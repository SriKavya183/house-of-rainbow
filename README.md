# House of Rainbow — Supabase edition

React + Vite storefront, Express API, Supabase PostgreSQL database, Supabase Storage product images, COD and Razorpay payments.

## What changed
- Replaced local SQLite (`node:sqlite`) with PostgreSQL using `pg`.
- The API creates/updates the required tables on startup and inserts the original demo catalogue only when those product IDs do not already exist.
- Product uploads now go to the public Supabase Storage bucket named `product-images`.
- Frontend API requests use `VITE_API_URL`; in local development Vite's proxy is used as before.
- Production admin cookie uses `SameSite=None; Secure` and CORS allows the configured frontend origin.

## 1. Install dependencies

```bash
npm install
```

## 2. Server environment variables (Render)

Add these under Render → your Web Service → Environment. Never put the Supabase secret key or Razorpay secret in Netlify or frontend code.

```env
DATABASE_URL=your_supabase_postgres_connection_string
DATABASE_SSL=true
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=your_supabase_secret_key
FRONTEND_URL=https://houseofrainbow.netlify.app
ADMIN_PASSWORD=your_new_strong_admin_password
RAZORPAY_KEY_ID=your_existing_razorpay_key_id
RAZORPAY_KEY_SECRET=your_existing_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_existing_webhook_secret
RAZORPAY_MODE=test
```

For `DATABASE_URL`, use the Supabase Connect dialog's **Session pooler** connection string (PostgreSQL URI). Keep the database password private. If Supabase shows a different region/host for your project, use the exact URI shown in your dashboard.

The backend automatically creates `products`, `orders`, `order_items`, and `payments` tables at startup. It also adds the demo products if they are not already present. No real orders are copied from the old SQLite database.

## 3. Storage

In Supabase → Storage, keep a **public** bucket named exactly `product-images`. Allowed file types: `image/jpeg`, `image/png`, `image/webp`; maximum size 5 MB. The backend uploads files using `SUPABASE_SECRET_KEY`.

## 4. Frontend environment (Netlify)

In Netlify → Site configuration → Environment variables, add:

```env
VITE_API_URL=https://house-of-rainbow.onrender.com
```

Then trigger a new deploy (clear cache is not normally needed). The value must be the Render API origin only, without `/api` at the end.

## 5. Deploy

- Render build command: `npm install`
- Render start command: `npm start`
- Netlify build command: `npm run build`
- Netlify publish directory: `dist`

After deploying, test the storefront, admin login, add/edit/delete product, image upload, COD order, and Razorpay test payment. The admin session is held in server memory and will be cleared whenever the Render service restarts, so log in again after a restart.

## Local development

Copy `.env.example` to `.env`, set the Supabase values and run:

```bash
npm install
npm run dev
```

Local frontend: `http://localhost:5173`; local API: `http://127.0.0.1:3001`.
