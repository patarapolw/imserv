import fs from "fs";
import Database, { mongoClient } from "../server/Database";

(async () => {
    await mongoClient.connect();

    const db = new Database();
    const r = await db.image.find({path: /gross/}).toArray();
    fs.writeFileSync("./out/gross.txt", r.map((el) => el.url).join("\n"));

    mongoClient.close();
})();
