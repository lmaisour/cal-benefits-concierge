import { safeJsonLd, type JsonLd } from "@/lib/seo/json-ld";

export function JsonLdScript({ data }: { data: JsonLd | JsonLd[] | null }) {
  if (!data) {
    return null;
  }
  const payload = Array.isArray(data) ? data.filter(Boolean) : [data];
  if (payload.length === 0) {
    return null;
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(payload.length === 1 ? payload[0] : payload) }}
    />
  );
}
