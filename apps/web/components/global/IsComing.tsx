"use client";
import { useEffect, useState } from "react";

const DEFAULT_LAUNCH = "2026-11-06T15:00:00Z";

function getRemaining(target: string | number | Date) {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  const day = Math.floor(diff / 86400000);
  const hr = Math.floor((diff % 86400000) / 3600000);
  const min = Math.floor((diff % 3600000) / 60000);
  const sec = Math.floor((diff % 60000) / 1000);
  return { day, hr, min, sec, done: diff <= 0 };
}

interface ComingSoonProps {
  platformName?: string;
  tagline?: string;
  network?: string;
  launchDate?: string | number | Date;
}

export default function ComingSoonPlatformSection({
  platformName = "Perkify",
  tagline = "The rewards platform for your community",
  network = "Built on Robinhood Chain",
  launchDate = DEFAULT_LAUNCH,
}: ComingSoonProps) {
  const [time, setTime] = useState(() => getRemaining(launchDate));

  useEffect(() => {
    const id = setInterval(() => setTime(getRemaining(launchDate)), 1000);
    return () => clearInterval(id);
  }, [launchDate]);

  const units = [
    { value: time.day, label: "days" },
    { value: time.hr, label: "hours" },
    { value: time.min, label: "min" },
    { value: time.sec, label: "sec" },
  ];

  return (
    <section
      id="coming-soon"
      className="relative flex min-h-160 items-center justify-center overflow-hidden px-4 py-16 text-[#EDE7FA] sm:px-6 sm:py-28"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7C3AED] opacity-[0.16] blur-[120px] sm:h-130 sm:w-130 sm:blur-[150px]"
      />
      <div className="relative mx-auto flex w-full max-w-xl flex-col items-center gap-10 text-center sm:gap-16">
        <div className="flex items-center gap-2 text-xs text-[#9686B8] sm:text-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[#C084FC]" />
          <span>{network}</span>
        </div>

        <div className="flex flex-col items-center">
          <h2 className="mt-4 px-2 text-3xl font-medium leading-[1.1] tracking-tight text-[#F7F3FF] sm:mt-6 sm:text-[2.75rem] sm:leading-[1.05] lg:text-6xl">
            {platformName}
          </h2>
          <p className="mt-3 max-w-md px-2 text-sm text-[#B4A6D6] sm:mt-4 sm:text-base lg:text-lg">
            {tagline}
          </p>
          <p className="mt-2 text-xs text-[#7A6C9C] sm:text-sm">Coming soon</p>
        </div>

        <div className="mt-8 grid w-full grid-cols-4 gap-1 px-1 sm:mt-12 sm:flex sm:items-start sm:justify-center sm:gap-6 sm:p-6 lg:gap-10">
          {units.map((u, i) => (
            <div key={u.label} className="flex items-start justify-center gap-1 sm:gap-6 lg:gap-10">
              <div className="flex flex-col items-center">
                <span className="font-mono text-2xl font-medium tabular-nums text-[#F7F3FF] xs:text-3xl sm:text-5xl lg:text-6xl">
                  {String(u.value).padStart(2, "0")}
                </span>
                <span className="mt-1 text-[0.65rem] text-[#7A6C9C] sm:mt-2 sm:text-xs">
                  {u.label}
                </span>
              </div>
              {i < units.length - 1 && (
                <span className="mt-0.5 hidden select-none text-3xl text-[#3A2E52] sm:mt-1 sm:inline sm:text-4xl">
                  :
                </span>
              )}
            </div>
          ))}
        </div>

        {time.done && (
          <p className="mt-4 font-mono text-xs text-[#C084FC] sm:mt-6 sm:text-sm">
            We're live now.
          </p>
        )}
      </div>
    </section>
  );
}