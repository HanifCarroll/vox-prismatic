import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2, Sparkles, Workflow, ShieldCheck, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/auth/AuthContext'

const differentiators = [
  {
    title: 'Project-centric cockpit',
    description:
      'Track every client from transcript to ready-to-publish posts with a lifecycle that keeps priorities and ownership clear.',
    icon: Workflow,
  },
  {
    title: 'Insight-driven generation',
    description:
      'Our AI distills each call into 5–10 LinkedIn-ready drafts, anchored in the language your clients already trust you for.',
    icon: Sparkles,
  },
  {
    title: 'Human-in-the-loop control',
    description:
      'Approve, edit, and schedule with confidence. Every post stays reviewable until you give the green light.',
    icon: ShieldCheck,
  },
]

const processSteps = [
  {
    title: 'Import a call transcript',
    detail: 'Drop in cleaned notes or a transcript and let the platform normalize structure instantly.',
  },
  {
    title: 'Review AI-generated posts',
    detail: 'See 5–10 context-rich drafts with call highlights woven in. Approve in bulk or fine-tune messaging.',
  },
  {
    title: 'Publish at the perfect moment',
    detail: 'Hand-off to LinkedIn in a click, or line up ready-to-go posts for upcoming campaigns.',
  },
]

const stats = [
  { label: 'Time saved per project', value: '12+ hours', explanation: 'Replace manual drafting and context switching with one focused workflow.' },
  { label: 'Posts per call', value: '5–10 drafts', explanation: 'Consistently generate a full slate of LinkedIn posts from a single conversation.' },
  { label: 'Teams onboarded', value: '40+', explanation: 'Boutique agencies and consultants building LinkedIn visibility at scale.' },
]

const faqs = [
  {
    question: 'How does the platform create LinkedIn posts?',
    answer:
      'We analyze your transcript to extract the strongest insights, then craft platform-aware drafts with hooks, context, and calls to action. You keep full control to edit, approve, or reject every post.',
  },
  {
    question: 'Do I need to manage multiple tools?',
    answer:
      'No. Projects, drafts, approvals, and publishing all live in one project-centric view. Built-in status cues make it easy to see what needs your attention.',
  },
  {
    question: 'What happens after I approve a post?',
    answer:
      'Approved posts move into a ready state for instant publishing. LinkedIn OAuth is built in so you can ship directly without exporting content elsewhere.',
  },
  {
    question: 'Can my team collaborate?',
    answer:
      'Absolutely. Share projects across your team to keep everyone aligned on status, upcoming posts, and client priorities.',
  },
]

const socialProof = [
  'Fractional CMOs',
  'Boutique Agencies',
  'Leadership Coaches',
  'Enablement Teams',
  'RevOps Consultants',
]

export const Route = createFileRoute('/')({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: 'Content Projects | Turn client calls into LinkedIn influence' },
      {
        name: 'description',
        content:
          'Content Projects turns transcripts into polished LinkedIn posts. Manage insights, approvals, and publishing from one project-centric hub.',
      },
    ],
  }),
})

