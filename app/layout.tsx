import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Miomika",
  description: "Voice AI companion for Thai creators",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-white min-[390px]:bg-[#F2EEF0] antialiased`}
    >
      <body className="min-h-screen bg-white text-[var(--miomika-foreground)] min-[390px]:bg-[#F2EEF0]">
        <div className="relative mx-auto min-h-screen w-full max-w-[390px] overflow-x-hidden bg-white min-[390px]:shadow-xl md:max-w-none md:shadow-none">
          {children}
        </div>
      </body>
    </html>
  );
}
