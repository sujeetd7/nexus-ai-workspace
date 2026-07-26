import "dotenv/config";

import { app } from "./app";

const PORT = Number(process.env.PORT ?? 3004);

app.listen(PORT, () => {
  console.log(`AI Kernel running on port ${PORT}`);
});
