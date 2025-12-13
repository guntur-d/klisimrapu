import 'dotenv/config';
import readline from 'readline';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import mongoose from 'mongoose';

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Connection error:', err));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

(async () => {
  try {
    console.log('=== Create Super User ===');

    // Check if arguments are provided via command line
    const [,, username, email, password] = process.argv;

    let finalUsername, finalEmail, finalPassword;

    if (username && email && password) {
      console.log('Using command line arguments:');
      console.log(`Username: ${username}`);
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}\n`);
      finalUsername = username;
      finalEmail = email;
      finalPassword = password;
      
    } else {
      // Interactive mode
      console.log('Interactive mode - enter details below:');
      finalUsername = await question('Username: ');
      if (!finalUsername) throw new Error('Username is required');

      finalEmail = await question('Email: ');
      if (!finalEmail) throw new Error('Email is required');

      finalPassword = await question('Password: ');
      if (!finalPassword) throw new Error('Password is required');

      const confirmPassword = await question('Confirm Password: ');
      if (finalPassword !== confirmPassword) throw new Error('Passwords do not match');
 
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username: finalUsername }, { email: finalEmail }] });
    if (existingUser) throw new Error('Username or email already exists');

    // Hash password
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    // Create super user
    const newUser = new User({
      username: finalUsername,
      email: finalEmail,
      password: hashedPassword,
    });

    await newUser.save();
    console.log('Super user created successfully!');
    console.log(`Username: ${finalUsername}`);
    console.log(`Email: ${finalEmail}`);
    console.log(`Role: Super User`);
 

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    rl.close();
    mongoose.connection.close();
  }
})();