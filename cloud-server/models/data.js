const mongoose = require("mongoose");

const dataSchema = new mongoose.Schema({
  CO2: Number,
  HUMID: Number,
  PRESSURE: Number,
  RA: Number,
  TEMP: Number,
  VOC: Number,
  Timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("dataRead", dataSchema);
