import { Injectable } from '@nestjs/common';

export interface NormalizedProduct {
  title: string;
  category: string;
  weightG: number;
  isLightweight: boolean;
  imageUrl: string;
  imageSource: string;
  imageConfidence: number | null;
  marketplaceUrl: string;
  seller: string;
  sellerRating: number;
}

export interface MarketplaceMeta {
  code: string;
  displayName: string;
  color: string;
  searchUrl: (query: string) => string;
}

export const MARKETPLACE_META: Record<string, MarketplaceMeta> = {
  amazon_us:    { code: 'amazon_us',    displayName: 'Amazon',    color: '#FF9900', searchUrl: q => `https://www.amazon.com/s?k=${encodeURIComponent(q)}` },
  amazon_uk:    { code: 'amazon_uk',    displayName: 'Amazon UK', color: '#FF9900', searchUrl: q => `https://www.amazon.co.uk/s?k=${encodeURIComponent(q)}` },
  amazon_de:    { code: 'amazon_de',    displayName: 'Amazon DE', color: '#FF9900', searchUrl: q => `https://www.amazon.de/s?k=${encodeURIComponent(q)}` },
  amazon_ca:    { code: 'amazon_ca',    displayName: 'Amazon CA', color: '#FF9900', searchUrl: q => `https://www.amazon.ca/s?k=${encodeURIComponent(q)}` },
  amazon_au:    { code: 'amazon_au',    displayName: 'Amazon AU', color: '#FF9900', searchUrl: q => `https://www.amazon.com.au/s?k=${encodeURIComponent(q)}` },
  etsy:         { code: 'etsy',         displayName: 'Etsy',      color: '#F56400', searchUrl: q => `https://www.etsy.com/search?q=${encodeURIComponent(q)}` },
  ebay:         { code: 'ebay',         displayName: 'eBay',      color: '#86B817', searchUrl: q => `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}` },
  walmart:      { code: 'walmart',      displayName: 'Walmart',   color: '#0071DC', searchUrl: q => `https://www.walmart.com/search?q=${encodeURIComponent(q)}` },
  shopify:      { code: 'shopify',      displayName: 'Shopify',   color: '#5C6AC4', searchUrl: q => `https://www.google.com/search?q=${encodeURIComponent(q)}+shop` },
  tiktok_shop:  { code: 'tiktok_shop',  displayName: 'TikTok',   color: '#010101', searchUrl: q => `https://www.tiktok.com/search?q=${encodeURIComponent(q)}` },
  shopee:       { code: 'shopee',       displayName: 'Shopee',    color: '#EE4D2D', searchUrl: q => `https://shopee.in/search?keyword=${encodeURIComponent(q)}` },
};

