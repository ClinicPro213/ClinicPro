// backend/models/Treatment.js
const mongoose = require("mongoose");

const TreatmentSchema = new mongoose.Schema({
  patientId: String,
  toothNumber: String,
  diagnosis: String,
  treatment: String,
  date: {type:Date, default:Date.now},
  notes: String
});

module.exports = mongoose.model("Treatment", TreatmentSchema);