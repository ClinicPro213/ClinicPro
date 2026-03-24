const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const router = express.Router();

// إنشاء حساب جديد
router.post('/signup', async (req, res) => {
  try {
    const { fullName, phone, age, username, password, clinicName, clinicAddress } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      fullName,
      phone,
      age,
      username,
      password: hashedPassword,
      clinicName,
      clinicAddress
    });

    await user.save();
    res.status(201).json({ message: 'تم إنشاء الحساب بنجاح' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// تسجيل الدخول
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // اسم المستخدم أو الهاتف
    const user = await User.findOne({
      $or: [{ username: identifier }, { phone: identifier }]
    });
    if (!user) return res.status(400).json({ error: 'اسم المستخدم أو رقم الهاتف غير صحيح' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'كلمة المرور غير صحيحة' });

    res.json({ message: 'تم تسجيل الدخول بنجاح', userId: user._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
