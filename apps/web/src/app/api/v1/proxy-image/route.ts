import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Block SSRF — private and loopback addresses
function isPrivateHostname(hostname: string): boolean {
  return /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|::1)/.test(hostname);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  const filename = searchParams.get('filename') || 'product-image.jpg';

  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (parsed.protocol !== 'https:') return NextResponse.json({ error: 'HTTPS only' }, { status: 400 });
  if (isPrivateHostname(parsed.hostname)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SellBodr/1.0 (image-proxy)' },
      redirect: 'follow',
    });
    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 });

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) return NextResponse.json({ error: 'Not an image' }, { status: 400 });

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 });
  }
}
