import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();
const client = new MongoClient(process.env.MONGO_URI!, {useNewUrlParser: true});

client.connect((err) => {
    if (err) {
        console.error(err);
    }

    const imageCol = client.db("image").collection("image");
    imageCol.createIndex({ md5: 1 }, { unique: true });
});
