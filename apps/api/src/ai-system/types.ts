// ─── Task Types ──────────────────────────────────────────────────────────────

export type TaskType =
  | 'product_research'
  | 'trend_analysis'
  | 'competitor_analysis'
  | 'supplier_search'
  | 'seo'
  | 'listing_optimization'
  | 'image_validation'
  | 'demand_prediction'
  | 'profitability'
  | 'recommendation'
  | 'report_generation'
  | 'chat'
  | 'summarization'
  | 'vision'
  | 'ocr'
  | 'translation'
  | 'coding';

// ─── Task Complexity ─────────────────────────────────────────────────────────

export type TaskComplexity = 'simple' | 'moderate' | 'complex' | 'expert';

// ─── Task Requirements ───────────────────────────────────────────────────────

export interface TaskRequirements {
  complexity: TaskComplexity;
  requireVision: boolean;
  requireJson: boolean;
  requireStreaming: boolean;
  requireFunctionCalling: boolean;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  maxLatencyMs: number;
  maxCostUsd: number;
  allowedProviders?: string[];
}

// ─── AI Task (input to orchestrator) ─────────────────────────────────────────

export interface AiTask {
  type: TaskType;
  prompt: string;
  systemPrompt?: string;
  context?: Record<string, unknown>;
  images?: string[];            // URLs for vision tasks
  marketplace?: string;
  productId?: string;
  opportunityId?: string;
  userId?: string;
  maxTokens?: number;
  budgetUsd?: number;
  stream?: boolean;
  requireVision?: boolean;
  requireJson?: boolean;
  cacheKey?: string;            // explicit cache key override
  skipCache?: boolean;
}

// ─── AI Result (output from orchestrator) ────────────────────────────────────

export interface AiResult {
  content: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
  cached: boolean;
  validated: boolean;
  retries: number;
  validationWarnings: string[];
}

// ─── Provider Request / Response ─────────────────────────────────────────────

export interface ProviderMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ProviderContentBlock[];
}

export interface ProviderContentBlock {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface ProviderRequest {
  messages: ProviderMessage[];
  maxTokens: number;
  temperature?: number;
  jsonMode?: boolean;
  stream?: boolean;
}

export interface ProviderResponse {
  content: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
}

// ─── Provider Capabilities ───────────────────────────────────────────────────

export interface ProviderCapabilities {
  supportsVision: boolean;
  supportsJson: boolean;
  supportsStreaming: boolean;
  supportsFunctionCalling: boolean;
  contextWindow: number;
  maxOutputTokens: number;
  rpmLimit: number;
  tpmLimit: number;
}

// ─── Provider Score (for selector) ───────────────────────────────────────────

export interface ProviderScore {
  providerName: string;
  model: string;
  score: number;
  estimatedCostUsd: number;
  estimatedLatencyMs: number;
  reasons: string[];
}

// ─── Token Estimate ──────────────────────────────────────────────────────────

export interface TokenEstimate {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

// ─── Validation Result ───────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
  score: number;  // 0-100
}

// ─── Cache Entry ─────────────────────────────────────────────────────────────

export interface CacheEntry {
  key: string;
  content: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  createdAt: number;
  ttlMs: number;
  hitCount: number;
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

export interface ProviderMetrics {
  provider: string;
  totalRequests: number;
  successRequests: number;
  failedRequests: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  cacheHits: number;
  p95LatencyMs: number;
}

export interface SystemMetrics {
  providers: ProviderMetrics[];
  totalRequests: number;
  totalCostUsd: number;
  cacheHitRate: number;
  avgLatencyMs: number;
  validationSuccessRate: number;
  uptimeSeconds: number;
}

// ─── Learning Record ─────────────────────────────────────────────────────────

export interface LearningRecord {
  taskType: TaskType;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
  retries: number;
  cacheHit: boolean;
  validationPassed: boolean;
  userAccepted?: boolean;
}

// ─── Rate Limit State ────────────────────────────────────────────────────────

export interface RateLimitState {
  provider: string;
  requestsThisMinute: number;
  tokensThisMinute: number;
  requestsToday: number;
  tokensThisMonth: number;
  lastResetMinute: number;
  lastResetDay: number;
  throttledUntil?: number;
}

// ─── Product Validation ──────────────────────────────────────────────────────

export interface ProductValidationInput {
  title?: string | null;
  imageUrl?: string | null;
  imageSource?: string | null;
  imageConfidence?: number | null;
  marketplaceUrl?: string | null;
  seller?: string | null;
  sellerRating?: number | null;
  category?: string | null;
  marketplace?: string | null;
}

// ─── Image Validation ────────────────────────────────────────────────────────

export interface ImageValidationInput {
  title: string;
  imageUrl: string;
  category?: string;
  marketplace?: string;
}

export interface ImageValidationOutput {
  confidence: number;
  verified: boolean;
  expectedObjects: string[];
  detectedObjects: string[];
  rejectionReason?: string;
  source: 'ai' | 'curated' | 'heuristic';
}

// ─── Marketplace Validation ──────────────────────────────────────────────────

export interface MarketplaceValidationInput {
  code: string;
  displayName?: string;
  productUrl?: string;
  seller?: string;
  price?: number;
  currency?: string;
  country?: string;
}
