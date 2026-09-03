const BAD_DOMAINS = [
  'picsum.photos', 'loremflickr.com', 'placeholder.com', 'placehold.it',
  'via.placeholder.com', 'dummyimage.com', 'pollinations.ai', 'source.unsplash.com',
  'lorempixel.com', 'upload.wikimedia.org', 'commons.wikimedia.org',
];

const DDG_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
};

export function isBrokenImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return true;
  return BAD_DOMAINS.some(d => url.includes(d));
}

/* ── Single-image fetch (used by enrich-image route) ── */
export async function fetchProductImage(
  title: string,
  category: string,
  marketplace?: string,
): Promise<{ url: string; source: string; confidence: number; sourceUrl?: string } | null> {
  const clean = title.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  const catClean = category.replace(/_/g, ' ').toLowerCase();

  // 1. ScraperAPI — real marketplace listing images (highest quality)
  const scraperResult = await _scraperApiSearch(clean, marketplace ?? 'amazon_us');
  if (scraperResult) return { ...scraperResult, confidence: 92 };

  // 2. Google CSE (if enabled)
  const apiKey = process.env.GOOGLE_API_KEY;
  const cseId  = process.env.GOOGLE_CSE_ID;
  if (apiKey && cseId) {
    const r1 = await _googleImageSearch(apiKey, cseId, `${clean} product`);
    if (r1) return { ...r1, confidence: 82 };
  }

  // 3. DuckDuckGo — searches real e-commerce listings
  const dd1 = await _duckDuckGoSearch(`${clean} product amazon`);
  if (dd1) return { ...dd1, confidence: 72 };

  const dd2 = await _duckDuckGoSearch(`${catClean} handmade india product`);
  if (dd2) return { ...dd2, confidence: 60 };

  return null;
}

/* Returns human-readable marketplace label for UI */
export function marketplaceLabel(code: string): string {
  const MAP: Record<string, string> = {
    amazon_us: 'Amazon US', amazon_uk: 'Amazon UK', amazon_de: 'Amazon DE',
    amazon_ca: 'Amazon CA', amazon_au: 'Amazon AU',
    etsy: 'Etsy', ebay: 'eBay', walmart: 'Walmart',
  };
  return MAP[code] ?? code.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/* ── Multi-image fetch (used by product-gallery route) ── */
export interface ProductImage {
  url: string;
  source: string;
  confidence: number;
  angle: string;
  sourceUrl?: string;
}

type AngleQuery = { angle: string; buildQuery: (title: string, cat: string) => string };

const ANGLE_QUERIES: AngleQuery[] = [
  { angle: 'Main Shot',   buildQuery: (t, _c) => `"${t.slice(0, 40)}" product amazon` },
  { angle: 'Detail View', buildQuery: (t, _c) => `${t.slice(0, 40)} product detail close up texture` },
  { angle: 'Studio Shot', buildQuery: (t, _c) => `${t.slice(0, 40)} white background product photo` },
  { angle: 'Lifestyle',   buildQuery: (_t, c)  => `${c} handmade lifestyle product use` },
  { angle: 'Pattern',     buildQuery: (t, _c)  => `${t.slice(0, 40)} pattern fabric texture` },
  { angle: 'Packaging',   buildQuery: (_t, c)  => `${c} handcrafted india artisan packaging` },
];

export async function fetchProductImages(
  title: string,
  category: string,
  marketplace?: string,
): Promise<ProductImage[]> {
  const clean = title.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const catClean = category.replace(/_/g, ' ').toLowerCase();
  const seen = new Set<string>();
  const results: ProductImage[] = [];

  const apiKey = process.env.GOOGLE_API_KEY;
  const cseId  = process.env.GOOGLE_CSE_ID;

  for (const { angle, buildQuery } of ANGLE_QUERIES) {
    if (results.length >= 6) break;

    // For "Main Shot", use ScraperAPI to get real marketplace listing photo
    if (angle === 'Main Shot' && results.length === 0) {
      const scraped = await _scraperApiSearch(clean, marketplace ?? 'amazon_us');
      if (scraped && !seen.has(scraped.url)) {
        seen.add(scraped.url);
        results.push({ ...scraped, confidence: 92, angle });
        continue;
      }
    }

    const query = buildQuery(clean, catClean);

    // Try Google CSE (when enabled)
    if (apiKey && cseId) {
      const r = await _googleImageSearch(apiKey, cseId, query);
      if (r && !seen.has(r.url)) {
        seen.add(r.url);
        results.push({ ...r, confidence: 80, angle });
        continue;
      }
    }

    // DuckDuckGo — real e-commerce product images
    const dd = await _duckDuckGoSearch(query);
    if (dd && !seen.has(dd.url)) {
      seen.add(dd.url);
      results.push({ ...dd, confidence: 68, angle });
    }
  }

  return results;
}

/* ── ScraperAPI — real marketplace listing photos ── */
async function _scraperApiSearch(
  title: string,
  marketplace: string,
): Promise<{ url: string; source: string; sourceUrl: string } | null> {
  const apiKey = process.env.SCRAPERAPI_KEY;
  if (!apiKey) return null;

  try {
    // Etsy requires JS rendering; all others use static HTML (much cheaper + faster)
    const needsRender = marketplace === 'etsy';
    const searchUrl = _marketplaceSearchUrl(title, marketplace);
    const scraperUrl =
      `https://api.scraperapi.com/?api_key=${apiKey}` +
      `&url=${encodeURIComponent(searchUrl)}` +
      `&render=${needsRender ? 'true' : 'false'}&country_code=us`;

    const res = await fetch(scraperUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(needsRender ? 25_000 : 9_000),
    });
    if (!res.ok) return null;

    const html = await res.text();
    if (!html || html.length < 500) return null;

    if (marketplace === 'etsy') {
      const r = _extractEtsyImage(html, searchUrl);
      if (r) return r;
      // Etsy fallback: search Amazon US instead
      return _scraperApiAmazon(apiKey, title, 'amazon_us');
    }
    if (marketplace === 'ebay') return _extractEbayImage(html, searchUrl);

    // For unknown marketplaces (allegro_pl etc.) we already search Amazon US via _marketplaceSearchUrl
    return _extractAmazonImage(html, title, marketplace, searchUrl);
  } catch {
    // On timeout or any error, try Amazon US as universal fallback
    if (marketplace !== 'amazon_us') {
      return _scraperApiAmazon(apiKey, title, 'amazon_us');
    }
    return null;
  }
}

