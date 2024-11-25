// Description: This file contains the logic to check the mode of the device and change the mode of the device.

const e = require("express");
const { MongoClient } = require("mongodb");
require("dotenv").config();
const dbURI = process.env.MONGO_URI;

// Connect to MongoDB
const client = new MongoClient(dbURI);

//*[DONE]* 2. Add a new endpoint to register the device
//TODO: Add a activity log to the database
const registerDevice = async (req, res) => {
  try {
    // Function to generate a new HardwareID
    random = Math.floor(Math.random() * 1000) + 1;
    console.log(random);
    function generateHardwareID(random) {
      const prefix = "EF-";
      return prefix + random.toString().padStart(3, "0");
    }
    // Usage example
    const newID = generateHardwareID(random);
    console.log(newID); // Output: EF-xxx

    const newHardwareID = { HardwareID: newID }; // Generate a new HardwareID format 001 002 or 010
    console.log(newHardwareID);

    // connect to MongoDB
    await client.connect();
    const db = client.db("frontier");
    console.log("Connected to MongoDB");

    const collection = db.collection("sessions_log");

    if (!collection) {
      console.error("Collection not found");
      return;
    } else if (collection) {
      console.log("Collection found");
    }

    // Perform the findOne query
    const existingDevice = await collection.findOne({ HardwareID: newID });

    if (existingDevice) {
      console.log("[SYSTEM]: HardwareID already exists");
      res.status(400).send("[SYSTEM]: Device registered");
      client.close();
    } else if (!existingDevice) {
      console.log("[SYSTEM]: registering device");
      await collection.insertOne(newHardwareID);
      res.status(200).send({ HardwareID: newID });
    }
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

const checkMode = async (req, res) => {
  try {
    // Log the entire request body to debug the issue
    console.log("Received request body:", req.body);

    // Ensure req.body is an array and get the first element
    const modeObject = Array.isArray(req.body) ? req.body[0] : null;

    if (modeObject && modeObject.MODE) {
      const MODE = modeObject.MODE; // Extract the MODE value
      console.log("MODE:", MODE);

      if (MODE === "Safe mode") {
        res.send("Safe mode");
      } else if (MODE === "Normal mode") {
        res.send("Normal mode");
      } else {
        res.send("Invalid mode");
      }
    } else {
      res.status(400).send("Invalid request body");
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

const changeMode = async (req, res) => {
  try {
    await client.connect();
    const db = client.db("frontier");
    console.log("Connected to MongoDB");
    const collection = db.collection("sessions_log");

    // Log the entire request body to debug the issue
    console.log("Received request body:", req.body);

    const { HardwareID, Mode, SPEED } = req.body;

    // Validate the input
    if (!HardwareID || !Mode) {
      return res.status(400).send("HardwareID and Mode are required");
    }

    // Find the existing hardware
    const existingDevice = await collection.findOne({ HardwareID });
    if (!existingDevice) {
      console.log("Hardware ID not found");
      return res.status(404).send("Hardware not found");
    }

    if (Mode === "PREDICTION") {
      console.log("Changing HardwareID to Prediction mode...");

      const predictionData = {
        ...existingDevice,
        Mode: "Prediction mode",
        SPEED,
        Prediction: {}, // Add your prediction logic or data here
      };

      // Update the database
      await collection.updateOne(
        { HardwareID },
        { $set: { Mode: "Prediction mode", SPEED, Prediction: {} } }
      );

      return res.status(200).send({
        message: "Mode changed to Prediction mode",
        data: predictionData,
      });
    } else if (Mode === "SAFE") {
      console.log("Changing HardwareID to Safe mode...");

      const safeModeData = {
        ...existingDevice,
        Mode: "Safe mode",
        SPEED,
      };

      // Update the database
      await collection.updateOne(
        { HardwareID },
        { $set: { Mode: "Safe mode", SPEED } }
      );

      return res.status(200).send({
        message: "Mode changed to Safe mode",
        data: safeModeData,
      });
    } else {
      console.log("Invalid mode received");
      return res.status(400).send("Invalid mode");
    }
  } catch (error) {
    console.error("Error in changeMode:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = { checkMode, changeMode, registerDevice };
