const path = require("path");
const { MongoClient, ServerApiVersion } = require("mongodb");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const uri = process.env.MONGO_URI;

if (!uri) {
  console.error(
    "MONGO_URI is not set. Add it to syict-backend/.env before running this script.",
  );
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    console.log("Connecting...");
    await client.connect();
    console.log("Pinging...");
    await client.db("admin").command({ ping: 1 });
    console.log(
      "✅ Pinged your deployment. You successfully connected to MongoDB!",
    );
  } catch (e) {
    console.error("❌ Connection failed", e);
  } finally {
    await client.close();
  }
}
run();
