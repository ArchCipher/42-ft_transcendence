const FALLBACK_APP_URL = "https://localhost:8443"

export function appUrl(path = "/"):string{
  // TODO: use requiredEnv
  return new URL(path, process.env.APP_URL ?? FALLBACK_APP_URL).toString();
}