async function _scraperApiAmazon(
  apiKey: string,
  title: string,
  marketplace: string,
): Promise<{ url: string; source: string; sourceUrl: string } | null> {
  try {
    const searchUrl = _marketplaceSearchUrl(title, marketplace);
    const scraperUrl =
      `https://api.scraperapi.com/?api_key=${apiKey}` +
      `&url=${encodeURIComponent(searchUrl)}` +
      `&render=false&country_code=us`;
    const res = await fetch(scraperUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(9_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (!html || html.length < 500) return null;
    return _extractAmazonImage(html, title, marketplace, searchUrl);
  } catch {
    return null;
  }
}

function _marketplaceSearchUrl(title: string, marketplace: string): string {
  const q = encodeURIComponent(title.slice(0, 60));
  if (marketplace === 'amazon_uk')  return `https://www.amazon.co.uk/s?k=${q}`;
  if (marketplace === 'amazon_de')  return `https://www.amazon.de/s?k=${q}`;
  if (marketplace === 'amazon_ca')  return `https://www.amazon.ca/s?k=${q}`;
  if (marketplace === 'amazon_au')  return `https://www.amazon.com.au/s?k=${q}`;
  if (marketplace === 'etsy')       return `https://www.etsy.com/search?q=${q}`;
  if (marketplace === 'ebay')       return `https://www.ebay.com/sch/i.html?_nkw=${q}`;
  return `https://www.amazon.com/s?k=${q}`;
}

function _extractAmazonImage(
  html: string,
  title: string,
  marketplace: string,
  fallbackSearchUrl: string,
): { url: string; source: string; sourceUrl: string } | null {
  // Try to get the first ASIN — construct a real product listing URL
  const asinMatch = html.match(/data-asin="([A-Z0-9]{10})"/);
  const domain = _amazonDomain(marketplace);
  const sourceUrl = asinMatch
    ? `https://${domain}/dp/${asinMatch[1]}`
    : fallbackSearchUrl;

  // Amazon CDN URL patterns — appear in JSON blobs and data attributes in static HTML
  const patterns = [
    /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+%]+\._[A-Z_0-9]+_\.(?:jpg|jpeg)/g,
    /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+%]+\.(?:jpg|jpeg)/g,
    /https:\/\/images-na\.ssl-images-amazon\.com\/images\/I\/[A-Za-z0-9+%]+\.(?:jpg|jpeg)/g,
  ];

  for (const pattern of patterns) {
    const matches = [...html.matchAll(pattern)].map(m => m[0]);
    for (const raw of matches) {
      if (raw.includes('transparent-pixel') || raw.includes('01RmK+J')) continue;
      // Upgrade to 1500px variant for highest quality
      const url = raw.replace(/\._[A-Z_0-9]+_\.(jpg|jpeg)$/, '._AC_SL1500_.$1');
      return { url, source: 'amazon', sourceUrl };
    }
  }
  return null;
}

