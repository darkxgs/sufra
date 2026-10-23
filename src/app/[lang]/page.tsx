import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand";
import { DemoButton } from "@/components/landing/demo-button";
import { FloorMock, KitchenMock, PhoneMock } from "@/components/landing/mocks";
import { TicketRail } from "@/components/landing/ticket-rail";
import { LangLink } from "@/components/lang-link";
import { Photo } from "@/components/photo";
import { buttonClass, cn } from "@/components/ui";
import { dict, isLang, otherLang } from "@/lib/i18n";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = dict(lang);
  const other = otherLang(lang);
  const mocks = [<PhoneMock key="p" lang={lang} />, <KitchenMock key="k" lang={lang} />, <FloorMock key="f" lang={lang} />];

  return (
    <div className="min-h-dvh bg-desk">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link href={`/${lang}`} aria-label={t.brand}>
          <Logo lang={lang} />
        </Link>
        <nav className="flex items-center gap-1">
          <Link href={`/${lang}/staff/login`} className="rounded-control px-3 py-1.5 text-[14px] text-ink-2 transition-colors hover:bg-rule-2 hover:text-ink">
            {t.login.title}
          </Link>
          <LangLink to={other} href={`/${other}`} label={t.language} />
        </nav>
      </header>

      <main>
        {/* Hero: the claim on one side, the kitchen rail filling up on the other. */}
        <section className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-10 px-5 pt-6 pb-16 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:pt-14 lg:pb-24">
          <div>
            <h1 className={cn("max-w-[15ch] font-semibold tracking-[-0.025em] text-ink", lang === "ar" ? "text-[38px] leading-[1.35] sm:text-[50px]" : "text-[40px] leading-[1.06] sm:text-[56px]")}>
              {t.landing.title}
            </h1>
            <p className="mt-5 max-w-[56ch] text-[17px] leading-relaxed text-ink-2">{t.landing.sub}</p>
            <div className="mt-8 flex flex-wrap items-start gap-3">
              <DemoButton lang={lang} />
              <Link href={`/${lang}/m/jamr`} className={buttonClass("outline", "lg", "h-13 rounded-[14px] px-6 text-[16px]")}>
                {t.landing.menu}
              </Link>
            </div>
            <p className="mt-4 max-w-[52ch] text-[14px] leading-relaxed text-muted">{t.landing.demoNote}</p>
          </div>
          <TicketRail lang={lang} label={t.landing.railLabel} />
        </section>

        {/* The sequence an order actually follows. */}
        <section className="border-y border-rule bg-paper">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
            <h2 className="text-[28px] font-semibold tracking-[-0.015em] sm:text-[34px]">{t.landing.flowTitle}</h2>
            <ol className="mt-10 grid gap-12 lg:grid-cols-3 lg:gap-8">
              {t.landing.flow.map((step, i) => (
                <li key={step.title} className="flex flex-col">
                  <div className="flex items-end justify-center lg:min-h-[380px]">{mocks[i]}</div>
                  <div className="mt-8 flex items-baseline gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-zaatar text-[15px] font-semibold text-white tnum">{i + 1}</span>
                    <h3 className="text-[19px] font-semibold">{step.title}</h3>
                  </div>
                  <p className="mt-2 ps-11 text-[15.5px] leading-relaxed text-ink-2">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <h2 className="text-[28px] font-semibold tracking-[-0.015em] sm:text-[34px]">{t.landing.localTitle}</h2>
            <ul className="mt-7 grid gap-4">
              {t.landing.local.map((line) => (
                <li key={line} className="flex gap-3 text-[16.5px] leading-relaxed text-ink-2">
                  <span className="mt-[0.7em] h-[2px] w-4 shrink-0 bg-zaatar" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <figure>
            <Photo slug="cover" cover alt={lang === "ar" ? "سفرة من أطباق مطعم جمر" : "A spread of Jamr's dishes"} sizes="(max-width: 1024px) 100vw, 560px" className="aspect-[3/2] w-full rounded-[22px]" />
            <figcaption className="mt-3 text-[13px] text-muted">{t.footer.fictional}</figcaption>
          </figure>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
          <div className="flex flex-col items-start justify-between gap-6 rounded-[22px] bg-zaatar-deep px-6 py-8 text-white sm:flex-row sm:items-center sm:px-10">
            <div>
              <h2 className="text-[22px] font-semibold">{t.landing.helpTitle}</h2>
              <p className="mt-1.5 max-w-[60ch] text-[15.5px] leading-relaxed text-white/80">{t.landing.helpBody}</p>
            </div>
            <a href="https://seifashraf.dev/contact" className={buttonClass("outline", "lg", "h-12 rounded-[12px] border-white/0 bg-white text-zaatar-deep hover:bg-white/90")}>
              {t.landing.helpCta}
            </a>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-rule px-5 py-8 text-[13.5px] text-muted sm:px-8">
        <p>
          {t.footer.by}{" "}
          <a href="https://seifashraf.dev" className="text-ink underline decoration-rule underline-offset-4 hover:decoration-ink">
            {lang === "ar" ? "سيف أشرف" : "Seif Ashraf"}
          </a>
        </p>
        <a href="https://github.com/darkxgs/sufra" className="hover:text-ink">
          {t.footer.source}
        </a>
      </footer>
    </div>
  );
}
