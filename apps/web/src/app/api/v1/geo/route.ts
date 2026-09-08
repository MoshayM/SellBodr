import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const country = req.headers.get('x-vercel-ip-country') ?? null;
  return NextResponse.json({ country });
}
