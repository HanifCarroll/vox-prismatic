import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ZodSchema } from 'zod'
import { ValidationException } from '@/utils/errors'

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    throw new ValidationException('GEMINI_API_KEY is not configured')
  }
  return key
}

const DEFAULT_MODEL = 'models/gemini-2.5-pro'

export async function generateJson<T>(args: {
  schema: ZodSchema<T>
  prompt: string
  temperature?: number
}): Promise<T> {
  const { schema, prompt, temperature = 0.3 } = args
  const apiKey = getApiKey()
  const client = new GoogleGenerativeAI(apiKey)
  const model = client.getGenerativeModel({ model: DEFAULT_MODEL })

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
      return parsed.data
    } catch (err) {
      lastErr = err
    }
  }
  // Re-throw the last error after retries
  if (lastErr instanceof ValidationException) throw lastErr
  throw new ValidationException('AI generation failed')
}
