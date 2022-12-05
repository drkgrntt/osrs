import "dotenv-safe/config";
import express from "express";
import { scrape } from "./controllers/scrape";
import { continuousScrape } from "./lib/scrape";

const main = async () => {
  const app = express();

  app.get("/", scrape);

  app.listen(parseInt(process.env.PORT), () => {
    console.log(`Server started on ${process.env.PORT}`);
  });
};

try {
  main();

  continuousScrape();
} catch (error) {
  console.error(error);
}
