"use client";

import { useEffect, useState } from "react";

interface ComingSoonProps {
  tokenName?: string;
  network?: string;
  contractAddress?: string;
  explorerBaseUrl?: string;
}

export default function ContractSection({
  tokenName = "Perkify",
  network = "Ethereum",
  contractAddress = "0x07B1ba3a777602264294e66635B4B1605a594693",
  explorerBaseUrl = "https://www.ponsfamily.com/launchpad/",
}: ComingSoonProps) {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const animation = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(animation);
  }, []);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(contractAddress);
      setCopied(true);

      setTimeout(() => setCopied(false), 2000);
    } catch {
    }
  };

  const animation = mounted
    ? "translate-y-0 opacity-100"
    : "translate-y-3 opacity-0";

  return (
    <section
      id="contract"
      className="relative flex min-h-160 items-center justify-center overflow-hidden px-6 py-28 text-[#EDE7FA]"
    >
      {/* Background */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-16 h-105 w-105 rounded-full bg-[#7C3AED] opacity-[0.14] blur-[140px]"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-0 h-90 w-90 rounded-full bg-[#C084FC] opacity-[0.10] blur-[130px]"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,#0F0A18_100%)]"
      />

      
      {/* Content */}
      <div className="flex flex-col items-center gap-3 text-center">

        {/* Network */}
        <div
          className={`flex items-center gap-2 text-sm text-[#9686B8] transition-all duration-700 ease-out motion-reduce:transition-none ${animation}`}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute h-full w-full animate-ping rounded-full bg-[#C084FC] opacity-60 motion-reduce:animate-none" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-[#C084FC]" />
          </span>

          <span>{network}</span>
        </div>

        {/* Title */}
        <h2
          className={`mt-6 text-[2.75rem] font-medium leading-[1.05] tracking-tight text-[#F7F3FF] transition-all delay-100 duration-700 ease-out sm:text-6xl motion-reduce:transition-none ${animation}`}
        >
          {tokenName} is here
        </h2>

        {/* Description */}
        <p
          className={`mt-5 max-w-sm text-balance text-[15px] leading-relaxed text-[#9686B8] transition-all delay-150 duration-700 ease-out sm:text-base motion-reduce:transition-none ${animation}`}
        >
          The contract is live on {network}. Verify the address below before
          you interact with it.
        </p>

        <p className="mb-2 text-left text-white font-bold">
            Contract address :
        </p>

        {/* Contract */}


          <div className="flex flex-col w-lg h-32 gap-6 rounded-2xl border border-[#3A2E52] bg-[#1A1428] transition-colors hover:border-[#4C3A6E] focus-within:border-[#7C3AED]">
            
            <span
              title={contractAddress}
              className="select-all break-all self-center pt-7 font-mono sm:text-sm text-[#EDE7FA] text-[11px] flex"
            >
              {contractAddress}
            </span>

            <button
              type="button"
              onClick={copyAddress}
              aria-label={copied ? "Address copied" : "Copy contract address"}
              className="shrink-0 self-center rounded-full border border-[#3A2E52] bg-[#241C36] px-4 py-1 font-mono text-xs text-[#C084FC] transition-colors hover:border-[#7C3AED] hover:text-[#F7F3FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {/* Explorer */}
          <a
            href={`${explorerBaseUrl}/${contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className=" inline-block pt-4 text-xs text-[#9686B8] underline decoration-[#3A2E52] underline-offset-4 transition-colors hover:text-[#C084FC] hover:decoration-[#7C3AED]"
          >
            View on block explorer
          </a>
      </div>
      
    </section>
  );
}