import glob from "glob";
import shortId from "shortid";
import imageHash from "image-hash";
import md5 from "md5";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import fetch from "node-fetch";
import Database, { mongoClient, IDbImage } from "../server/Database";

dotenv.config();

(async () => {
    await mongoClient.connect();
    const db = new Database();

    const items = await db.image.find().toArray();

    const existingMd5 = items.map((el) => el.md5).filter((el) => typeof el === "string") as string[];
    const existingUrl = items.map((el) => el.url);

    const currentMd5 = await new Promise((resolve, reject) => {
        glob(path.join(process.env.LOCAL_DIR!, "img", "**/*.png"), (_err, files) => {
            if (_err) {
                reject(_err);
            }
            Promise.all(files.map((file) => processFile(file, db, existingMd5))).then((r) => resolve(r));
        });
    }) as string[];

    const currentUrl = await new Promise((resolve, reject) => {
        glob(path.join(process.env.LOCAL_DIR!, "net-img", "**/*.md"), (_err, files) => {
            if (_err) {
                reject(_err);
            }
            Promise.all(files.map((file) => processMd(file, db, existingUrl)))
            .then((r) => resolve(r.reduce((x, y) => [...x, ...y])));
        });
    }) as string[];

    await Promise.all(items.filter((el) => {
        return  ((el.md5 ? currentMd5.indexOf(el.md5) === -1 : true)
        && currentUrl.indexOf(el.url) === -1
        );
    }).map((el) => db.image.deleteOne({_id: el._id})));

    mongoClient.close();
})();

async function processFile(file: string, db: Database, existingMd5: string[]): Promise<string> {
    const _md5 = await new Promise((resolve, reject) => {
        console.log(`Reading file: ${file}`);
        fs.readFile(file, (err, b) => err ? reject(err) : resolve(md5(b)));
    }) as string;
    let data: Partial<IDbImage>;

    if (existingMd5.indexOf(_md5 as string) === -1) {
        const _imghash = await new Promise((resolve, reject) => {
            console.log(`Calculating hash for file: ${file}`);
            imageHash(file, 16, true, (err: any, d: string) => err ? reject(err) : resolve(d));
        });

        data = {
            _id: shortId.generate(),
            url: path.relative(process.env.LOCAL_DIR!, file),
            imghash: _imghash,
            md5: _md5
        } as IDbImage;
    } else {
        data = {
            _id: shortId.generate(),
            url: path.relative(process.env.LOCAL_DIR!, file),
            md5: _md5
        } as Partial<IDbImage>;
    }

    await doUpsertMany(data, db);
    return _md5;
}

async function processMd(file: string, db: Database, existingUrl: string[]): Promise<string[]> {
    return await Promise.all(fs.readFileSync(file, "utf8").trim().split(/^-{3,}$/gm)
        .map((note) => processUrl(note, db, existingUrl)));
}

async function processUrl(note: string, db: Database, existingUrl: string[]): Promise<string> {
    const m = /!\[[^\]]*\]\((.+)\)/.exec(note);
    if (!m) {
        console.log(`Fail to read ${note}`);
        return note;
    }

    const url = m[1];

    try {
        if (existingUrl.indexOf(url) === -1) {
            console.log(`Reading URL: ${url}`);
            // const [_imghash, _md5] = await Promise.all([
            //     new Promise((resolve, reject) => {
            //         imageHash(url, 16, true, (err: any, d: string) => err ? reject(err) : resolve(d));
            //     }),
            //     new Promise((resolve, reject) => {
            //         fetch(url)
            //         .then((r) => r.text())
            //         .then((r) => resolve(md5(r)))
            //         .catch((e) => reject(e));
            //     })
            // ]);

            const data = {
                _id: shortId.generate(),
                url,
                // imghash: _imghash,
                // md5: _md5,
                note
            } as IDbImage;

            await doUpsertMany(data, db);
            return url;
        }
    } catch (e) {
        console.error(e);
        return url;
    }

    return url;
}

async function doUpsertMany(data: Partial<IDbImage>, db: Database) {
    const {url, ...insert} = data;

    return await db.image.updateOne({$or: [
        {md5: data.md5},
        {url}
    ]}, {
        $set: {url},
        $setOnInsert: insert
    }, {upsert: true});
}
