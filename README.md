# Celestial Bazi (星曜命理)

A modern, commercial-ready Web Application for Bazi (Chinese Astrology) calculation, matchmaking, naming, and fortune analysis. Built with Node.js, Express, and a beautiful TailwindCSS-inspired frontend.

## Features
- **Accurate Calculation**: Powered by `lunar-javascript` for high-precision solar term and lunar calendar conversions.
- **Interactive UI**: Deep-space blue & glowing gold theme with smooth animations.
- **Premium Modules**:
  - 10-Year Fortune & Yearly Analysis
  - Matchmaking / Compatibility Test
  - Five Elements Naming Suggestion
  - Poster Generation (for social sharing & referrals)
- **Daily Check-ins**: Draw daily lots (抽签) and generate lucky numbers.
- **User & Payment System**: Built-in JWT authentication and mock payment gateway (ready for WeChat/Alipay integration).

## Project Structure
```text
celestial-bazi/
├── public/                 # Frontend Static Assets
│   ├── index.html          # Main Application Entry
│   ├── css/
│   │   └── style.css       # Custom Theme & Animations
│   └── js/
│       ├── app.js          # Core UI Logic & Event Handlers
│       ├── bazi.js         # Bazi Calculation Wrappers
│       ├── data.js         # Constants (Five Elements, Stems, Branches)
│       └── auth.js         # User System & Payment UI
├── server.js               # Node.js Express Backend (API & SQLite)
├── package.json            # Project Dependencies
├── app.yaml                # Wasmer Edge Deployment Config (Optional)
├── .gitignore              # Git Ignore Rules
└── README.md               # This File
```

## Local Development
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
4. Open `http://localhost:3000` in your browser.

## Deployment (Wasmer Edge)
This project is fully compatible with [Wasmer Edge](https://wasmer.io/products/edge) for fast, serverless deployment.

1. Install Wasmer CLI:
   ```bash
   curl https://get.wasmer.io -sSfL | sh
   ```
2. Login to your Wasmer account:
   ```bash
   wasmer login
   ```
3. Initialize the app (if you haven't created `app.yaml`):
   ```bash
   wasmer app init
   ```
4. Deploy to Wasmer Edge:
   ```bash
   wasmer deploy
   ```

*Note: For SQLite database persistence on serverless platforms like Wasmer, you may need to attach a persistent volume or migrate to a cloud database (e.g., PostgreSQL/MySQL) depending on your production needs.*

## License
MIT
