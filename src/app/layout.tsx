import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/site-header";
import { getCurrentPlayer } from "@/lib/session";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sports Fans League",
  description: "Make picks, view picks and follow the standings.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const player = await getCurrentPlayer();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Wrapper, not <body>: the unlayered body rule in globals.css overrides utilities on body. */}
        <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-black font-sans">
          <SiteHeader player={player} />
          {children}
        </div>
      </body>
    </html>
  );
}
