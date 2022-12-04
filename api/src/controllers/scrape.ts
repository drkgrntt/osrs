import { Request, Response } from "express";
import { scrape as scrapeWiki } from "../lib/scrape";

export const scrape = async (_: Request, res: Response) => {
  const item = await scrapeWiki();
  res.send({ item });
};
