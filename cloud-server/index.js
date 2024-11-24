//! Danger: This is a simple server for testing purposes only. Do not use in production.
//* This server is for testing purposes only. Do not use in production.
//? This server is for testing purposes only. Do not use in production.
//TODO: This server is for testing purposes only. Do not use in production.

// Required modules
const express = require("express");
const app = express();
const port = process.env.PORT || 8000;
const WebSocket = require("ws");
const http = require("http");
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });
const wss2 = new WebSocket.Server({ noServer: true });
const cors = require("cors");
const bodyParser = require("body-parser");
const mongodb = require("mongodb");

// Load environment variables
require("dotenv").config();

// Middleware
app.use(cors());
app.use(bodyParser.json());

//TODO---------------------------------------MongoDB-----------------------------------------
// connect to MongoDB
// const uri = process.env.MONGO_URI; // Ensure this is correctly loaded
const client = new mongodb.MongoClient(process.env.MONGO_URI);
let db;

// async function connectToDatabase() {
//   try {
//     await client.connect();
//     console.log("Connected to MongoDB successfully!");
//   } catch (err) {
//     console.error("Error connecting to MongoDB:", err.message);
//   }
// }
// connectToDatabase();
client
  .connect()
  .then(() => {
    db = client.db("frontier");
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
  });
//TODO--------------------------------------------------------------------------------------------

//TODO--------------- Switching Modes -------------------------
// Default Mode
let currentMode = "SAFE";
//TODO---------------------------------------------------------

const clients = new Map();

