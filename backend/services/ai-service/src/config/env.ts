export function validateEnv() {
  const missing: string[] = [];

  // In production we require CHROMA_URL; in development we allow a default.
  if (process.env.NODE_ENV === "production") {
    if (!process.env.CHROMA_URL) missing.push("CHROMA_URL");
  }

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}

export const isProduction = () => process.env.NODE_ENV === "production";
