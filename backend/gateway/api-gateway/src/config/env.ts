export const env = {
  PORT: Number(process.env.PORT),

  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL ?? "http://localhost:3000",

  JWT_SECRET: process.env.JWT_SECRET ?? "development-secret",
};
