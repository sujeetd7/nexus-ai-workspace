import "dotenv/config";

import { app } from "./app";

/** Document Service owns 3004; AI Kernel stable local default is 3010. */
const PORT = Number(process.env.PORT ?? 3010);

app.listen(PORT, () => {
  console.log(`AI Kernel running on port ${PORT}`);
});
