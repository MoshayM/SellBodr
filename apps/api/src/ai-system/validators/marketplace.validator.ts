import { Injectable } from '@nestjs/common';
import { MarketplaceValidationInput, ValidationResult } from '../types';

const VALID_CODES = new Set([
  'amazon_us', 'amazon_uk', 'amazon_de', 'amazon_ca', 'amazon_au',
  'etsy', 'ebay', 'walmart', 'shopify', 'tiktok_shop',
  'shopee', 'flipkart', 'meesho', 'alibaba', 'aliexpress', 'temu', 'noon', 'lazada',
]);

const VALID_CURRENCIES = new Set(['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'INR', 'SGD', 'MYR', 'AED']);

@Injectable()
export class MarketplaceValidator {
  validate(input: MarketplaceValidationInput): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    let score = 100;

    if (!input.code) { errors.push('Missing: marketplace code'); score -= 30; }
    else if (!VALID_CODES.has(input.code)) { errors.push(`Unknown marketplace code: ${input.code}`); score -= 20; }

    if (!input.displayName) { warnings.push('Missing: marketplace display name'); score -= 5; }

    if (!input.productUrl) {
      warnings.push('Missing: product URL — users cannot view original listing');
      score -= 15;
    } else if (!input.productUrl.startsWith('https://')) {
      warnings.push('Product URL is not HTTPS'); score -= 5;
    }

    if (!input.seller) { warnings.push('Missing: seller name'); score -= 5; }

    if (input.price !== undefined && input.price !== null) {
      if (input.price <= 0) { warnings.push(`Invalid price: ${input.price}`); score -= 10; }
    } else {
      warnings.push('Missing: price'); score -= 5;
    }

    if (input.currency && !VALID_CURRENCIES.has(input.currency)) {
      warnings.push(`Unknown currency: ${input.currency}`); score -= 5;
    } else if (!input.currency) {
      warnings.push('Missing: currency'); score -= 5;
    }

    return { valid: errors.length === 0, warnings, errors, score: Math.max(0, score) };
  }
}
