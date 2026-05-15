import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Miomika",
  description: "Voice AI companion for Thai creators",
  icons: {
    icon: "/favicon.ico",
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
      className={`${geistSans.variable} ${geistMono.variable} h-[100dvh] max-h-[100dvh] overflow-hidden bg-white antialiased md:h-auto md:max-h-none md:overflow-visible md:min-h-screen`}
    >
      <body className="h-[100dvh] max-h-[100dvh] overflow-hidden bg-white text-[var(--miomika-foreground)] md:h-auto md:max-h-none md:min-h-screen md:overflow-visible">
        <div className="relative h-[100dvh] max-h-[100dvh] min-h-0 w-full overflow-hidden bg-white md:h-auto md:max-h-none md:min-h-screen md:overflow-visible">
          {children}
        </div>
      </body>
    </html>
  );
}
