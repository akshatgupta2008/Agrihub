# AgriHub Backend

Node/Express API for AgriHub.

API documentation (detailed request/response/error examples):
- `src/controllers/controller.md`

## Quickstart

1) Install dependencies

```bash
npm install
```

2) Configure environment

Copy `src/.env.example` to `src/.env` (or `src/.env.local`) and fill in values.

The backend loads env vars from a deterministic location (so it works the same whether you run from `Backend/` or `Backend/src/`). Load priority:
1) `Backend/src/.env.local`
2) `Backend/src/.env`
3) `Backend/.env.local`
4) `Backend/.env`

Minimum required for auth routes:
- `JWT_SECRET`

MongoDB:
- `MONGO_URI` (recommended) or `MONGODB_URI`
- Optional local fallback: `MONGO_LOCAL_URI=mongodb://127.0.0.1:27017/agrihub`

Optional (features):
- Admin registration gate: `ADMIN_REGISTER_TOKEN`
- Gesture proxy service: `GESTURE_SERVICE_URL` (default `http://localhost:5001`) and `GESTURE_SERVICE_TIMEOUT_MS`
- PDF report uploads (Cloudinary): `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (+ optional `CLOUDINARY_REPORTS_FOLDER`)
- Chatbot (Ollama): `OLLAMA_URL` (default `http://localhost:11434`)

3) Run

```bash
npm run dev
```

API base URL:
- `http://localhost:<PORT>/api`
	- default if `PORT` is not set: `http://localhost:3000/api`
	- common local dev setup in this repo: set `PORT=5000` in your env

Health check:
- `GET /api/health`

## Chatbot (Ollama)

This backend exposes a streaming chatbot endpoint:
- `POST /api/chatbot/chat`
	- body: `{ "message": "...", "imageBase64": "data:image/png;base64,..." }` (image optional)

Implementation notes:
- The current code is wired to the `medgemma` model and includes a medical-oriented system prompt.
- For an agriculture-focused assistant, update the model name and system prompt in `src/routes/chatbot.route.js`.

Local setup:
1) Start Ollama: `ollama serve`
2) Pull the model used by the API: `ollama pull medgemma`
3) (Optional) If Ollama is not on the default host/port, set `OLLAMA_URL` (example: `http://localhost:11434`)

## API Documentation

See `src/controllers/controller.md` for a full breakdown of all endpoints, including:
- example request bodies
- example success responses
- common error responses (401/403/400 validation, etc.)

Main route groups (mounted in `src/server.js`):
- `/api/auth`, `/api/public`
- `/api/patient`, `/api/patient-dashboard`
- `/api/doctor`, `/api/admin`
- `/api/gesture`, `/api/feedback`

Compatibility note:
- The frontend UI uses agriculture terms (farmer/provider).
- The backend API paths and some entity names still use legacy naming (farmer → `patient`, provider → `doctor`) to avoid breaking the existing contract.

## Notes / conventions

- Auth uses an httpOnly cookie named `jwt`.
- CORS is allow-list based via `CORS_ORIGINS` (comma-separated). If it’s empty, dev mode allows `http://localhost:5170-5179`.
- Cookie behavior can be customized via `COOKIE_SAMESITE`, `COOKIE_SECURE`, and `COOKIE_DOMAIN`.

## Troubleshooting

- **401 everywhere**: set `JWT_SECRET` in `src/.env`.
- **Frontend can’t call API**: add your frontend origin to `CORS_ORIGINS` and restart the server.
- **Mongo connection issues**: try `MONGO_LOCAL_URI=mongodb://127.0.0.1:27017/agrihub` for local dev.
- **Report upload failing (503)**: set Cloudinary env vars (`CLOUDINARY_*`).
