import { ImageResponse } from 'next/og';
import { BRAND, SITE_NAME, SITE_TAGLINE } from '@/lib/site';

// Default site-wide social share card. Every route inherits this og:image
// unless it ships a more specific one (e.g. product/[id]/opengraph-image).
export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: BRAND.charcoal,
          color: BRAND.white,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 150,
            height: 150,
            borderRadius: 32,
            background: BRAND.yellow,
            color: BRAND.charcoal,
            fontSize: 100,
            fontWeight: 800,
            marginBottom: 44,
          }}
        >
          F
        </div>
        <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -1 }}>{SITE_NAME}</div>
        <div style={{ fontSize: 36, color: BRAND.yellow, marginTop: 14 }}>{SITE_TAGLINE}</div>
      </div>
    ),
    { ...size },
  );
}
