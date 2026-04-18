const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');
require('dotenv').config();

const app = express();
const session = require('express-session');

app.use(session({
  secret: process.env.JWT_SECRET || 'dentify_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 أيام
}));
// ========== Admin Routes ==========

// جلب إحصائيات عامة
app.get('/api/admin/stats', async (req, res) => {
  try {
    const totalPatients = await User.countDocuments({ role: 'patient', isBanned: false });
    const totalDoctors = await User.countDocuments({ role: 'doctor', isBanned: false });
    const pendingDoctors = await DoctorProfile.countDocuments({ verificationStatus: 'pending' });
    const activeSubscriptions = await Subscription.countDocuments({ isActive: true, endDate: { $gt: new Date() } });
    const monthlyRevenue = 500 * (await Subscription.countDocuments({ type: 'normal', isActive: true })) +
                           1000 * (await Subscription.countDocuments({ type: 'featured', isActive: true }));
    
    res.json({ totalPatients, totalDoctors, pendingDoctors, activeSubscriptions, monthlyRevenue });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// جلب جميع المستخدمين (مرضى وأطباء)
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } }).sort({ createdAt: -1 });
    const doctors = await DoctorProfile.find().populate('userId');
    
    const usersWithDetails = await Promise.all(users.map(async (user) => {
      const doctorProfile = await DoctorProfile.findOne({ userId: user._id });
      const subscription = await Subscription.findOne({ doctorId: user._id, isActive: true });
      return {
        ...user.toObject(),
        doctorProfile,
        subscription: subscription ? { type: subscription.type, endDate: subscription.endDate } : null
      };
    }));
    
    res.json(usersWithDetails);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// جلب طلبات التوثيق (الأطباء pending)
app.get('/api/admin/pending-doctors', async (req, res) => {
  try {
    const pendingDoctors = await DoctorProfile.find({ verificationStatus: 'pending' }).populate('userId');
    res.json(pendingDoctors);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// قبول أو رفض طبيب
app.post('/api/admin/verify-doctor/:id', async (req, res) => {
  try {
    const { status } = req.body; // approved or rejected
    const doctorProfile = await DoctorProfile.findById(req.params.id);
    if (!doctorProfile) return res.status(404).json({ error: 'الطبيب غير موجود' });
    
    doctorProfile.verificationStatus = status;
    doctorProfile.isActive = (status === 'approved');
    await doctorProfile.save();
    
    res.json({ success: true, message: status === 'approved' ? 'تم قبول الطبيب' : 'تم رفض الطبيب' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// إضافة/تجديد اشتراك لطبيب
app.post('/api/admin/add-subscription', async (req, res) => {
  try {
    const { doctorId, type, months } = req.body; // type: normal(500) or featured(1000)
    const price = type === 'normal' ? 500 : 1000;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);
    
    // تعطيل الاشتراكات القديمة
    await Subscription.updateMany({ doctorId, isActive: true }, { isActive: false });
    
    const subscription = new Subscription({
      doctorId, type, startDate, endDate, amountPaid: price * months, isActive: true
    });
    await subscription.save();
    
    // تفعيل الطبيب إذا كان مقبولاً
    const doctorProfile = await DoctorProfile.findOne({ userId: doctorId });
    if (doctorProfile && doctorProfile.verificationStatus === 'approved') {
      doctorProfile.isActive = true;
      await doctorProfile.save();
    }
    
    res.json({ success: true, message: `تم تفعيل الاشتراك لمدة ${months} شهر/أشهر بمبلغ ${price * months} ريال` });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// رفع طبيب لأول القائمة (ترقية لمدة شهر مميز)
app.post('/api/admin/make-featured/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    // تعطيل الاشتراك العادي الحالي
    await Subscription.updateMany({ doctorId, isActive: true }, { isActive: false });
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    
    const subscription = new Subscription({
      doctorId, type: 'featured', startDate, endDate, amountPaid: 1000, isActive: true
    });
    await subscription.save();
    
    res.json({ success: true, message: 'تم رفع الطبيب لأول القائمة لمدة شهر' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// حظر أو إلغاء حظر مستخدم
app.post('/api/admin/toggle-ban/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    
    user.isBanned = !user.isBanned;
    await user.save();
    
    // إذا كان طبيباً، قم بتعطيل حسابه في الملف الشخصي
    if (user.role === 'doctor') {
      const doctorProfile = await DoctorProfile.findOne({ userId: user._id });
      if (doctorProfile) {
        doctorProfile.isActive = !user.isBanned;
        await doctorProfile.save();
      }
    }
    
    res.json({ success: true, isBanned: user.isBanned, message: user.isBanned ? 'تم حظر المستخدم' : 'تم إلغاء حظر المستخدم' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// حذف مستخدم
app.delete('/api/admin/delete-user/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    
    if (user.role === 'doctor') {
      await DoctorProfile.deleteOne({ userId: user._id });
      await Subscription.deleteMany({ doctorId: user._id });
    }
    await User.deleteOne({ _id: user._id });
    
    res.json({ success: true, message: 'تم حذف المستخدم' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ========== Middleware ==========
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('frontend'));

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
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
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
