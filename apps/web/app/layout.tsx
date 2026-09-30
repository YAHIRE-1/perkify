import type { Metadata } from "next";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { Space_Grotesk, JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";
import "./theme.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import { config as wagmiConfig } from "@/lib/wagmi";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Perkify",
  description:
    "The Web3 quest and rewards marketplace. Find a quest, take the action, submit proof, and get paid in crypto.",
  icons: {
    icon: "/images/PWaifu.png",
    shortcut: "/images/PWaifu.png",
    apple: "/images/PWaifu.png",
  },
  verification: {
    google: "b3HjENvKz0sQ4bcUl_pF86kstKoqW5-Y_GrFYehS-x4",
  },
};

// Aplica el tema guardado (o la preferencia del sistema) antes del primer paint,
// para que no haya parpadeo de oscuro -> claro (o viceversa) al cargar la página.
const themeInit = `try{var t=localStorage.getItem('prky_theme')||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialWagmiState = cookieToInitialState(
    wagmiConfig,
    (await headers()).get("cookie")
  );

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${inter.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body style={{ fontFamily: "var(--font-body), system-ui, sans-serif" }}>
        <Providers initialWagmiState={initialWagmiState}>
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}