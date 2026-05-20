# AgriHub

AgriHub is an inclusive agriculture services platform that connects **farmers**, **service providers**, and **village operations teams** for fast bookings, coordination, and field support.

This repository contains:
- **Frontend** (React + Vite)
- **Backend API** (Node + Express + MongoDB)
- Optional **Assistive Support** hardware workflow (Arduino + Web Serial) integrated into the frontend

---

## Problem
Many service booking platforms assume a single interaction style (reading small text, typing forms, hearing audio). That creates barriers for users with visual/hearing/motor impairments and increases friction for completing essential bookings and accessing reports.

---

## What AgriHub Provides
AgriHub combines **role-based service workflows** with **multi-modal accessibility**:
- Farmers can register, book services (on-site/remote), and access reports.
- Farmers can leave **reviews (1–5 stars + comment)** after a booking is completed.
- Providers are displayed **sorted by rating**, helping farmers choose trusted service faster.
- Platform admins can onboard providers, set availability slots, and upload farmer reports as PDFs.
- Providers can manage availability, view bookings, and access farmer reports.
- A voice-first interface and assistive tools (voice navigation + optional Arduino/Web Serial output) reduce barriers for assistive-technology users.

---

## Repo Modules

### 1) AgriHub Web App
- Frontend: [Frontend/](Frontend/)
- Backend: [Backend/](Backend/)

### 2) Assistive Support (Integrated)
- Assistive Support page: [Frontend/src/pages/AssistiveSupport.jsx](Frontend/src/pages/AssistiveSupport.jsx)
- Arduino firmware reference (downloadable from the frontend): [Frontend/public/arduino/](Frontend/public/arduino/)
- Additional sketch: [Arduino/Arduino.ino](Arduino/Arduino.ino)

---

## Key Features

### Farmer
- Registration and secure login
- Browse providers and **book services** (on-site/remote)
- Reviews & ratings after completion
- Reports
  - view latest
  - list all
  - download report PDF (if attached)
- Multilingual voice navigation via the floating voice assistant

### Platform Admin
- Admin registration (optionally protected by `ADMIN_REGISTER_TOKEN`)
- Add / list / delete providers
- Provider list sorted by rating
- Set provider time slots
- Booking history view
- Reports (PDF)
  - search farmers
  - upload reports to Cloudinary
  - download links for farmer/provider access

### Provider
- Login and availability toggle
- View schedule and bookings
- Create notes/reports
- Access farmer reports

## Accessibility / Assistive Tech
- Voice navigation (Web Speech API) inside the main frontend
- Assistive Support page for Braille/haptic workflows (optional Arduino)

---

## Naming / API Compatibility
The UI uses agriculture terms:
- **Farmer** and **Provider** dashboards/routes

For backend compatibility, some API paths and role strings still use legacy names:
- Farmer maps to API/user role `patient`
- Provider maps to API/user role `doctor`

This is intentional to avoid breaking the existing backend contract.

---

## Architecture (High Level)

```mermaid
flowchart LR
  U[User (Farmer/Admin/Provider)] --> FE[Frontend (React/Vite)]
  FE -->|REST + Cookies| BE[Backend (Express)]
  BE --> DB[(MongoDB)]
  BE --> CL[Cloudinary (PDF Reports)]
  BE --> G[Google Calendar API
(Google Meet link)]
  FE -->|Web Serial (optional)| AR[Arduino (Braille/Haptics)]
```

---

## APIs / Integrations

External services:
- Cloudinary (PDF report uploads)
- Google Calendar API (optional Meet link creation)
- Web Speech API (voice assistant)
- Web Serial API (optional Arduino connection)

For detailed backend endpoints and request/response examples, see:
- [Backend/src/controllers/controller.md](Backend/src/controllers/controller.md)

---

## Setup (Clone + Run Locally)

### Prerequisites
- Node.js 18+
- MongoDB (Atlas or local)
- (Optional) Cloudinary account for PDF uploads
- (Optional) Google service account + Calendar ID for Meet links
- Chrome/Edge recommended for voice features (speech recognition) and **Web Serial** (Arduino)

### 1) Clone
```bash
git clone <your-repo-url>
cd Agrihub
```

### 2) Backend setup
```bash
cd Backend
npm install
```

Create your backend env file:
- Copy [Backend/src/.env.example](Backend/src/.env.example) to `Backend/src/.env` and fill values (minimum: `JWT_SECRET`, Mongo URI).

Run backend:
```bash
npm run dev
```

Backend runs at: `http://localhost:5000`

> Important: do **not** commit `.env` files. If secrets were committed previously, rotate them.

### 3) Frontend setup
```bash
cd ..\Frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

Optional frontend env:
- `VITE_API_BASE_URL` (defaults to `http://localhost:5000/api`)

### 4) Arduino setup (optional)
- Install **Arduino IDE**
- Open and upload one of the sketches:
  - `Frontend/public/arduino/bil369.ino` (recommended for the integrated Assistive Support page)
  - [Arduino/Arduino.ino](Arduino/Arduino.ino)
- Use Chrome/Edge + Web Serial from the Assistive Support page to connect (9600 baud)

---

## Port Notes (When Running Multiple Modules)
- Backend uses `PORT` (commonly **5000** for local dev)
- Frontend runs on **5173** (Vite default)
- If using the optional gesture bridge service, ensure `GESTURE_SERVICE_URL` points to it (default `http://localhost:5001`).

---
