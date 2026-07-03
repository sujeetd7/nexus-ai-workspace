import dotenv from "dotenv";
import path from "path";

console.log("PROCESS CWD:", process.cwd());

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

console.log("PORT ENV:", process.env.PORT);
console.log("AUTH ENV:", process.env.AUTH_SERVICE_URL);

export const env = {
  PORT: parseInt(process.env.PORT ?? "3000", 10),

  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL ?? "http://localhost:3001",

  JWT_SECRET: process.env.JWT_SECRET ?? "development-secret",
};

console.log("FINAL ENV:", env);
