import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/brand";
import { SignInForm } from "@/components/staff/sign-in-form";
import { dict, isLang } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/staff/login">): Promise<Metadata> {
  const { lang } = await params;
  return isLang(lang) ? { title: dict(lang).login.title, robots: { index: false } } : {};
}

export default async function LoginPage({ params, searchParams }: PageProps<"/[lang]/staff/login">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = dict(lang);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <Link href={`/${lang}`} className="self-start" aria-label={t.brand}>
        <Logo lang={lang} />
      </Link>
      <div className="mt-8 rounded-[20px] border border-rule bg-paper p-6 shadow-[0_20px_50px_-30px_rgb(20_30_25/0.35)] sm:p-8">
        <h1 className="text-[24px] font-semibold">{t.login.title}</h1>
        <p className="mt-1.5 text-[15px] text-ink-2">{t.login.sub}</p>
        <Suspense>
          <PairNotice searchParams={searchParams} lang={lang} />
        </Suspense>
        <SignInForm lang={lang} />
      </div>
      <Link href={`/${lang}`} className="mt-6 self-center text-[14.5px] text-zaatar underline-offset-4 hover:underline">
        {t.login.demo}
      </Link>
    </main>
  );
}

async function PairNotice({ searchParams, lang }: { searchParams: Promise<Record<string, string | string[] | undefined>>; lang: "ar" | "en" }) {
  const sp = await searchParams;
  if (sp.pair !== "failed") return null;
  return <p className="mt-4 rounded-[12px] bg-saffron-soft px-3.5 py-2.5 text-[14px] text-[#7a5410]">{dict(lang).login.pairFailed}</p>;
}
