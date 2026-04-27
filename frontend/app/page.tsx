import Link from "next/link";
import BrandHomeLink from "../components/BrandHomeLink";

const workflowCards = [
  {
    title: "Structured intake",
    description:
      "Capture danger signs, vitals, transport realities, and clinician notes in a clear reviewable format.",
  },
  {
    title: "Facility comparison",
    description:
      "Compare likely destination facilities by capability and travel realities with visible reasoning.",
  },
  {
    title: "Referral packet review",
    description:
      "Review the handoff note, next steps, missing information, and verification reminders before sending.",
  },
];

const principles = [
  "Clinical support only",
  "Human review required",
  "Based on entered information",
];

const workflowSteps = [
  {
    step: "01",
    title: "Enter the case",
    description:
      "Record danger signs, vitals, transport realities, and clinician notes through structured intake.",
  },
  {
    step: "02",
    title: "Review support",
    description:
      "Compare likely facility options, review missing information, and inspect visible reasoning.",
  },
  {
    step: "03",
    title: "Finalize the packet",
    description:
      "Review the draft handoff note, complete referral-readiness actions, and approve the referral packet before sending.",
  },
];

const productReadinessNotes = [
  {
    title: "Purpose-built workflow",
    description:
      "Designed for maternal emergency referral-readiness and handoff support, not for generic healthcare chat.",
  },
  {
    title: "Grounded human review",
    description:
      "Outputs are meant to be reviewed, verified, and approved by clinicians before escalation.",
  },
  {
    title: "Scalable product direction",
    description:
      "Built around structured intake, facility comparison, referral packet review, and safer workflow support.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f3ed] text-[#1f1b16]">
      <header className="border-b border-[#e6ddd2] bg-[#fbfaf7]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <BrandHomeLink />

          <nav className="hidden items-center gap-3 md:flex">
            <a
              href="#workflow"
              className="rounded-2xl px-4 py-2 text-sm font-medium text-[#342d26] transition hover:bg-[#f3eee6]"
            >
              Workflow
            </a>
            <a
              href="#product"
              className="rounded-2xl px-4 py-2 text-sm font-medium text-[#342d26] transition hover:bg-[#f3eee6]"
            >
              Why it matters
            </a>
            <Link
              href="/new-case"
              className="rounded-2xl bg-[#1f1b16] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Start new case
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pt-7">
        <div className="rounded-[20px] border border-[#e4d8c8] bg-[#faf6ef] px-6 py-4 shadow-[0_6px_18px_rgba(31,27,22,0.025)]">
          <p className="text-[15px] font-medium leading-7 text-[#8b602b] sm:text-base">
            Clinical support only
            <span className="mx-3 text-[#c8a06a]">·</span>
            Not a diagnostic system
            <span className="mx-3 text-[#c8a06a]">·</span>
            Final referral decision remains with the clinician.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex rounded-full border border-[#ddd3c7] bg-[#fcfbf8] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#7c7368]">
              Smart healthcare · workflow support
            </p>

            <h1 className="text-5xl font-semibold leading-[0.96] tracking-tight text-[#1f1b16] sm:text-6xl">
              Maternal emergency referral-readiness and handoff support.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#5f564c]">
              Mamathemba helps frontline maternal-care workers prepare urgent
              referrals with more structure, clearer handoff communication, and
              stronger human review before escalation.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/new-case"
                className="rounded-2xl bg-[#1f1b16] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Start new case
              </Link>

              <a
                href="#workflow"
                className="rounded-2xl border border-[#d7cec1] bg-white px-6 py-3 text-sm font-medium text-[#342d26] transition hover:bg-[#f8f5ef]"
              >
                View workflow
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {principles.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[#d7e4e1] bg-[#eef5f4] px-3 py-1.5 text-xs font-semibold text-[#2f5e59]"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {workflowCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-[24px] border border-[#e6ddd2] bg-white p-4 shadow-[0_8px_30px_rgba(31,27,22,0.04)]"
                >
                  <p className="text-sm font-semibold text-[#1f1b16]">
                    {card.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#5f564c]">
                    {card.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="relative overflow-hidden rounded-[36px] border border-[#e6ddd2] bg-[#fbfaf7] shadow-[0_16px_50px_rgba(31,27,22,0.06)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_24%,rgba(95,141,137,0.10),transparent_30%),radial-gradient(circle_at_20%_75%,rgba(195,170,120,0.10),transparent_24%)]" />

              <div className="relative grid min-h-[620px] grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="flex flex-col justify-between p-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7c7368]">
                      Product focus
                    </p>

                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl border border-[#e6ddd2] bg-white/90 p-4">
                        <p className="text-sm font-semibold text-[#1f1b16]">
                          Case intake
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[#5f564c]">
                          Structured inputs for maternal referral-readiness
                          review.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-[#e6ddd2] bg-white/90 p-4">
                        <p className="text-sm font-semibold text-[#1f1b16]">
                          Facility comparison
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[#5f564c]">
                          Compare destination options with visible reasoning and
                          reviewable selection.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#d7e4e1] bg-[#eef5f4] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#567670]">
                      Human review moment
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#314a46]">
                      Review the referral packet, verify facility availability,
                      and approve before sending.
                    </p>
                  </div>
                </div>

                <div className="p-6 pt-0 lg:p-8">
                  <div className="mx-auto w-fit rounded-full border border-[#ddd3c7] bg-white px-5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c7368] shadow-[0_8px_22px_rgba(31,27,22,0.06)] sm:px-7">
                    Africa-centered care workflow
                  </div>

                  <div className="mt-4 relative flex min-h-[560px] w-full items-end justify-center overflow-hidden rounded-[28px] border border-[#e8ddcf] bg-[linear-gradient(180deg,#f7f3eb_0%,#f1ece3_100%)]">
                    <div className="absolute inset-x-0 bottom-0 h-[40%] bg-[radial-gradient(circle_at_center,rgba(95,141,137,0.12),transparent_62%)]" />

                    <img
                      src="/hero-mother.png"
                      alt="Pregnant African mother portrait"
                      className="pointer-events-none absolute bottom-0 left-[55%] z-10 h-[100%] w-auto max-w-none -translate-x-1/2 object-contain object-bottom"
                    />

                    <div className="absolute inset-0 rounded-[28px] ring-1 ring-inset ring-[#efe8dc]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-6 py-6">
        <div className="rounded-[32px] border border-[#e6ddd2] bg-white p-6 shadow-[0_8px_30px_rgba(31,27,22,0.04)] md:p-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7c7368]">
              Workflow
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#1f1b16]">
              A reviewable referral workflow, not a chatbot.
            </h2>
            <p className="mt-4 text-base leading-7 text-[#5f564c]">
              Mamathemba is designed as a clear clinician-facing flow: capture
              the case, review referral-readiness support, compare likely
              facilities, refine the handoff note, and approve the referral
              packet through human review.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {workflowSteps.map((item) => (
              <div
                key={item.step}
                className="rounded-[24px] border border-[#ece4d8] bg-[#fcfbf8] p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7c7368]">
                  {item.step}
                </p>
                <h3 className="mt-3 text-lg font-semibold text-[#1f1b16]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#5f564c]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="product" className="mx-auto max-w-7xl px-6 py-6 pb-14">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[32px] border border-[#e6ddd2] bg-white p-6 shadow-[0_8px_30px_rgba(31,27,22,0.04)] md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7c7368]">
              Why this matters
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#1f1b16]">
              Delay in maternal emergencies is often a workflow problem.
            </h2>
            <p className="mt-4 text-base leading-7 text-[#5f564c]">
              In rural and resource-constrained settings, frontline clinicians
              may recognize danger signs quickly, but still lose time because
              referral pathways are fragmented, facility capability is unclear,
              and handoff documentation is inconsistent. Mamathemba exists to
              reduce that workflow delay with more structure and clearer review.
            </p>

            <div className="mt-6 rounded-2xl border border-[#d7e4e1] bg-[#eef5f4] p-5">
              <p className="text-sm font-semibold text-[#314a46]">
                Strongest product truth
              </p>
              <p className="mt-2 text-sm leading-6 text-[#314a46]">
                Mamathemba is not a maternal chatbot. It is a referral workflow
                system for a specific high-stakes moment of care.
              </p>
            </div>
          </div>

          <div className="rounded-[32px] border border-[#e6ddd2] bg-white p-6 shadow-[0_8px_30px_rgba(31,27,22,0.04)] md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7c7368]">
              Product readiness
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#1f1b16]">
              Built as a credible workflow product for real review and escalation support.
            </h2>

            <div className="mt-5 space-y-4">
              {productReadinessNotes.map((note) => (
                <div
                  key={note.title}
                  className="rounded-2xl border border-[#ece4d8] bg-[#fcfbf8] p-4"
                >
                  <p className="text-sm font-semibold text-[#342d26]">
                    {note.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#5f564c]">
                    {note.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/new-case"
                className="rounded-2xl bg-[#1f1b16] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Open case intake
              </Link>
              <a
                href="#workflow"
                className="rounded-2xl border border-[#d7cec1] bg-white px-6 py-3 text-sm font-medium text-[#342d26] transition hover:bg-[#f8f5ef]"
              >
                Review workflow
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}