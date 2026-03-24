// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const patientRoutes = require("./routes/patients");
const treatmentRoutes = require("./routes/treatments");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser:true, useUnifiedTopology:true})
.then(()=>console.log("MongoDB connected"))
.catch(err=>console.log(err));

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/treatments", treatmentRoutes);

app.get("/", (req,res)=> res.send("Clinic Pro API running"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));
