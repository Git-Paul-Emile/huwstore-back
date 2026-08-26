import "dotenv/config";
import { createApp } from "./config/app.js";

const port = Number(process.env.PORT ?? 8000);
const app = createApp();

app.listen(port, () => {
  console.log(`API disponible sur http://localhost:${port}/api`);
});
