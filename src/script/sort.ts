import glob from "glob";
import shortId from "shortid";
import imageHash from "image-hash";
import md5 from "md5";
import path from "path";
import fs from "fs";
import trash from "trash";

interface IImage {
    _id?: string;
    path: string;
    imghash: string;
    md5: string;
}

async function processFile(file: string) {
    const [_imghash, _md5] = await Promise.all([
        new Promise((resolve, reject) => {
            imageHash(file, 16, true, (err, d: string) => {
                if (err) {
                    reject(err);
                }
                resolve(d);
            });
        }),
        new Promise((resolve, reject) => {
            fs.readFile(file, (err, b) => {
                if (err) {
                    reject(err);
                }
                resolve(md5(b));
            });
        })
    ]);

    return {
        path: file,
        imghash: _imghash,
        md5: _md5
    } as IImage;
}

interface IMap {
    [key: string]: string;
}

const folderPath = "/Volumes/EXT/textbooks/img";
glob(path.join(folderPath, "**/*.png"), (err, files) => {
    Promise.all(files.map((file) => processFile(file))).then((results) => {
        const imgHashToShortId = {} as IMap;
        const md5s: string[] = [];
        results.forEach((result) => {
            if (md5s.indexOf(result.md5) !== -1) {
                trash(result.path);
            } else {
                md5s.push(result.md5);

                result._id = imgHashToShortId[result.imghash];
                if (result._id === undefined) {
                    result._id = shortId.generate();
                    imgHashToShortId[result.imghash] = result._id;
                } else {
                    const pathObj = path.parse(result.path);
                    fs.mkdir(path.join(folderPath, result._id!), (e1) => {
                        fs.rename(result.path, path.join(pathObj.dir, result._id!, pathObj.base), (e2) =>
                            e2 ? console.error(e2) : "");
                    });
                }
            }
        });
    });
});
