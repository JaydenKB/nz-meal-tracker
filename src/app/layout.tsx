import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { BottomNav } from "@/components/layout/bottom-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NZ Meal Tracker",
  description: "Track calories, recipes, and shopping lists for Auckland meals",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Meal Tracker",
  },
};

export const viewport: Viewport = {
  themeColor: "#13664f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-white text-[var(--foreground)]">
        <div className="mx-auto min-h-full max-w-[430px] bg-white shadow-none">
          <main className="min-h-screen px-5 pb-28 pt-6">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
