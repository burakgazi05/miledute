require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB baglantisi basarili.');

    const existing = await Admin.findOne({ username: 'admin' });
    if (existing) {
      console.log('Admin kullanicisi zaten mevcut. Islem atlanıyor.');
    } else {
      await Admin.create({ username: 'admin', password: 'Miledute2024!' });
      console.log('Admin kullanicisi olusturuldu: admin / Miledute2024!');
    }
  } catch (err) {
    console.error('Hata:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
