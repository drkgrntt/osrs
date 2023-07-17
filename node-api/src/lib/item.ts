import { Db } from "mongodb";
import { query, read } from "../database";

export const getItemBySlug = async (slug: string) => {
  try {
    const [item] = await read("item", [{ slug }]);
    return item;
  } catch (error) {
    return { error };
  }
};

export const getItemsBySearch = async (search: string) => {
  try {
    const regex = new RegExp(search, "i");
    const items = await query(async (db: Db) => {
      const matches = await db
        .collection("item")
        .find({
          $text: { $search: `"${search}"` },
        })
        .project({
          score: { $meta: "textScore" },
        })
        .sort({ score: { $meta: "textScore" } })
        .limit(20)
        .toArray();

      const closeEnough = await db
        .collection("item")
        .find({
          _id: { $nin: matches.map((i) => i._id) },
          $or: [{ slug: regex }, { title: regex }],
        })
        .limit(20)
        .toArray();

      return [
        ...matches.filter(({ score, ...fields }) => ({ ...fields })),
        ...closeEnough,
      ].filter((_, i) => i < 20);
    });

    return items;
  } catch (error) {
    return { error };
  }
};
