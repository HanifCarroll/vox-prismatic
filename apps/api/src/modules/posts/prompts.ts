// Prompt constants and builders for LinkedIn post generation
import {
  MAX_EMOJIS_TOTAL,
  MAX_HASHTAGS,
  MAX_PARAGRAPH_CHARS,
  MAX_PARAGRAPHS,
  MAX_SENTENCES_PER_PARAGRAPH,
  MIN_HASHTAGS,
  MIN_PARAGRAPHS,
} from './constants'
import type { PostTypePreset, WritingStyle } from '@content/shared-types'

export const PROMPT_HEADER_WRITER = 'You are a LinkedIn post formatter and writer.'

export const PROMPT_OWNERSHIP_RULES = [
  'The transcript may include speaker labels of the form "Me:" and "Them:". Maintain correct ownership:',
  "- Only use first-person (I, me, my, I'm, I've) for claims explicitly stated in Me: lines.",
  '- Never attribute actions from "Them:" to yourself. If unsure, use neutral wording (e.g., "someone shared…").',
]

export const PROMPT_FORMATTING_RULES = [
  'Write for mobile readability with these constraints:',
  `- ${MIN_PARAGRAPHS}–${MAX_PARAGRAPHS} short paragraphs, 1–${MAX_SENTENCES_PER_PARAGRAPH} sentences each (<= ${MAX_PARAGRAPH_CHARS} chars per paragraph).`,
  '- Strong opening hook in the first paragraph.',
  '- Plain language; no lists, bullets, or markdown.',
  `- 0–${MAX_EMOJIS_TOTAL} emojis total; do NOT use emojis in the first paragraph.`,
  '- No hashtags inside paragraphs.',
  `- ${MIN_HASHTAGS}–${MAX_HASHTAGS} relevant hashtags at the very end as an array (each with leading #).`,
  'Return JSON only in this shape: { "post": { "paragraphs": string[], "hashtags": string[] } }.',
]

