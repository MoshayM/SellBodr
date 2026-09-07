import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS: string[] = [
  'https://sellbodr.vercel.app',
  process.env.NEXT_PUBLIC_APP_URL ?? '',
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean);

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow Vercel preview deployments for this project
  try {
    const url = new URL(origin);
    if (/^sellbodr(-[a-z0-9]+)*-sellbodr-8741s-projects\.vercel\.app$/.test(url.hostname)) return true;
  } catch {}
  return false;
}

function applyCors(res: NextResponse, origin: string | null): NextResponse {
  if (origin && isAllowedOrigin(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Guest-Groq-Key, X-Guest-Mistral-Key');
    res.headers.set('Access-Control-Max-Age', '86400');
    res.headers.set('Vary', 'Origin');
  }
  return res;
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get('origin');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 });
    return applyCors(res, origin);
  }

  return applyCors(NextResponse.next(), origin);
}

export const config = {
  matcher: '/api/:path*',
};
