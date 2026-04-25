import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { getSiteUrl } from "@/lib/site";
import { validateEnvironment } from "@/lib/env";
import { PwaRegistration } from "@/components/PwaRegistration";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


// Validate environment variables at startup (development only)
if (process.env.NODE_ENV === 'development') {
  try {
    validateEnvironment()
  } catch (error) {
    console.error('Environment validation failed:', error)
  }
}

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  applicationName: "AEGIS POS",
  // Basic Metadata
  title: {
    default: "AEGIS POS - Your AGENTIC AI Bussines",
    template: "%s | AEGIS POS"
  },
  description: "AEGIS POS helps modern businesses run sales, inventory, customers, and operations in one agentic AI-powered workspace.",
  
  // Metadata Base
  metadataBase: new URL(siteUrl),
  
  // Keywords
  keywords: [
    "POS system",
    "cloud POS",
    "point of sale system",
    "POS Indonesia",
    "POS software",
    "retail POS",
    "restaurant POS",
    "cafe POS",
    "business management software",
    "free POS system",
    "UMKM Indonesia",
    "sistem kasir",
    "aplikasi kasir"
  ],
  
  // Authors
  authors: [{ name: "SocialBrand1980", url: "https://socialbrand1980.com" }],
  creator: "SocialBrand1980",
  publisher: "SocialBrand1980",
  
  // Open Graph
  openGraph: {
    title: "AEGIS POS - Your AGENTIC AI Bussines",
    description: "Agentic AI business workspace for sales, inventory, customers, and daily operations.",
    url: siteUrl,
    siteName: "AEGIS POS",
    images: [
      {
        url: "/img/og-image.png",
        width: 1200,
        height: 630,
        alt: "AEGIS POS Dashboard - Cloud POS System",
        type: "image/png"
      }
    ],
    locale: "en_US",
    type: "website"
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "AEGIS POS - Your AGENTIC AI Bussines",
    description: "Agentic AI business workspace for sales, inventory, customers, and daily operations.",
    images: ["/img/og-image.png"],
    creator: "@socialbrand1980"
  },
  
  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  
  // Alternates
  alternates: {
    canonical: siteUrl
  },
  
  // Icons
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/pwa/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/pwa/icon-512.png", type: "image/png", sizes: "512x512" }
    ],
    shortcut: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/pwa/icon-192.png", type: "image/png", sizes: "192x192" }
    ],
    apple: [
      { url: "/pwa/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ],
    other: [
      {
        rel: "icon",
        type: "image/svg+xml",
        url: "/favicon.svg"
      },
      {
        rel: "apple-touch-icon",
        url: "/pwa/apple-touch-icon.png"
      }
    ]
  },
  
  // Manifest
  manifest: "/site.webmanifest",
  
  // App Links
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AEGIS POS"
  },
  
  // Format Detection
  formatDetection: {
    email: false,
    address: false,
    telephone: false
  }
};

export const viewport: Viewport = {
  themeColor: "#0f172a"
}

// Structured Data for SEO
const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "AEGIS POS",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD"
  },
  description: "AEGIS POS is a modern cloud POS system designed to manage sales, inventory, and customers.",
  creator: {
    "@type": "Organization",
    name: "SocialBrand1980",
    url: "https://socialbrand1980.com"
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "1000",
    bestRating: "5",
    worstRating: "1"
  },
  featureList: [
    "Point of Sale System",
    "Inventory Management",
    "Customer Loyalty Program",
    "Real-time Analytics",
    "Thermal Printer Support",
    "Multi-outlet Support"
  ],
  screenshot: `${siteUrl}/img/og-image.png`,
  downloadUrl: `${siteUrl}/setup`,
  installUrl: `${siteUrl}/setup`,
  softwareVersion: "1.0.0",
  inLanguage: ["en", "id"]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <head>
        {/* Canonical URL */}
        <link rel="canonical" href={siteUrl} />
        
        {/* Structured Data */}
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          strategy="afterInteractive"
        />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://supabase.com" />
        
        {/* DNS Prefetch */}
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      </head>
      <body className="antialiased font-sans bg-slate-50 text-slate-950">
        <PwaRegistration />
        {children}
        
        {/* Google Analytics - Replace with your ID */}
        {/* <Script
          src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'GA_MEASUREMENT_ID');
          `}
        </Script> */}
      </body>
    </html>
  );
}
