import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { OrganizationSchema, WebSiteSchema } from "@/components/seo/StructuredData";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { GoogleAds } from "@/components/analytics/GoogleAds";
import { BANK_SOURCES } from "@/lib/bank-registry";
import { EXCHANGE_COUNT } from "@/lib/exchange-registry";

// Optimized font loading with next/font
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

// Counts come from the source registries so the meta description can never overstate support.
const SITE_DESCRIPTION = `Parse any crypto exchange CSV or bank statement PDF via REST API. ${EXCHANGE_COUNT} exchanges, ${BANK_SOURCES.length} banks, 4 tax formats. One API call. MCP server for AI agents.`;

export const metadata: Metadata = {
  title: {
    default: "TaxFormatter — Crypto CSV Parsing API & MCP Server",
    template: "%s | TaxFormatter",
  },
  description: SITE_DESCRIPTION,
  keywords: ["crypto API", "CSV parsing API", "MCP server", "crypto tax API", "exchange parser", "bank statement API", "TurboTax API", "Koinly API", "fintech API", "AI agent tools"],
  authors: [{ name: "TaxFormatter" }],
  creator: "TaxFormatter",
  publisher: "TaxFormatter",
  metadataBase: new URL("https://www.taxformatter.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.taxformatter.com",
    title: "TaxFormatter — Crypto CSV Parsing API & MCP Server",
    description: SITE_DESCRIPTION,
    siteName: "TaxFormatter",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TaxFormatter API — Parse any crypto CSV instantly",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TaxFormatter — Crypto CSV Parsing API & MCP Server",
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
    creator: "@taxformatter",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
      <head>
        <OrganizationSchema />
        <WebSiteSchema />
      </head>
      <body className="antialiased">
        <GoogleAnalytics />
        <GoogleAds />
        {children}
      </body>
    </html>
  );
}