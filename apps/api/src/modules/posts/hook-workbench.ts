import { and, eq } from 'drizzle-orm'
import {
  HookFrameworksResponseSchema,
  HookWorkbenchRequestSchema,
  HookWorkbenchResponseSchema,
  HookWorkbenchHookSchema,
  type HookFramework,
  type HookWorkbenchRequest,
} from '@content/shared-types'
import { z } from 'zod'
import { db } from '@/db'
import { contentProjects, insights, posts } from '@/db/schema'
import { generateJson } from '@/modules/ai/ai'
import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
  ValidationException,
} from '@/utils/errors'

export const HOOK_FRAMEWORKS: HookFramework[] = [
  {
    id: 'problem-agitate',
    label: 'Problem → Agitate',
    description:
      'Start with the painful status quo, then intensify it with a consequence that creates urgency to keep reading.',
    example: 'Most coaches post daily and still hear crickets. Here’s the brutal reason no one told you.',
    tags: ['pain', 'urgency'],
  },
  {
    id: 'contrarian-flip',
    label: 'Contrarian Flip',
    description:
      'Challenge a common belief with a bold reversal that signals you are about to reveal a better path forward.',
    example: 'The worst advice in coaching? “Nurture every lead.” Here’s why that’s killing your pipeline.',
    tags: ['contrarian', 'pattern interrupt'],
  },
  {
    id: 'data-jolt',
    label: 'Data Jolt',
    description:
      'Lead with a specific metric or contrast that reframes the opportunity or risk in unmistakable numbers.',
    example: '87% of our inbound leads ghosted… until we changed one sentence in our opener.',
    tags: ['proof', 'specificity'],
  },
  {
    id: 'confession-to-lesson',
    label: 'Confession → Lesson',
    description:
      'Offer a vulnerable admission or mistake that earns trust, then hint at the transformation you unlocked.',
    example: 'I almost shut down my practice last year. The fix took 12 minutes a week.',
    tags: ['story', 'vulnerability'],
  },
  {
    id: 'myth-bust',
    label: 'Myth Bust',
    description:
      'Expose a beloved industry myth, then tease the unexpected truth that flips the audience’s worldview.',
    example: '“Add more value” is not why prospects ignore you. This is.',
    tags: ['belief shift', 'clarity'],
  },
  {
    id: 'micro-case',
    label: 'Micro Case Study',
    description:
      'Compress a before→after story into two lines that prove you can create the transformation your audience craves.',
    example: 'Session 1: 14% close rate. Session 6: 61%. Same offer. Different first sentence.',
    tags: ['credibility', 'outcomes'],
  },
]

const HookWorkbenchAiSchema = z.object({
  summary: z.string().optional(),
  recommendedId: z.string().optional(),
  hooks: z
    .array(
      z.object({
        id: z.string(),
        frameworkId: z.string(),
        label: z.string(),
        hook: z.string(),
        curiosity: z.number().int().min(0).max(100),
        valueAlignment: z.number().int().min(0).max(100),
        rationale: z.string(),
      }),
    )
    .min(3)
    .max(5),
})

