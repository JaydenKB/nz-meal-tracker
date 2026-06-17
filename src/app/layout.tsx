import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MainShell } from "@/components/layout/main-shell";
import { LaunchSplash } from "@/components/shell/launch-splash";
import { SfxInit } from "@/components/sfx/sfx-init";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { SW_RECOVERY_SCRIPT } from "@/lib/pwa/sw-recovery-script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NZ Meal Tracker",
  description: "Track calories, recipes, and shopping lists for Auckland meals",
  applicationName: "NZ Meal Tracker",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Meals",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0F6E56",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        <script dangerouslySetInnerHTML={{ __html: SW_RECOVERY_SCRIPT }} />
        <ServiceWorkerRegister />
        <SfxInit />
        <LaunchSplash />
        <div className="relative mx-auto min-h-full max-w-[430px] bg-transparent shadow-none">
          <MainShell>{children}</MainShell>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
