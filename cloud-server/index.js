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
    console.log("[MONGO]: Connection successful");
  })
  .catch((err) => {
    console.error("[MONGO]: Connection error:", err.message);
  });
//--------------------------------------------------------------------------------------------

// WebSocket connection
wss.on("connection", (ws) => {
  // console.log('Client connected to /');
  ws.send("Welcome to the server");

  // Handle incoming messages
  ws.on("message", async (data) => {
    try {
      const buffer = Buffer.from(data);
      const objArray = JSON.parse(buffer.toString());

      // Log received data
      // console.log('Received data:', objArray);

      // Send data to all clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(objArray));
        }
      });

      // Ensure `objArray` is an array
      const documents = Array.isArray(objArray) ? objArray : [objArray];
      // MongoDB collection
      const collection = db.collection("data_log");

      // Insert data into the collection
      const result = await collection.insertMany(documents);
      // console.log("Data stored in MongoDB:", result.insertedCount);

      // Check the total number of documents in the collection
      const count = await collection.countDocuments();
      // console.log("Total number of documents:", count);

      // Delete data if data is over 3 minutes old
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
      const deleteResult = await collection.deleteMany({
        Timestamp: { $lt: threeMinutesAgo },
      });
      //console.log(`Deleted ${deleteResult.deletedCount} documents older than 3 minutes`);
    } catch (err) {
      console.error("Error processing message:", err.message);
      ws.send("Error processing data");
    }
  });

  // Handle errors
  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
  });

  // Handle client disconnection
  ws.on("close", () => {
    console.log("Client disconnected from websocket server");
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

      const data = {
        Data: {
          CO2: Math.floor(Math.random() * 100.0),
          VOC: Math.floor(Math.random() * 100.0),
          RA: Math.floor(Math.random() * 100.0),
          TEMP: Math.floor(Math.random() * 100.0),
          HUMID: Math.floor(Math.random() * 100.0),
          PRESSURE: Math.floor(Math.random() * 100.0),
        },
        Event: "random event",
        HardwareID: "EF-840",
        Mode: "PREDICTION",
        Prediction: {
          Cold: Math.floor(Math.random() * 100.0),
          Dry: Math.floor(Math.random() * 100.0),
          Hot: Math.floor(Math.random() * 100.0),
          Normal: Math.floor(Math.random() * 100.0),
          Warm: Math.floor(Math.random() * 100.0),
          Wet: Math.floor(Math.random() * 100.0),
        },
        TimeStamp: formattedTime, // time stamp
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
