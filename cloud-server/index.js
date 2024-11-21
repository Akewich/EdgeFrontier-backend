// Required modules
const express = require("express");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 8000;
const WebSocket = require("ws");
const http = require("http");
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const dataRead = require("./models/data");

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connection to Database
mongoose
  .connect(process.env.DB_URI)
  .then(() => {
    console.log("Connected to MongoDB Database!");
  })
  .catch((err) => {
    console.log("Failed to connected to MongoDB", err.message);
  });

// WebSocket connection
wss.on("connection", (ws) => {
  console.log("Client connected");
  ws.send("Welcome to the server");

  // Handle incoming messages
  ws.on("message", async (data) => {
    try {
      const buffer = Buffer.from(data);
      const obj = JSON.parse(buffer.toString());

      // Log received data
      console.log("Received data:", obj);

      // Respond to client
      ws.send(
        `Message received and processed, Date: ${new Date().toISOString()}`
      );

      // boradcast to all clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(obj));
        }
      });
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
    console.log("Client disconnected");
  });
});

// Health check endpoint
app.get("/", (req, res) => {
  res.send("Server is running");
});

app.post("/", (req, res) => {
  const { username, password } = req.body;
  console.log("username:", username);
  console.log("password:", password);
  res.send("Post request received");
});

// Get all data
app.get("/api/data", async (req, res) => {
  try {
    const data = await dataRead.find();
    console.log("Data", data);
    res.status(200).json(data);

    // Stream data to all clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Error to fetching data" });
  }
});

// Get specific data by ID
app.get("/api/data/:id", async (req, res) => {
  try {
    const { id } = req.params; // request data form parameter
    const data = await dataRead.findById({ dataRead: id }); // find data by Id
    if (data.length === 0) {
      return res.status(404).json({ message: "Data not found!" });
    }

    // Broadcast to WebSocket clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: "Error to fetching data" });
  }
});

// Create Data
app.post("/api/data", async (req, res) => {
  try {
    const data = await dataRead.create(req.body);
    console.log("Created data:", data);

    // Respond to client
    res.status(201).json({ message: "Data logged successfully!", data });

    // Broadcast to WebSocket clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  } catch (error) {
    console.error("Error creating data:", error.message);
    res.status(500).json({ message: "Error creating data" });
  }
});

// Server listening
server.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port} Naja jubjub`);
});
