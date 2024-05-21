const { runLoaders } = require("./loader-runner/loader-runner");
const path = require("path");
const fs = require("fs");

console.log('test222');

const entryFile = path.resolve(__dirname, "src/index.js");

let request = `inline-loader1!inline-loader2!${entryFile}`;
const rules = [
  {
    test: /\.js$/,
    use: ["normal-loader1", "normal-loader2"],
  },
  {
    test: /\.js$/,
    enforce: "pre",
    use: ["pre-loader1", "pre-loader2"],
  },
  {
    test: /\.js$/,
    enforce: "post",
    use: ["post-loader1", "post-loader2"],
  },
];

const parts = request.replace(/^-?!+/, "").split("!");
let resource = parts.pop();
let inlineLoaders = parts;
let preLoaders = [],
  postLoaders = [],
  normalLoaders = [];
for (let i = 0; i < rules.length; i++) {
  let rule = rules[i];
  if (resource.match(rule.test)) {
    if (rule.enforce === "pre") {
      preLoaders.push(...rule.use);
    } else if (rule.enforce === "post") {
      postLoaders.push(...rule.use);
    } else {
      normalLoaders.push(...rule.use);
    }
  }
}

let loaders = [];
if (request.startsWith("!!")) {
  loaders = inlineLoaders;
} else if (request.startsWith("-!")) {
  loaders = [...postLoaders, ...preLoaders];
} else if (request.startsWith("!")) {
  loaders = [...postLoaders, ...normalLoaders, ...preLoaders];
} else {
  loaders = [...postLoaders, ...inlineLoaders, ...normalLoaders, ...preLoaders];
}

loaders = loaders.map((loader) =>
  path.resolve(__dirname, "loader-chain", loader)
);

runLoaders(
  {
    resource,
    loaders,
    context: {},
    readResource: fs.readFile,
  },
  (err, result) => {
    console.log(err);
    console.log(result);
  }
);
