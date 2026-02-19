require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

async function seed() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.error('Hata: .env dosyasinda ADMIN_USERNAME ve ADMIN_PASSWORD tanimlanmali.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB baglantisi basarili.');

    const existing = await Admin.findOne({ username });
    if (existing) {
      console.log('Admin kullanicisi zaten mevcut. Islem atlaniyor.');
    } else {
      await Admin.create({ username, password });
      console.log(`Admin kullanicisi olusturuldu: ${username}`);
    }
  } catch (err) {
    console.error('Hata:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
