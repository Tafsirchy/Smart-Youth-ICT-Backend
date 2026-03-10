const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://smartyouthictbd_db_user:NluQRtCDLjf5exrH@syictltd.oy4yrbf.mongodb.net/?retryWrites=true&w=majority&appName=SYICTLTD";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    console.log("Connecting...");
    await client.connect();
    console.log("Pinging...");
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Pinged your deployment. You successfully connected to MongoDB!");
  } catch(e) {
    console.error("❌ Connection failed", e);
  } finally {
    await client.close();
  }
}
run();