// WebSocket connection
wss.on("connection", (ws) => {
  console.log("Client connected to /");
  ws.send("Welcome to the server");

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message); // Parse the incoming message
      const { HardwareID, Mode, SPEED, Data, Event, TimeStamp } = data;

      if (!HardwareID || !Mode) {
        ws.send(
          JSON.stringify({
            type: "Error",
            message: "Invalid payload: Missing HardwareID or Mode",
          })
        );
        return;
      }

      // MongoDB Collections
      const safeModeCollection = db.collection("safeModeData");
      const predictionModeCollection = db.collection("predictionModeData");

      if (Mode === "Safe mode") {
        // Safe mode handling
        const safeModeData = {
          HardwareID,
          Mode,
          SPEED,
          Data: {
            CO2: Math.floor(Math.random() * 100.0),
            HUMID: Math.floor(Math.random() * 100.0),
            PRESSURE: Math.floor(Math.random() * 100.0),
            RA: Math.floor(Math.random() * 100.0),
            TEMP: Math.floor(Math.random() * 100.0),
            VOC: Math.floor(Math.random() * 100.0),
          },
          Event,
          TimeStamp: TimeStamp || new Date().toISOString(),
        };

        await safeModeCollection.insertOne(safeModeData);

        // Broadcast Safe mode data to all clients
        broadcast({
          type: "SafeModeData",
          record: safeModeData,
        });
        ws.send(
          JSON.stringify({
            type: "Success",
            message: "Safe mode data created",
            data: safeModeData,
          })
        );
      } else if (Mode === "PREDICTION") {
        // Transition to Prediction mode
        const existingSafeModeRecord = await safeModeCollection.findOne({
          HardwareID,
        });

        if (!existingSafeModeRecord) {
          ws.send(
            JSON.stringify({
              type: "Error",
              message: "HardwareID not found in Safe mode",
            })
          );
          return;
        }

        const predictionData = {
          ...existingSafeModeRecord,
          Mode: "Prediction mode",
          SPEED,
          Prediction: {
            Cold: 0.0,
            Dry: 0.0,
            Hot: 0.0,
          },
        };

        await predictionModeCollection.insertOne(predictionData);
        await safeModeCollection.deleteOne({ HardwareID });

        // Broadcast Prediction mode data to all clients
        broadcast({
          type: "PredictionModeData",
          record: predictionData,
        });
        ws.send(
          JSON.stringify({
            type: "Success",
            message: "Mode switched to Prediction mode",
            data: predictionData,
          })
        );
      } else {
        ws.send(
          JSON.stringify({
            type: "Error",
            message: "Invalid mode or unrecognized command",
          })
        );
      }
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
      ws.send(
        JSON.stringify({ type: "Error", message: "Internal server error" })
      );
    }
  });

  // Handle incoming messages
  // ws.on("message", async (data) => {
  // try {
  //   const buffer = Buffer.from(data);
  //   const objArray = JSON.parse(buffer.toString());
  //   // Check if required fields are present
  //   if (objArray.Mode && objArray.Data && objArray.TimeStamp) {
  //     console.log("Valid data received:", objArray);
  //     // Process data according to mode
  //     if (objArray.Mode === "SAFE") {
  //       await handleSafeMode(objArray, ws);
  //     } else if (objArray.Mode === "PREDICTION") {
  //       await handlePredictionMode(objArray, ws);
  //     } else {
  //       ws.send("Invalid mode. Please use 'Safe mode' or 'Prediction mode'.");
  //     }
  //   } else {
  //     ws.send("Invalid data structure. Missing required fields.");
  //   }

  // if (objArray.command && objArray.command.startsWith("Mode")) {
  //   // const mode = objArray.command.split(":")[1];
  //   if (mode === "Safe mode" || mode === "Prediction mode") {
  //     currentMode = mode;
  //     console.log(`Mode switched to: ${currentMode}`);
  //     ws.send(`Mode switched to: ${currentMode}`);
  //   } else {
  //     ws.send(
  //       "Invalid mode. Use 'Mode:Safe mode' or 'Mode:Prediction mode'"
  //     );
  //   }
  //   return;
  // }
  // if (currentMode === "Safe mode") {
  //   await handleSafeMode(message, ws);
  // } else if (currentMode === "Prediction mode") {
  //   await handlePredictionMode(message, ws);
  // }
  // } catch (err) {
  //   console.error("Error processing message:", err.message);
  //   ws.send("Error processing data");
  // }
  // // Log received data
  // console.log("Received data:", objArray);

  // //*------------------------------------------------------------------------------------------
  // // send data to all client
  // wss.clients.forEach((client) => {
  //   if (client.readyState === WebSocket.OPEN) {
  //     client.send(JSON.stringify(objArray));
  //   }
  // });
  //*------------------------------------------------------------------------------------------

  //   //TODO---------------------------------------MongoDB-----------------------------------------
  //   // Store data in MongoDB

  //   // Ensure `objArray` is an array
  //   const documents = Array.isArray(objArray) ? objArray : [objArray];
  //   // MongoDB collection
  //   const collection = db.collection("data_Log");

  //   // Insert data into the collection
  //   const result = await collection.insertMany(documents);
  //   console.log("Data stored in MongoDB:", result.insertedCount);

  //   // Check the total number of documents in the collection
  //   const count = await collection.countDocuments();
  //   console.log("Total number of documents:", count);
  //   if (count > 100) {
  //     //     // Delete the oldest documents to keep the total count at 100
  //     const excessCount = count - 100;
  //     const oldestDocs = await collection
  //       .find()
  //       .sort({ _id: 1 })
  //       .limit(excessCount)
  //       .toArray();
  //     const oldestIds = oldestDocs.map((doc) => doc._id);
  //     await collection.deleteMany({ _id: { $in: oldestIds } });
  //     console.log(
  //       `Deleted ${excessCount} oldest documents to maintain a maximum of 100 documents.`
  //     );
  //   }
  //   //TODO---------------------------------------MongoDB-----------------------------------------
  // } catch (err) {
  //   console.error("Error processing message:", err.message);
  //   ws.send("Error processing data");
  // }
  // });

  // Handle errors
  ws.on("error", (err) => {
    console.error("WebSocket error:", err.message);
  });

  // Handle client disconnection
  ws.on("close", () => {
    console.log("Client disconnected from /");
  });
});

const broadcast = (message) => {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
};

