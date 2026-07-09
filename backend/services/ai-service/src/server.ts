import { app } from "./app";

const PORT = Number(process.env.PORT) || 3007;

app.listen(PORT, () => {
  console.log(`User service running on ${PORT}`);
});
