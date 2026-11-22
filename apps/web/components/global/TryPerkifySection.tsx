import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Translate } from "@/lib/i18n/provider";

export default function TryPerkifySection() {
  return (
    <section className="section scroll-mt-24" id="try-perkify" aria-labelledby="try-perkify-title">
      <div className="wrap">
        <div className="grid overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] md:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col items-start justify-center px-6 py-10 sm:px-10 md:py-14 lg:px-14">
            <h2
              id="try-perkify-title"
              className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight lg:text-5xl"
            >
              <Translate text={"Try Perkify"} />
            </h2>
            <p className="mt-4 max-w-sm leading-relaxed text-[var(--muted)]">
              <Translate text={"Post or complete a quest on Ethereum Sepolia. The testing guide shows you how to set up your wallet, get test tokens, and get started."} />
            </p>
            <Link href="/how-to-test-perkify" className="btn-primary mt-7">
              <Translate text={"Read the testing guide"} />
              <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" />
            </Link>
          </div>
          <div className="relative aspect-[3/2] bg-[var(--surface-2)] md:aspect-auto md:min-h-80">
            <Image
              src="/images/try-perkify.webp"
              alt=""
              fill
              sizes="(min-width: 1152px) 600px, (min-width: 768px) 55vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
