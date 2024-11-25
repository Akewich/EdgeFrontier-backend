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

//? another file
const mode = require("./control.js");

// Load environment variables
require("dotenv").config();

// Middleware
app.use(cors());
app.use(bodyParser.json());

//TODO---------------------------------------MongoDB-----------------------------------------
// connect to MongoDB
const client = new mongodb.MongoClient(process.env.MONGO_URI);
let db;

client
  .connect()
  .then(() => {
    db = client.db("frontier");
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
  });
//--------------------------------------------------------------------------------------------

// WebSocket connection
wss.on("connection", (ws) => {
  console.log("Client connected to /");
  ws.send("Welcome to the server");

  // Handle incoming messages
  ws.on("message", async (data) => {
    try {
      const buffer = Buffer.from(data);
      const objArray = JSON.parse(buffer.toString());

      // Log received data
      console.log("Received data:", objArray);

      //*------------------------------------------------------------------------------------------
      // send data to all client
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(objArray));
        }
      });
      //*------------------------------------------------------------------------------------------

      // //TODO---------------------------------------MongoDB-----------------------------------------
      // Store data in MongoDB
      // MongoDB collection
      // Ensure `objArray` is an array
      const documents = Array.isArray(objArray) ? objArray : [objArray];
      // MongoDB collection
      const collection = db.collection("data_log");

      // Insert data into the collection
      const result = await collection.insertMany(documents);
      console.log("Data stored in MongoDB:", result.insertedCount);

      // Check the total number of documents in the collection
      const count = await collection.countDocuments();
      console.log("Total number of documents:", count);
      if (count > 100) {
        // Delete the oldest documents to keep the total count at 100
        const excessCount = count - 100;
        const oldestDocs = await collection
          .find()
          .sort({ _id: 1 })
          .limit(excessCount)
          .toArray();
        const oldestIds = oldestDocs.map((doc) => doc._id);
        await collection.deleteMany({ _id: { $in: oldestIds } });
        console.log(
          `Deleted ${excessCount} oldest documents to maintain a maximum of 100 documents.`
        );
      }
      //TODO---------------------------------------MongoDB-----------------------------------------
    } catch (err) {
      console.error("Error processing message:", err.message);
      ws.send("Error processing data");
    }
  });

  // Handle errors
  ws.on("error", (err) => {
    console.error("WebSocket error:", err.message);
  });

  // Handle client disconnection
  ws.on("close", () => {
    console.log("Client disconnected from /");
  });
});

//--------------------------------------------------------------------------------------------

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
    setInterval(() => {
      const time = new Date();
      const data = {
        TimeStamp: time, // time stamp
        Event: "random event",
        Data: {
          CO2: Math.floor(Math.random() * 100.0),
          VOC: Math.floor(Math.random() * 100.0),
          RA: Math.floor(Math.random() * 100.0),
          TEMP: Math.floor(Math.random() * 100.0),
          HUMID: Math.floor(Math.random() * 100.0),
          PRESSURE: Math.floor(Math.random() * 100.0),
        },
        Prediction: {
          CO2: Math.floor(Math.random() * 100.0),
          VOC: Math.floor(Math.random() * 100.0),
          RA: Math.floor(Math.random() * 100.0),
          TEMP: Math.floor(Math.random() * 100.0),
          HUMID: Math.floor(Math.random() * 100.0),
          PRESSURE: Math.floor(Math.random() * 100.0),
        },
      };
      wss2.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
          console.log("Sending data from wss2.");
        }
      });
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

//TODO----------------------------------------------------------------------------------------

//TODO 1. Add a new endpoint to change modes
app.post("/hardware", mode.checkmode);
app.post("/command", mode.changeMode);
app.get("/register", mode.registerDevice);
app.get("/list", mode.listHardware);

//TODO----------------------------------------------------------------------------------------

// Server listening
server.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});
