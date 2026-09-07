import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Block SSRF — private, loopback, and link-local addresses
function isPrivateHostname(hostname: string): boolean {
  // Strip IPv6 brackets e.g. [::1]
  const h = hostname.replace(/^\[|\]$/g, '');
  return /^(localhost|127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\.|0\.0\.0\.0|::1|fc[0-9a-f]{2}:|fd[0-9a-f]{2}:)/i.test(h);
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SellBodr/1.0 (image-proxy)' },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return NextResponse.json({ error: 'Upstream error' }, { status: 502 });

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) return NextResponse.json({ error: 'Not an image' }, { status: 400 });

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 });
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') return NextResponse.json({ error: 'Request timeout' }, { status: 504 });
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 });
  }
}
