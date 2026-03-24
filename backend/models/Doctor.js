// backend/models/Doctor.js
const mongoose = require("mongoose");

const DoctorSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  clinicName: String,
  clinicLocation: String,
  patientsCount: {type:Number, default:0},
  freeLimit: {type:Number, default:5},
  subscriptionStatus: {type:String, default:"free"}
});

module.exports = mongoose.model("Doctor", DoctorSchema);
