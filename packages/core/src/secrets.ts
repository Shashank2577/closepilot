export class SecretProvider {
  private getEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  }

  getAnthropicKey(): string {
    return this.getEnvVar('ANTHROPIC_API_KEY');
  }

  getGoogleClientId(): string {
    return this.getEnvVar('GOOGLE_CLIENT_ID');
  }

  getGoogleClientSecret(): string {
    return this.getEnvVar('GOOGLE_CLIENT_SECRET');
  }

  getDatabaseUrl(): string {
    return this.getEnvVar('DATABASE_URL');
  }

  getMcpPort(): string {
    return this.getEnvVar('MCP_PORT');
  }
}

export const secrets = new SecretProvider();
