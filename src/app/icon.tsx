import { ImageResponse } from 'next/og';
import { BRAND } from '@/lib/site';

// Generated favicon / app icon. Doubles as the Organization logo
// (referenced as `${SITE_URL}/icon` in the JSON-LD), so it's sized well
// above Google's 112px logo minimum.
export const size = { width: 256, height: 256 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: BRAND.yellow,
          color: BRAND.charcoal,
          fontSize: 180,
          fontWeight: 800,
        }}
      >
        F
      </div>
    ),
    { ...size },
  );
}
