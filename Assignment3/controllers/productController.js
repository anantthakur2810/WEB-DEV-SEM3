const Product = require('../models/Product');

/**
 * @desc    Create a new product
 * @route   POST /api/products
 * @access  Public
 */
const createProduct = async (req, res, next) => {
  try {
    const { name, sku, category, price, quantity, reorderLevel, supplier } = req.body;

    const product = new Product({
      name,
      sku,
      category,
      price,
      quantity,
      reorderLevel,
      supplier
    });

    const savedProduct = await product.save();
    return res.status(201).json(savedProduct);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all products with filtering, searching, sorting & pagination
 * @route   GET /api/products
 * @access  Public
 */
const getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      search,
      supplier,
      minPrice,
      maxPrice,
      inStock,
      sortBy,
      sortOrder,
      sort
    } = req.query;

    const query = {};

    // Filter by Category (exact case-insensitive)
    if (category) {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    // Search by Name or SKU
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by Supplier
    if (supplier) {
      query.supplier = { $regex: supplier, $options: 'i' };
    }

    // Price Range Filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) query.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) query.price.$lte = Number(maxPrice);
    }

    // In Stock Filter
    if (inStock !== undefined) {
      if (inStock === 'true' || inStock === true) {
        query.quantity = { $gt: 0 };
      } else if (inStock === 'false' || inStock === false) {
        query.quantity = 0;
      }
    }

    // Sorting Logic
    let sortOptions = {};
    if (sort) {
      if (sort.startsWith('-')) {
        sortOptions[sort.substring(1)] = -1;
      } else if (sort.includes(':')) {
        const [field, order] = sort.split(':');
        sortOptions[field] = order.toLowerCase() === 'desc' ? -1 : 1;
      } else {
        sortOptions[sort] = 1;
      }
    } else if (sortBy) {
      const order = sortOrder && sortOrder.toLowerCase() === 'desc' ? -1 : 1;
      sortOptions[sortBy] = order;
    } else {
      sortOptions = { createdAt: -1 };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return res.status(200).json({
      total,
      page: pageNum,
      totalPages,
      count: products.length,
      products
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single product by ID
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update product details
 * @route   PUT /api/products/:id
 * @access  Public
 */
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Stock adjustment (Safe restock and sale operations)
 * @route   PATCH /api/products/:id/stock
 * @access  Public
 */
const adjustStock = async (req, res, next) => {
  try {
    const { change } = req.body;

    if (change === undefined || typeof change !== 'number' || isNaN(change)) {
      return res.status(400).json({
        message: 'A valid numeric "change" value is required'
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const newQuantity = product.quantity + change;

    if (newQuantity < 0) {
      return res.status(400).json({
        message: `Insufficient stock for sale operation. Current stock: ${product.quantity}, requested change: ${change}`
      });
    }

    product.quantity = newQuantity;
    await product.save();

    return res.status(200).json({
      message: 'Stock updated',
      product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a product
 * @route   DELETE /api/products/:id
 * @access  Public
 */
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(200).json({
      message: 'Product deleted',
      id: req.params.id
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Low-stock alert report (quantity <= reorderLevel)
 * @route   GET /api/products/low-stock
 * @access  Public
 */
const getLowStockReport = async (req, res, next) => {
  try {
    const lowStockItems = await Product.find({
      $expr: { $lte: ['$quantity', '$reorderLevel'] }
    });

    return res.status(200).json({
      count: lowStockItems.length,
      lowStockItems
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Category-wise inventory summary using MongoDB Aggregation Pipeline
 * @route   GET /api/products/summary
 * @access  Public
 */
const getCategorySummary = async (req, res, next) => {
  try {
    const summary = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalStockValue: { $sum: { $multiply: ['$price', '$quantity'] } },
          avgPrice: { $avg: '$price' }
        }
      },
      {
        $sort: { totalStockValue: -1 }
      }
    ]);

    return res.status(200).json({
      categories: summary.length,
      summary
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  adjustStock,
  deleteProduct,
  getLowStockReport,
  getCategorySummary
};
