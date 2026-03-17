import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { OrganizationSchema, WebSiteSchema } from "@/components/seo/StructuredData";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { GoogleAds } from "@/components/analytics/GoogleAds";

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

export const metadata: Metadata = {
  title: {
    default: "TaxFormatter - Crypto Taxes, Simplified",
    template: "%s | TaxFormatter",
  },
  description: "Fix broken crypto CSV files in 30 seconds with AI-powered repair. Clean, format, and export to any tax platform including TurboTax, Koinly, CoinLedger & ZenLedger. No manual editing required.",
  keywords: ["crypto tax", "CSV repair", "tax software", "cryptocurrency", "tax filing", "TurboTax", "tax platform", "crypto accounting", "tax formatter"],
  authors: [{ name: "TaxFormatter" }],
  creator: "TaxFormatter",
  publisher: "TaxFormatter",
  metadataBase: new URL("https://taxformatter.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://taxformatter.com",
    title: "TaxFormatter - AI-Powered Crypto Tax CSV Repair in 30 Seconds",
    description: "Fix broken crypto CSV files in 30 seconds with AI-powered repair. Clean, format, and export to any tax platform including TurboTax, Koinly, CoinLedger & ZenLedger. No manual editing required.",
    siteName: "TaxFormatter",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TaxFormatter - Crypto Tax CSV Repair Tool",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TaxFormatter - AI-Powered Crypto Tax CSV Repair in 30 Seconds",
    description: "Fix broken crypto CSV files in 30 seconds with AI-powered repair. Clean, format, and export to any tax platform including TurboTax, Koinly, CoinLedger & ZenLedger.",
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
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a365d" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
      <head>
        <OrganizationSchema />
        <WebSiteSchema />
      </head>
      <body className="antialiased">
        <GoogleAnalytics />
        <GoogleAds />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}