import { api } from '@/lib/api';
import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ sku: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sku } = await params;
  return { title: `Scanning ${decodeURIComponent(sku)}...` };
}

export default async function ScanPage({ params }: Props) {
  const { sku } = await params;
  const decoded = decodeURIComponent(sku);

  // Pull the original scanner's user-agent + IP from the incoming
  // request so the scan-event log captures the actual customer's
  // device + (best-effort) IP, not the Next.js server's. headers() is
  // async in Next 16 — must be awaited.
  const reqHeaders = await headers();
  const userAgent = reqHeaders.get('user-agent');
  // Vercel + most CDNs append client IP to x-forwarded-for; the first
  // entry is the original client. Falls back to x-real-ip if present.
  const fwd = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip');
  const ip  = fwd ? fwd.split(',')[0].trim() : null;

  // Look up the product AND fire the anonymous scan-event log
  // concurrently. Promise.allSettled so a logging failure never blocks
  // the redirect — telemetry is best-effort.
  const [productResult] = await Promise.allSettled([
    api.getProductBySku(decoded),
    api.logScanEvent(
      { sku: decoded },
      { userAgent, ip },
    ).catch(() => null),
  ]);

  if (productResult.status === 'rejected') {
    notFound();
  }

  // Backfill the product_id on the just-logged event would require a
  // second roundtrip — skipped for now since the backend can join on
  // sku at query time. If product analytics need product_id directly,
  // that's a small follow-up: capture the log id from the first call
  // and PATCH it after the lookup resolves.
  redirect(`/product/${productResult.value.id}`);
}
