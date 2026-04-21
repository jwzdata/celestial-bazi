# Celestial Bazi (星曜命理)

A modern, commercial-ready Web Application for Bazi (Chinese Astrology) calculation, matchmaking, naming, and fortune analysis. Deployed on **Vercel** & **Netlify** with **Turso** cloud database.

## Features

- **Accurate Calculation**: Powered by `lunar-javascript` for high-precision solar term and lunar calendar conversions.
- **Interactive UI**: Deep-space blue & glowing gold theme with smooth animations.
- **Premium Modules**:
  - 10-Year Fortune (大運流年) & Yearly Analysis — dynamically calculated based on your Bazi
  - Matchmaking / Compatibility Test (合婚)
  - Five Elements Naming Suggestion (起名)
  - Poster Generation (for social sharing & referrals)
- **Daily Check-ins**: Draw daily lots (抽签) and generate lucky numbers.
- **User & Payment System**: Built-in JWT authentication and mock payment gateway (ready for WeChat/Alipay integration).
- **i18n**: Chinese/English bilingual support with dynamic switching.

## Project Structure

```text
celestial-bazi/
├── public/                 # Frontend Static Assets
│   ├── index.html          # Main Application Entry
│   ├── css/
│   │   └── style.css       # Custom Theme & Animations
│   └── js/
│       ├── app.js          # Core UI Logic, Features & Rendering
│       ├── bazi.js         # Bazi Calculation (Five Elements, Strength, etc.)
│       ├── data.js         # Constants (Stems, Branches, Elements, etc.)
│       ├── auth.js         # User System & Payment UI
│       └── i18n.js         # Internationalization (zh/en)
├── api/                    # Vercel Serverless Functions (shared by both platforms)
│   ├── _db.js              # Shared Database Module (Turso/libsql)
│   ├── register.js         # POST /api/register
│   ├── login.js            # POST /api/login
│   ├── user.js             # GET  /api/user
│   └── pay/
│       ├── create.js       # POST /api/pay/create
│       └── mock-success.js # POST /api/pay/mock-success
├── netlify/                # Netlify Functions Adapters
│   └── functions/          # Thin wrappers reusing api/ logic
├── vercel.json             # Vercel Configuration
├── netlify.toml            # Netlify Configuration
├── package.json            # Project Dependencies
├── .env.example            # Environment Variables Template
└── README.md
```

## Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/jwzdata/celestial-bazi.git
   cd celestial-bazi
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your Turso credentials:
   ```bash
   cp .env.example .env
   ```
4. Start development server:
   - **Vercel** (requires [Vercel CLI](https://vercel.com/docs/cli)):
     ```bash
     npm run dev
     ```
   - **Netlify** (requires [Netlify CLI](https://docs.netlify.com/cli/get-started/)):
     ```bash
     npm run netlify:dev
     ```
5. Open `http://localhost:3000` in your browser.

## Deployment

### Vercel

Push to GitHub and import in [Vercel Dashboard](https://vercel.com) — zero-config deployment.

### Netlify

Push to GitHub and import in [Netlify Dashboard](https://app.netlify.com) — `netlify.toml` handles all configuration.

### Environment Variables (both platforms)

| Variable | Description |
|----------|-------------|
| `TURSO_DATABASE_URL` | Your Turso database URL |
| `TURSO_AUTH_TOKEN` | Your Turso auth token |
| `JWT_SECRET` | A random hex string for JWT signing |

## License

ISC
