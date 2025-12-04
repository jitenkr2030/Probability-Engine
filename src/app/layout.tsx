import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Probability Engine - AI-Powered Stock Predictions",
  description: "Advanced AI-powered stock prediction platform with real-time analytics and comprehensive trading tools.",
  keywords: ["AI", "Stock Prediction", "Trading", "Analytics", "Probability Engine"],
  authors: [{ name: "Probability Engine Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Probability Engine",
    description: "AI-powered stock prediction platform with real-time analytics",
    url: "https://probability-engine.com",
    siteName: "Probability Engine",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Probability Engine",
    description: "AI-powered stock prediction platform with real-time analytics",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
