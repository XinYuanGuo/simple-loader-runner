function normalLoader2(source) {
  console.log("normalLoader2 normal");
  return source;
}

normalLoader2.pitch = () => {
  console.log("normalLoader2 pitch");
};

module.exports = normalLoader2;
