module.exports = async () => {
  const mongo = global.__MONGO_SERVER__;
  if (mongo) {
    await mongo.stop();
  }
};
