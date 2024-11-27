// Description: This file contains the logic to check the mode of the device and change the mode of the device.

const { MongoClient, Timestamp } = require("mongodb");
require("dotenv").config();
const dbURI = process.env.MONGO_URI;

const Function = require("./function.js");

// Connect to MongoDB
const client = new MongoClient(dbURI);

const checkmode = async (req, res) => {
  try {
    // Log the entire request body { HardwareID: 'EF-001' }
    //console.log('Received request body:', req.body);

    // Extract and convert fields to uppercase
    const { HardwareID } = req.body;
    const upperHardwareID = HardwareID.toUpperCase();

    //console.log('Uppercased HardwareID:', upperHardwareID);

    // Connect to MongoDB
    await client.connect();
    const db = client.db("frontier");
    if (!db) {
      console.error("Database not found");
      return;
    } else if (db) {
      //console.log("Connected to MongoDB");
      const collection = db.collection("sessions_log");
      if (!collection) {
        console.error("Collection not found");
        return;
      } else if (collection) {
        //console.log("Collection found");
        const device = await collection.findOne(
          { HardwareID: upperHardwareID },
          { projection: { _id: 0, Timestamp: 0 } } // ignore the Timestamp field
        );
        if (device) {
          console.log("Device found");

          // Update the OnlineTimestamp and Status
          const status = { Status: "Online" };
          const time = new Date();
          const formattedTime = time
            .toLocaleString("en-GB", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            })
            .replace(",", "");
          const onlineTime = { OnlineTimestamp: formattedTime };
          //console.log("Device", upperHardwareID, "status updated", "Time", formattedTime);

          await collection.updateOne(
            { HardwareID: upperHardwareID },
            { $set: { ...status, ...onlineTime } }
          );

          //TODO auto delete the device after 5 seconds
          // setTimeout(async () => {
          //     const afterFiveSeconds = new Date();
          //     const checkTimeFiveSec = afterFiveSeconds.toLocaleString('en-GB', {
          //         year: 'numeric',
          //         month: '2-digit',
          //         day: '2-digit',
          //         hour: '2-digit',
          //         minute: '2-digit',
          //         second: '2-digit',
          //         hour12: false
          //     }).replace(',', '');

          //     const devicetime = await collection.findOne({ HardwareID: upperHardwareID });
          //     console.log("new", checkTimeFiveSec, "device", devicetime.OnlineTimestamp);
          //     if (devicetime) {
          //         console.log("Device time", devicetime.OnlineTimestamp);
          //         if (checkTimeFiveSec > devicetime.OnlineTimestamp) {
          //             //await collection.deleteOne({ HardwareID: upperHardwareID });
          //             console.log("Device deleted");
          //         }
          //     }
          // }, 10000);

          // Add an activity log to the database
          const activityCollection = db.collection("activity_log");
          if (!activityCollection) {
            console.error("Activity log collection not found");
            return;
          } else {
            const activityLog = {
              TimeStamp: formattedTime,
              HardwareID: upperHardwareID,
              LogLevel: "INFO",
              Message: "Check device",
            };
            await activityCollection.insertOne(activityLog);
            //console.log("Activity log added");
          }

          res.status(200).json({
            HardwareID: device.HardwareID,
            Mode: device.Mode,
            Speed: device.Speed,
          });
        } else {
          console.log("Device not found");
          // Add an activity log to the database
          const activityCollection = db.collection("activity_log");
          if (!activityCollection) {
            console.error("Activity log collection not found");
            return;
          } else {
            const time = new Date();
            const formattedTime = time
              .toLocaleString("en-GB", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              })
              .replace(",", "");
            const activityLog = {
              TimeStamp: formattedTime,
              HardwareID: upperHardwareID,
              LogLevel: "ERROR",
              Message: "Device not found",
            };
            await activityCollection.insertOne(activityLog);
            //console.log("Activity log added");
          }
          res.status(404).send("Device not found");
        }
      }
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

//*[DONE]* 2. Add a new endpoint to register the device
const registerDevice = async (req, res) => {
  try {
    // Function to generate a new HardwareID
    random = Math.floor(Math.random() * 1000) + 1;
    // console.log(random);
    function generateHardwareID(random) {
      const prefix = "EF-";
      return prefix + random.toString().padStart(3, "0");
    }
    // Usage example
    const newID = generateHardwareID(random);
    // console.log(newID); // Output: EF-xxx
    const time = new Date();
    const formattedTime = time
      .toLocaleString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
      .replace(",", "");
    const newHardwareID = {
      HardwareID: newID,
      Mode: "SAFE",
      Speed: "MIDIUM",
      Timestamp: formattedTime,
      Status: "Offline",
      OnlineTimestamp: "",
    }; // Generate a new HardwareID format 001 002 or 010
    //console.log(newHardwareID);

    // connect to MongoDB
    await client.connect();
    const db = client.db("frontier");
    if (!db) {
      console.error("Database not found");
      return;
    } else if (db) {
      console.log("Connected to MongoDB");

      const collection = db.collection("sessions_log");
      //TODO: Add a activity log to the database
      const activityCollection = db.collection("activity_log");

      if (!collection) {
        console.error("Collection not found");
        return;
      } else if (collection) {
        console.log("Collection found");
      }

      // auto delete the device after 5 seconds
      // setTimeout(() => {
      //     collection.deleteOne({ HardwareID: newID });
      //     console.log("Device deleted");
      // }, 5000);

      // Perform the findOne query
      const existingDevice = await collection.findOne({ HardwareID: newID });

      if (existingDevice) {
        console.log("[SYSTEM]: HardwareID already exists");
        res.status(400).send("[SYSTEM]: Device registered");
        client.close();
      } else if (!existingDevice) {
        console.log("[SYSTEM]: registering device");

        await collection.insertOne(newHardwareID);

        //*DONE: Add a activity log to the database
        // Save activity log
        const activityLog = {
          TimeStamp: formattedTime,
          HardwareID: newID,
          LogLevel: "INFO",
          Message: "Device registered successfully",
        };
        await activityCollection.insertOne(activityLog);
        console.log("[SYSTEM]: Activity log added:");
        res.status(200).json({ HardwareID: newID });
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

const changeMode = async (req, res) => {
  try {
    // Log the entire request body to debug the issue
    // console.log("Received request body:", req.body);

    // Extract and convert fields to uppercase
    const { HardwareID, Mode, Speed } = req.body;
    const upperHardwareID = HardwareID.toUpperCase();
    const upperMode = Mode.toUpperCase();
    const upperSpeed = Speed ? Speed.toUpperCase() : null;

    //console.log("Uppercased values:", upperHardwareID, upperMode, upperSpeed);

    // Validate the input
    if (!upperHardwareID || !upperMode) {
      return res.status(400).send("HardwareID and Mode are required");
    }

    // Connect to MongoDB
    await client.connect();
    const db = client.db("frontier");
    const collection = db.collection("sessions_log");

    // Find the existing hardware
    const existingDevice = await collection.findOne(
      { HardwareID: upperHardwareID },
      { projection: { _id: 0 } }
    );
    if (!existingDevice) {
      console.log("Hardware ID not found");
      // add an activity log to the database
      const activityCollection = db.collection("activity_log");
      if (!activityCollection) {
        console.error("Activity log collection not found");
        return;
      } else {
        const time = new Date();
        const formattedTime = time
          .toLocaleString("en-GB", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })
          .replace(",", "");
        const activityLog = {
          TimeStamp: formattedTime,
          HardwareID: upperHardwareID,
          LogLevel: "ERROR",
          Message: "HardwareID not found",
        };
        await activityCollection.insertOne(activityLog);
        //console.log("Activity log added:");
      }
      return res.status(404).send("HardwareID not found");
    }

    // Set default speed if Speed is null
    const updatedSpeed =
      upperSpeed !== null ? upperSpeed : existingDevice.Speed;

    // middleware to check the mode
    if (upperMode === "PREDICTION") {
      //console.log("Changing HardwareID to Prediction mode...");

      const predictionData = {
        ...existingDevice,
        Mode: "PREDICTION",
        Speed: updatedSpeed,
      };

      // Update the database
      await collection.updateOne(
        { HardwareID: upperHardwareID },
        { $set: { Mode: "PREDICTION", Speed: updatedSpeed } }
      );

      if (collection) {
        const time = new Date();
        const formattedTime = time
          .toLocaleString("en-GB", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })
          .replace(",", "");
        const cmd_collection = db.collection("cmd_log");
        if (!cmd_collection) {
          console.error("Collection not found");
          return;
        } else if (cmd_collection) {
          const cmd = {
            Timestamp: formattedTime,
            HardwareID: upperHardwareID,
            CMD: { Mode: predictionData.Mode, Speed: predictionData.Speed },
          };
          await cmd_collection.insertOne(cmd);
          const activityCollection = db.collection("activity_log");
          if (!activityCollection) {
            console.error("Activity log collection not found");
            return;
          } else {
            const activityLog = {
              TimeStamp: formattedTime,
              HardwareID: upperHardwareID,
              LogLevel: "INFO",
              Message: "Device mode changed to PREDICTION",
            };
            await activityCollection.insertOne(activityLog);
            console.log("Activity log added:");
          }
        }
      }

      return res.status(200).json({
        HardwareID: predictionData.HardwareID,
        Mode: predictionData.Mode,
        Speed: predictionData.Speed,
      });
    } else if (upperMode === "SAFE") {
      console.log("Changing HardwareID to SAFE mode...");

      const safeModeData = {
        ...existingDevice,
        Mode: "SAFE",
        Speed: updatedSpeed,
      };

      // Update the database
      await collection.updateOne(
        { HardwareID: upperHardwareID },
        { $set: { Mode: "SAFE", Speed: updatedSpeed } }
      );

      if (collection) {
        const time = new Date();
        const formattedTime = time
          .toLocaleString("en-GB", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })
          .replace(",", "");
        const cmd_collection = db.collection("cmd_log");
        if (!cmd_collection) {
          console.error("Collection not found");
          return;
        } else if (cmd_collection) {
          const cmd = {
            Timestamp: formattedTime,
            HardwareID: upperHardwareID,
            CMD: { Mode: safeModeData.Mode, Speed: safeModeData.Speed },
          };
          await cmd_collection.insertOne(cmd);
          console.log("command log added");
          //TODO: Add a activity log to the database
          const activityCollection = db.collection("activity_log");
          if (!activityCollection) {
            console.error("Activity log collection not found");
            return;
          } else {
            const activityLog = {
              TimeStamp: formattedTime,
              HardwareID: upperHardwareID,
              LogLevel: "INFO",
              Message: "Device mode changed to SAFE",
            };
            await activityCollection.insertOne(activityLog);
            //console.log("Activity log added:");
          }
        }
      }
      return res.status(200).json({
        HardwareID: safeModeData.HardwareID,
        Mode: safeModeData.Mode,
        Speed: safeModeData.Speed,
      });
    } else {
      console.log("Invalid mode received");
      // add an activity log to the database
      const activityCollection = db.collection("activity_log");
      if (!activityCollection) {
        console.error("Activity log collection not found");
        return;
      } else {
        const time = new Date();
        const formattedTime = time
          .toLocaleString("en-GB", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })
          .replace(",", "");
        const activityLog = {
          TimeStamp: formattedTime,
          HardwareID: upperHardwareID,
          LogLevel: "ERROR",
          Message: "Invalid mode",
        };
        await activityCollection.insertOne(activityLog);
        //console.log("Activity log added:");
        return res.status(400).send("Invalid mode");
      }
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

const listHardware = async (req, res) => {
  try {
    // Connect to MongoDB
    await client.connect();
    const db = client.db("frontier");
    const collection = db.collection("sessions_log");

    // Find all devices
    const devices = await collection
      .find({}, { projection: { _id: 0 } })
      .toArray();
    if (!devices) {
      console.log("No devices found");
      return res.status(404).send("No devices found");
    }

    return res.status(200).json(devices);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = { checkmode, registerDevice, changeMode, listHardware };
