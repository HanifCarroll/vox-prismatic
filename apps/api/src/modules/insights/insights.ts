import { z } from 'zod'
import { db } from '@/db'
import { insights as insightsTable } from '@/db/schema'
import { generateJson } from '@/modules/ai/ai'
import { ValidationException } from '@/utils/errors'

const InsightItemSchema = z.object({
  content: z.string().min(1).max(1000),
  quote: z.string().min(1).max(200),
  score: z.number().min(0).max(1),
})

const InsightsResponseSchema = z.object({
  insights: z.array(InsightItemSchema).min(1),
})

export async function generateAndPersist(args: {
  projectId: number
  transcript: string
  target?: number
}): Promise<{ count: number }> {
  const { projectId, transcript, target = 7 } = args
  if (!transcript || transcript.trim().length === 0) {
    throw new ValidationException('Transcript is required for insights generation')
  }

  const prompt = [
    'Extract concise insights suitable for LinkedIn thought-leadership from the transcript below.',
    `Return between ${Math.max(5, Math.min(10, target))} and 10 items when possible.`,
    'Each insight should be a single, self-contained idea (1–2 sentences).',
    'Provide a short, punchy quote and a quality score between 0.0 and 1.0.',
    'Output strictly as JSON in this shape: { "insights": [ { "content": string, "quote": string, "score": number } ] }',
    '\nTranscript:\n',
    transcript,
  ].join('\n')

  const json = await generateJson({ schema: InsightsResponseSchema, prompt })

  // Post-process: trim, bound score, dedupe, cap to target
  const seen = new Set<string>()
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
  const cleaned = json.insights
    .map((i) => ({
      content: i.content.trim(),
      quote: i.quote.trim(),
      score: Math.max(0, Math.min(1, i.score ?? 0)),
    }))
    .filter((i) => i.content.length > 0)

  // Sort by score desc, then dedupe by normalized content
  cleaned.sort((a, b) => (b.score || 0) - (a.score || 0))
  const unique: typeof cleaned = []
  for (const i of cleaned) {
    const key = normalize(i.content)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(i)
    if (unique.length >= target) break
  }

  if (unique.length === 0) {
    throw new ValidationException('AI did not return usable insights')
  }

  const inserted = await db
    .insert(insightsTable)
    .values(
      unique.map((i) => ({
        projectId,
        content: i.content,
        quote: i.quote.length > 200 ? `${i.quote.slice(0, 197)}...` : i.quote,
        score: (i.score as unknown as any) ?? null,
        isApproved: false,
      })),
    )
    .returning({ id: insightsTable.id })

  return { count: inserted.length }
}
