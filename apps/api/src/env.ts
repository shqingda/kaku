export type Env = {
  BANGUMI_CLIENT_ID: string;
  BANGUMI_CLIENT_SECRET: string;
  BANGUMI_REDIRECT_URI: string;
  DB: D1Database;
  TOKEN_ENCRYPTION_KEY: string;
};

export function requireEnv(value: string | undefined, name: keyof Env) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
