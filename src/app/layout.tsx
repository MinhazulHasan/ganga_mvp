import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter/opsz.css";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource-variable/noto-sans-devanagari";
import "./globals.css";
import { Providers } from "@/components/layout/providers";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { FixedBackdrop } from "@/components/layout/fixed-backdrop";
import { HimalayaBackdrop } from "@/components/brand/himalaya-backdrop";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: {
    default: "GANGA — Glacial-flood early warning · Team PASS, APIE Camp #11",
    template: "%s · GANGA",
  },
  description: site.tagline,
  applicationName: "GANGA",
  authors: [{ name: "Team PASS" }],
  keywords: ["GLOF", "flood early warning", "Nepal", "LoRa", "MQTT", "CAP 1.2", "APIE", "SOI Asia"],
  openGraph: {
    title: "GANGA — Glacial-flood early warning",
    description: site.tagline,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfd" },
    { media: "(prefers-color-scheme: dark)", color: "#21222c" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full" data-scroll-behavior="smooth">
      <body className="flex min-h-full flex-col">
        {/* the Himalaya, fixed to the window behind every page */}
        <FixedBackdrop>
          <HimalayaBackdrop className="absolute inset-x-0 bottom-0 h-[55%] w-full sm:h-[70%] lg:h-full" />
        </FixedBackdrop>
        <Providers>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-[10px] focus:bg-surface focus:px-4 focus:py-2 focus:shadow-float"
          >
            Skip to content
          </a>
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
