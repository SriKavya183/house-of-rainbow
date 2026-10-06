# House of Rainbow

Premium Indian jewellery storefront (React + Vite + CSS) with an Express API, SQLite orders, Cash on Delivery, and Razorpay Checkout.

**Payments are in Razorpay test mode until you complete Razorpay account verification, install live keys on the server, and confirm a successful test. This project does not claim that payments are live.**

## Features

- Luxury homepage (cream, lavender, gold), responsive navigation, hero banner, categories, featured products
- Cart, checkout, order confirmation with order ID
- Razorpay: UPI, Google Pay, PhonePe, debit/credit cards, net banking (methods offered by Checkout; enable them in the Razorpay dashboard)
- Cash on Delivery
- Secure order creation and signature verification on the server (`RAZORPAY_KEY_SECRET` never ships to the browser)
- Success, failure, and pending payment pages
- Admin view of payment status and refunds

## Local setup

1. Copy environment variables:

```bash
copy .env.example .env
```

2. Set `ADMIN_PASSWORD` and, for online payments, Razorpay **test** keys from [Razorpay Dashboard → API Keys](https://dashboard.razorpay.com/app/keys) (`rzp_test_...`).

3. Install and run:

```bash
npm install
npm run dev
```

- Storefront: http://localhost:5173
- API: http://127.0.0.1:3001
- Admin: http://localhost:5173/admin (password from `.env`)

COD works without Razorpay keys. Online checkout returns a clear error until test keys are present.

### Test payments

Use Razorpay’s [test cards, UPI, and netbanking](https://razorpay.com/docs/payments/payments/test-card-upi-details/) only. Example test card: `4111 1111 1111 1111`, any future expiry, any CVV.

Optional webhook (for pending → paid after a closed modal): Dashboard → Webhooks → `http://YOUR_PUBLIC_URL/api/payments/webhook` with `payment.captured`, `payment.failed`, `order.paid`. Put the webhook secret in `RAZORPAY_WEBHOOK_SECRET`. Localhost needs a tunnel (ngrok, etc.).

## Switching from test mode to live mode

Do this only after Razorpay has verified your business account.

1. Complete KYC and activation in the Razorpay dashboard until live mode is available.
2. Enable UPI, cards, net banking, and wallets (PhonePe / Google Pay appear through UPI and wallets as Razorpay configures them).
3. Generate **live** API keys (`rzp_live_...`). Never put `RAZORPAY_KEY_SECRET` in Vite env vars or frontend code.
4. In `.env` on the **server**:

```
RAZORPAY_KEY_ID=rzp_live_xxxxxxxx
RAZORPAY_KEY_SECRET=your_live_secret
RAZORPAY_WEBHOOK_SECRET=your_live_webhook_secret
RAZORPAY_MODE=live
```

5. Point the webhook URL at your production API.
6. Restart the server. The purple test banner stays up until the server sees a live key (`rzp_live_`).
7. Place a small real order, confirm capture and a refund in admin, then treat the integration as live.

Until those steps succeed, keep `RAZORPAY_MODE=test` and test keys.

## Security notes

- Frontend only receives `key_id` from `GET /api/config` and `POST /api/payments/create-order`.
- Payment amounts are recalculated from the product catalogue on the server.
- Admin uses an httpOnly session cookie after password login.

## Stack

React 19, Vite, CSS, Express, SQLite (`node:sqlite`), Razorpay Node SDK.
