function postLoader1(source) {
  console.log("postLoader1 normal");
  return source;
}

postLoader1.pitch = () => {
  console.log("postLoader1 pitch");
};

module.exports = postLoader1;
