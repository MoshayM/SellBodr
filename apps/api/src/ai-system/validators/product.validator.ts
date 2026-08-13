import { Injectable } from '@nestjs/common';
import { ProductValidationInput, ValidationResult } from '../types';

const VALID_MARKETPLACES = new Set([
  'amazon_us', 'amazon_uk', 'amazon_de', 'amazon_ca', 'amazon_au',
  'etsy', 'ebay', 'walmart', 'shopify', 'tiktok_shop', 'shopee',
  'flipkart', 'meesho', 'alibaba', 'aliexpress', 'temu', 'noon', 'lazada',
]);

const PLACEHOLDER_PATTERNS = ['picsum.photos', 'lorempixel.com', 'placehold.it', 'placeholder.com'];

@Injectable()
export class ProductValidator {
  validate(product: ProductValidationInput): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    let score = 100;

    // Required fields
    if (!product.title?.trim()) { errors.push('Missing: title'); score -= 20; }
    if (!product.category?.trim()) { warnings.push('Missing: category'); score -= 5; }
    if (!product.marketplace?.trim()) { warnings.push('Missing: marketplace'); score -= 5; }

    // Marketplace validity
    if (product.marketplace && !VALID_MARKETPLACES.has(product.marketplace)) {
      warnings.push(`Unknown marketplace: ${product.marketplace}`);
      score -= 5;
    }

    // Image checks
    if (!product.imageUrl) {
      warnings.push('Missing: imageUrl');
      score -= 15;
    } else if (PLACEHOLDER_PATTERNS.some(p => product.imageUrl!.includes(p))) {
      errors.push('Placeholder/random image detected — must be product-specific');
      score -= 30;
    } else if (!product.imageUrl.startsWith('https://')) {
      warnings.push('Image URL is not HTTPS');
      score -= 10;
    }

    // Image confidence
    if (product.imageConfidence !== null && product.imageConfidence !== undefined) {
      if (product.imageConfidence < 80) {
        warnings.push(`Low image confidence: ${product.imageConfidence}% — image may not match product`);
        score -= 15;
      }
    } else {
      warnings.push('Image confidence not set — image is unvalidated');
      score -= 10;
    }

    // Marketplace URL
    if (!product.marketplaceUrl) {
      warnings.push('Missing: marketplaceUrl — users cannot open the original listing');
      score -= 10;
    } else if (!product.marketplaceUrl.startsWith('https://')) {
      warnings.push('marketplaceUrl is not HTTPS');
      score -= 5;
    }

    // Seller
    if (!product.seller) { warnings.push('Missing: seller'); score -= 5; }
    if (product.sellerRating !== null && product.sellerRating !== undefined) {
      if (product.sellerRating < 0 || product.sellerRating > 5) {
        warnings.push(`Invalid sellerRating: ${product.sellerRating}`);
        score -= 5;
      }
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors,
      score: Math.max(0, score),
    };
  }
}
