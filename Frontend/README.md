# AgriHub Frontend

Vite + React frontend for AgriHub.

Related docs:
- Backend setup: `../Backend/README.md`
- API reference (endpoints + examples): `../Backend/src/controllers/controller.md`

## Quickstart

1) Install dependencies

```bash
npm install
```

2) Configure environment

Optional: create `.env` (Vite) and set:
- `VITE_API_BASE_URL` (backend origin; `/api` is appended automatically if missing)

If omitted, the app defaults to `http://localhost:5000/api`.

Examples:
- `VITE_API_BASE_URL=http://localhost:5000`
- `VITE_API_BASE_URL=http://localhost:5000/api`

3) Run

```bash
npm run dev
```

## API client

- API calls use `axiosInstance` from `src/lib/axios.js`.
- Auth is cookie-based (JWT in an httpOnly cookie). The client sends cookies with `withCredentials: true`.
- `VITE_API_BASE_URL` is normalized so it always ends with `/api`.

## Voice assistant (appointment booking)

The floating voice assistant (bottom-right) supports voice-based booking for farmers.

Examples:
- "book with provider <name> on 2026-04-25"
- "book provider <name> tomorrow remote"
- "book provider <name> on 2026-04-25 at 5 pm on-site"

Notes:
- Requires farmer login (cookie auth).
- If no time is mentioned, it books the earliest available slot returned by the backend.

Compatibility note:
- For backend compatibility, the API still uses legacy paths and entity names (farmer → `patient`, provider → `doctor`).
- Uses backend endpoints:
	- `GET /api/patient-dashboard/doctors`
	- `GET /api/patient-dashboard/doctors/:doctorId/slots?date=YYYY-MM-DD`
	- `POST /api/patient-dashboard/appointments/book`

## Common issues

- **CORS blocked**:
	- In dev, if the backend `CORS_ORIGINS` is empty, it allows `http://localhost:5170` - `http://localhost:5179`.
	- Otherwise, add your frontend origin to backend `CORS_ORIGINS` and restart the backend.
- **Login works but other calls 401**:
	- Confirm the browser is storing/sending the `jwt` cookie.
	- For cross-site deployments, configure backend cookies correctly (`COOKIE_SAMESITE=none` requires `COOKIE_SECURE=true`) and serve over HTTPS.
