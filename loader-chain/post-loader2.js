function postLoader2(source) {
  console.log("postLoader2 normal");
  return source;
}

postLoader2.pitch = () => {
  console.log("postLoader2 pitch");
};

module.exports = postLoader2;
