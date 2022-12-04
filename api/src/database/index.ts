import { Filter, Document, MongoClient, MongoClientOptions } from "mongodb";

export const read = async (collection: string, filters: Filter<Document>[]) => {
  const client = new MongoClient(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 3,
  } as MongoClientOptions);

  try {
    await client.connect();
    const db = await client.db();

    const found = await db
      .collection(collection)
      .find({ $or: filters })
      .toArray();

    return found;
  } finally {
    await client.close();
  }
};

export const write = async (
  collection: string,
  items: Record<string, any>[],
  filterKeys: string[]
) => {
  if (!items.length) return;

  const client = new MongoClient(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 3,
  } as MongoClientOptions);

  try {
    await client.connect();
    const db = await client.db();

    const upserts = items.map((item) => {
      const filter = filterKeys.reduce<Record<string, any>>((filters, key) => {
        filters[key] = item[key];
        return filters;
      }, {});
      return {
        updateOne: {
          filter,
          update: { $set: item },
          upsert: true,
        },
      };
    });

    await db.collection(collection).bulkWrite(upserts as any);
  } finally {
    await client.close();
  }
};
