import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb://localhost:27017/simrapu';

async function fixOps2UserDirect() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('simrapu');
    const usersCollection = db.collection('users');

    // Find and update ops2 user directly
    const result = await usersCollection.updateOne(
      { username: 'ops2' },
      { 
        $set: { 
          password: '$2a$10$5QNHA8MCykJ15UhiqwN6PedXgQhOS5BJI1N/IDQvWPztlAdtP0sCG'
        } 
      }
    );

    console.log(`✅ Update result: ${JSON.stringify(result)}`);

    // Verify the update
    const updatedUser = await usersCollection.findOne({ username: 'ops2' });
    console.log('Updated ops2 user:', JSON.stringify(updatedUser, null, 2));

    console.log('✅ Fix completed successfully');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

fixOps2UserDirect();