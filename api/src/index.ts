import "dotenv-safe/config";
import express from "express";
import { scrape } from "./controllers/scrape";
import { scrape as scrapeWiki } from "./lib/scrape";

const main = async () => {
  const app = express();

  app.get("/", scrape);

  app.listen(parseInt(process.env.PORT), () => {
    console.log(`Server started on ${process.env.PORT}`);
  });
};

try {
  main();

  setInterval(scrapeWiki, 15000);
} catch (error) {
  console.error(error);
}
