# Smart Tracker Booster Backend

Node.js + Express + MongoDB backend for the Smart Tracker Booster frontend.

## Setup

1. Copy `.env.example` to `.env`.
2. Keep MongoDB running locally, or replace `MONGO_URI` with your MongoDB Atlas connection string.
3. Install dependencies:

```bash
npm install
```

4. Start the server:

```bash
npm start
```

The API runs on `http://localhost:5000` by default.

## API

- `GET /api/health` checks server status.
- `POST /api/auth/signup` creates a user account.
- `POST /api/auth/login` logs in a user.
- `GET /api/auth/me` returns the logged-in user.
- `GET /api/dashboard` returns protected dashboard data.

The frontend stores the login token in `localStorage` and sends it to protected APIs.
