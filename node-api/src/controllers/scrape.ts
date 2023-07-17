import { Request, Response } from "express";
import { scrape as scrapeWiki } from "../lib/scrape";

export const scrape = async (req: Request, res: Response) => {
  const item = await scrapeWiki(req.params.slug);

  if (item.error) {
    return res
      .status(item.error.status || 400)
      .send({ error: { message: item.error.message } });
  }

  return res.send({ item });
};
