import { createApp } from "./app";
import { getDb } from "./db";

const port = Number(process.env.PORT ?? 3000);

await getDb(); // open the DB and apply migrations before accepting requests

createApp().listen(port, () => {
  console.log(`mini-library listening on http://localhost:${port}`);
});