function sanitizeText(value: string, limit: number) {
  return value
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
    .replace(/```/g, '`')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit)
}

function takeParagraph(value: string, limit: number) {
  return sanitizeText(value.split(/\n{2,}/)[0] ?? value, limit)
}

function buildHookWorkbenchPrompt(args: {
  frameworks: HookFramework[]
  transcript: string
  insight: string
  postContent: string
  count: number
  customFocus?: string
}) {
  const { frameworks, transcript, insight, postContent, count, customFocus } = args
  const library = frameworks
    .map((fw) => `- ${fw.id}: ${fw.label} → ${fw.description}${fw.example ? ` Example: "${fw.example}"` : ''}`)
    .join('\n')
  const base = [
    'You are a hook strategist for high-performing LinkedIn posts.',
    'Generate scroll-stopping opening lines (<= 210 characters, 1-2 sentences, no emojis).',
    `Produce ${count} options.`,
    'Each option must follow one of the approved frameworks below. Match the tone to the audience of executive coaches & consultants.',
    'For every hook, score curiosity (ability to earn a See More click) and value alignment (how clearly it sets up the promised lesson or outcome). Scores are 0-100 integers.',
    'Provide a short rationale referencing why the hook will resonate.',
    'Return ONLY JSON with shape { "summary"?: string, "recommendedId"?: string, "hooks": [{ "id", "frameworkId", "label", "hook", "curiosity", "valueAlignment", "rationale" }] }.',
    'Framework Library:',
    library,
    '',
    'Project Insight (anchor the promise to this idea):',
    sanitizeText(insight || 'N/A', 600),
    '',
    'Transcript Excerpt (do not quote verbatim; use for credibility only):',
    sanitizeText(transcript, 900),
    '',
    'Current Draft Opening:',
    takeParagraph(postContent, 220),
  ]
  if (customFocus && customFocus.trim().length > 0) {
    base.push('', `Audience Focus: ${sanitizeText(customFocus, 240)}`)
  }
  base.push('', 'Remember: respond with JSON only.')
  return base.join('\n')
}

export function listHookFrameworks() {
  return HookFrameworksResponseSchema.parse({ frameworks: HOOK_FRAMEWORKS })
}

type RunArgs = {
  userId: number
  postId: number
  input: HookWorkbenchRequest
}

export async function runHookWorkbench(args: RunArgs) {
  const { userId, postId, input } = args
  const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) })
  if (!post) throw new NotFoundException('Post not found')
  const project = await db.query.contentProjects.findFirst({ where: eq(contentProjects.id, post.projectId) })
  if (!project) throw new NotFoundException('Project not found')
  if (project.userId !== userId) throw new ForbiddenException('You do not have access to this project')

  if (!project.transcriptCleaned && !project.transcriptOriginal) {
    throw new UnprocessableEntityException('Transcript missing; generate hooks after processing completes')
  }

  const transcript = sanitizeText(
    (project.transcriptCleaned || project.transcriptOriginal || '').toString(),
    1800,
  )
  const insightId = post.insightId
  if (!insightId) {
    throw new UnprocessableEntityException('Hooks require an insight-backed post')
  }
  const insightRow = await db
    .select({ content: insights.content })
    .from(insights)
    .where(and(eq(insights.id, insightId), eq(insights.projectId, project.id)))
    .limit(1)
  const insight = insightRow[0]?.content
  if (!insight) {
    throw new NotFoundException('Insight not found for post')
  }

  const parsedInput = HookWorkbenchRequestSchema.parse(input ?? {})
  const selected = parsedInput.frameworkIds
    ? HOOK_FRAMEWORKS.filter((fw) => parsedInput.frameworkIds?.includes(fw.id))
    : HOOK_FRAMEWORKS.slice(0, 4)
  if (selected.length === 0) {
    throw new ValidationException('Select at least one framework')
  }
  const count = parsedInput.count ?? Math.min(Math.max(selected.length, 3), 5)

  const prompt = buildHookWorkbenchPrompt({
    frameworks: selected,
    transcript,
    insight,
    postContent: post.content,
    count,
    customFocus: parsedInput.customFocus,
  })

  const aiResult = await generateJson({ schema: HookWorkbenchAiSchema, prompt, temperature: 0.4 })

  const frameworksById = new Map(HOOK_FRAMEWORKS.map((fw) => [fw.id, fw]))
  const hooks = aiResult.hooks
    .map((hook) => {
      const framework = frameworksById.get(hook.frameworkId) ?? frameworksById.get(selected[0]!.id)
      const normalizedHook = sanitizeText(hook.hook, 210)
      return HookWorkbenchHookSchema.parse({
        id: hook.id || `${hook.frameworkId}-${Math.random().toString(36).slice(2, 8)}`,
        frameworkId: framework?.id ?? hook.frameworkId,
        label: framework?.label ?? hook.label,
        hook: normalizedHook,
        curiosity: hook.curiosity,
        valueAlignment: hook.valueAlignment,
        rationale: sanitizeText(hook.rationale, 360),
      })
    })
    .filter(Boolean)

  if (!hooks.length) {
    throw new ValidationException('No hooks generated')
  }

  const scored = hooks.map((hook) => ({
    ...hook,
    totalScore: Math.round((hook.curiosity + hook.valueAlignment) / 2),
  }))
  const recommended =
    aiResult.recommendedId && scored.some((h) => h.id === aiResult.recommendedId)
      ? aiResult.recommendedId
      : scored.reduce((best, hook) => (best && best.totalScore >= hook.totalScore ? best : hook)).id

  const response = HookWorkbenchResponseSchema.parse({
    hooks: scored.map(({ totalScore, ...hook }) => hook),
    summary: aiResult.summary ? sanitizeText(aiResult.summary, 400) : undefined,
    recommendedId: recommended,
    generatedAt: new Date(),
  })

  return response
}

export type RunHookWorkbenchReturn = Awaited<ReturnType<typeof runHookWorkbench>>
