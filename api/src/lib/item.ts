import { read } from "../database";

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
    const items = await read("item", [{ slug: regex }, { title: regex }]);
    return items;
  } catch (error) {
    return { error };
  }
};
