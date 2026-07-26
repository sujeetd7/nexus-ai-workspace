import dotenv from "dotenv";
import path from "path";
import { app } from "./app";

dotenv.config({
  path: path.resolve(__dirname, "../../../../.env"),
});

const PORT = Number(process.env.PORT) || 3005;

app.listen(PORT, () => {
  console.log(`User service running on ${PORT}`);
});
