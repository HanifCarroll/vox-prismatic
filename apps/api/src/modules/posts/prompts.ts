// Prompt constants and builders for LinkedIn post generation
import {
  MAX_PARAGRAPH_CHARS,
  MAX_SENTENCES_PER_PARAGRAPH,
  MAX_EMOJIS_TOTAL,
  MIN_HASHTAGS,
  MAX_HASHTAGS,
  MIN_PARAGRAPHS,
  MAX_PARAGRAPHS,
} from './constants'

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

export function buildBasePrompt(args: { transcript: string; insight: string }) {
  const { transcript, insight } = args
  return [
    PROMPT_HEADER_WRITER,
    'Ground the post ONLY in the provided transcript and the specific insight. Do not invent details.',
    ...PROMPT_OWNERSHIP_RULES,
    ...PROMPT_FORMATTING_RULES,
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
    '',
    'Me lines (may be empty):',
    meLines || '(none)',
    '',
    'Current draft (JSON):',
    JSON.stringify(json),
  ].join('\n')
}
