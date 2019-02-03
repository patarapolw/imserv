import { MongoClient, Collection } from "mongodb";
import glob from "glob";
import shortId from "shortid";
import imghash from "imghash";
import md5 from "md5";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();
const client = new MongoClient(process.env.MONGO_URI!, {useNewUrlParser: true});

interface IImage {
    _id: string;
    path: string;
    imghash: string;
    md5: string;
}

client.connect((err) => {
    if (err) {
        console.error(err);
    }

    const imageCol = client.db("image").collection("image");

    glob(path.join(process.env.LOCAL_IMG_FOLDER!, "./**/*.png"), (_err, files) => {
        Promise.all(files.map((file) => processFile(file, imageCol))).then(() => {
            client.close();
        });
    });
});

async function processFile(file: string, col: Collection) {
    const [_imghash, _md5] = await Promise.all([
        imghash.hash(file),
        new Promise((resolve, reject) => {
            fs.readFile(file, (err, b) => {
                resolve(md5(b));
            });
        })
    ]);

    const data = {
        _id: shortId.generate(),
        path: path.relative(process.env.LOCAL_IMG_FOLDER!, file),
        imghash: _imghash,
        md5: _md5
    } as IImage;

    return await col.updateOne({ md5: _md5 }, { $set: data }, { upsert: true });
}
