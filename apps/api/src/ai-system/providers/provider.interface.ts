import {
  ProviderCapabilities,
  ProviderRequest,
  ProviderResponse,
  TokenEstimate,
} from '../types';

export interface IAiProviderAdapter {
  readonly name: string;
  readonly defaultModel: string;

  call(request: ProviderRequest): Promise<ProviderResponse>;
  estimateTokens(text: string): TokenEstimate;
  estimateCost(estimate: TokenEstimate): number;
  isAvailable(): boolean;
  getCapabilities(): ProviderCapabilities;
}
