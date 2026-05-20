import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Kanit, Quicksand } from "next/font/google";
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

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Miomika",
  description: "Voice AI companion for Thai creators",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/miomi/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/miomi/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/miomi/icon-512.png",
    shortcut: "/miomi/icon-192.png",
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
  return (
    <html
      lang="th"
      className={`${kanit.variable} ${quicksand.variable} ${geistSans.variable} ${geistMono.variable} overflow-hidden bg-white antialiased md:h-auto md:max-h-none md:overflow-visible md:min-h-screen`}
    >
      <head>
        <link rel="icon" type="image/png" href="/miomi/icon-512.png" />
      </head>
      <body className="overflow-hidden bg-white text-[var(--miomika-foreground)] md:h-auto md:max-h-none md:min-h-screen md:overflow-visible">
        <div className="relative miomika-app-height min-h-0 w-full overflow-hidden bg-white md:h-auto md:max-h-none md:min-h-screen md:overflow-visible">
          {children}
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
if('serviceWorker' in navigator){
  window.addEventListener('load',function(){
    navigator.serviceWorker.register('/sw.js')
  })
}
`,
          }}
        />
      </body>
    </html>
  );
}
