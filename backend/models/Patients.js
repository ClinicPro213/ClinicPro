// backend/models/Patient.js
const mongoose = require("mongoose");

const PatientSchema = new mongoose.Schema({
  doctorId: String,
  name: String,
  age: Number,
  phone: String,
  createdAt: {type:Date, default:Date.now}
});

module.exports = mongoose.model("Patient", PatientSchema);