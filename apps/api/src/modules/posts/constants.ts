// Shared constants for LinkedIn post generation/validation

export const MAX_POST_CHARS = 3000
export const MAX_PARAGRAPH_CHARS = 220
export const MAX_SENTENCES_PER_PARAGRAPH = 2
export const MIN_PARAGRAPHS = 2
export const MAX_PARAGRAPHS = 8
export const MIN_HASHTAGS = 3
export const MAX_HASHTAGS = 5
export const MAX_EMOJIS_TOTAL = 2

// Patterns
export const HASHTAG_PATTERN = /^#[A-Za-z][A-Za-z0-9_]{1,49}$/
export const EMOJI_REGEX = /\p{Extended_Pictographic}/gu

// Generation parameters
export const GENERATE_CONCURRENCY = 3
export const MIN_DRAFTS = 5
export const MAX_DRAFTS = 10
export const DEFAULT_DRAFT_LIMIT = 7
export const GENERATE_TEMPERATURE = 0.3
export const REFORMAT_TEMPERATURE = 0.2