function _amazonDomain(marketplace: string): string {
  const MAP: Record<string, string> = {
    amazon_uk: 'www.amazon.co.uk', amazon_de: 'www.amazon.de',
    amazon_ca: 'www.amazon.ca',    amazon_au: 'www.amazon.com.au',
  };
  return MAP[marketplace] ?? 'www.amazon.com';
}

function _extractEtsyImage(
  html: string,
  fallbackSearchUrl: string,
): { url: string; source: string; sourceUrl: string } | null {
  // Extract the first Etsy listing URL
  const listingMatch = html.match(/href="(https:\/\/www\.etsy\.com\/listing\/[^"?]+)/);
  const sourceUrl = listingMatch ? listingMatch[1] : fallbackSearchUrl;

  const matches = [...html.matchAll(
    /https:\/\/i\.etsystatic\.com\/[^\s"'<>]+\.(?:jpg|jpeg|webp)/g,
  )].map(m => m[0]);
  if (matches.length > 0) return { url: matches[0], source: 'etsy', sourceUrl };
  return null;
}

function _extractEbayImage(
  html: string,
  fallbackSearchUrl: string,
): { url: string; source: string; sourceUrl: string } | null {
  // Extract the first eBay item URL
  const itemMatch = html.match(/href="(https:\/\/www\.ebay\.com\/itm\/[^"?]+)/);
  const sourceUrl = itemMatch ? itemMatch[1] : fallbackSearchUrl;

  const matches = [...html.matchAll(
    /https:\/\/i\.ebayimg\.com\/[^\s"'<>]+\.(?:jpg|jpeg)/g,
  )].map(m => m[0]);
  if (matches.length > 0) return { url: matches[0], source: 'ebay', sourceUrl };
  return null;
}

/* ── Google Custom Search ── */
async function _googleImageSearch(
  apiKey: string,
  cseId: string,
  query: string,
): Promise<{ url: string; source: string } | null> {
  try {
    const endpoint = new URL('https://www.googleapis.com/customsearch/v1');
    endpoint.searchParams.set('key', apiKey);
    endpoint.searchParams.set('cx', cseId);
    endpoint.searchParams.set('q', query);
    endpoint.searchParams.set('searchType', 'image');
    endpoint.searchParams.set('imgSize', 'large');
    endpoint.searchParams.set('imgType', 'photo');
    endpoint.searchParams.set('safe', 'active');
    endpoint.searchParams.set('num', '5');

    const res = await fetch(endpoint.toString(), { cache: 'no-store' });
    if (!res.ok) return null;

    const data = await res.json();
    const items: any[] = data.items || [];

    for (const item of items) {
      const imgUrl: string = item.link || '';
      if (!imgUrl.startsWith('https://')) continue;
      if (isBrokenImageUrl(imgUrl)) continue;
      const w = Number(item.image?.width  ?? 0);
      const h = Number(item.image?.height ?? 0);
      if (w < 150 || h < 150) continue;
      return { url: imgUrl, source: 'google_cse' };
    }
    return null;
  } catch {
    return null;
  }
}

/* ── DuckDuckGo Image Search (no API key required) ── */
async function _duckDuckGoSearch(
  query: string,
): Promise<{ url: string; source: string } | null> {
  try {
    // Step 1: obtain the vqd token DuckDuckGo requires for image requests
    const initRes = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
      { headers: DDG_HEADERS, cache: 'no-store' },
    );
    if (!initRes.ok) return null;
    const html = await initRes.text();

    const vqdMatch = html.match(/vqd=["']([^"']+)["']/) ||
                     html.match(/vqd=([\d-]+)/);
    if (!vqdMatch) return null;
    const vqd = vqdMatch[1];

    // Step 2: fetch image results
    const imgEndpoint = new URL('https://duckduckgo.com/i.js');
    imgEndpoint.searchParams.set('l', 'us-en');
    imgEndpoint.searchParams.set('o', 'json');
    imgEndpoint.searchParams.set('q', query);
    imgEndpoint.searchParams.set('vqd', vqd);
    imgEndpoint.searchParams.set('f', ',,,,,');
    imgEndpoint.searchParams.set('p', '1');

    const imgRes = await fetch(imgEndpoint.toString(), {
      headers: { ...DDG_HEADERS, 'Referer': 'https://duckduckgo.com/' },
      cache: 'no-store',
    });
    if (!imgRes.ok) return null;

    const data = await imgRes.json();
    const results: any[] = data?.results ?? [];

    for (const r of results) {
      const url: string = r.image || '';
      if (!url.startsWith('https://')) continue;
      if (isBrokenImageUrl(url)) continue;
      if (url.includes('.svg') || url.includes('.gif') || url.includes('.tif')) continue;
      const w = Number(r.width || 0);
      const h = Number(r.height || 0);
      if (w < 150 || h < 150) continue;
      return { url, source: 'duckduckgo' };
    }
    return null;
  } catch {
    return null;
  }
}
