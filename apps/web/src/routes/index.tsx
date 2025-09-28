import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2, Sparkles, Workflow, ShieldCheck, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/auth/AuthContext'

const differentiators = [
  {
    title: 'Fractional-ready cockpit',
    description:
      'Keep every portfolio company and advisory client on one board that surfaces what needs your executive voice next.',
    icon: Workflow,
  },
  {
    title: 'AI tuned for executive POV',
    description:
      'Our engine writes from the perspective you bring to the boardroom, pulling sharp hooks and takeaways straight from your calls.',
    icon: Sparkles,
  },
  {
    title: 'Guardrails for brand-critical posts',
    description:
      'Retain human control over every draft. Approve, delegate, or schedule only when the narrative matches your mandate.',
    icon: ShieldCheck,
  },
]

const processSteps = [
  {
    title: 'Drop in a board update or founder briefing',
    detail: 'Upload transcripts, Loom links, or your chief of staff’s notes. We auto-structure context around the initiative you led.',
  },
  {
    title: 'Review drafts built for executive-level storytelling',
    detail: 'Scan 5–10 posts that translate your guidance into strategic narratives. Mark what ships, what needs polish, and what to delegate.',
  },
  {
    title: 'Publish without blocking your calendar',
    detail: 'Push directly to LinkedIn or line up a month of thought leadership while you stay embedded with clients.',
  },
]

const stats = [
  {
    label: 'Executive hours reclaimed each month',
    value: '18+',
    explanation: 'Hand off post-production while keeping your strategic fingerprints on every message.',
  },
  {
    label: 'LinkedIn posts per engagement',
    value: '5–10 drafts',
    explanation: 'Turn one advisory call into a full campaign your network recognizes as distinctly yours.',
  },
  {
    label: 'Fractional leaders onboarded',
    value: '70+',
    explanation: 'CMOs, CROs, and COOs who treat LinkedIn as their portfolio-wide town hall.',
  },
]

const faqs = [
  {
    question: 'How does the platform create LinkedIn posts?',
    answer:
      'We analyze your transcript to extract the strongest insights, then craft platform-aware drafts with hooks, context, and calls to action. Every post reflects the executive priorities you set.',
  },
  {
    question: 'Do I need to manage multiple tools?',
    answer:
      'No. Projects, drafts, approvals, and publishing all live in one project-centric view. Built-in status cues make it easy to see what needs your signature versus what your chief of staff can ship.',
  },
  {
    question: 'What happens after I approve a post?',
    answer:
      'Approved posts move into a ready state for instant publishing. LinkedIn OAuth is built in so your team can push live the moment you sign off.',
  },
  {
    question: 'Can my team collaborate?',
    answer:
      'Absolutely. Loop in marketing partners, portfolio operators, or ghostwriters so everyone stays aligned on status, next steps, and brand guardrails.',
  },
]

const socialProof = [
  'Fractional CMOs',
  'Fractional CROs',
  'Portfolio Operations Leads',
  'Chiefs of Staff',
  'Advisory Collectives',
]

export const Route = createFileRoute('/')({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: 'Content Projects | Fractional executives on LinkedIn, without the grind' },
      {
        name: 'description',
        content:
          'Content Projects helps fractional executives turn transcripts and briefings into polished LinkedIn posts. Stay visible across every portfolio without rewriting the same story twice.',
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
              Built for fractional executives
            </Badge>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-5xl">
              Own LinkedIn without owning the calendar.
            </h1>
            <p className="text-lg text-zinc-600">
              Content Projects gives fractional executives a project-centric workflow that transforms board updates, portfolio wins, and advisory calls into ready-to-publish LinkedIn posts—without late-night writing sprints.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 px-6 text-base">
                <Link to={primaryCtaHref} className="flex items-center gap-2">
                  {isAuthenticated ? 'Go to projects' : 'Start leading on LinkedIn'}
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
                Your executive voice stays in every draft
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Delegate reviews without another toolchain
              </div>
            </div>
          </div>
          <div className="relative isolate overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 p-8 shadow-sm">
            <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-blue-100 opacity-70 blur-3xl" />
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-500">Active engagement</p>
                  <p className="text-xl font-semibold text-zinc-900">Portfolio sync · Series B fintech</p>
                </div>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                  Ready
                </Badge>
              </div>
              <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-zinc-500">LinkedIn draft</p>
                <p className="mt-2 text-base font-medium text-zinc-900">
                  “Fractional doesn’t mean part-time influence. Here’s how we turned a board fire drill into a customer story our network couldn’t stop sharing.”
                </p>
                <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
                  <span>Character count: 1,182</span>
                  <span>Stage: Drafts → Exec review</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Briefing processed via SSE · 3 mins ago</span>
                <span>4 drafts awaiting your green light</span>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="social-proof-heading" className="space-y-6">
          <div className="flex items-center gap-3 text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            <Users className="h-4 w-4" aria-hidden="true" />
            <span id="social-proof-heading">Trusted by fractional leaders</span>
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
              Replace disconnected tools with a workflow that keeps you visible while you operate.
            </h2>
            <p className="text-lg text-zinc-600">
              Content Projects removes the manual labor of turning calls into content so you can focus on steering portfolio strategy, not polishing posts.
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
              Ship LinkedIn content without breaking stride.
            </h2>
            <p className="text-lg text-zinc-600">
              Guided stages keep every engagement moving—from first briefing to scheduled post—with clarity on who owns the next action.
            </p>
            <Button asChild size="lg" className="h-12 w-fit px-6 text-base">
              <Link to={primaryCtaHref}>See it in action</Link>
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
              Fractional executives convert conversations into influence faster.
            </h2>
            <p className="text-lg text-zinc-600">
              See the compound impact when each strategic call fuels LinkedIn content that keeps every stakeholder looped in.
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
              “We translate portfolio wins into LinkedIn narratives before the next standup even starts.”
            </h2>
            <p className="text-lg text-zinc-700">
              “Before Content Projects I was copying field notes into docs on Friday nights. Now I forward a briefing, review aligned drafts in minutes, and my network sees the signal the same day. It’s the operating system that keeps every portfolio company aligned with my executive narrative.”
            </p>
            <div className="text-sm font-medium text-zinc-600">
              — Priya Raman, Fractional CMO at Signal North Collective
            </div>
          </div>
        </section>

        <section aria-labelledby="faq-heading" className="space-y-10">
          <div className="max-w-3xl space-y-4">
            <h2 id="faq-heading" className="text-3xl font-semibold text-zinc-900">
              Frequently asked questions
            </h2>
            <p className="text-lg text-zinc-600">
              Everything you need to know before turning your advisory calls into a consistent executive presence.
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
                Ready to ship LinkedIn thought leadership on autopilot?
              </h2>
              <p className="text-lg text-zinc-200">
                Launch your first project in minutes. Import a briefing, review AI drafts, and publish to LinkedIn before the next board packet lands.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" variant="secondary" className="h-12 px-6 text-base text-zinc-900">
                <Link to={primaryCtaHref} className="flex items-center gap-2">
                  {isAuthenticated ? 'Go to projects' : 'Start as a fractional leader'}
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
