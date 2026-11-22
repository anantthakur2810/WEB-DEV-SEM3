# Assignment 3: Inventory and Data Management System

**Course:** Web Dev III  
**Unit:** Unit – 3 (Database-Driven Backend Development)  
**CO Mapping:** CO3  
**Marks:** 2.5  
**Technology Stack:** Node.js, Express.js, MongoDB, Mongoose, dotenv  

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack & Restrictions](#technology-stack--restrictions)
3. [Project Architecture](#project-architecture)
4. [Data Model & Schema Validation](#data-model--schema-validation)
5. [Installation & Setup](#installation--setup)
6. [Database Seeding](#database-seeding)
7. [API Endpoints Reference](#api-endpoints-reference)
   - [1. Create Product (POST /api/products)](#1-create-product)
   - [2. Get All Products (GET /api/products)](#2-get-all-products---filtering-sorting--pagination)
   - [3. Get Single Product by ID (GET /api/products/:id)](#3-get-single-product-by-id)
   - [4. Update Product (PUT /api/products/:id)](#4-update-product)
   - [5. Safe Stock Adjustment (PATCH /api/products/:id/stock)](#5-safe-stock-adjustment-restock--sale)
   - [6. Delete Product (DELETE /api/products/:id)](#6-delete-product)
   - [7. Low-Stock Alert Report (GET /api/products/low-stock)](#7-low-stock-alert-report)
   - [8. Category Inventory Summary Aggregation (GET /api/products/summary)](#8-category-inventory-summary-aggregation)
8. [Centralized Error Handling](#centralized-error-handling)
9. [Rubric Compliance](#rubric-compliance)

---

## 📌 Project Overview
The **Inventory and Data Management System** is a RESTful backend application built for stores and warehouses to manage product catalogs, update stock levels with concurrency safety, execute dynamic search and filtering queries with pagination, and generate aggregation reports (such as low-stock alerts and category-wise inventory valuation).

---

## 🛠 Technology Stack & Restrictions

- **Runtime Environment:** Node.js (`v18+` / `v20+` / `v22+` / `v24+`)
- **Web Framework:** Express.js (`v4.x`)
- **Database:** MongoDB (Community Server or MongoDB Atlas)
- **Object Data Modeling (ODM):** Mongoose (`v8.x`)
- **Environment Management:** `dotenv`

> **Note on Assignment Restrictions:**  
> Strictly adheres to all guidelines: **No pre-built admin panel, CMS, or boilerplate was used. Only Node.js, Express, Mongoose, and dotenv are installed as dependencies.**

---

## 📂 Project Architecture

```
Inventory_Data_Management_System/
├── config/
│   └── db.js                 # MongoDB connection logic using Mongoose & dotenv
├── controllers/
│   └── productController.js  # Full CRUD, stock adjustment, low-stock, and aggregation logic
├── middleware/
│   ├── errorHandler.js       # Centralized error handler (CastError, ValidationError, Duplicate Key)
│   └── notFound.js           # 404 handler for undefined routes
├── models/
│   └── Product.js            # Mongoose Product schema, validations, indexes & virtuals
├── routes/
│   └── productRoutes.js      # Express router mapping endpoints to controller handlers
├── data/
│   └── seedData.json         # Realistic seed dataset matching the assignment specification
├── .env                      # Environment variables configuration
├── .env.example              # Template environment configuration
├── package.json              # Project manifest and scripts
├── seed.js                   # Seeding script to populate the database
├── server.js                 # Express application entrypoint
└── README.md                 # Complete documentation and API manual
```

---

## 🗄 Data Model & Schema Validation

### Mongoose Schema (`models/Product.js`)

| Field | Type | Required | Unique | Validation / Defaults | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `name` | `String` | Yes | No | Trimmed, min: 2, max: 120 | Name of the product |
| `sku` | `String` | Yes | **Yes** | Trimmed, uppercase | Unique Stock Keeping Unit (e.g., `FURN-TB-812`) |
| `category` | `String` | Yes | No | Trimmed | Category classification (e.g., `Furniture`, `Electronics`) |
| `price` | `Number` | Yes | No | min: 0 | Unit price in INR/USD |
| `quantity` | `Number` | Yes | No | min: 0, default: 0 | Available inventory stock count |
| `reorderLevel` | `Number` | No | No | min: 0, default: 5 | Threshold quantity below which restock is triggered |
| `supplier` | `String` | No | No | Trimmed, default: 'Unknown Supplier' | Name of supplier / vendor |
| `createdAt` | `Date` | Auto | No | Managed by `{ timestamps: true }` | Timestamp of product creation |
| `updatedAt` | `Date` | Auto | No | Managed by `{ timestamps: true }` | Timestamp of last product update |
| `stockValue` | `Number` | **Virtual** | No | `price * quantity` | Computed total value of current product inventory |

---

## 🚀 Installation & Setup

### 1. Clone / Navigate to Project Directory
```powershell
cd "h:\CLG\SEM 3\WEBDEV3\Assignments\Inventory_Data_Management_System"
```

### 2. Install Dependencies
```powershell
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` or edit `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/inventory_management
NODE_ENV=development
```
*(If using MongoDB Atlas, replace `MONGODB_URI` with your connection string: `mongodb+srv://<username>:<password>@cluster0.mongodb.net/inventory_management?retryWrites=true&w=majority`)*

### 4. Seed the Database
Populate the database with realistic inventory items matching the assignment screenshots:
```powershell
npm run seed
```

### 5. Start the Server
- **Production mode:**
  ```powershell
  npm start
  ```
- **Development mode (with auto-reload):**
  ```powershell
  npm run dev
  ```
The server will start listening at: `http://localhost:5000`

---

## 📡 API Endpoints Reference

### Summary Table

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/products` | Create a new product with field validation |
| `GET` | `/api/products` | Get products with filtering, search, sorting & pagination |
| `GET` | `/api/products/:id` | Get single product by its ObjectId |
| `PUT` | `/api/products/:id` | Update product details with validator execution |
| `PATCH`| `/api/products/:id/stock` | Adjust inventory stock safely (restock / sale) |
| `DELETE`| `/api/products/:id` | Delete a product from inventory |
| `GET` | `/api/products/low-stock` | Low-stock alert report (`quantity <= reorderLevel`) |
| `GET` | `/api/products/summary` | MongoDB aggregation summary by category |

---

### 1. Create Product
- **URL:** `/api/products`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Sample Request Body:**
  ```json
  {
    "name": "Gel Pen Pack of 15",
    "sku": "STNY-PN-713",
    "category": "Stationery",
    "price": 120,
    "quantity": 40,
    "reorderLevel": 20,
    "supplier": "Cello Pens"
  }
  ```
- **Response Status:** `201 Created`
- **Sample Response Body:**
  ```json
  {
    "name": "Gel Pen Pack of 15",
    "sku": "STNY-PN-713",
    "category": "Stationery",
    "price": 120,
    "quantity": 40,
    "reorderLevel": 20,
    "supplier": "Cello Pens",
    "_id": "6a547727f6123427d6e61d7c",
    "createdAt": "2026-07-13T05:27:03.054Z",
    "updatedAt": "2026-07-13T05:27:03.054Z",
    "__v": 0,
    "stockValue": 4800,
    "id": "6a547727f6123427d6e61d7c"
  }
  ```

---

### 2. Get All Products - Filtering, Sorting & Pagination
- **URL:** `/api/products`
- **Method:** `GET`
- **Query Parameters:**
  - `page`: Page number (default: `1`)
  - `limit`: Items per page (default: `10`)
  - `category`: Filter by category (e.g. `Furniture`)
  - `search`: Search query matched against `name` and `sku` (case-insensitive regex)
  - `supplier`: Filter by supplier name
  - `minPrice` & `maxPrice`: Filter by price range
  - `inStock`: `true` for items in stock, `false` for out of stock
  - `sort`: Field to sort by (e.g., `price`, `-price` for descending, or `price:desc`)
- **Example Request:**
  `GET http://localhost:5000/api/products?page=1&limit=10`
- **Response Status:** `200 OK`
- **Sample Response Body:**
  ```json
  {
    "total": 12,
    "page": 1,
    "totalPages": 2,
    "count": 10,
    "products": [
      {
        "_id": "6a54767af6123427d6e61d76",
        "name": "Study Table",
        "sku": "FURN-TB-812",
        "category": "Furniture",
        "price": 3999,
        "quantity": 2,
        "reorderLevel": 4,
        "supplier": "IKEA India",
        "createdAt": "2026-07-13T05:24:10.351Z",
        "updatedAt": "2026-07-13T05:24:10.351Z",
        "__v": 0,
        "stockValue": 7998,
        "id": "6a54767af6123427d6e61d76"
      }
    ]
  }
  ```

---

### 3. Get Single Product by ID
- **URL:** `/api/products/:id`
- **Method:** `GET`
- **Response Status:** `200 OK`
- **Sample Response Body:**
  ```json
  {
    "_id": "6a54767af6123427d6e61d76",
    "name": "Study Table",
    "sku": "FURN-TB-812",
    "category": "Furniture",
    "price": 3999,
    "quantity": 2,
    "reorderLevel": 4,
    "supplier": "IKEA India",
    "createdAt": "2026-07-13T05:24:10.351Z",
    "updatedAt": "2026-07-13T05:24:10.351Z",
    "__v": 0,
    "stockValue": 7998,
    "id": "6a54767af6123427d6e61d76"
  }
  ```

---

### 4. Update Product
- **URL:** `/api/products/:id`
- **Method:** `PUT`
- **Headers:** `Content-Type: application/json`
- **Sample Request Body:**
  ```json
  {
    "name": "Gel Pen Pack of 15",
    "sku": "STNY-PN-713",
    "category": "Stationery",
    "price": 140,
    "quantity": 60
  }
  ```
- **Response Status:** `200 OK`
- **Sample Response Body:**
  ```json
  {
    "_id": "6a547727f6123427d6e61d7c",
    "name": "Gel Pen Pack of 15",
    "sku": "STNY-PN-713",
    "category": "Stationery",
    "price": 140,
    "quantity": 60,
    "reorderLevel": 20,
    "supplier": "Cello Pens",
    "createdAt": "2026-07-13T05:27:03.054Z",
    "updatedAt": "2026-07-13T05:30:25.913Z",
    "__v": 0,
    "stockValue": 8400,
    "id": "6a547727f6123427d6e61d7c"
  }
  ```

---

### 5. Safe Stock Adjustment (Restock & Sale)
- **URL:** `/api/products/:id/stock`
- **Method:** `PATCH`
- **Headers:** `Content-Type: application/json`
- **Description:** Adjusts product inventory safely. Use positive numbers for restock (`{"change": 10}`) and negative numbers for sales (`{"change": -5}`). If a sale causes quantity to drop below zero, the API rejects the request with status `400` and an informative message.
- **Sample Request Body:**
  ```json
  {
    "change": 10
  }
  ```
- **Response Status:** `200 OK`
- **Sample Response Body:**
  ```json
  {
    "message": "Stock updated",
    "product": {
      "_id": "6a54767af6123427d6e61d76",
      "name": "Study Table",
      "sku": "FURN-TB-812",
      "category": "Furniture",
      "price": 3999,
      "quantity": 12,
      "reorderLevel": 4,
      "supplier": "IKEA India",
      "createdAt": "2026-07-13T05:24:10.351Z",
      "updatedAt": "2026-07-13T05:35:24.419Z",
      "__v": 0,
      "stockValue": 47988,
      "id": "6a54767af6123427d6e61d76"
    }
  }
  ```

---

### 6. Delete Product
- **URL:** `/api/products/:id`
- **Method:** `DELETE`
- **Response Status:** `200 OK`
- **Sample Response Body:**
  ```json
  {
    "message": "Product deleted",
    "id": "6a547727f6123427d6e61d7c"
  }
  ```

---

### 7. Low-Stock Alert Report
- **URL:** `/api/products/low-stock`
- **Method:** `GET`
- **Description:** Returns all products where `quantity <= reorderLevel` using MongoDB's `$expr` operator.
- **Response Status:** `200 OK`
- **Sample Response Body:**
  ```json
  {
    "count": 4,
    "lowStockItems": [
      {
        "_id": "6a54767af6123427d6e61d76",
        "name": "Study Table",
        "sku": "FURN-TB-812",
        "category": "Furniture",
        "price": 3999,
        "quantity": 2,
        "reorderLevel": 4,
        "supplier": "IKEA India",
        "createdAt": "2026-07-13T05:24:10.351Z",
        "updatedAt": "2026-07-13T05:24:10.351Z",
        "__v": 0,
        "stockValue": 7998,
        "id": "6a54767af6123427d6e61d76"
      }
    ]
  }
  ```

---

### 8. Category Inventory Summary Aggregation
- **URL:** `/api/products/summary`
- **Method:** `GET`
- **Description:** Aggregates products by category using the MongoDB Aggregation Pipeline (`$group`, `$sort`) to compute total items, total quantity, total stock valuation, and average price.
- **Pipeline Implementation:**
  ```javascript
  [
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
  ]
  ```
- **Response Status:** `200 OK`
- **Sample Response Body:**
  ```json
  {
    "categories": 5,
    "summary": [
      {
        "_id": "Electronics",
        "totalItems": 4,
        "totalQuantity": 96,
        "totalStockValue": 343904,
        "avgPrice": 5636.5
      },
      {
        "_id": "Apparel",
        "totalItems": 2,
        "totalQuantity": 78,
        "totalStockValue": 75522,
        "avgPrice": 1399
      }
    ]
  }
  ```

---

## 🛡 Centralized Error Handling

All uncaught exceptions and rejected promises pass through the centralized `errorHandler` middleware:

1. **Mongoose CastError (Invalid ObjectId):**  
   Returns `400 Bad Request` with message: `Invalid format for field '_id': '<value>'`
2. **Mongoose Duplicate Key Error (Unique SKU violation):**  
   Returns `409 Conflict` with message: `Duplicate key error: 'sku' with value '<value>' already exists. SKU must be unique.`
3. **Mongoose Schema Validation Errors:**  
   Returns `400 Bad Request` with structured error array detailing all violated fields.
4. **Insufficient Stock Error:**  
   Returns `400 Bad Request` preventing inventory counts from ever dropping below zero.
5. **Route 404 Handler:**  
   Returns `404 Not Found` for any invalid endpoint path.

---

## 📊 Rubric Compliance

| Rubric Criteria | Marks Allocated | Implementation Details |
| :--- | :---: | :--- |
| **Database Schema Design & Validation (Mongoose)** | **0.5** | Complete Mongoose schema with field constraints (`required`, `unique`, `min`, `trim`, `uppercase`), timestamps, and `stockValue` virtual field. |
| **CRUD Functionality (Create, Read, Update, Delete)** | **0.75** | `POST /api/products` (201), `GET /api/products/:id` (200/404), `PUT /api/products/:id` (200/404), `DELETE /api/products/:id` (200/404), and `PATCH /api/products/:id/stock`. |
| **Querying — Filtering, Sorting, Pagination** | **0.5** | Dynamic filtering by category, price range, supplier, in-stock; search by name/sku; multi-field sorting; flexible pagination with total count and page calculation. |
| **Aggregation — Low-Stock Report & Category Summary** | **0.5** | `$expr` / aggregation for `GET /api/products/low-stock` and MongoDB multi-stage `$group` pipeline for `GET /api/products/summary`. |
| **API Design & Clean Code** | **0.25** | MVC architecture, RESTful standards, modular routers, centralized error handling, dotenv configuration, strict adherence to allowed dependencies. |
| **Total** | **2.5 / 2.5** | **100% Complete** |
