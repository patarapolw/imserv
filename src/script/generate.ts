import { MongoClient, Collection } from "mongodb";
import glob from "glob";
import shortId from "shortid";
import imageHash from "image-hash";
import md5 from "md5";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import fetch from "node-fetch";

dotenv.config();
const client = new MongoClient(process.env.MONGO_URI!, {useNewUrlParser: true});

interface IImage {
    _id: string;
    path: string;
    imghash: string;
    md5: string;
}

(async () => {
    await client.connect();
    const imageCol = client.db("image").collection<IImage>("image");
    const items = await imageCol.find().toArray();

    const existingMd5 = items.map((el) => el.md5);
    const existingUrl = items.map((el) => el.path);

    const currentMd5 = await new Promise((resolve, reject) => {
        glob(path.join(process.env.LOCAL_IMG_FOLDER!, "**/*.png"), (_err, files) => {
            if (_err) {
                reject(_err);
            }
            Promise.all(files.map((file) => processFile(file, imageCol, existingMd5))).then((r) => resolve(r));
        });
    }) as string[];

    const currentUrl = await new Promise((resolve, reject) => {
        glob(path.join(process.env.LOCAL_IMG_FOLDER!, "**/extra.txt"), (_err, files) => {
            if (_err) {
                reject(_err);
            }
            Promise.all(files.map((file) => processText(file, imageCol, existingUrl)))
            .then((r) => resolve(r.reduce((x, y) => [...x, ...y])));
        });
    }) as string[];

    await Promise.all(items.filter((el) => {
        return (currentMd5.indexOf(el.md5) === -1
        && currentUrl.indexOf(el.path) === -1
        );
    }).map((el) => imageCol.deleteOne({_id: el._id})));

    client.close();
})();

async function processFile(file: string, col: Collection, existingMd5: string[]): Promise<string> {
    const _md5 = await new Promise((resolve, reject) => {
        console.log(`Reading file: ${file}`);
        fs.readFile(file, (err, b) => err ? reject(err) : resolve(md5(b)));
    }) as string;
    let data: IImage;

    if (existingMd5.indexOf(_md5 as string) === -1) {
        const _imghash = await new Promise((resolve, reject) => {
            console.log(`Calculating hash for file: ${file}`);
            imageHash(file, 16, true, (err, d: string) => err ? reject(err) : resolve(d));
        });

        data = {
            _id: shortId.generate(),
            path: path.relative(process.env.LOCAL_IMG_FOLDER!, file),
            imghash: _imghash,
            md5: _md5
        } as IImage;
    } else {
        data = {
            _id: shortId.generate(),
            path: path.relative(process.env.LOCAL_IMG_FOLDER!, file),
            md5: _md5
        } as IImage;
    }

    await doUpsertMany(data, col);
    return _md5;
}

async function processText(file: string, col: Collection, existingUrl: string[]): Promise<string[]> {
    return await Promise.all(fs.readFileSync(file, "utf8").trim().split("\n")
        .map((url) => processUrl(url, col, existingUrl)));
}

async function processUrl(url: string, col: Collection, existingUrl: string[]): Promise<string> {
    if (existingUrl.indexOf(url) === -1) {
        console.log(`Reading URL: ${url}`);
        const [_imghash, _md5] = await Promise.all([
            new Promise((resolve, reject) => {
                imageHash(url, 16, true, (err, d: string) => err ? reject(err) : resolve(d));
            }),
            new Promise((resolve, reject) => {
                fetch(url)
                .then((r) => r.text())
                .then((r) => resolve(md5(r)))
                .catch((e) => reject(e));
            })
        ]);

        const data = {
            _id: shortId.generate(),
            path: url,
            imghash: _imghash,
            md5: _md5
        } as IImage;

        await doUpsertMany(data, col);
        return url;
    }

    return url;
}

async function doUpsertMany(data: IImage, col: Collection) {
    return await col.updateOne({md5: data.md5}, {
        $set: {
            path: data.path
        },
        $setOnInsert: {
            _id: data._id,
            md5: data.md5,
            imghash: data.imghash
        }
    }, {upsert: true});
}
