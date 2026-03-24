// backend/routes/treatments.js
const express = require("express");
const router = express.Router();
const Treatment = require("../models/Treatment");

// إضافة علاج
router.post("/add", async (req,res)=>{
  const {patientId,toothNumber,diagnosis,treatment,notes} = req.body;
  const newTreatment = new Treatment({patientId,toothNumber,diagnosis,treatment,notes});
  await newTreatment.save();

  // هنا يمكن إرسال رسالة WhatsApp تذكير أو تحديث
  res.json(newTreatment);
});

module.exports = router;