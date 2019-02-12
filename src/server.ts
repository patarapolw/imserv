import express from "express";
import bodyParser from "body-parser";
import XRegExp from "xregexp";
import Database, { mongoClient, IDbImage } from "./server/Database";

(async () => {
    await mongoClient.connect();
    const db = new Database();

    const app = express();
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(express.static("public"));
    app.use(express.static("dist"));

    const port = process.env.PORT || "5000";

    app.get("/img", (req, res) => {
        function sendFromPath(p?: string) {
            let query: Partial<IDbImage>;
            let pathRegex: any;
            if (p !== undefined) {
                pathRegex = new RegExp(`^${XRegExp.escape(p)}`);
                query = {url: pathRegex};
            } else {
                query = {};
            }

            db.image.find(query).sort({path: 1}).toArray().then((r: IDbImage[]) => {
                const folders: string[] = [];
                const contents = r.map((el) => {
                    // tslint:disable-next-line: prefer-const
                    let {url, ...remaining} = el;
                    try {
                        url = new URL(url).href;
                        return {
                            ...remaining,
                            url
                        };
                    } catch (e) {
                        let cond = true;
                        if (pathRegex !== undefined) {
                            cond = (url.replace(pathRegex, "").substring(1).indexOf("/") === -1);
                        } else {
                            cond = (url.indexOf("/") === -1);
                        }

                        if (cond) {
                            return {
                                ...remaining,
                                url: new URL(url, process.env.GITHUB_RAW_DIR!).href
                            };
                        } else {
                            let folderName = url;
                            if (pathRegex !== undefined) {
                                folderName = folderName.replace(pathRegex, "").substring(1);
                            }
                            folderName = /^([^/]+)\//.exec(folderName)![1];

                            folders.push(folderName);
                            return null;
                        }
                    }
                });

                res.send([
                    ...folders.filter((el, i) => folders.indexOf(el) === i).map((el) => {
                        return p ? `${p}/${el}` : el;
                    }),
                    ...contents.filter((el) => el !== null)
                ]);
            });
        }

        if (req.query._id) {
            db.image.findOne({_id: req.query._id}).then((r) => {
                res.redirect(new URL(r!.url, process.env.GITHUB_RAW_DIR!).href);
            });
        } else {
            sendFromPath(req.query.path);
        }
    });

    app.listen(port, () => console.log(`App listening on port ${port}!`));
})();
