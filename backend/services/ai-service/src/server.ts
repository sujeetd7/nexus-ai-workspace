import dotenv from "dotenv";
import path from "path";

const __dirname = path.dirname(__filename);

// Load root .env before any other imports so providers read env vars correctly
dotenv.config({
  path: path.resolve(__dirname, "../../../../.env"),
});

import { app } from "./app";

console.log(process.env.CLAUDE_API_KEY);
const PORT = Number(process.env.PORT) || 3007;

app.listen(PORT, () => {
  console.log(`User service running on ${PORT}`);
});
