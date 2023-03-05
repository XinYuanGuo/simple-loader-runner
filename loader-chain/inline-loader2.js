function inlineLoader2(source) {
  console.log("inlineLoader2 normal");
  return source;
}

inlineLoader2.pitch = () => {
  console.log("inlineLoader2 pitch");
};

module.exports = inlineLoader2;
