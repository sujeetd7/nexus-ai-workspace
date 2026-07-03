import { app } from "./app";

import { env } from "./config/env/env";

app.listen(env.PORT, () => {
  console.log(`
=================================
SERVICE : workspace-service
PORT    : ${env.PORT}
=================================
`);
});
