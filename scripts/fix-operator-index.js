import { MongoClient } from 'mongodb';

async function dropOperatorIndex() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/simrapu';
    const client = new MongoClient(uri);
    
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const collection = db.collection('subperangkatdaerahs');
    
    // Get current indexes
    const indexes = await collection.listIndexes().toArray();
    console.log('Current indexes:');
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    // Drop the problematic index
    try {
      await collection.dropIndex('operators.username_1');
      console.log('✅ Successfully dropped operators.username_1 index');
    } catch (err) {
      if (err.codeName === 'IndexNotFound') {
        console.log('ℹ️ operators.username_1 index not found');
      } else {
        throw err;
      }
    }
    
    // Also drop any other username-related indexes that might be problematic
    const usernameIndexes = indexes.filter(index =>
      index.name.includes('username') && index.key['operators.username']
    );
    
    for (const index of usernameIndexes) {
      try {
        await collection.dropIndex(index.name);
        console.log(`✅ Dropped index: ${index.name}`);
      } catch (err) {
        if (err.codeName !== 'IndexNotFound') {
          console.error(`Error dropping ${index.name}:`, err.message);
        }
      }
    }
    
    console.log('✅ Index cleanup completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

dropOperatorIndex();