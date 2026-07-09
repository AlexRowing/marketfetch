import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ChatWidget } from "@/components/chat/ChatWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MarketFetch",
  description:
    "AI buying agent for second-hand marketplaces — with persistent Buyer Memory and Price Memory.",
};

// Runs before paint: applies the saved theme (or the OS preference) so the
// first frame is already correct — no light-mode flash for dark-mode users.
const themeInit = `(function(){try{var t=localStorage.getItem("marketfetch.theme");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* beforeInteractive: runs before hydration, so the first painted
            frame already has the right theme — no light-mode flash. */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInit }}
        />
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
