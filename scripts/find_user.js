const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require("mongoose");
require("dotenv").config();
const User = require("../src/models/User");

const findUsers = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/syict";
    await mongoose.connect(mongoUri);
    const users = await User.find({ role: "student" }).select("email name _id").lean();
    console.log(users);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
findUsers();
