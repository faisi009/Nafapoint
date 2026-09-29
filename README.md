# NafaPoint — Multi-user demo

This is a real Node.js web application intended for private testing. It supports real user accounts and a private admin panel, but all financial activity is DEMO/VIRTUAL ONLY.

## Run locally
1. Install Node.js 18+.
2. In this folder run: `npm install`
3. Copy `.env.example` to `.env` and set a strong admin password and session secret.
4. Run: `npm start`
5. Open `http://localhost:3000`

The admin account is created from `ADMIN_EMAIL` and `ADMIN_PASSWORD` on first startup.

## Important
There is intentionally NO real payment gateway, bank transfer acceptance, wallet, or real-money withdrawal. Do not accept public funds through this app. Any real-money investment/deposit service should only be enabled after obtaining the appropriate legal/licensing and payment arrangements.
