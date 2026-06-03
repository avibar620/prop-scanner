import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Prop-Scanner — Ondergewaardeerd Belgisch vastgoed",
  description:
    "Vind ondergewaardeerd vastgoed in België — scant 10 grote sites, scoort elke deal met AI.",
  manifest: "/manifest.json",
  applicationName: "Prop-Scanner",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Prop-Scanner",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
  formatDetection: {
    telephone: false,
  },
};

// Next 15+ requires viewport / themeColor in a separate export.
export const viewport: Viewport = {
  themeColor: "#C9A84C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg text-text-primary">
        <Providers>{children}</Providers>
        {/* Register the service worker on the client. afterInteractive so it
            doesn't block first paint. We guard on `serviceWorker` presence so
            it's a silent no-op in browsers that don't support PWAs. */}
        <Script id="register-sw" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) {
            window.addEventListener('load', function () {
              navigator.serviceWorker.register('/sw.js').catch(function () {});
            });
          }`}
        </Script>
      </body>
    </html>
  );
}
