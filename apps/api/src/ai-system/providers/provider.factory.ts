import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAiProviderAdapter } from './provider.interface';
import { AnthropicAdapter } from './anthropic.adapter';
import { OpenAiAdapter } from './openai.adapter';
import { MockAdapter } from './mock.adapter';

@Injectable()
export class ProviderFactory {
  private readonly logger = new Logger('ProviderFactory');
  private readonly registry = new Map<string, IAiProviderAdapter>();

  constructor(private readonly config: ConfigService) {
    this.register();
  }

  private register(): void {
    const anthropicKey = this.config.get<string>('ANTHROPIC_API_KEY');
    const openaiKey = this.config.get<string>('OPENAI_API_KEY');

    if (anthropicKey) {
      this.registry.set('anthropic', new AnthropicAdapter(anthropicKey, 'claude-haiku-4-5-20251001'));
      this.registry.set('anthropic:sonnet', new AnthropicAdapter(anthropicKey, 'claude-sonnet-4-6'));
      this.registry.set('anthropic:opus',   new AnthropicAdapter(anthropicKey, 'claude-opus-4-8'));
      this.logger.log('Registered: anthropic (haiku + sonnet + opus)');
    }

    if (openaiKey) {
      this.registry.set('openai', new OpenAiAdapter(openaiKey, 'gpt-4o-mini'));
      this.registry.set('openai:gpt4o', new OpenAiAdapter(openaiKey, 'gpt-4o'));
      this.logger.log('Registered: openai (gpt-4o-mini + gpt-4o)');
    }

    // Mock is always available as a fallback
    this.registry.set('mock', new MockAdapter());

    if (!anthropicKey && !openaiKey) {
      this.logger.warn('No real AI provider keys found — using mock adapter only');
    }
  }

  get(name: string): IAiProviderAdapter {
    const adapter = this.registry.get(name);
    if (!adapter) throw new Error(`Provider "${name}" is not registered`);
    return adapter;
  }

  getAll(): IAiProviderAdapter[] {
    return Array.from(this.registry.values());
  }

  getAvailable(): IAiProviderAdapter[] {
    return this.getAll().filter(a => a.isAvailable());
  }

  // Returns the unique adapters (de-duped by .name, prefer non-mock)
  getUniqueAvailable(): IAiProviderAdapter[] {
    const seen = new Set<string>();
    const result: IAiProviderAdapter[] = [];
    for (const adapter of this.getAvailable()) {
      if (!seen.has(adapter.name)) {
        seen.add(adapter.name);
        result.push(adapter);
      }
    }
    return result;
  }

  has(name: string): boolean {
    return this.registry.has(name) && (this.registry.get(name)?.isAvailable() ?? false);
  }
}
