import Script from 'next/script';

export function GoogleAnalytics() {
  const measurementId = process.env['NEXT_PUBLIC_GA_MEASUREMENT_ID'] || 'G-1B5PK7TZ87';
  const adsId = process.env['NEXT_PUBLIC_GOOGLE_ADS_ID'] || 'AW-17945154043';
  const isProduction = process.env['NODE_ENV'] === 'production';

  // Only load in production
  if (!isProduction) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${adsId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${adsId}');
          gtag('config', '${measurementId}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}
