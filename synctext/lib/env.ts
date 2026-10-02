export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function appUrl(path = "/"): string {
  return new URL(path, requiredEnv("APP_URL")).toString();
}