app.post("/command", async (req, res) => {
  const { HardwareID, Mode, SPEED, Data, Event, TimeStamp } = req.body;

  try {
    const safeModeCollection = db.collection("safeModeData");
    const predictionModeCollection = db.collection("predictionModeData");

    if (Mode === "Safe mode") {
      // Safe mode handling
      const safeModeData = {
        HardwareID,
        Mode,
        SPEED,
        Data: {
          CO2: Math.floor(Math.random() * 100.0),
          HUMID: Math.floor(Math.random() * 100.0),
          PRESSURE: Math.floor(Math.random() * 100.0),
          RA: Math.floor(Math.random() * 100.0),
          TEMP: Math.floor(Math.random() * 100.0),
          VOC: Math.floor(Math.random() * 100.0),
        },
        Event,
        TimeStamp: TimeStamp || new Date().toISOString(),
      };

      await safeModeCollection.insertOne(safeModeData);

      broadcast({
        type: "SafeModeData",
        record: safeModeData,
      });

      return res
        .status(201)
        .send({ message: "Safe mode data created", data: safeModeData });
    } else if (Mode === "PREDICTION") {
      // Transition to Prediction mode
      const existingSafeModeRecord = await safeModeCollection.findOne({
        HardwareID,
      });

      if (!existingSafeModeRecord) {
        return res
          .status(404)
          .send({ message: "HardwareID not found in Safe mode" });
      }

      const predictionData = {
        ...existingSafeModeRecord,
        Mode: "Prediction mode",
        SPEED,
        Prediction: {
          Cold: 0.0,
          Dry: 0.0,
          Hot: 0.0,
        },
      };

      await predictionModeCollection.insertOne(predictionData);
      await safeModeCollection.deleteOne({ HardwareID });

      broadcast({
        type: "PredictionModeData",
        record: predictionData,
      });

      return res.status(200).send({
        message: "Mode switched to Prediction mode",
        data: predictionData,
      });
    }

    // Invalid mode
    return res.status(400).send({ message: "Invalid mode or data" });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Internal server error" });
  }
});

//* ws://localhost:8000/demo endpoint
//* WebSocket connection
wss2.on("connection", (ws, req) => {
  const url = req.url; // Extract the URL of the WebSocket request

  if (url === "/demo") {
    console.log("Client connected to /demo");
    //  random template data :
    //  "TimeStamp": "",
    //  "Event": "random event",
    //  "Data": {
    //              "CO2": random number,
    //              "VOC": random number,
    //              "RA": random number,
    //              "TEMP": random number,
    //              "HUMID": random number,
    //              "PRESSURE": random number
    //          }

    // console.log('Sending data:', data);
    // loop to send data every 1 seconds
    // Periodic data broadcasting
    setInterval(() => {
      const time = new Date();
      const baseData = {
        Event: "random event",
        TimeStamp: time, // Time stamp
        Data: {
          CO2: Math.floor(Math.random() * 100.0),
          VOC: Math.floor(Math.random() * 100.0),
          RA: Math.floor(Math.random() * 100.0),
          TEMP: Math.floor(Math.random() * 100.0),
          HUMID: Math.floor(Math.random() * 100.0),
          PRESSURE: Math.floor(Math.random() * 100.0),
        },
      };

      // Add the `Event` field only in Prediction Mode
      if (currentMode === "Prediction mode") {
        baseData.Event = "random event"; // Example event, replace with real logic
      }

      // Broadcast data to all clients
      wss2.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(baseData));
        }
      });
      console.log(`Data ${currentMode}:`, baseData);
    }, 1000);

    // Handle errors
    ws.on("error", (err) => {
      console.error("WebSocket error on /demo:", err.message);
    });

    // Handle client disconnection
    ws.on("close", () => {
      console.log("Client disconnected from /demo");
    });
  } else {
    // Handle default connection or other paths
    console.log("Client connected to default WebSocket");
    ws.send("Welcome to the default WebSocket endpoint");

    ws.on("message", (message) => {
      console.log("Received message on default.");

      // Handle or broadcast the message
      ws.send(`Default handler received: ${message}`);
    });

    ws.on("error", (err) => {
      console.error("WebSocket error on default:", err.message);
    });

    ws.on("close", () => {
      console.log("Client disconnected from default");
      clearInterval(intervalId);
    });
  }
});

//--------------------------------------------------------------------------------------------

// Health check endpoint
app.get("/", (req, res) => {
  res.send("Server is running");
});

app.post("/api/data", (req, res) => {
  // Extract data from the request body
  const data = req.body;
  // Log the entire request body to debug the issue
  console.log("Received request body:", JSON.stringify(data));

  // Stream data to all clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });

  res.send("Data sent to all clients");
});

// Upgrade the HTTP server to a WebSocket server
server.on("upgrade", (req, socket, head) => {
  const pathname = req.url
    ? new URL(req.url, `http://${req.headers.host}`).pathname
    : "";

  if (pathname === "/") {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  } else if (pathname === "/demo") {
    wss2.handleUpgrade(req, socket, head, (ws) => {
      wss2.emit("connection", ws, req);
    });
  } else {
    socket.destroy();
  }
});

//--------------------------------------------------------------------------------------------
// Server listening
server.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});
