import { Request, Response } from "express";
import { getItemBySlug, getItemsBySearch } from "../lib/item";

export const getItem = async (req: Request, res: Response) => {
  const slug = req.params.slug;
  if (!slug)
    return res
      .status(400)
      .send({ error: { message: "Missing required slug." } });

  const item = await getItemBySlug(slug);

  if (!item)
    return res.status(404).send({
      error: { message: "Nothing was found with the provided slug." },
    });

  return res.send({ item });
};

export const searchItems = async (req: Request, res: Response) => {
  const search = req.params.search;
  if (!search)
    return res
      .status(400)
      .send({ error: { message: "Missing required search term" } });

  const items = await getItemsBySearch(search);

  return res.send({ items });
};
