import mongoose from 'mongoose';
import 'dotenv/config';

async function checkPerangkatDaerah() {
  try {
    const mongoURI = process.env.MONGODB_URI;
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB Atlas');

    // Import model after connection
    const PerangkatDaerah = (await import('./models/PerangkatDaerah.js')).default;

    // Check for existing kodeOrganisasi '1.01.01'
    const existing = await PerangkatDaerah.find({ kodeOrganisasi: '1.01.01' });
    console.log('Existing records with kodeOrganisasi 1.01.01:', JSON.stringify(existing, null, 2));

    // Get all records
    const all = await PerangkatDaerah.find({});
    console.log('Total perangkat daerah records:', all.length);

    all.forEach((record, index) => {
      console.log(`Record ${index + 1}: ${record.nama} - ${record.kodeOrganisasi} (ID: ${record._id})`);
    });

    await mongoose.connection.close();
    console.log('Database connection closed');

  } catch (error) {
    console.error('Error:', error);
  }
}

checkPerangkatDaerah();