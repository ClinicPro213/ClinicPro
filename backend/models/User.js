const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  age: { type: Number, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  clinicName: { type: String, required: true },
  clinicAddress: { type: String, required: true }
});

module.exports = mongoose.model('User', userSchema);
