import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

// Body / UI — neutral, highly legible at small sizes.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Display / headings — warm, slightly editorial, anchors the boutique tone.
// Variable axes are narrowed to what we actually use to keep the payload small.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz", "SOFT"],
});

export const metadata: Metadata = {
  title: "Songbird Terrace · Liability Release",
  description: "Secure Digital Signing for Songbird Terrace",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#2C1810",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
