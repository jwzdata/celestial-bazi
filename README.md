# Celestial Bazi (星曜命理)

A modern, commercial-ready Web Application for Bazi (Chinese Astrology) calculation, matchmaking, naming, and fortune analysis. Deployed on **Vercel** & **Netlify** with **Turso** cloud database.

## Features

- **Accurate Calculation**: Powered by `lunar-javascript` for high-precision solar term and lunar calendar conversions.
- **Deeper Ming-Li (命理) engine**: 得令/得地/得勢 strength tiers, chart-level shen-sha (天乙貴人/驛馬/桃花/華蓋/祿神/羊刃/金輿 ...), three-framework 用神 (扶抑/調候/通關), and 大運/流年 × 原局 六合/六沖/三合/刑害 interaction tags.
- **Professional Calculation Rules**: Supports exact birth time, gender, birthplace longitude, optional true-solar-time correction, and selectable 子初/子正 day-change rules.
- **Searchable Birthplace Input**: Type a city name (for example `新泰`, `山東新泰`, or `山東省新泰市`) to auto-fill longitude, with manual longitude override for unlisted places.
- **Smart Form Memory**: Birth information (date, time, gender, birthplace, longitude) is saved after login/analysis and restored on the next login for convenience.
- **Professional Bazi Details**: Displays precision metadata, Ming Gong (命宮), Shen Gong (身宮), Tai Yuan (胎元), Na Yin (納音), Xun Kong (旬空), Ji Shen/Xiong Sha (吉神/凶煞), Peng Zu notes, and calendar-day scoring details.
- **Interactive UI**: Deep-space blue & glowing gold theme with smooth animations, SEO metadata, sitemap/robots, and installable web manifest.
- **Premium Modules**:
  - 10-Year Fortune (大運流年) & Yearly Analysis — dynamically calculated based on your Bazi
  - Matchmaking / Compatibility Test (合婚)
  - Five Elements Naming Suggestion (起名)
  - Poster Generation (for social sharing & referrals)
- **Daily Check-ins**: Draw daily lots (抽签) and generate lucky numbers.
- **User & Payment System**: Built-in JWT authentication, form preferences, and a production-safe payment/VIP foundation ready for WeChat/Alipay integration.
- **i18n**: Chinese/English bilingual support with dynamic switching, including document title and social metadata updates.
- **Verification Scripts**: `npm test` runs syntax checks and Bazi core regressions for safer deployments.

## Project Structure

```text
celestial-bazi/
├── public/                 # Frontend Static Assets
│   ├── index.html          # Main Application Entry
│   ├── css/
│   │   └── style.css       # Custom Theme & Animations
│   └── js/
│       ├── app.js          # Core UI Logic, Features & Rendering (with form memory)
│       ├── bazi.js         # Bazi Calculation, true solar time, Five Elements, Strength, etc.
│       ├── data.js         # Constants (Stems, Branches, Elements, city longitudes, etc.)
│       ├── auth.js         # User System, Payment UI & Form Preferences
│       └── i18n.js         # Internationalization (zh/en)
├── api/                    # Vercel Serverless Functions (shared by both platforms)
│   ├── _db.js              # Shared Database Module (Turso/libsql)
│   ├── register.js         # POST /api/register
│   ├── login.js            # POST /api/login
│   ├── user.js             # GET  /api/user
│   ├── preferences.js      # GET/PUT /api/preferences (user form memory)
│   └── pay/
│       ├── create.js       # POST /api/pay/create
│       └── mock-success.js # POST /api/pay/mock-success
├── netlify/                # Netlify Functions Adapters
│   └── functions/          # Thin wrappers reusing api/ logic
├── vercel.json             # Vercel Configuration
├── netlify.toml            # Netlify Configuration
├── package.json            # Project Dependencies
├── deno.lock               # Netlify Edge Functions dependency lock
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
