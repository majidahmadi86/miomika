import type { Metadata, Viewport } from "next";
import { Kanit, Quicksand, Sarabun } from "next/font/google";
import { PwaUpdateManager } from "@/components/pwa/PwaUpdateManager";
import { getBuildId } from "@/lib/pwa/build-id";
import "./globals.css";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-kanit",
  display: "swap",
});

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-quicksand",
  display: "swap",
});

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sarabun",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Miomika · Learn languages with Miomi, your AI companion",
  description:
    "A friend who remembers you. Learn Thai and English with Miomi, an AI companion that grows with you. เพื่อนที่จำคุณได้และโตไปพร้อมกับคุณ",
  keywords: [
    "learn Thai",
    "learn English",
    "AI language tutor",
    "Thai for tourists",
    "English for Thai",
    "AI companion",
  ],
  authors: [{ name: "Mikaro Studio" }],
  metadataBase: new URL("https://miomika.com"),
  alternates: { canonical: "https://miomika.com" },
  manifest: "/manifest.json",

  openGraph: {
    title: "Miomika · A friend who remembers you",
    description:
      "Learn Thai and English with Miomi, your AI companion. เพื่อนที่จำคุณได้",
    url: "https://miomika.com",
    siteName: "Miomika",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Miomi · your AI companion",
      },
    ],
    locale: "th_TH",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Miomika · A friend who remembers you",
    description:
      "Learn Thai and English with Miomi, your AI companion.",
    images: ["/twitter-card.png"],
    creator: "@miomika",
  },

  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/manifest-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/manifest-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon-32.png",
    other: [{ rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#C9A96E" }],
  },

  other: {
    "cache-control": "no-cache",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const buildId = getBuildId();

  return (
    <html
      lang="th"
      suppressHydrationWarning
      className={`${kanit.variable} ${quicksand.variable} ${sarabun.variable} overflow-hidden bg-[var(--mk-canvas)] antialiased md:h-auto md:max-h-none md:overflow-visible md:min-h-screen`}
    >
      <head>
        <link rel="icon" type="image/png" href="/manifest-icon-512.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("miomika-theme");if(t!=="cool"&&t!=="blush"&&t!=="dark"&&t!=="warm")t="warm";document.documentElement.dataset.theme=t;}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${kanit.variable} ${quicksand.variable} ${sarabun.variable} overflow-hidden bg-[var(--mk-canvas)] text-[var(--mk-ink)] md:h-auto md:max-h-none md:min-h-screen md:overflow-visible`}>
        <div className="relative miomika-app-height min-h-0 w-full overflow-hidden bg-[var(--mk-canvas)] md:h-auto md:max-h-none md:min-h-screen md:overflow-visible">
          {children}
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__MIOMIKA_BUILD_ID__=${JSON.stringify(buildId)};`,
          }}
        />
        <PwaUpdateManager />
      </body>
    </html>
  );
}
