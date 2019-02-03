var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
dotenv.config();
var client = new MongoClient(process.env.MONGO_URI, { useNewUrlParser: true });
var app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.static("dist"));
client.connect(function (err) {
    if (err) {
        console.error(err);
    }
    var imageCol = client.db("image").collection("image");
    app.get("/img", function (req, res) {
        function sendFromPath(p) {
            var query;
            var pathRegex;
            if (p !== undefined) {
                pathRegex = new RegExp("^" + escapeRegExp(p));
                query = { path: pathRegex };
            }
            else {
                query = {};
            }
            imageCol.find(query).toArray().then(function (r) {
                var folders = [];
                var contents = r.map(function (el) {
                    var cond = true;
                    if (pathRegex) {
                        cond = pathRegex.test(el.path);
                    }
                    else {
                        cond = (el.path.indexOf("/") === -1);
                    }
                    if (cond) {
                        return __assign({}, el, { url: new URL(el.path, process.env.ONLINE_IMG_FOLDER).href });
                    }
                    else {
                        folders.push(el.path.replace(/\/[^/]+$/, ""));
                        return null;
                    }
                });
                res.send(folders.filter(function (el, i) { return folders.indexOf(el) === i; }).concat(contents.filter(function (el) { return el !== null; })));
            });
        }
        if (req.query._id) {
            imageCol.findOne(req.params._id).then(function (r) {
                res.redirect(new URL(r.path, process.env.ONLINE_IMG_FOLDER).href);
            });
        }
        else {
            sendFromPath(req.query.path);
        }
    });
    app.listen(process.env.PORT, function () { return console.log("App listening on port " + process.env.PORT + "!"); });
});
function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}
//# sourceMappingURL=server.js.map