// Demo catalog — all images are validated at runtime by Claude Vision AI.
// imageSource: 'marketplace' forces the AI validation pipeline for every image.
// If an image fails validation (confidence < 80), the pipeline stores null and the UI
// shows a 📦 placeholder rather than an unrelated photo.
const DEMO_CATALOG: NormalizedProduct[] = [
  {
    title: 'Handmade Wooden Desk Organizer',
    category: 'home_office',
    weightG: 420,
    isLightweight: false,
    // Wooden desk stationery organizer — AI validates on each pipeline run
    imageUrl: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop&q=80',
    imageSource: 'marketplace',
    imageConfidence: null,
    marketplaceUrl: 'https://www.amazon.com/s?k=Handmade+Wooden+Desk+Organizer+India',
    seller: 'WoodCraft India Exports',
    sellerRating: 4.7,
  },
  {
    title: 'Brass Singing Bowl Meditation Set',
    category: 'wellness',
    weightG: 280,
    isLightweight: true,
    // Tibetan singing bowl / meditation bell — AI validates
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&q=80',
    imageSource: 'marketplace',
    imageConfidence: null,
    marketplaceUrl: 'https://www.amazon.com/s?k=Brass+Singing+Bowl+Meditation+Set+India',
    seller: 'Rajasthan Brass Arts',
    sellerRating: 4.5,
  },
  {
    title: 'Jute Macrame Wall Hanging',
    category: 'home_decor',
    weightG: 350,
    isLightweight: true,
    // Macrame wall art — AI validates
    imageUrl: 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?w=400&h=400&fit=crop&q=80',
    imageSource: 'marketplace',
    imageConfidence: null,
    marketplaceUrl: 'https://www.etsy.com/search?q=Jute+Macrame+Wall+Hanging+India',
    seller: 'Jaipur Craft House',
    sellerRating: 4.8,
  },
  {
    title: 'Handmade Leather Passport Wallet',
    category: 'travel_accessories',
    weightG: 95,
    isLightweight: true,
    // Leather travel wallet / passport holder — AI validates
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop&q=80',
    imageSource: 'marketplace',
    imageConfidence: null,
    marketplaceUrl: 'https://www.amazon.com/s?k=Handmade+Leather+Passport+Wallet+India',
    seller: 'Mumbai Leather Works',
    sellerRating: 4.6,
  },
  {
    title: 'Hand-Painted Ceramic Planter',
    category: 'garden',
    weightG: 650,
    isLightweight: false,
    // Ceramic plant pot — AI validates
    imageUrl: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400&h=400&fit=crop&q=80',
    imageSource: 'marketplace',
    imageConfidence: null,
    marketplaceUrl: 'https://www.etsy.com/search?q=Hand+Painted+Ceramic+Planter+India',
    seller: 'Khurja Pottery Co.',
    sellerRating: 4.9,
  },
  {
    title: 'Sandalwood Incense Gift Set',
    category: 'wellness',
    weightG: 220,
    isLightweight: true,
    // Incense sticks burning — AI validates
    imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=400&fit=crop&q=80',
    imageSource: 'marketplace',
    imageConfidence: null,
    marketplaceUrl: 'https://www.amazon.com/s?k=Sandalwood+Incense+Gift+Set+India',
    seller: 'Bangalore Aromas',
    sellerRating: 4.4,
  },
  {
    title: 'Block Print Cotton Scarf',
    category: 'fashion',
    weightG: 180,
    isLightweight: true,
    // Block print fabric/textile — AI validates
    imageUrl: 'https://images.unsplash.com/photo-1558171813-2c4b99e87deb?w=400&h=400&fit=crop&q=80',
    imageSource: 'marketplace',
    imageConfidence: null,
    marketplaceUrl: 'https://www.etsy.com/search?q=Block+Print+Cotton+Scarf+India',
    seller: 'Sanganer Textile Studio',
    sellerRating: 4.7,
  },
  {
    title: 'Brass Candle Holder Pair',
    category: 'home_decor',
    weightG: 520,
    isLightweight: false,
    // Brass decorative candle holders — AI validates
    imageUrl: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=400&h=400&fit=crop&q=80',
    imageSource: 'marketplace',
    imageConfidence: null,
    marketplaceUrl: 'https://www.amazon.com/s?k=Brass+Candle+Holder+Pair+India',
    seller: 'Moradabad Metal Craft',
    sellerRating: 4.5,
  },
  {
    title: 'Natural Loofah Body Scrubber',
    category: 'beauty',
    weightG: 120,
    isLightweight: true,
    // Natural loofah bath scrubber — AI validates
    imageUrl: 'https://images.unsplash.com/photo-1526817575615-3685e9981010?w=400&h=400&fit=crop&q=80',
    imageSource: 'marketplace',
    imageConfidence: null,
    marketplaceUrl: 'https://www.amazon.com/s?k=Natural+Loofah+Body+Scrubber+India',
    seller: 'Kerala Natural Products',
    sellerRating: 4.6,
  },
  {
    title: 'Terracotta Wind Chime',
    category: 'garden',
    weightG: 310,
    isLightweight: true,
    // Terracotta clay wind chime — AI validates
    imageUrl: 'https://images.unsplash.com/photo-1589363460779-cd717d88d5be?w=400&h=400&fit=crop&q=80',
    imageSource: 'marketplace',
    imageConfidence: null,
    marketplaceUrl: 'https://www.etsy.com/search?q=Terracotta+Wind+Chime+India',
    seller: 'Terracotta Village Arts',
    sellerRating: 4.3,
  },
];

@Injectable()
export class ProductNormalizerService {
  getCatalog(): NormalizedProduct[] {
    return DEMO_CATALOG;
  }

  getMarketplaceMeta(code: string): MarketplaceMeta | null {
    return MARKETPLACE_META[code] ?? null;
  }

  getMarketplaceSearchUrl(code: string, query: string): string {
    const meta = this.getMarketplaceMeta(code);
    return meta ? meta.searchUrl(query) : `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }
}
