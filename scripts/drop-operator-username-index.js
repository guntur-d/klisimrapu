import mongoose from 'mongoose';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI );
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Drop the problematic index
const dropOperatorUsernameIndex = async () => {
  try {
    const db = mongoose.connection.db;
    
    console.log('🔍 Checking existing indexes on subperangkatdaerahs collection...');
    const indexes = await db.collection('subperangkatdaerahs').listIndexes().toArray();
    
    console.log('Current indexes:');
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    // Find the operators.username_1 index
    const operatorUsernameIndex = indexes.find(index => 
      index.name === 'operators.username_1' || 
      (index.key && index.key['operators.username'] === 1)
    );
    
    if (operatorUsernameIndex) {
      console.log('🔧 Dropping problematic index:', operatorUsernameIndex.name);
      await db.collection('subperangkatdaerahs').dropIndex(operatorUsernameIndex.name);
      console.log('✅ Index dropped successfully');
    } else {
      console.log('ℹ️ operators.username_1 index not found');
    }
    
  } catch (error) {
    console.error('❌ Error dropping index:', error.message);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await dropOperatorUsernameIndex();
  
  console.log('✅ Script completed');
  await mongoose.disconnect();
  process.exit(0);
};

main();