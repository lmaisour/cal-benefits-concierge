import { gaMeasurementId } from "@/lib/analytics/config";

export function AnalyticsScripts() {
  const measurementId = gaMeasurementId();
  if (!measurementId) {
    return null;
  }

  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${measurementId}',{anonymize_ip:true,allow_google_signals:false,allow_ad_personalization_signals:false});`,
        }}
      />
    </>
  );
}
