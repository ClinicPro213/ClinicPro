const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');
require('dotenv').config();

const app = express();

// ========== Middleware ==========
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ========== MongoDB Models ==========

const UserSchema = new mongoose.Schema({
  name: String, age: Number, gender: String, phone: { type: String, unique: true },
  password: String, role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
  isBanned: { type: Boolean, default: false }, createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const DoctorProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  profileImage: String, workLocation: String, workingHours: String,
  preferredGender: { type: String, enum: ['male', 'female', 'both'] },
  showPhone: { type: Boolean, default: false }, telegramUsername: String,
  treatments: { type: Map, of: Number },
  verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  universityCardImage: String, isActive: { type: Boolean, default: false }
});
const DoctorProfile = mongoose.model('DoctorProfile', DoctorProfileSchema);

const SubscriptionSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['normal', 'featured'] }, startDate: Date, endDate: Date,
  amountPaid: Number, isActive: { type: Boolean, default: true }
});
const Subscription = mongoose.model('Subscription', SubscriptionSchema);

// ========== إعداد رفع الملفات ==========
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// ========== Routes ==========

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/register-patient', async (req, res) => {
  try {
    const { name, age, gender, phone, password } = req.body;
    if (await User.findOne({ phone })) return res.status(400).json({ error: 'رقم الهاتف موجود' });
    const user = new User({ name, age, gender, phone, password: await bcrypt.hash(password, 10), role: 'patient' });
    await user.save();
    res.json({ success: true, message: 'تم التسجيل بنجاح' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/register-doctor', upload.fields([{ name: 'profileImage' }, { name: 'universityCard' }]), async (req, res) => {
  try {
    const { name, age, gender, phone, password, workLocation, workingHours, preferredGender, showPhone, telegramUsername, treatments } = req.body;
    if (await User.findOne({ phone })) return res.status(400).json({ error: 'رقم الهاتف موجود' });
    
    const user = new User({ name, age, gender, phone, password: await bcrypt.hash(password, 10), role: 'doctor' });
    await user.save();
    
    const treatmentsObj = treatments ? JSON.parse(treatments) : {};
    const doctor = new DoctorProfile({
      userId: user._id,
      profileImage: req.files['profileImage'] ? '/uploads/' + req.files['profileImage'][0].filename : '',
      universityCardImage: req.files['universityCard'] ? '/uploads/' + req.files['universityCard'][0].filename : '',
      workLocation, workingHours, preferredGender, showPhone: showPhone === 'true', telegramUsername,
      treatments: treatmentsObj
    });
    await doctor.save();
    
    res.json({ success: true, message: 'تم التسجيل، انتظر موافقة الأدمن', telegramBot: '@DentifyVerifyBot' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'بيانات غير صحيحة' });
    if (user.isBanned) return res.status(403).json({ error: 'حسابك محظور' });
    
    req.session.userId = user._id;
    req.session.userRole = user.role;
    res.json({ success: true, role: user.role, redirect: user.role === 'admin' ? '/admin.html' : '/dashboard.html' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/doctors', async (req, res) => {
  try {
    const doctors = await DoctorProfile.find({ verificationStatus: 'approved', isActive: true }).populate('userId');
    const subscriptions = await Subscription.find({ isActive: true, endDate: { $gt: new Date() } });
    
    const doctorsWithSubscription = doctors.map(doc => {
      const sub = subscriptions.find(s => s.doctorId.toString() === doc.userId._id.toString());
      return { ...doc.toObject(), subscriptionType: sub ? sub.type : 'none' };
    });
    
    doctorsWithSubscription.sort((a, b) => {
      if (a.subscriptionType === 'featured' && b.subscriptionType !== 'featured') return -1;
      if (a.subscriptionType !== 'featured' && b.subscriptionType === 'featured') return 1;
      return 0;
    });
    
    res.json(doctorsWithSubscription);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// ========== تشغيل الخادم ==========
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dentify')
  .then(() => app.listen(3000, () => console.log('🦷 Dentify running on http://localhost:3000')))
  .catch(err => console.log(err));
