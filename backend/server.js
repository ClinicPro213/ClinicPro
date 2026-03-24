const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const userRoutes = require('../routes/users');

const app = express();

// إعدادات
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ربط Routes
app.use('/api/users', userRoutes);

// الاتصال بقاعدة البيانات
mongoose.connect('mongodb://localhost:27017/clinicpro', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error(err));

// بدء السيرفر
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Clinic Pro API running on port ${PORT}`);
});
