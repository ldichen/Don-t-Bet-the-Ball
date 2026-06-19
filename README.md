# Don't Bet the Ball

A football betting odds analysis tool. Enter match odds to compute de-vigged true probabilities, query weighted historical win rates, and run multi-model ML predictions — using data to discourage impulsive betting.

[中文文档](README.zh-CN.md)

## Features

- **De-vigged Odds** — Strip the bookmaker margin to reveal true implied probabilities and expected value (EV) for home/draw/away
- **Weighted Historical Win Rate** — Tricube kernel weighted KNN across selected leagues, finding historically similar odds profiles and computing weighted outcomes
- **ML Predictions** — Logistic Regression, Random Forest, LightGBM, CatBoost, KNN, and an Inverse-LogLoss weighted ensemble, outputting probabilities and EV
- **Odds Explorer** — Filter historical matches by league and odds range, view distribution histograms and match details

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| In-browser Database | sql.js (WebAssembly SQLite) |
| ML Backend | FastAPI + scikit-learn + LightGBM + CatBoost |

The frontend queries an SQLite database directly in the browser via sql.js — no backend needed for data exploration. Only ML predictions hit the Python API.

## Getting Started

### Frontend

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:5173`. Place your database file at `web/public/lottery.db`.

### ML Backend (optional)

```bash
pip install fastapi uvicorn pandas numpy scikit-learn lightgbm catboost
cd server
uvicorn main:app --reload
```

First startup takes 1-2 minutes to train models. When the backend is not running, the ML module falls back to local approximations.

## Database

The project requires a SQLite database `lottery.db` with a `matches` table:

| Column | Description |
|--------|------------|
| match_date | Match date |
| league_name_abbr | League abbreviation |
| home_team / away_team | Home / away team |
| h / d / a | Home win / draw / away win odds |
| win_flag | Match result (H/D/A) |
| sections_no999 | Section number |

The database file is not included in the repository.

## Deployment

Nginx reverse proxy configuration:

```nginx
server {
    listen 443 ssl;
    server_name lottery.yourdomain.com;

    root /var/www/lottery;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
    }
}
```

Build the frontend:

```bash
cd web
npm run build
# Copy dist/ contents and lottery.db to /var/www/lottery/ on your server
```

## Project Structure

```
├── web/            # React frontend
├── server/         # FastAPI ML prediction service
├── model/          # Model training script
└── design/         # UI/UX design reference (read-only)
```

## License

MIT
