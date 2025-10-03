import "dotenv/config";
import { env } from "./env";
import { createServer } from "./server";

const app = createServer();

app.listen(env.PORT, () => {
  console.log(`Backend listening on port ${env.PORT}`);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection", reason);
});
