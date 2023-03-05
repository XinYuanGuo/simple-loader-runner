function inlineLoader1(source) {
  console.log("inlineLoader1 normal");
  return source;
}

inlineLoader1.pitch = () => {
  console.log("inlineLoader1 pitch");
};

module.exports = inlineLoader1;
