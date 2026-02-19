require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Experience = require('../models/Experience');

const defaultExperiences = [
  {
    title: 'Bolum I: Bagin Uyanisi',
    description: "Toskana'da mahrem bir mahzende, 3 Michelin yildizli sefimizle ates ve sarap temali kapali devre bir gece.",
    order: 1,
    active: true
  },
  {
    title: 'Bolum II: Tarihin Yankisi',
    description: 'Yuzyillik bir malikanede, sadece 10 seckin konuk icin tasarlanmis teatral gastronomi seremonisi.',
    order: 2,
    active: true
  },
  {
    title: 'Bolum III: Sirlarin Sofrasi',
    description: 'Rotasi son ana kadar gizli tutulan ozel bir lokasyonda, dunyanin en nadir tatlariyla bulusma.',
    order: 3,
    active: true
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB baglantisi basarili.');

    const count = await Experience.countDocuments();
    if (count > 0) {
      console.log('Deneyimler zaten mevcut (' + count + ' adet). Islem atlaniyor.');
    } else {
      await Experience.insertMany(defaultExperiences);
      console.log('Varsayilan deneyimler olusturuldu.');
    }
  } catch (err) {
    console.error('Hata:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