function clamp(s: string, max = 400) {
  return s.replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/```/g, ' ').slice(0, max)
}

function buildPostTypeGuidance(type?: PostTypePreset): string[] {
  switch (type) {
    case 'story':
      return [
        'Use a story arc: hook → context → challenge → insight → takeaway.',
        'Keep paragraphs compact; avoid lists.',
      ]
    case 'how_to':
      return [
        'Explain a practical “how-to” with clear, concise steps (no bullets, write as prose).',
        'Lead with the outcome and why it matters to the audience.',
      ]
    case 'myth_bust':
      return [
        'Bust a common myth: state the myth briefly, then the reality and what to do instead.',
      ]
    case 'listicle':
      return [
        'Present 3–5 short ideas in paragraph form (no bullets). One idea per paragraph.',
      ]
    case 'case_study':
      return [
        'Case study framing: problem → approach → result (no confidential details).',
      ]
    case 'announcement':
      return [
        'Announce crisply: what, why, who benefits, optional CTA. Avoid hype.',
      ]
    default:
      return []
  }
}

function buildStyleGuide(style?: WritingStyle): string[] {
  if (!style) return []
  const out: string[] = ['Style Guide:']
  if (style.tone) out.push(`- Tone: ${clamp(style.tone, 120)}`)
  if (style.audience) out.push(`- Audience: ${clamp(style.audience, 160)}`)
  if (style.goals) out.push(`- Goal: ${clamp(style.goals, 200)}`)
  if (style.emojiPolicy) out.push(`- Emojis: ${style.emojiPolicy}`)
  // Derive CTA implicitly from goals: encourage a concise CTA aligned with goals
  if (style.goals) out.push(`- If appropriate, end with a single-sentence CTA aligned with the goal above.`)
  const c = style.constraints
  if (c) {
    const rules: string[] = []
    if (c.minParagraphs) rules.push(`>= ${c.minParagraphs} paragraphs`)
    if (c.maxParagraphs) rules.push(`<= ${c.maxParagraphs} paragraphs`)
    if (c.maxSentencesPerParagraph) rules.push(`<= ${c.maxSentencesPerParagraph} sentences/paragraph`)
    if (c.maxParagraphChars) rules.push(`<= ${c.maxParagraphChars} chars/paragraph`)
    if (c.maxEmojisTotal !== undefined) rules.push(`<= ${c.maxEmojisTotal} emojis total`)
    if (c.minHashtags !== undefined) rules.push(`>= ${c.minHashtags} hashtags`)
    if (c.maxHashtags !== undefined) rules.push(`<= ${c.maxHashtags} hashtags`)
    if (rules.length) out.push(`- Constraints: ${rules.join('; ')}`)
  }
  const hp = style.hashtagPolicy
  if (hp) {
    const hpLines: string[] = []
    if (hp.strategy) hpLines.push(`strategy=${hp.strategy}`)
    if (hp.required?.length) hpLines.push(`required=[${hp.required.join(', ')}]`)
    if (hp.banned?.length) hpLines.push(`banned=[${hp.banned.join(', ')}]`)
    if (hp.allowed?.length) hpLines.push(`allowed=[${hp.allowed.slice(0, 10).join(', ')}]`)
    if (hpLines.length) out.push(`- Hashtags: ${hpLines.join('; ')}`)
  }
  const gl = style.glossary
  if (gl) {
    if (gl.prefer?.length) out.push(`- Prefer terms: ${gl.prefer.slice(0, 10).join(', ')}`)
    if (gl.avoid?.length) out.push(`- Avoid terms: ${gl.avoid.slice(0, 10).join(', ')}`)
  }
  return out
}

export function buildBasePrompt(args: {
  transcript: string
  insight: string
  style?: WritingStyle
  postType?: PostTypePreset
  examples?: string[]
  customInstructions?: string
}) {
  const { transcript, insight, style, postType, examples, customInstructions } = args
  const typeGuide = buildPostTypeGuidance(postType || style?.defaultPostType)
  const styleGuide = buildStyleGuide(style)
  const ex = (examples || style?.examples || []).slice(0, 3)
  const exSection = ex.length
    ? ['Examples (JSON array of strings):', JSON.stringify(ex.map((s) => clamp(s, 1000))) ]
    : []
  const customSection = customInstructions && customInstructions.trim().length
    ? ['Custom Instructions (within ALL constraints above):', clamp(customInstructions, 1000)]
    : []
  return [
    PROMPT_HEADER_WRITER,
    'Ground the post ONLY in the provided transcript and the specific insight. Do not invent details.',
    'Safety: Do not include PII, secrets, or URLs. Keep content professional and factual.',
    ...PROMPT_OWNERSHIP_RULES,
    ...PROMPT_FORMATTING_RULES,
    ...(typeGuide.length ? ['Post Type Guidance:', ...typeGuide] : []),
    ...(styleGuide.length ? styleGuide : []),
    ...exSection,
    ...customSection,
    '',
    'IMPORTANT: Follow the constraints ABOVE. You MUST return ONLY JSON in the exact schema.',
    '',
    'Transcript:',
    transcript,
    '',
    'Insight:',
    insight,
  ].join('\n')
}

export function buildReformatPrompt(violations: string[], json: unknown) {
  return [
    'Reformat the following LinkedIn post to satisfy ALL constraints. Do not add new information.',
    'You may split/merge sentences, remove emojis, move hashtags to the end, and make minimal grammar edits.',
    'Keep the same meaning. Return JSON only in the same schema.',
    'Safety: Do not include PII, secrets, or URLs.',
    '',
    'Violations:',
    ...violations.map((v) => `- ${v}`),
    '',
    'Current draft (JSON):',
    JSON.stringify(json),
  ].join('\n')
}

export function buildAttributionPrompt(meLines: string, json: unknown) {
  return [
    'Verify attribution in the LinkedIn post draft below.',
    'If any first-person statements are not supported by the provided Me: lines, rewrite the draft to neutral voice (no first-person).',
    'Keep the same meaning and earlier formatting constraints.',
    'Return JSON only in the same schema.',
    'Safety: Do not include PII, secrets, or URLs.',
    '',
    'Me lines (may be empty):',
    meLines || '(none)',
    '',
    'Current draft (JSON):',
    JSON.stringify(json),
  ].join('\n')
}
