const express = require('express');
const router = express.Router();
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  adjustStock,
  deleteProduct,
  getLowStockReport,
  getCategorySummary
} = require('../controllers/productController');

// Aggregation & Specialized Reporting Endpoints (Must be placed before /:id routes)
router.get('/summary', getCategorySummary);
router.get('/low-stock', getLowStockReport);

// Core CRUD Endpoints
router.route('/')
  .get(getProducts)
  .post(createProduct);

router.route('/:id')
  .get(getProductById)
  .put(updateProduct)
  .delete(deleteProduct);

// Safe Stock Adjustment Operation
router.patch('/:id/stock', adjustStock);

module.exports = router;
