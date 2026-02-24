# 🦈 Stare Wallet

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange?logo=firebase)
![Cloudinary](https://img.shields.io/badge/Cloudinary-Uploads-blue?logo=cloudinary)
![Tailwind](https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green)

> **Consumer Digital Wallet** — The user-facing mobile-first app for managing virtual cards, transfers, scan-to-pay, and spending analytics.

## ✨ Features

- 🃏 **3D Interactive Cards** — Flip-to-reveal with EMV chip, contactless icon, masked numbers, and CVV on the back
- 📊 **Spending Analytics** — AreaChart with 1D/1W/1M toggle and monthly limit progress bar
- 🔒 **Card Security** — Freeze/unfreeze cards, Eye-toggle for sensitive data, PIN-protected transfers
- 📱 **Scan & Pay** — QR-based payment system with real-time transaction processing
- 🏷️ **Category Icons** — 7 vivid transaction categories (Food, Shopping, Transport, Entertainment, Bills, Transfer, Other)
- 🌙 **Modern Fintech Dark UI** — Glassmorphism, framer-motion animations, responsive for mobile & desktop

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
# Fill in your Firebase & Cloudinary credentials

# Start development server
npm run dev
```

The app runs on [http://localhost:3000](http://localhost:3000).

## 📁 Project Structure

```
app/
├── (auth)/          # Login, Register
├── cards/           # Card list & [id] detail (3D flip, analytics)
├── scan-pay/        # QR scan & payment flow
├── transfer/        # P2P money transfers
└── layout.tsx       # Root layout with BottomNav
components/
├── ui/              # shadcn/ui primitives
├── VirtualCard.tsx   # Reusable 3D card renderer
└── VirtualCardLogo.tsx  # Issuer & bank logo components
lib/
├── firebase.ts      # Client SDK init
├── firebase-admin.ts # Admin SDK for server actions
├── actions/         # Server actions (cards, transfer)
└── utils.ts         # formatCurrency, getCategoryLabel, etc.
```

## 🔐 Environment Variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | Firebase client SDK config |
| `FIREBASE_ADMIN_*` | Firebase Admin SDK for server actions |
| `NEXT_PUBLIC_CLOUDINARY_*` | Cloudinary upload config |

## 📄 License

[MIT](LICENSE) © 2026 Shark Fintech Inc.
