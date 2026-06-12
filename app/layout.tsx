import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import Script from "next/script";
import { AsciiCloudBackground } from "@/components/ascii-background/ascii-cloud-background";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "ASCIILOGRAPH",
  description: "Telegram Mini App for text, image and video ASCII conversion.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#020403",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      <body className={geistMono.variable + " antialiased"}>
        <AsciiCloudBackground />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
