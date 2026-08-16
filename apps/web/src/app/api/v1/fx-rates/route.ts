import { NextResponse } from 'next/server';

const CODES = ['USD','GBP','EUR','INR','AUD','CAD','SGD','AED','JPY','CNY','SAR','MYR','BRL','MXN','PLN','SEK','NOK','KRW','THB','ZAR'];

export async function GET() {
  try {
    const targets = CODES.filter(c => c !== 'USD').join(',');
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=USD&to=${targets}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) throw new Error('upstream error');
    const data = await res.json();
    return NextResponse.json({ USD: 1, ...data.rates }, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=120' },
    });
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}
