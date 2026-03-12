import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const siteUrl = "https://aegis.id";

export const metadata: Metadata = {
  // Basic Metadata
  title: {
    default: "AEGIS POS – Smart POS System for Modern Businesses",
    template: "%s | AEGIS POS"
  },
  description: "AEGIS POS is a modern cloud POS system that helps businesses manage sales, inventory, and customers from one powerful platform. Free for Indonesian businesses.",
  
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
    title: "AEGIS POS – Smart POS Platform for Modern Businesses",
    description: "Modern POS system for managing sales, inventory, and customers. Free for Indonesian businesses.",
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
    title: "AEGIS POS – Smart POS Platform",
    description: "Modern POS system for managing sales, inventory, and customers.",
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
  
  // Verification
  verification: {
    google: "your-google-verification-code",
    yandex: "your-yandex-verification-code",
    yahoo: "your-yahoo-verification-code"
  },
  
  // Alternates
  alternates: {
    canonical: siteUrl,
    languages: {
      "en-US": siteUrl,
      "id-ID": `${siteUrl}/id`
    }
  },
  
  // Icons
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" }
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
    other: [
      {
        rel: "icon",
        type: "image/svg+xml",
        url: "/favicon.svg"
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
    <html lang="en" suppressHydrationWarning>
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
      <body className="antialiased font-sans">
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
