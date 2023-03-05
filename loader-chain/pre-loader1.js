function preLoader1(source) {
  console.log("preLoader1 normal");
  return source;
}

preLoader1.pitch = () => {
  console.log("preLoader1 pitch");
};

module.exports = preLoader1;
