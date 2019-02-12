import { MongoClient, Db, Collection } from "mongodb";
import dotenv from "dotenv";

dotenv.config();
export const mongoClient = new MongoClient(process.env.MONGO_URI!, {useNewUrlParser: true});

export interface IDbImage {
    _id: string;
    path: string;
    url: string;
    md5?: string;
    imghash?: string;
    note?: string;
}

export default class Database {
    public image: Collection<IDbImage>;

    private db: Db;

    constructor() {
        this.db = mongoClient.db("image");
        this.image = this.db.collection("image");
    }
}
