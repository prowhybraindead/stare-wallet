# 🦈 Stare Wallet

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange?logo=firebase)
![Cloudinary](https://img.shields.io/badge/Cloudinary-Uploads-blue?logo=cloudinary)
![Tailwind](https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green)

> **Consumer Digital Wallet** — The user-facing mobile-first application in the Shark Fintech Ecosystem. Provides personal finance management, virtual cards, P2P transfers, scan-to-pay, and advanced spending analytics.

## ✨ Enhanced Features

- 🎭 **Dual Application Dashboard (B2C & B2B):** The app intelligently detects consumer vs. business accounts based on their Tier. Gen-Z users (Standard UI) receive a highly vibrant, colorful, and spring-animated layout, whereas Corporate (Business Tier) users receive a muted, data-dense layout emphasizing KPIs.
- 🏛️ **Treasury Routed Payments:** Embedded support for the Centralized Treasury. Invoice payments triggered through Stare Wallet atomically transfer real money directly from the user to the Central `TREASURY_UID` logic, preventing unmapped balances.
- 🃏 **3D Interactive Virtual Cards:** Full Framer Motion-powered 3D cards. Click to physically flip the card and reveal CVV details securely on the reverse via an eye-icon toggle. Shows real-time backend values for EMV chips and contactless markings.
- 📊 **Contextual Spending Analytics:** Rendered natively via Recharts. AreaCharts display timelines bridging across 1-Day, 1-Week, or 1-Month scopes, alongside visual progress bars relative to monthly spending goals.
- 🔒 **Multi-Layered Authentication & Security:** Cookie-session Edge Middleware blocks unauthenticated routes entirely natively in Next.js 14 Server Components. The app also features strict 6-digit PIN hashing before any financial transaction is processed.
- 📱 **QR Generator & Scan Engine:** Powered by `html5-qrcode` and `qrcode.react`, allowing for seamless physical payment execution at Merchants.
- 🌙 **Modern Fintech Aesthetics:** Relies strictly on native Tailwind CSS Glassmorphism logic (`backdrop-blur`), sophisticated color palettes, and responsive design tailored for immediate mobile utilization.

## 🚀 Detailed Setup Instructions

Follow these steps to run the `stare-wallet` locally. Note that this app connects to the shared Firebase backend.

### 1. Install Dependencies

Ensure you are in the `stare-wallet` directory, then install the Node packages:

```bash
cd stare-wallet
npm install
```

### 2. Configure Environment Variables

Copy the provided template to create your local environment file:

```bash
cp .env.local.example .env.local
```

Open `.env.local` and configure the following blocks:

- **Firebase Client (`NEXT_PUBLIC_FIREBASE_*`)**: Get these from your Firebase Project Settings > Web App config. This allows the frontend to authenticate users.
- **Firebase Admin (`FIREBASE_ADMIN_*`)**: Generate a Service Account JSON from Firebase Project Settings > Service Accounts. Extract the `project_id`, `client_email`, and `private_key` (ensure the private key is properly formatted with `\n` newlines). This allows the server actions to bypass security rules securely.
- **Central Treasury (`TREASURY_UID`)**: Create a designated user in Firebase Auth to act as the "bank". Paste their UID here. This is required for routing B2B invoice payments.
- **Cloudinary (`NEXT_PUBLIC_CLOUDINARY_*`)**: Required to load 3D card background images dynamically.

### 3. Run the Development Server

Once variables are set, boot the Next.js server:

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## 📁 Repository Structure

```
app/
├── (auth)/          # Edge middleware-protected Login / Register flows
├── cards/           # 3D interactive Card Library & detailed [cardId] analytics
├── dashboard/       # Dual-State (B2B/B2C) Central Hub
├── scan-pay/        # Hardware-accelerated camera QR scanner
├── transactions/    # Detailed transaction ledger mapping
├── transfer/        # Synchronous P2P and B2C money transferring
└── layout.tsx       # Standard Layout w/ Bottom Navigation & Theme Provider
components/
├── ui/              # Shadcn/ui raw primitives strictly wrapped with Tailwind-Merge
├── QuickActions.tsx # Reusable high-velocity functional navigation
├── VirtualCard.tsx  # Central 3D logic encapsulation
└── VirtualCardLogo.tsx # Generates dynamic SVG Bank Logos depending on payload
lib/
├── firebase.ts      # Standard Firebase v10 initialization tree
├── firebase-admin.ts# Secret-laden Admin SDK initializing securely
├── actions/         # Pure Server Components marking server boundaries for data mutation
│   ├── auth.ts      # Verifies IDTokens yielding secure JS cookies
│   └── transfer.ts  # Runs Atomic Transactions deducting balances while processing fees
└── utils.ts         # Handles complex currency formats (vi-VN VND) & TS serialization
```

## 🔐 Environment Scope

Refer directly to [`.env.local.example`](.env.local.example) to cross-reference constraints. Key integrations:

| Variable                   | Implementation details                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_FIREBASE_*`   | Basic client credentials. Can be exposed safely.                                                   |
| `FIREBASE_ADMIN_*`         | Needs explicit Service Account JSON parsing natively in server functions.                          |
| `TREASURY_UID`             | Points exactly to the ID of the shared wallet in `/users` collecting all system fees and upgrades. |
| `NEXT_PUBLIC_CLOUDINARY_*` | Allows dynamic background pulling for newly designed virtual cards.                                |

## 📄 License

[MIT](LICENSE) © 2026 Shark Fintech Inc.
