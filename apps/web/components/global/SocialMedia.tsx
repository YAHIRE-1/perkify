import React from "react";

type Social = {
  name: string;
  handle: string;
  href: string;
  accent: string;
  icon: React.ReactNode;
};

const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "currentColor",
};

const TelegramIcon = () => (
  <svg {...iconProps}>
    <path d="M21.05 3.16 2.7 10.53c-1.26.52-1.25 1.24-.23 1.55l4.7 1.47 1.82 5.6c.22.6.38.84.78.84.38 0 .55-.17.76-.37l1.83-1.78 4.78 3.53c.88.49 1.51.24 1.73-.82L23.97 4.5c.3-1.3-.5-1.88-1.92-1.34ZM8.98 13.87l-1.15-3.79 9.38-5.9c.44-.27.85-.12.52.18L8.98 13.87Z"/>
  </svg>
);

const XIcon = () => (
  <svg {...iconProps}>
    <path d="M13.6 10.6 20.9 2h-1.9l-6.3 7.5L7.6 2H2l7.6 11-7.6 8.9h1.9l6.7-7.9L16.4 22H22l-8.4-11.4Zm-2.4 2.8-.8-1.1L4.3 3.5h2.5l5 6.9.8 1.1 6.7 9.1h-2.5l-5.6-7.2Z"/>
  </svg>
);

const DiscordIcon = () => (
  <svg {...iconProps}>
    <path d="M20.3 5.3A18 18 0 0 0 15.7 4l-.3.6a15 15 0 0 1 4 1.5 15.8 15.8 0 0 0-14.8 0 15 15 0 0 1 4.1-1.5L8.4 4a18 18 0 0 0-4.6 1.4C1.3 9 .6 12.6.9 16.1a18.2 18.2 0 0 0 5.4 2.7l.9-1.5a11.7 11.7 0 0 1-1.9-.9l.5-.4a13 13 0 0 0 11 0l.5.4c-.6.4-1.2.6-1.9.9l.9 1.5a18 18 0 0 0 5.4-2.7c.4-4.2-.7-7.8-2.4-10.8ZM8.7 14.1c-.8 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7 1.5.8 1.5 1.7-.6 1.7-1.5 1.7Zm6.6 0c-.8 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7 1.5.8 1.5 1.7-.6 1.7-1.5 1.7Z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg {...iconProps}>
    <path d="M13.5 21v-7.6h2.6l.4-3H13.5V8.4c0-.9.3-1.5 1.6-1.5h1.7V4.2A22 22 0 0 0 14.4 4c-2.4 0-4 1.4-4 4v2.4H7.8v3h2.6V21h3.1Z"/>
  </svg>
);

const socials: Social[] = [
  {
    name: "Telegram",
    handle: "@perkifylat",
    href: "https://t.me/+VAsVqAiwNmU2NDNh",
    accent: "#00E6C3",
    icon: <TelegramIcon />,
  },
  {
    name: "X",
    handle: "@perkifylat",
    href: "https://x.com/perkifylat",
    accent: "#FFFFFF",
    icon: <XIcon />,
  }
];

const SocialSection: React.FC = () => {
  return (
    <section className="w-full px-5 py-14 flex gap-6 items-center justify-center sm:px-8 sm:py-20">
      <div className="mx-auto flex max-w-xl gap-6 flex-col items-center text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Follow us wherever we are
        </h2>
        <p className="mt-2 text-sm text-[#8FA396]">
          Choose your favorite channel and join the community
        </p>

        <ul className="mt-9 grid w-full grid-cols-1 gap-10 sm:mt-12 sm:grid-cols-2">
          {socials.map((s) => (
            <li key={s.name}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center gap-4 rounded-[14px] border border-[#1E2A22] bg-[#111C16] px-5 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-(--accent) hover:shadow-[0_10px_28px_-14px_var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)"
                style={{ ["--accent" as string]: s.accent }}
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#0B0F0D] shadow-[0_0_0_1px_rgba(255,255,255,0.08)] transition-transform duration-200 group-hover:scale-105"
                  style={{ backgroundColor: s.accent }}
                >
                  {s.icon}
                </span>

                <span className="flex min-w-0 flex-col">
                  <span className="text-[15px] font-medium text-white">
                    {s.name}
                  </span>
                  <span className="truncate text-sm text-[#8FA396]">
                    {s.handle}
                  </span>
                </span>

                <span
                  className="ml-auto shrink-0 text-[#5D6E63] transition-colors duration-200 group-hover:text-(--accent)"
                  aria-hidden="true"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17 17 7" />
                    <path d="M7 7h10v10" />
                  </svg>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default SocialSection;