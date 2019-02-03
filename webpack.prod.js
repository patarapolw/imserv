const path = require("path");
const common = require("./webpack.common");

module.exports = {
    ...common,
    mode: "production",
    devtool: "source-map",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "[name].bundle.js"
    }
};
