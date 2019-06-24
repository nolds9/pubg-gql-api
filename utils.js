module.exports = {};

module.exports.validateArgs = (args = {}, argNames = []) => {
  argNames.forEach(argName => {
    if (!args[argName]) {
      throw new Error(`Must provide ${argName}`);
    }
  });
};

module.exports.validateApiKey = () => {
  if (!process.env.PUBG_API_KEY) {
    throw new Error("Must provide valid api key");
  }
};

module.exports.validateResponse = (response = {}, isDataArray = false) => {
  if (
    !response ||
    !response.data ||
    ((isDataArray && !response.data.length) ||
      (isDataArray && !response.data[0])) ||
    (!isDataArray && !Object.keys(response.data).length)
  ) {
    throw new Error(
      "Request failed: bad request or no data for provided arguments"
    );
  }
};
