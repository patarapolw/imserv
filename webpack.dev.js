const common = require("./webpack.common");
require("dotenv").config();

module.exports = {
    ...common,
    mode: "development",
    devtool: "inline-source-map",
    devServer: {
        contentBase: "./public",
        watchContentBase: true,
        port: process.env.DEV_SERVER_PORT || 5000,
        proxy: {
            "/img": `http://localhost:${process.env.PORT || 3000}`
        }
    }
};
