const mongoose = require('mongoose');
const express = require('express');
const { MongoMemoryServer } = require('mongodb-memory-server');
const productRoutes = require('../routes/productRoutes');
const errorHandler = require('../middleware/errorHandler');
const notFound = require('../middleware/notFound');
const Product = require('../models/Product');
const seedProducts = require('../data/seedData.json');

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 Starting Inventory Management System Test Suite');
  console.log('====================================================\n');

  let mongod;
  let server;
  let baseUrl;
  let passedCount = 0;
  let totalTests = 0;

  function assert(condition, testName, extraInfo = '') {
    totalTests++;
    if (condition) {
      passedCount++;
      console.log(`  ✅ PASS: ${testName} ${extraInfo}`);
    } else {
      console.error(`  ❌ FAIL: ${testName} ${extraInfo}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  try {
    // 1. Setup MongoMemoryServer
    console.log('1. Starting In-Memory MongoDB Server...');
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log('   MongoDB connected at:', uri);

    // 2. Setup Express App
    const app = express();
    app.use(express.json());
    app.use('/api/products', productRoutes);
    app.use(notFound);
    app.use(errorHandler);

    server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const port = server.address().port;
    baseUrl = `http://localhost:${port}/api/products`;
    console.log(`   Express test server listening on port ${port}\n`);

    // 3. Seed Database
    console.log('2. Seeding Initial Catalog Data (12 Products)...');
    await Product.insertMany(seedProducts);
    const initialCount = await Product.countDocuments();
    assert(initialCount === 12, 'Database seeded with exactly 12 products');

    // 4. Test GET /api/products (Pagination, Filtering, Sorting)
    console.log('\n3. Testing GET /api/products (Catalog, Filtering, Sorting, Pagination)...');
    const resPage1 = await fetch(`${baseUrl}?page=1&limit=10`);
    assert(resPage1.status === 200, 'GET /api/products returns status 200');
    const dataPage1 = await resPage1.json();
    assert(dataPage1.total === 12, 'Total products count is 12');
    assert(dataPage1.page === 1, 'Current page is 1');
    assert(dataPage1.totalPages === 2, 'Total pages is 2');
    assert(dataPage1.count === 10, 'Count of products on page 1 is 10');
    assert(dataPage1.products.length === 10, 'Returned products array length is 10');
    assert(typeof dataPage1.products[0].stockValue === 'number', 'Virtual field stockValue exists on products');
    assert(dataPage1.products[0].stockValue === Number((dataPage1.products[0].price * dataPage1.products[0].quantity).toFixed(2)), 'Virtual field stockValue equals price * quantity');

    // Test Category Filter
    const resFurniture = await fetch(`${baseUrl}?category=Furniture`);
    const dataFurniture = await resFurniture.json();
    assert(dataFurniture.total === 3, 'Filter by category=Furniture returns 3 items');

    // Test Search Query
    const resSearch = await fetch(`${baseUrl}?search=Study Table`);
    const dataSearch = await resSearch.json();
    assert(dataSearch.total === 1 && dataSearch.products[0].sku === 'FURN-TB-812', 'Search query finds "Study Table" with SKU FURN-TB-812');

    // Test Price Range Filter
    const resPriceRange = await fetch(`${baseUrl}?minPrice=2000&maxPrice=4000`);
    const dataPriceRange = await resPriceRange.json();
    assert(dataPriceRange.products.every(p => p.price >= 2000 && p.price <= 4000), 'Price filter correctly filters products between 2000 and 4000');

    // 5. Test POST /api/products (Create Product)
    console.log('\n4. Testing POST /api/products (Create Product)...');
    const newProductPayload = {
      name: 'Gel Pen Pack of 15',
      sku: 'STNY-PN-713',
      category: 'Stationery',
      price: 120,
      quantity: 40,
      reorderLevel: 20,
      supplier: 'Cello Pens'
    };

    const resCreate = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProductPayload)
    });
    assert(resCreate.status === 201, 'POST /api/products returns status 201 Created');
    const createdProduct = await resCreate.json();
    assert(createdProduct.name === 'Gel Pen Pack of 15', 'Created product has matching name');
    assert(createdProduct.sku === 'STNY-PN-713', 'Created product has matching SKU');
    assert(createdProduct.stockValue === 4800, 'Created product has correct stockValue (120 * 40 = 4800)');
    const createdId = createdProduct._id;

    // 6. Test GET /api/products/:id
    console.log('\n5. Testing GET /api/products/:id (Get Single Product)...');
    const resGetById = await fetch(`${baseUrl}/${createdId}`);
    assert(resGetById.status === 200, 'GET /api/products/:id returns status 200');
    const singleProduct = await resGetById.json();
    assert(singleProduct._id === createdId, 'Fetched product has matching _id');

    // 7. Test PUT /api/products/:id (Update Product)
    console.log('\n6. Testing PUT /api/products/:id (Update Product Details)...');
    const resUpdate = await fetch(`${baseUrl}/${createdId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Gel Pen Pack of 15',
        sku: 'STNY-PN-713',
        category: 'Stationery',
        price: 140,
        quantity: 60
      })
    });
    assert(resUpdate.status === 200, 'PUT /api/products/:id returns status 200');
    const updatedProduct = await resUpdate.json();
    assert(updatedProduct.price === 140, 'Updated price is 140');
    assert(updatedProduct.quantity === 60, 'Updated quantity is 60');
    assert(updatedProduct.stockValue === 8400, 'Updated stockValue is 8400 (140 * 60)');

    // 8. Test PATCH /api/products/:id/stock (Stock Adjustment)
    console.log('\n7. Testing PATCH /api/products/:id/stock (Safe Stock Adjustment)...');
    // Restock (+10)
    const resRestock = await fetch(`${baseUrl}/${createdId}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ change: 10 })
    });
    assert(resRestock.status === 200, 'Restock PATCH returns status 200');
    const restockData = await resRestock.json();
    assert(restockData.message === 'Stock updated', 'Restock response has message "Stock updated"');
    assert(restockData.product.quantity === 70, 'Restocked quantity is 70 (60 + 10)');
    assert(restockData.product.stockValue === 9800, 'Restocked stockValue is 9800 (140 * 70)');

    // Sale (-20)
    const resSale = await fetch(`${baseUrl}/${createdId}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ change: -20 })
    });
    assert(resSale.status === 200, 'Sale PATCH returns status 200');
    const saleData = await resSale.json();
    assert(saleData.product.quantity === 50, 'Sale quantity is 50 (70 - 20)');

    // Excessive Sale (prevent negative stock)
    const resExcessiveSale = await fetch(`${baseUrl}/${createdId}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ change: -100 })
    });
    assert(resExcessiveSale.status === 400, 'Excessive sale returns status 400 Bad Request (Safety Check)');

    // 9. Test GET /api/products/low-stock
    console.log('\n8. Testing GET /api/products/low-stock (Low-Stock Alert Report)...');
    const resLowStock = await fetch(`${baseUrl}/low-stock`);
    assert(resLowStock.status === 200, 'GET /api/products/low-stock returns status 200');
    const lowStockData = await resLowStock.json();
    assert(lowStockData.count === 4, 'Low-stock count is exactly 4 matching assignment');
    assert(lowStockData.lowStockItems.length === 4, 'lowStockItems array has 4 items');
    assert(lowStockData.lowStockItems.every(i => i.quantity <= i.reorderLevel), 'All low-stock items satisfy quantity <= reorderLevel');

    // 10. Test GET /api/products/summary (Aggregation Pipeline)
    console.log('\n9. Testing GET /api/products/summary (Aggregation Pipeline Summary)...');
    const resSummary = await fetch(`${baseUrl}/summary`);
    assert(resSummary.status === 200, 'GET /api/products/summary returns status 200');
    const summaryData = await resSummary.json();
    assert(summaryData.categories === 5, 'Category count is 5');

    const electronicsSummary = summaryData.summary.find(s => s._id === 'Electronics');
    assert(electronicsSummary !== undefined, 'Electronics category exists in aggregation summary');
    assert(electronicsSummary.totalItems === 4, 'Electronics totalItems is 4');
    assert(electronicsSummary.totalQuantity === 96, 'Electronics totalQuantity is 96');
    assert(electronicsSummary.totalStockValue === 343904, 'Electronics totalStockValue is 343904');
    assert(electronicsSummary.avgPrice === 5636.5, 'Electronics avgPrice is 5636.5');

    const apparelSummary = summaryData.summary.find(s => s._id === 'Apparel');
    assert(apparelSummary !== undefined, 'Apparel category exists in aggregation summary');
    assert(apparelSummary.totalItems === 2, 'Apparel totalItems is 2');
    assert(apparelSummary.totalQuantity === 78, 'Apparel totalQuantity is 78');
    assert(apparelSummary.totalStockValue === 75522, 'Apparel totalStockValue is 75522');
    assert(apparelSummary.avgPrice === 1399, 'Apparel avgPrice is 1399');

    // 11. Test DELETE /api/products/:id
    console.log('\n10. Testing DELETE /api/products/:id (Delete Product)...');
    const resDelete = await fetch(`${baseUrl}/${createdId}`, { method: 'DELETE' });
    assert(resDelete.status === 200, 'DELETE /api/products/:id returns status 200');
    const deleteData = await resDelete.json();
    assert(deleteData.message === 'Product deleted', 'Delete response has message "Product deleted"');
    assert(deleteData.id === createdId, 'Delete response includes the deleted product ID');

    // Verify product no longer exists
    const resCheckDeleted = await fetch(`${baseUrl}/${createdId}`);
    assert(resCheckDeleted.status === 404, 'Product lookup after deletion returns 404 Not Found');

    // 12. Test Centralized Error Handling
    console.log('\n11. Testing Centralized Error Handling...');
    // Missing required fields
    const resMissingFields = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Incomplete' })
    });
    assert(resMissingFields.status === 400, 'Missing fields returns 400 Validation Error');

    // Duplicate SKU
    const resDupSku = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Study Table',
        sku: 'FURN-TB-812', // Already exists in seed
        category: 'Furniture',
        price: 2000,
        quantity: 5
      })
    });
    assert(resDupSku.status === 409, 'Duplicate SKU returns 409 Conflict');

    // Invalid ObjectId format
    const resInvalidId = await fetch(`${baseUrl}/invalid-id-12345`);
    assert(resInvalidId.status === 400, 'Invalid ObjectId format returns 400 CastError');

    // 404 Route Not Found
    const resNotFound = await fetch(`http://localhost:${port}/api/non-existent-route`);
    assert(resNotFound.status === 404, 'Non-existent route returns 404');

    console.log('\n====================================================');
    console.log(`🎉 ALL ${passedCount} OF ${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log('====================================================\n');

  } finally {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongod) {
      await mongod.stop();
    }
  }
}

runTestSuite().catch(err => {
  console.error('\n❌ Test suite execution failed:', err);
  process.exit(1);
});
