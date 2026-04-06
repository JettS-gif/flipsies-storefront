import { api } from '@/lib/api';
import { redirect, notFound } from 'next/navigation';
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

  try {
    const product = await api.getProductBySku(decoded);
    redirect(`/product/${product.id}`);
  } catch {
    notFound();
  }
}
