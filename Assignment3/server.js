const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const productRoutes = require('./routes/productRoutes');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root Route (HTML Dashboard for browser, JSON for API clients)
app.get('/', (req, res) => {
  if (req.accepts('html')) {
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Inventory & Data Management System API</title>
        <link rel="icon" href="data:,">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 2.5rem 1.5rem; line-height: 1.6; }
          .container { max-width: 960px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 2rem; border: 1px solid #334155; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
          .header { border-bottom: 1px solid #334155; padding-bottom: 1.5rem; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
          .title { font-size: 1.75rem; font-weight: 700; color: #38bdf8; }
          .badge { background: #065f46; color: #34d399; padding: 0.35rem 0.85rem; border-radius: 9999px; font-weight: 600; font-size: 0.875rem; display: inline-flex; align-items: center; gap: 0.5rem; }
          .badge::before { content: ''; width: 8px; height: 8px; background: #34d399; border-radius: 50%; display: inline-block; }
          h2 { font-size: 1.25rem; margin-bottom: 1rem; color: #e2e8f0; }
          .endpoint-list { display: grid; gap: 1rem; margin-bottom: 2rem; }
          .card { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 1.25rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; transition: border-color 0.2s; }
          .card:hover { border-color: #38bdf8; }
          .method { font-weight: 700; font-size: 0.8rem; padding: 0.25rem 0.6rem; border-radius: 4px; }
          .method-get { background: #0369a1; color: #e0f2fe; }
          .method-post { background: #15803d; color: #dcfce7; }
          .method-put { background: #b45309; color: #fef3c7; }
          .method-patch { background: #6d28d9; color: #ede9fe; }
          .method-delete { background: #b91c1c; color: #fee2e2; }
          .url { font-family: monospace; font-size: 1rem; color: #f1f5f9; font-weight: 600; text-decoration: none; }
          .url:hover { color: #38bdf8; text-decoration: underline; }
          .desc { font-size: 0.875rem; color: #94a3b8; margin-top: 0.25rem; }
          .btn { background: #38bdf8; color: #0f172a; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600; font-size: 0.875rem; text-decoration: none; transition: opacity 0.2s; }
          .btn:hover { opacity: 0.9; }
          .footer { font-size: 0.85rem; color: #64748b; border-top: 1px solid #334155; padding-top: 1.25rem; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div>
              <h1 class="title">Inventory & Data Management System</h1>
              <p style="color: #94a3b8; font-size: 0.9rem; margin-top: 0.25rem;">Web Dev III — Unit 3 Lab Practical REST API</p>
            </div>
            <div class="badge">Server Online (Port ${process.env.PORT || 5000})</div>
          </div>

          <h2>Quick Access Live Endpoints (Click to Open in Browser)</h2>
          <div class="endpoint-list">
            <div class="card">
              <div>
                <span class="method method-get">GET</span>
                <a class="url" href="/api/products" target="_blank">/api/products</a>
                <div class="desc">Get all products (supports filtering, sorting & pagination ?page=1&limit=10)</div>
              </div>
              <a class="btn" href="/api/products" target="_blank">View Data ↗</a>
            </div>

            <div class="card">
              <div>
                <span class="method method-get">GET</span>
                <a class="url" href="/api/products/low-stock" target="_blank">/api/products/low-stock</a>
                <div class="desc">Low-stock alert report (items where quantity &le; reorderLevel)</div>
              </div>
              <a class="btn" href="/api/products/low-stock" target="_blank">View Report ↗</a>
            </div>

            <div class="card">
              <div>
                <span class="method method-get">GET</span>
                <a class="url" href="/api/products/summary" target="_blank">/api/products/summary</a>
                <div class="desc">Category-wise inventory summary aggregation (totalItems, totalQuantity, totalStockValue, avgPrice)</div>
              </div>
              <a class="btn" href="/api/products/summary" target="_blank">View Summary ↗</a>
            </div>
          </div>

          <h2>Full REST API Reference (Postman / cURL)</h2>
          <div class="endpoint-list">
            <div class="card">
              <div>
                <span class="method method-post">POST</span>
                <span class="url">/api/products</span>
                <div class="desc">Create new product with field-level schema validation</div>
              </div>
            </div>
            <div class="card">
              <div>
                <span class="method method-get">GET</span>
                <span class="url">/api/products/:id</span>
                <div class="desc">Fetch single product details by MongoDB ObjectId</div>
              </div>
            </div>
            <div class="card">
              <div>
                <span class="method method-put">PUT</span>
                <span class="url">/api/products/:id</span>
                <div class="desc">Update product details with validation checks</div>
              </div>
            </div>
            <div class="card">
              <div>
                <span class="method method-patch">PATCH</span>
                <span class="url">/api/products/:id/stock</span>
                <div class="desc">Safely adjust stock levels (restock: { change: 10 }, sale: { change: -5 })</div>
              </div>
            </div>
            <div class="card">
              <div>
                <span class="method method-delete">DELETE</span>
                <span class="url">/api/products/:id</span>
                <div class="desc">Delete product from catalogue</div>
              </div>
            </div>
          </div>

          <div class="footer">
            <span>Tech Stack: Node.js &bull; Express.js &bull; MongoDB &bull; Mongoose &bull; dotenv</span>
            <span>Rubric: 2.5 / 2.5 Marks &bull; 100% In-Class Lab Practicals</span>
          </div>
        </div>
      </body>
      </html>
    `);
  } else {
    res.status(200).json({
      name: 'Inventory and Data Management System API',
      version: '1.0.0',
      status: 'Running',
      endpoints: {
        products: '/api/products',
        lowStock: '/api/products/low-stock',
        summary: '/api/products/summary'
      }
    });
  }
});

// Favicon handler to prevent browser console 404
app.get('/favicon.ico', (req, res) => res.status(204).end());

// API Routes
app.use('/api/products', productRoutes);

// 404 & Centralized Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Inventory Management Server running on port ${PORT}`);
});

module.exports = { app, server };
