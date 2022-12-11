import "dotenv-safe/config";
import express from "express";
import { getItem, searchItems } from "./controllers/item";
import { scrape } from "./controllers/scrape";
import { continuousScrape } from "./lib/scrape";

const openApi = async () => {
  const app = express();

  app.get("/random", scrape);
  app.get("/scrape/:slug", scrape);

  app.get("/search/:search", searchItems);
  app.get("/item/:slug", getItem);

  app.listen(parseInt(process.env.PORT), () => {
    console.log(`Server started on ${process.env.PORT}`);
  });
};

try {
  openApi();

  if (process.env.NODE_ENV === "production") continuousScrape();
} catch (error) {
  console.error(error);
}
