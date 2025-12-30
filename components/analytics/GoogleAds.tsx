import Script from 'next/script'

export function GoogleAds() {
  const adsId = process.env['NEXT_PUBLIC_GOOGLE_ADS_ID']

  if (!adsId) {
    return null
  }

  return (
    <>
      {/* Google Ads Global Site Tag (gtag.js) */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${adsId}`}
      />
      <Script
        id="google-ads-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${adsId}');
          `,
        }}
      />
    </>
  )
}
