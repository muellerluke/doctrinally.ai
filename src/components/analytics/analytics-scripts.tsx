"use client";

import Script from "next/script";
import { GtagPageView } from "./gtag-page-view";

/**
 * All third-party analytics scripts. Loaded client-only via a dynamic import
 * with `ssr: false` in analytics-loader.tsx so Next.js's streaming HTML path
 * never touches them — they mount strictly after hydration, which avoids a
 * class of issues where gtag inline init executes before React is ready and
 * the dataLayer queue silently drops.
 */
export function AnalyticsScripts() {
  return (
    <>
      {/* Plausible */}
      <Script
        id="plausible-js"
        src="https://plausible.io/js/pa-OLhck3vYwRCsbi0z4VP5k.js"
        strategy="afterInteractive"
      />
      <Script id="plausible-init" strategy="afterInteractive">
        {`window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()`}
      </Script>

      {/* Google: GA4 + Google Ads. Load the library with the GA4 ID in the
          URL so GA4 is the primary consumer, then register both IDs via
          separate gtag('config', ...) calls. */}
      <Script
        id="gtag-src"
        src="https://www.googletagmanager.com/gtag/js?id=G-4PJMBW2762"
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', 'G-4PJMBW2762');
          gtag('config', 'AW-18068029031');
        `}
      </Script>

      {/* Meta Pixel */}
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','1272174814466979');fbq('track','PageView');`}
      </Script>

      {/* SPA route-change page_view tracker for GA4 + Meta Pixel */}
      <GtagPageView />
    </>
  );
}
