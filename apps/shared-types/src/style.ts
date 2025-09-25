import { z } from 'zod'

// Post type presets for generation
export const PostTypePresetSchema = z.enum([
  'story',
  'how_to',
  'myth_bust',
  'listicle',
  'case_study',
  'announcement',
])
export type PostTypePreset = z.infer<typeof PostTypePresetSchema>

// Few-shot examples: up to 3 short examples
export const FewShotExamplesSchema = z.array(z.string().min(1).max(1200)).max(3)

// Hashtag policy and glossary guidance
export const HashtagPolicySchema = z.object({
  required: z.array(z.string().min(2).max(52)).max(10).optional(),
  allowed: z.array(z.string().min(2).max(52)).max(50).optional(),
  banned: z.array(z.string().min(2).max(52)).max(50).optional(),
  strategy: z.enum(['balanced', 'branded_first', 'generic_first']).optional(),
})
export type HashtagPolicy = z.infer<typeof HashtagPolicySchema>

export const GlossarySchema = z.object({
  prefer: z.array(z.string().min(1).max(80)).max(50).optional(),
  avoid: z.array(z.string().min(1).max(80)).max(50).optional(),
})
export type Glossary = z.infer<typeof GlossarySchema>

export const ConstraintsSchema = z.object({
  maxParagraphs: z.number().int().min(2).max(8).optional(),
  minParagraphs: z.number().int().min(1).max(8).optional(),
  maxSentencesPerParagraph: z.number().int().min(1).max(4).optional(),
  maxParagraphChars: z.number().int().min(80).max(400).optional(),
  maxEmojisTotal: z.number().int().min(0).max(5).optional(),
  minHashtags: z.number().int().min(0).max(10).optional(),
  maxHashtags: z.number().int().min(0).max(10).optional(),
})
export type Constraints = z.infer<typeof ConstraintsSchema>

export const WritingStyleSchema = z.object({
  tone: z.string().min(1).max(120).optional(),
  audience: z.string().min(1).max(160).optional(),
  goals: z.string().min(1).max(200).optional(),
  emojiPolicy: z.enum(['none', 'few', 'free']).optional(),
  constraints: ConstraintsSchema.optional(),
  hashtagPolicy: HashtagPolicySchema.optional(),
  glossary: GlossarySchema.optional(),
  examples: FewShotExamplesSchema.optional(),
  defaultPostType: PostTypePresetSchema.optional(),
})
export type WritingStyle = z.infer<typeof WritingStyleSchema>

export const GetStyleResponseSchema = z.object({ style: WritingStyleSchema.nullable() })
export type GetStyleResponse = z.infer<typeof GetStyleResponseSchema>

export const UpdateStyleRequestSchema = WritingStyleSchema
export type UpdateStyleRequest = z.infer<typeof UpdateStyleRequestSchema>
