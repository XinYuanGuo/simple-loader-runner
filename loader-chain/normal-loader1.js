function normalLoader1(source) {
  console.log("normalLoader1 normal");
  return source;
}

normalLoader1.pitch = () => {
  console.log("normalLoader1 pitch");
};

module.exports = normalLoader1;