function LandingPage() {
  const { isAuthenticated } = useAuth()
  const primaryCtaHref = isAuthenticated ? '/projects' : '/register'

  return (
    <div className="bg-white text-zinc-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-blue-600 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <header className="border-b border-zinc-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
            <div className="h-9 w-9 rounded-lg bg-blue-600" aria-hidden="true" />
            Content Projects
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {isAuthenticated ? (
              <>
                <Link to="/projects" className="text-zinc-600 transition-colors hover:text-zinc-900">
                  Workspace
                </Link>
                <Button asChild size="sm">
                  <Link to="/projects/new" className="flex items-center gap-1">
                    New project
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-zinc-600 transition-colors hover:text-zinc-900">
                  Log in
                </Link>
                <Button asChild size="sm">
                  <Link to="/register" className="flex items-center gap-1">
                    Start free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="main-content" className="mx-auto flex max-w-6xl flex-col gap-24 px-6 pb-24 pt-16">
        <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
              New: LinkedIn-first content OS
            </Badge>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-5xl">
              Turn every client call into weeks of LinkedIn visibility.
            </h1>
            <p className="text-lg text-zinc-600">
              Content Projects gives coaches, consultants, and boutique agencies a project-centric workflow that transforms transcripts into ready-to-publish LinkedIn posts—without spreadsheets, guesswork, or copy-paste fatigue.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 px-6 text-base">
                <Link to={primaryCtaHref} className="flex items-center gap-2">
                  {isAuthenticated ? 'Go to projects' : 'Start creating posts'}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              {isAuthenticated ? (
                <Button asChild variant="outline" size="lg" className="h-12 border-zinc-300 px-6 text-base">
                  <Link to="/projects/new" className="flex items-center gap-2">
                    Create new project
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="outline" size="lg" className="h-12 border-zinc-300 px-6 text-base">
                  <a href="#process-heading" className="flex items-center gap-2">
                    See how it works
                  </a>
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Human approval at every step
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                No complex onboarding required
              </div>
            </div>
          </div>
          <div className="relative isolate overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 p-8 shadow-sm">
            <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-blue-100 opacity-70 blur-3xl" />
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-500">Active project</p>
                  <p className="text-xl font-semibold text-zinc-900">Pitch prep with Acme Co.</p>
                </div>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                  Ready
                </Badge>
              </div>
              <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-zinc-500">LinkedIn draft</p>
                <p className="mt-2 text-base font-medium text-zinc-900">
                  “Executives hire coaches to think sharper, not faster. Here’s how to turn raw call notes into compounding influence without burning your calendar.”
                </p>
                <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
                  <span>Character count: 1,396</span>
                  <span>Stage: Posts → Ready</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Transcript processed via SSE · 3 mins ago</span>
                <span>5 drafts awaiting approval</span>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="social-proof-heading" className="space-y-6">
          <div className="flex items-center gap-3 text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            <Users className="h-4 w-4" aria-hidden="true" />
            <span id="social-proof-heading">Trusted by modern experts</span>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-base text-zinc-500">
            {socialProof.map((group) => (
              <span key={group} className="whitespace-nowrap rounded-full border border-zinc-200 px-4 py-2">
                {group}
              </span>
            ))}
          </div>
        </section>

        <section aria-labelledby="differentiators-heading" className="space-y-12">
          <div className="max-w-3xl space-y-4">
            <h2 id="differentiators-heading" className="text-3xl font-semibold text-zinc-900">
              Replace disconnected tools with a workflow built for LinkedIn momentum.
            </h2>
            <p className="text-lg text-zinc-600">
              Content Projects removes the manual labor of turning calls into content so you can focus on strategy, client relationships, and consistent publishing.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {differentiators.map(({ title, description, icon: Icon }) => (
              <Card key={title} className="h-full border-zinc-200 shadow-sm">
                <CardContent className="flex h-full flex-col gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                    <Icon className="h-6 w-6 text-blue-600" aria-hidden="true" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-zinc-900">{title}</h3>
                    <p className="text-sm text-zinc-600">{description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="process-heading" className="grid gap-10 lg:grid-cols-[0.6fr_1fr] lg:items-center">
          <div className="space-y-4">
            <h2 id="process-heading" className="text-3xl font-semibold text-zinc-900">
              Ship LinkedIn content in three focused steps.
            </h2>
            <p className="text-lg text-zinc-600">
              Guided stages keep every project moving—from first transcript to scheduled post—with clarity on who owns the next action.
            </p>
            <Button asChild size="lg" className="h-12 w-fit px-6 text-base">
              <Link to={primaryCtaHref}>Experience the workflow</Link>
            </Button>
          </div>
          <ol className="space-y-6">
            {processSteps.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <span className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-lg font-semibold text-white">
                    {index + 1}
                  </span>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-zinc-900">{step.title}</h3>
                    <p className="text-sm text-zinc-600">{step.detail}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="results-heading" className="space-y-12">
          <div className="max-w-3xl space-y-4">
            <h2 id="results-heading" className="text-3xl font-semibold text-zinc-900">
              Real teams convert conversations into pipeline faster.
            </h2>
            <p className="text-lg text-zinc-600">
              See the compound impact when each call fuels high-performing LinkedIn content instead of languishing in a shared drive.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {stats.map((stat) => (
              <Card key={stat.label} className="h-full border-zinc-200 shadow-sm">
                <CardContent className="flex h-full flex-col gap-3 p-6">
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">{stat.label}</p>
                  <p className="text-4xl font-semibold text-zinc-900">{stat.value}</p>
                  <p className="text-sm text-zinc-600">{stat.explanation}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="testimonial-heading" className="rounded-3xl border border-zinc-200 bg-gradient-to-r from-zinc-50 to-blue-50 p-10 shadow-sm">
          <div className="max-w-3xl space-y-6">
            <Badge variant="secondary" className="bg-zinc-900 text-white">
              Customer spotlight
            </Badge>
            <h2 id="testimonial-heading" className="text-3xl font-semibold text-zinc-900">
              “We turned weekly advisory calls into a month of LinkedIn thought leadership in a single afternoon.”
            </h2>
            <p className="text-lg text-zinc-700">
              “Before Content Projects we lost momentum copying notes into docs, assigning edits, then hunting for the latest version. Now our strategist uploads a transcript, the team reviews AI drafts in one view, and we publish with confidence. It’s the operating system our boutique firm needed to stay visible.”
            </p>
            <div className="text-sm font-medium text-zinc-600">
              — Priya Raman, Founder at Signal North Consulting
            </div>
          </div>
        </section>

        <section aria-labelledby="faq-heading" className="space-y-10">
          <div className="max-w-3xl space-y-4">
            <h2 id="faq-heading" className="text-3xl font-semibold text-zinc-900">
              Frequently asked questions
            </h2>
            <p className="text-lg text-zinc-600">
              Everything you need to know before transforming your client conversations into consistent pipeline-building content.
            </p>
          </div>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <Card key={faq.question} className="border-zinc-200">
                <CardContent className="space-y-2 p-6">
                  <h3 className="text-lg font-semibold text-zinc-900">{faq.question}</h3>
                  <p className="text-sm text-zinc-600">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="cta-heading" className="rounded-3xl border border-zinc-200 bg-zinc-900 p-10 text-white shadow-lg">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <h2 id="cta-heading" className="text-3xl font-semibold">
                Ready to turn transcripts into demand?
              </h2>
              <p className="text-lg text-zinc-200">
                Launch your first project in minutes. Import a transcript, review AI drafts, and publish to LinkedIn before the next call hits your calendar.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" variant="secondary" className="h-12 px-6 text-base text-zinc-900">
                <Link to={primaryCtaHref} className="flex items-center gap-2">
                  {isAuthenticated ? 'Go to projects' : 'Start free trial'}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 border-white px-6 text-base text-white">
                <a href="mailto:hello@contentprojects.com">Talk with sales</a>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-zinc-200 bg-zinc-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Content Projects. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/login" className="hover:text-zinc-700">
              Log in
            </Link>
            <Link to="/register" className="hover:text-zinc-700">
              Create account
            </Link>
            <a href="mailto:hello@contentprojects.com" className="hover:text-zinc-700">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
