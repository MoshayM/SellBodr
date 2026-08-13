export interface MarketplaceDef {
  displayName: string;
  shortName: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  logoChar: string;       // letter icon used in the badge
  logoColor: string;      // background of the logo circle
}

const DEFS: Record<string, MarketplaceDef> = {
  amazon_us:   { displayName: 'Amazon US',  shortName: 'Amazon',  bgColor: '#FFF8EE', textColor: '#B45309', borderColor: '#FCD34D', logoChar: 'A', logoColor: '#FF9900' },
  amazon_uk:   { displayName: 'Amazon UK',  shortName: 'Amazon',  bgColor: '#FFF8EE', textColor: '#B45309', borderColor: '#FCD34D', logoChar: 'A', logoColor: '#FF9900' },
  amazon_de:   { displayName: 'Amazon DE',  shortName: 'Amazon',  bgColor: '#FFF8EE', textColor: '#B45309', borderColor: '#FCD34D', logoChar: 'A', logoColor: '#FF9900' },
  amazon_ca:   { displayName: 'Amazon CA',  shortName: 'Amazon',  bgColor: '#FFF8EE', textColor: '#B45309', borderColor: '#FCD34D', logoChar: 'A', logoColor: '#FF9900' },
  amazon_au:   { displayName: 'Amazon AU',  shortName: 'Amazon',  bgColor: '#FFF8EE', textColor: '#B45309', borderColor: '#FCD34D', logoChar: 'A', logoColor: '#FF9900' },
  etsy:        { displayName: 'Etsy',        shortName: 'Etsy',    bgColor: '#FFF3EE', textColor: '#C2410C', borderColor: '#FB923C', logoChar: 'E', logoColor: '#F56400' },
  ebay:        { displayName: 'eBay',        shortName: 'eBay',    bgColor: '#F0FDF4', textColor: '#166534', borderColor: '#4ADE80', logoChar: 'e', logoColor: '#86B817' },
  walmart:     { displayName: 'Walmart',     shortName: 'Walmart', bgColor: '#EFF6FF', textColor: '#1D4ED8', borderColor: '#60A5FA', logoChar: 'W', logoColor: '#0071DC' },
  shopify:     { displayName: 'Shopify',     shortName: 'Shopify', bgColor: '#F5F3FF', textColor: '#5B21B6', borderColor: '#A78BFA', logoChar: 'S', logoColor: '#5C6AC4' },
  tiktok_shop: { displayName: 'TikTok Shop', shortName: 'TikTok',  bgColor: '#F9FAFB', textColor: '#111827', borderColor: '#D1D5DB', logoChar: 'T', logoColor: '#010101' },
  shopee:      { displayName: 'Shopee',      shortName: 'Shopee',  bgColor: '#FFF1EE', textColor: '#9A3412', borderColor: '#F87171', logoChar: 'S', logoColor: '#EE4D2D' },
  flipkart:    { displayName: 'Flipkart',    shortName: 'Flipkart',bgColor: '#EFF6FF', textColor: '#1D4ED8', borderColor: '#93C5FD', logoChar: 'F', logoColor: '#2874F0' },
  meesho:      { displayName: 'Meesho',      shortName: 'Meesho',  bgColor: '#FDF4FF', textColor: '#7E22CE', borderColor: '#D8B4FE', logoChar: 'M', logoColor: '#9B2EB4' },
};

export function getMarketplaceDef(code: string): MarketplaceDef {
  return DEFS[code] ?? {
    displayName: code.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    shortName: code.split('_')[0].toUpperCase(),
    bgColor: '#F9FAFB',
    textColor: '#374151',
    borderColor: '#D1D5DB',
    logoChar: code[0]?.toUpperCase() ?? '?',
    logoColor: '#6B7280',
  };
}

export function getMarketplaceSearchUrl(code: string, query: string): string {
  const q = encodeURIComponent(query);
  const map: Record<string, string> = {
    amazon_us:   `https://www.amazon.com/s?k=${q}`,
    amazon_uk:   `https://www.amazon.co.uk/s?k=${q}`,
    amazon_de:   `https://www.amazon.de/s?k=${q}`,
    amazon_ca:   `https://www.amazon.ca/s?k=${q}`,
    amazon_au:   `https://www.amazon.com.au/s?k=${q}`,
    etsy:        `https://www.etsy.com/search?q=${q}`,
    ebay:        `https://www.ebay.com/sch/i.html?_nkw=${q}`,
    walmart:     `https://www.walmart.com/search?q=${q}`,
    shopify:     `https://www.google.com/search?q=${q}+site:myshopify.com`,
    tiktok_shop: `https://www.tiktok.com/search?q=${q}`,
    shopee:      `https://shopee.in/search?keyword=${q}`,
    flipkart:    `https://www.flipkart.com/search?q=${q}`,
    meesho:      `https://www.meesho.com/search?q=${q}`,
  };
  return map[code] ?? `https://www.google.com/search?q=${q}`;
}
