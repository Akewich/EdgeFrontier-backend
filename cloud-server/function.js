const { MongoClient } = require("mongodb");
require("dotenv").config();
const dbURI = process.env.MONGO_URI;
const client = new MongoClient(dbURI);

async function AutoDelete() {
  try {
    // Connect to MongoDB
    await client.connect();
    const db = client.db("frontier");
    if (!db) {
      console.error("Database not found");
      return;
    } else {
      console.log("Connected to MongoDB");
      const collection = db.collection("sessions_log");
      if (!collection) {
        console.error("Collection not found");
        return;
      } else if (collection) {
        console.log("Collection found");

        //await collection.deleteOne({ :  });
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.close();
  }
}

// Example of another function
async function AnotherFunction() {
  // Your code here
}

// Export all functions
module.exports = {
  AutoDelete,
  AnotherFunction,
};
