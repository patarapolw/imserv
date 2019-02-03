import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();
const client = new MongoClient(process.env.MONGO_URI!, {useNewUrlParser: true});
const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(express.static("dist"));

client.connect((err) => {
    if (err) {
        console.error(err);
    }

    const imageCol = client.db("image").collection("image");

    app.get("/img", (req, res) => {
        function sendFromPath(p?: string) {
            let query: any;
            let pathRegex: any;
            if (p !== undefined) {
                pathRegex = new RegExp(`^${escapeRegExp(p)}`);
                query = {path: pathRegex};
            } else {
                query = {};
            }

            imageCol.find(query).toArray().then((r: any[]) => {
                const folders: string[] = [];
                const contents = r.map((el) => {
                    let cond = true;
                    if (pathRegex) {
                        cond = pathRegex.test(el.path);
                    } else {
                        cond = (el.path.indexOf("/") === -1);
                    }

                    if (cond) {
                        return {
                            ...el,
                            url: new URL(el.path, process.env.ONLINE_IMG_FOLDER!).href
                        };
                    } else {
                        folders.push(el.path.replace(/\/[^/]+$/, ""));
                        return null;
                    }
                });

                res.send([
                    ...folders.filter((el, i) => folders.indexOf(el) === i),
                    ...contents.filter((el) => el !== null)
                ]);
            });
        }

        if (req.query._id) {
            imageCol.findOne(req.params._id).then((r) => {
                res.redirect(new URL(r.path, process.env.ONLINE_IMG_FOLDER!).href);
            });
        } else {
            sendFromPath(req.query.path);
        }
    });

    app.listen(process.env.PORT, () => console.log(`App listening on port ${process.env.PORT}!`));
});

function escapeRegExp(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}
