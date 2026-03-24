// backend/routes/auth.js
const express = require("express");
const router = express.Router();
const Doctor = require("../models/Doctor");

// تسجيل أو تحديث بيانات الطبيب بعد Google Sign-In
router.post("/register", async (req,res)=>{
  const {name,email,phone,clinicName,clinicLocation} = req.body;
  let doctor = await Doctor.findOne({email});
  if(!doctor){
    doctor = new Doctor({name,email,phone,clinicName,clinicLocation});
    await doctor.save();
  }
  res.json(doctor);
});

module.exports = router;
