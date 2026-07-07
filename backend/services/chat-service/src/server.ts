import { app } from "./app";

const PORT = Number(process.env.PORT) || 3006;

app.listen(PORT, () => {
  console.log(`User service running on ${PORT}`);
});
