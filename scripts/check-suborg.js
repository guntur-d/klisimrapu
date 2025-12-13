const mongoose = require('mongoose');
const SubPerangkatDaerah = require('../models/SubPerangkatDaerah.js');

mongoose.connect('mongodb://localhost:27017/simrapu', { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
}).then(() => {
  console.log('Connected to MongoDB');
  return SubPerangkatDaerah.find().limit(10);
}).then((data) => {
  console.log('Sub organizations in database:', data.length);
  data.forEach((item, index) => {
    console.log(`${index + 1}. ${item.nama} (ID: ${item._id})`);
  });
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});