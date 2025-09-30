import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { ProviderMetadata } from '@ai-sdk/provider'
import { generateObject, type UserModelMessage, zodSchema } from 'ai'
import { GoogleAICacheManager } from '@google/generative-ai/server'
import crypto from 'node:crypto'
import type { ZodSchema } from 'zod'
import { supabaseService } from '@/services/supabase'
import { ValidationException } from '@/utils/errors'
import { logger } from '@/utils/logger'

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    throw new ValidationException('GEMINI_API_KEY is not configured')
  }
  return key
}

export const PRO_MODEL = 'models/gemini-2.5-pro'
export const FLASH_MODEL = 'models/gemini-2.5-flash'

const DEFAULT_MODEL = PRO_MODEL

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  [PRO_MODEL]: { input: 1.25, output: 10 },
  [FLASH_MODEL]: { input: 0.3, output: 2.5 },
}

type GenerateJsonArgs<T> = {
  schema: ZodSchema<T>
  prompt: string
  temperature?: number
  model?: string
  action: string
  userId?: number
  projectId?: number | null
  metadata?: Record<string, unknown>
  cachedPrompt?: {
    key: string
    text: string
    ttlSeconds?: number
  }
}

type CachedContentLookup = {
  name: string
  displayName: string | undefined
}

let googleClient: ReturnType<typeof createGoogleGenerativeAI> | null = null
let googleClientKey: string | null = null
let cacheManager: GoogleAICacheManager | null = null
let cacheManagerKey: string | null = null
const cacheNameByDigest = new Map<string, Promise<string | null>>()

async function recordUsage(args: {
  action: string
  model: string
  userId?: number
  projectId?: number | null
  inputTokens: number
  outputTokens: number
  costUsd: number | null
  metadata?: Record<string, unknown>
}) {
  try {
    await supabaseService.from('ai_usage_events').insert({
      action: args.action,
      model: args.model,
      user_id: args.userId ?? null,
      project_id: args.projectId ?? null,
      input_tokens: args.inputTokens,
      output_tokens: args.outputTokens,
      cost_usd: args.costUsd ?? 0,
      metadata: args.metadata ?? {},
    })
  } catch (error) {
    logger.warn({ msg: 'ai_usage_audit_insert_failed', error })
  }
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number | null {
  const pricing = MODEL_PRICING[model]
  if (!pricing) return null
  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output
  const total = inputCost + outputCost
  return Number(total.toFixed(6))
}

function getGoogleModel(modelName: string) {
  const apiKey = getApiKey()
  if (!googleClient || googleClientKey !== apiKey) {
    googleClient = createGoogleGenerativeAI({ apiKey })
    googleClientKey = apiKey
  }
  return googleClient(modelName)
}

function getCacheManager(): GoogleAICacheManager {
  const apiKey = getApiKey()
  if (!cacheManager || cacheManagerKey !== apiKey) {
    cacheManager = new GoogleAICacheManager(apiKey)
    cacheManagerKey = apiKey
    cacheNameByDigest.clear()
  }
  return cacheManager
}

async function lookupCachedContent(
  manager: GoogleAICacheManager,
  displayName: string,
): Promise<string | null> {
  try {
    let pageToken: string | undefined
    do {
      const existing = await manager.list({ pageSize: 200, pageToken })
      const match = existing.cachedContents.find((item: CachedContentLookup) => {
        return item.displayName === displayName
      })
      if (match?.name) return match.name
      pageToken = existing.nextPageToken
    } while (pageToken)
    return null
  } catch (error) {
    logger.warn({ msg: 'ai_cache_lookup_failed', error })
    return null
  }
}

async function ensureCachedPrompt(args: {
  key: string
  text: string
  model: string
  ttlSeconds?: number
}): Promise<string | null> {
  const { key, text, model, ttlSeconds } = args
  const trimmed = text.trim()
  if (!trimmed) return null
  const digest = crypto
    .createHash('sha256')
    .update(model)
    .update(':')
    .update(key)
    .update(':')
    .update(trimmed)
    .digest('hex')
  const displayName = `${key.slice(0, 40)}-${digest.slice(0, 16)}`
  const mapKey = `${model}:${digest}`
  let entry = cacheNameByDigest.get(mapKey)
  if (!entry) {
    entry = (async () => {
      const manager = getCacheManager()
      const existingName = await lookupCachedContent(manager, displayName)
      if (existingName) return existingName
      try {
        const created = await manager.create({
          model,
          contents: [
            {
              role: 'user',
              parts: [{ text: trimmed } as any],
            },
          ],
          ttlSeconds: ttlSeconds ?? 60 * 60 * 24 * 7,
          displayName,
        })
        return created.name ?? null
      } catch (error) {
        logger.warn({ msg: 'ai_cache_create_failed', error })
        return null
      }
    })()
    cacheNameByDigest.set(mapKey, entry)
  }
  return entry
}

function buildUserMessage(prompt: string): UserModelMessage {
  return {
    role: 'user',
    content: [
      {
        type: 'text',
        text: prompt,
      },
    ],
  }
}

function extractGoogleUsage(providerMetadata: ProviderMetadata | undefined) {
  const googleMeta = (providerMetadata as any)?.google
  return googleMeta?.usageMetadata as
    | {
        promptTokenCount?: number
        candidatesTokenCount?: number
        totalTokenCount?: number
        cachedContentTokenCount?: number
      }
    | undefined
}

export async function generateJson<T>(args: GenerateJsonArgs<T>): Promise<T> {
  const {
    schema,
    prompt,
    temperature = 0.3,
    model: modelName = DEFAULT_MODEL,
    action,
    userId,
    projectId,
    metadata,
    cachedPrompt,
  } = args
  const model = getGoogleModel(modelName)
  const cachedContentName = cachedPrompt
    ? await ensureCachedPrompt({ ...cachedPrompt, model: modelName })
    : null
  const providerOptions = cachedContentName ? { google: { cachedContent: cachedContentName } } : undefined
  const hasCache = Boolean(cachedContentName)
  const messages = [buildUserMessage(prompt)]
  let lastErr: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await generateObject({
        model,
        schema: zodSchema(schema),
        temperature,
        messages,
        mode: 'json',
        providerOptions,
      })

      const googleUsage = extractGoogleUsage(result.providerMetadata)
      const promptTokens = typeof result.usage.promptTokens === 'number' ? result.usage.promptTokens : 0
      const candidateTokens =
        typeof result.usage.completionTokens === 'number'
          ? result.usage.completionTokens
          : Math.max(0, (typeof result.usage.totalTokens === 'number' ? result.usage.totalTokens : 0) - promptTokens)
      const cost = calculateCost(modelName, promptTokens, candidateTokens)
      const metadataWithExtras = {
        ...(metadata ?? {}),
        temperature,
        cached: hasCache,
        cachedContentName: providerOptions?.google?.cachedContent ?? null,
        cachedTokens: googleUsage?.cachedContentTokenCount ?? null,
      }
      void recordUsage({
        action,
        model: modelName,
        userId,
        projectId,
        inputTokens: promptTokens,
        outputTokens: candidateTokens,
        costUsd: cost,
        metadata: metadataWithExtras,
      })
      return result.object as T
    } catch (err) {
      lastErr = err
    }
  }
  // Re-throw the last error after retries
  if (lastErr instanceof ValidationException) throw lastErr
  throw new ValidationException('AI generation failed')
}
