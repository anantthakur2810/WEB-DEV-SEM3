const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');
const seedProducts = require('./data/seedData.json');

// Load environment variables
dotenv.config();

const seedDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/inventory_management';
    await mongoose.connect(mongoUri);
    console.log(`Connected to MongoDB for seeding at ${mongoUri}`);

    // Clear existing products
    await Product.deleteMany({});
    console.log('Cleared existing product catalog.');

    // Insert seed products
    const inserted = await Product.insertMany(seedProducts);
    console.log(`Successfully seeded ${inserted.length} products!`);

    console.log('\n--- Summary of Seeded Data ---');
    console.log(`Total Products: ${inserted.length}`);
    const lowStock = inserted.filter(p => p.quantity <= p.reorderLevel);
    console.log(`Low Stock Products (quantity <= reorderLevel): ${lowStock.length}`);

    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error.message);
    process.exit(1);
  }
};

seedDB();
