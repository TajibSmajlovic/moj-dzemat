export function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
