export type LLMProvider = 'anthropic' | 'openai' | 'gemini';

export interface LLMConfig {
  provider?: LLMProvider;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
}

export interface GenerateTextInput {
  system?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

const DEFAULT_MODELS: Record<LLMProvider, string> = {
  anthropic: 'claude-3-5-sonnet-20241022',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-1.5-pro',
};

export class LLMClient {
  private provider: LLMProvider;
  private apiKey: string;
  private model: string;
  private maxTokens: number;

  constructor(config: LLMConfig = {}) {
    this.provider = config.provider || resolveProvider();
    this.apiKey = config.apiKey || resolveApiKey(this.provider);
    this.model = config.model || process.env.AI_MODEL || DEFAULT_MODELS[this.provider];
    this.maxTokens = config.maxTokens || 2000;

    if (!this.apiKey) {
      throw new Error(
        `${this.provider.toUpperCase()} API key is required. Set ${apiKeyEnvName(this.provider)} or pass apiKey.`
      );
    }
  }

  async generateText(input: GenerateTextInput): Promise<string> {
    if (this.provider === 'anthropic') return this.generateAnthropic(input);
    if (this.provider === 'openai') return this.generateOpenAI(input);
    return this.generateGemini(input);
  }

  async generateJson<T = unknown>(input: GenerateTextInput): Promise<T> {
    const text = await this.generateText({
      ...input,
      prompt: `${input.prompt}\n\nReturn ONLY valid JSON. Do not include markdown fences or commentary.`,
    });
    return parseJsonFromText<T>(text);
  }

  private async generateAnthropic(input: GenerateTextInput): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: input.maxTokens || this.maxTokens,
        temperature: input.temperature,
        system: input.system,
        messages: [{ role: 'user', content: input.prompt }],
      }),
    });

    const json = await readJson(response);
    const textBlocks = Array.isArray(json.content)
      ? json.content.filter((block: any) => block.type === 'text').map((block: any) => block.text)
      : [];
    return textBlocks.join('\n').trim();
  }

  private async generateOpenAI(input: GenerateTextInput): Promise<string> {
    const messages = input.system
      ? [
          { role: 'system', content: input.system },
          { role: 'user', content: input.prompt },
        ]
      : [{ role: 'user', content: input.prompt }];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: input.maxTokens || this.maxTokens,
        temperature: input.temperature,
        messages,
      }),
    });

    const json = await readJson(response);
    return String(json.choices?.[0]?.message?.content || '').trim();
  }

  private async generateGemini(input: GenerateTextInput): Promise<string> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      this.model
    )}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: input.system ? { parts: [{ text: input.system }] } : undefined,
        generationConfig: {
          maxOutputTokens: input.maxTokens || this.maxTokens,
          temperature: input.temperature,
        },
        contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
      }),
    });

    const json = await readJson(response);
    const parts = json.candidates?.[0]?.content?.parts || [];
    return parts.map((part: any) => part.text || '').join('\n').trim();
  }
}

export function createLLMClient(config: LLMConfig = {}): LLMClient {
  return new LLMClient(config);
}

export function parseJsonFromText<T = unknown>(text: string): T {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON found in model response');
    return JSON.parse(match[0]) as T;
  }
}

function resolveProvider(): LLMProvider {
  const provider = (process.env.AI_PROVIDER || process.env.LLM_PROVIDER || 'anthropic').toLowerCase();
  if (provider === 'openai' || provider === 'gemini' || provider === 'anthropic') {
    return provider;
  }
  throw new Error(`Unsupported AI_PROVIDER "${provider}". Use anthropic, openai, or gemini.`);
}

function resolveApiKey(provider: LLMProvider): string {
  if (provider === 'anthropic') return process.env.ANTHROPIC_API_KEY || '';
  if (provider === 'openai') return process.env.OPENAI_API_KEY || '';
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
}

function apiKeyEnvName(provider: LLMProvider): string {
  if (provider === 'anthropic') return 'ANTHROPIC_API_KEY';
  if (provider === 'openai') return 'OPENAI_API_KEY';
  return 'GEMINI_API_KEY or GOOGLE_API_KEY';
}

async function readJson(response: Response): Promise<any> {
  const text = await response.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    const message = json.error?.message || json.error || json.raw || response.statusText;
    throw new Error(`LLM request failed (${response.status}): ${message}`);
  }

  return json;
}
