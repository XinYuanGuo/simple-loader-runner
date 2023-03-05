function preLoader2(source) {
  console.log("preLoader2 normal");
  return source;
}

preLoader2.pitch = () => {
  console.log("preLoader2 pitch");
};

module.exports = preLoader2;
