import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Playfair_Display, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const sourceSerif = Source_Serif_4({
  variable: "--font-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "Doctrinally.AI — AI Chat Platform for Churches",
    template: "%s | Doctrinally.AI",
  },
  description:
    "Doctrinally.AI turns your church's sermons, devotions, and documents into an AI assistant your congregation can ask questions. Cited answers from Scripture and your own content. Start free — no credit card required.",
  metadataBase: new URL("https://www.doctrinally.ai"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Doctrinally.AI",
    title: "Doctrinally.AI — AI Chat Platform for Churches",
    description:
      "Turn your church's sermons and documents into an AI assistant. Members ask questions, get cited answers from the Bible and your own teachings.",
    url: "https://www.doctrinally.ai",
    images: [
      {
        url: "/logo-light-mode.png",
        width: 512,
        height: 512,
        alt: "Doctrinally.AI",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Doctrinally.AI — AI Chat Platform for Churches",
    description:
      "Turn your church's sermons and documents into an AI assistant. Members ask questions, get cited answers from the Bible and your own teachings.",
    images: ["/logo-light-mode.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sourceSerif.variable} ${playfair.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head />
      <body className="min-h-full flex flex-col bg-background">
        <Script
          id="plausible-js"
          src="https://plausible.io/js/pa-OLhck3vYwRCsbi0z4VP5k.js"
          strategy="afterInteractive"
        />
        <Script id="plausible-init" strategy="afterInteractive">
          {`window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()`}
        </Script>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-18068029031"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','AW-18068029031');gtag('config','G-4PJMBW2762');`}
        </Script>
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','1272174814466979');fbq('track','PageView');`}
        </Script>
        <AuthSessionProvider>
          <ThemeProvider>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster />
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
