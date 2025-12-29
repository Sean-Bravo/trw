import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { OrganizationSchema, WebSiteSchema } from "@/components/seo/StructuredData";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";

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
  description: "Fix broken crypto CSV files in 30 seconds. Export to any tax platform. No manual editing required. Perfect for TurboTax, Koinly, CoinLedger & ZenLedger.",
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
    title: "TaxFormatter - Crypto Taxes, Simplified",
    description: "Fix broken crypto CSV files in 30 seconds. Export to TurboTax, Koinly, CoinLedger & ZenLedger.",
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
    title: "TaxFormatter - Crypto Taxes, Simplified",
    description: "Fix your crypto CSV files for any tax platform in 30 seconds.",
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
    shortcut: "/favicon-16x16.png",
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
        <GoogleAnalytics />
      </head>
      <body className="antialiased">
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