type SecretBindings = {
  BANGUMI_CLIENT_ID: string;
  BANGUMI_CLIENT_SECRET: string;
  TOKEN_ENCRYPTION_KEY: string;
  EXPO_ACCESS_TOKEN: string;
};

export type Env = CloudflareBindings & SecretBindings;

export function requireEnv(value: string | undefined, name: keyof Env) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
