require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--user' && args[i + 1]) {
      params.username = args[++i];
    } else if (args[i] === '--password' && args[i + 1]) {
      params.password = args[++i];
    }
  }
  return params;
}

async function seed() {
  const { username, password } = parseArgs();

  if (!username || !password) {
    console.error('Kullanim: node scripts/seedAdmin.js --user <kullanici> --password <sifre>');
    console.error('Ornek:    node scripts/seedAdmin.js --user admin --password GucluSifre123!');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB baglantisi basarili.');

    const existing = await Admin.findOne({ username });
    if (existing) {
      existing.password = password;
      await existing.save();
      console.log(`Admin sifresi guncellendi: ${username}`);
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
