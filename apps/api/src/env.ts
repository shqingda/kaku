type SecretBindings = {
  BANGUMI_CLIENT_ID: string;
  BANGUMI_CLIENT_SECRET: string;
  TOKEN_ENCRYPTION_KEY: string;
  FCM_SERVICE_ACCOUNT_JSON?: string;
  APNS_KEY_ID?: string;
  APNS_TEAM_ID?: string;
  APNS_PRIVATE_KEY?: string;
};

export type Env = CloudflareBindings & SecretBindings;

export function requireEnv(value: string | undefined, name: keyof Env) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
