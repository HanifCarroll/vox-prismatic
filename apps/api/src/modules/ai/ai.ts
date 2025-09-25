import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ZodSchema } from 'zod'
import { db } from '@/db'
import { aiUsageEvents } from '@/db/schema'
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
}

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
    await db.insert(aiUsageEvents).values({
      action: args.action,
      model: args.model,
      userId: args.userId ?? null,
      projectId: args.projectId ?? null,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      costUsd: args.costUsd ?? 0,
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
  } = args
  const apiKey = getApiKey()
  const client = new GoogleGenerativeAI(apiKey)
  const model = client.getGenerativeModel({ model: modelName })

  // Instruct JSON-only output explicitly
  const fullPrompt = `${prompt}\n\nYou MUST respond with JSON only. No markdown fences, no prose.`

  let lastErr: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt } as any] }],
        generationConfig: {
          temperature,
          // Ask for JSON explicitly; some SDK versions support this hint
          responseMimeType: 'application/json',
        } as any,
      })

      const text =
        result.response?.text?.() ??
        (result as any)?.response?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text || typeof text !== 'string') {
        throw new ValidationException('AI response was empty or invalid')
      }

      let data: unknown
      try {
        data = JSON.parse(text)
      } catch (e) {
        throw new ValidationException('AI did not return valid JSON')
      }

      const parsed = schema.safeParse(data)
      if (!parsed.success) {
        throw new ValidationException('AI JSON failed validation', {
          errors: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        })
      }
      const usage = (result.response as any)?.usageMetadata ?? (result as any)?.response?.usageMetadata
      const promptTokens = typeof usage?.promptTokenCount === 'number' ? usage.promptTokenCount : 0
      const candidateTokens =
        typeof usage?.candidatesTokenCount === 'number'
          ? usage.candidatesTokenCount
          : Math.max(0, (typeof usage?.totalTokenCount === 'number' ? usage.totalTokenCount : 0) - promptTokens)
      const cost = calculateCost(modelName, promptTokens, candidateTokens)
      void recordUsage({
        action,
        model: modelName,
        userId,
        projectId,
        inputTokens: promptTokens,
        outputTokens: candidateTokens,
        costUsd: cost,
        metadata: metadata ? { ...metadata, temperature } : { temperature },
      })
      return parsed.data
    } catch (err) {
      lastErr = err
    }
  }
  // Re-throw the last error after retries
  if (lastErr instanceof ValidationException) throw lastErr
  throw new ValidationException('AI generation failed')
}
