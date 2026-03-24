// backend/routes/patients.js
const express = require("express");
const router = express.Router();
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");

// إضافة مريض جديد
router.post("/add", async (req,res)=>{
  const {doctorId,name,age,phone} = req.body;
  const doctor = await Doctor.findById(doctorId);

  if(doctor.patientsCount >= doctor.freeLimit && doctor.subscriptionStatus !== "active")
    return res.status(403).json({message:"لقد انتهت الحالات المجانية"});

  const patient = new Patient({doctorId,name,age,phone});
  await patient.save();

  doctor.patientsCount +=1;
  await doctor.save();

  // هنا يمكن إضافة إرسال رسالة WhatsApp ترحيبية

  res.json(patient);
});

module.exports = router;