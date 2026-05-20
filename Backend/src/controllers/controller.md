# AgriHub Backend API Documentation (Detailed)

Base URL (local): `http://localhost:<PORT>`

This document describes all API endpoints implemented by the backend controllers with:

- Request breakdown (params/query/body/cookies)
- Success response (status + example JSON)
- Error cases (status + example JSON)

## Conventions

### Terminology (UI vs API)

The frontend UI uses agriculture terms:

- **Farmer** (UI) → `patient` (API role + routes)
- **Provider** (UI) → `doctor` (API role + routes)
- **Platform Admin** (UI) → `admin` (API role + routes)

Bookings are represented as **appointments** in the current API (`/patient-dashboard/appointments`, `/doctor/appointments`, etc.). This is intentional for backward compatibility.

### Authentication (Cookie-based)

- **Cookie name:** `jwt`
- **How it works:** On successful login/register, the server sets the `jwt` cookie. Protected routes require this cookie.
- **JWT payload:** `{ userId, role }` where `role ∈ { patient, doctor, admin }`.

### Standard error shape

Most errors follow:

```json
{ "message": "..." }
```

Validation errors (Zod) are also `400` with the same shape:

```json
{ "message": "email: Invalid email" }
```

Auth errors:

- `401` Unauthorized
	```json
	{ "message": "Unauthorized" }
	```
- `403` Forbidden
	```json
	{ "message": "Forbidden" }
	```

### Common formats

- **Mongo ObjectId:** 24 hex chars (e.g. `507f1f77bcf86cd799439011`)
- **Date:** `YYYY-MM-DD`
- **Time:** `HH:MM` (24h)
- **Password:** min 6 chars

---

## Health

### GET `/api/health`

**Auth:** none

**Success (200)**

```json
{ "ok": true, "env": "development" }
```

---

## Public

### GET `/api/public/doctors`

**Auth:** none

Returns the provider directory (API calls them `doctors`).

**Success (200)**

```json
[
	{
		"_id": "507f1f77bcf86cd799439011",
		"fullName": "Asha Verma",
		"specialty": "Soil Advisory",
		"licenseNumber": "PROV-12345",
		"isAvailable": true,
		"slots": [
			{ "date": "2026-04-19", "times": ["10:00", "10:30"] }
		],
		"hospital": "507f1f77bcf86cd799439012",
		"averageRating": 4.6,
		"ratingCount": 24
	}
]
```

**Errors**

- `500`
	```json
	{ "message": "Internal Server Error" }
	```

---

## Auth (All roles)

### GET `/api/auth/me`

**Auth:** required (`jwt` cookie)

**Success (200)**

Example (patient):

```json
{
	"role": "patient",
	"_id": "507f1f77bcf86cd799439013",
	"fullName": "Rahul Sharma",
	"email": "rahul@example.com",
	"patientType": "general",
	"createdAt": "2026-04-19T09:12:00.000Z",
	"updatedAt": "2026-04-19T09:12:00.000Z"
}
```

**Errors**

- `401`
	```json
	{ "message": "Unauthorized" }
	```

### POST `/api/auth/logout`

**Auth:** none (clears cookie if present)

**Success (200)**

```json
{ "message": "Logged out successfully" }
```

---

## Farmer Auth & Session (API: `/patient/*`)

### POST `/api/patient/register`

**Auth:** none

**Request body** (`application/json`)

| Field | Type | Required | Notes |
| :--- | :--- | :---: | :--- |
| `fullName` | string | Yes | 1..200 chars |
| `email` | string | Yes | valid email; normalized to lowercase |
| `password` | string | Yes | min 6 chars |
| `patientType` | string | No | `general` or `special` (defaults to `general`) — used by the UI to route Farmer vs Farmer+ dashboards |
| `aadhaarNumber` | string | No | optional ("" becomes not stored) |
| `disabilityId` | string | No | optional ("" becomes not stored) |

**Example request**

```json
{
	"fullName": "Rahul Sharma",
	"email": "rahul@example.com",
	"password": "secret123",
	"patientType": "general",
	"aadhaarNumber": "1234-5678-9012"
}
```

**Success (201)**

```json
{
	"role": "patient",
	"_id": "507f1f77bcf86cd799439013",
	"fullName": "Rahul Sharma",
	"email": "rahul@example.com",
	"patientType": "general"
}
```

**Errors**

- `400` (validation)
	```json
	{ "message": "email: Invalid email" }
	```
- `400` (business rules)
	```json
	{ "message": "Password must be at least 6 characters" }
	```
- `409` (duplicate email/aadhaar/disability)
	```json
	{ "message": "Account already exists with the provided details" }
	```
- `500`
	```json
	{ "message": "Internal Server Error" }
	```

### POST `/api/patient/login`

**Auth:** none

**Request body** (`application/json`)

| Field | Type | Required |
| :--- | :--- | :---: |
| `email` | string | Yes |
| `password` | string | Yes |

**Example request**

```json
{ "email": "rahul@example.com", "password": "secret123" }
```

**Success (200)**

```json
{
	"role": "patient",
	"_id": "507f1f77bcf86cd799439013",
	"fullName": "Rahul Sharma",
	"email": "rahul@example.com",
	"patientType": "general"
}
```

**Errors**

- `400` (invalid credentials)
	```json
	{ "message": "Invalid credentials" }
	```
- `400` (validation)
	```json
	{ "message": "email: Invalid email" }
	```
- `500`
	```json
	{ "message": "Internal Server Error" }
	```

### POST `/api/patient/logout`

**Auth:** none (clears cookie if present)

**Success (200)**

```json
{ "message": "Logged out successfully" }
```

### GET `/api/patient/check`

**Auth:** required + role must be `patient` (Farmer)

**Success (200)**

```json
{
	"role": "patient",
	"_id": "507f1f77bcf86cd799439013",
	"fullName": "Rahul Sharma",
	"email": "rahul@example.com",
	"patientType": "general",
	"createdAt": "2026-04-19T09:12:00.000Z",
	"updatedAt": "2026-04-19T09:12:00.000Z"
}
```

**Errors**

- `401` / `403`
	```json
	{ "message": "Unauthorized" }
	```

---

## Farmer Dashboard (Role: `patient`)

> All endpoints below require: **Auth required + role `patient`**.

### GET `/api/patient-dashboard/me`

**Success (200)**

```json
{
	"role": "patient",
	"_id": "507f1f77bcf86cd799439013",
	"fullName": "Rahul Sharma",
	"email": "rahul@example.com",
	"patientType": "general"
}
```

### GET `/api/patient-dashboard/reports/latest`

**Success (200)**

```json
{
	"_id": "507f1f77bcf86cd799439020",
	"patient": "507f1f77bcf86cd799439013",
	"doctor": { "_id": "507f1f77bcf86cd799439011", "fullName": "Asha Verma", "specialty": "Soil Advisory" },
	"hospital": "507f1f77bcf86cd799439012",
	"title": "Soil & Crop Report",
	"notes": "Crop status stable.",
	"uploadedByRole": "doctor",
	"createdAt": "2026-04-19T10:10:00.000Z",
	"updatedAt": "2026-04-19T10:10:00.000Z"
}
```

If no reports exist:

```json
null
```

### GET `/api/patient-dashboard/reports`

**Success (200)**

```json
[
	{
		"_id": "507f1f77bcf86cd799439020",
		"patient": "507f1f77bcf86cd799439013",
		"doctor": { "_id": "507f1f77bcf86cd799439011", "fullName": "Asha Verma", "specialty": "Soil Advisory" },
		"hospital": "507f1f77bcf86cd799439012",
		"title": "Soil & Crop Report",
		"notes": "Crop status stable.",
		"fileUrl": "https://res.cloudinary.com/.../report.pdf",
		"uploadedByRole": "admin",
		"createdAt": "2026-04-19T10:10:00.000Z",
		"updatedAt": "2026-04-19T10:10:00.000Z"
	}
]
```

### GET `/api/patient-dashboard/reports/:reportId/download`

**Params**

| Param | Type | Required |
| :--- | :--- | :---: |
| `reportId` | string | Yes |

**Success (302 redirect)**

- Redirects to the PDF URL (Location header)

**Error examples**

- `404`
	```json
	{ "message": "Report not found" }
	```
- `404` (no PDF available)
	```json
	{ "message": "No PDF available for this report" }
	```

### GET `/api/patient-dashboard/appointments`

Lists bookings for the current farmer (API calls them appointments).

**Success (200)**

```json
[
	{
		"_id": "507f1f77bcf86cd799439030",
		"patient": "507f1f77bcf86cd799439013",
		"doctor": { "_id": "507f1f77bcf86cd799439011", "fullName": "Asha Verma", "specialty": "Soil Advisory" },
		"hospital": "507f1f77bcf86cd799439012",
		"date": "2026-04-19",
		"time": "10:00",
		"mode": "online",
		"status": "pending",
		"meetLink": "https://meet.google.com/abc-defg-hij",
		"notes": "Online appointment requested. Waiting for doctor acceptance and Meet link upload.",
		"createdAt": "2026-04-19T09:45:00.000Z",
		"updatedAt": "2026-04-19T09:45:00.000Z"
	}
]
```

### GET `/api/patient-dashboard/reviews`

**Success (200)**

```json
[
	{
		"_id": "507f1f77bcf86cd799439040",
		"appointment": "507f1f77bcf86cd799439030",
		"doctor": "507f1f77bcf86cd799439011",
		"rating": 5,
		"comment": "Very helpful.",
		"createdAt": "2026-04-19T11:00:00.000Z"
	}
]
```

### GET `/api/patient-dashboard/doctors`

Lists providers available for booking (API calls them doctors).

**Success (200)**

```json
[
	{
		"_id": "507f1f77bcf86cd799439011",
		"fullName": "Asha Verma",
		"specialty": "Soil Advisory",
		"licenseNumber": "PROV-12345",
		"isAvailable": true,
		"averageRating": 4.6,
		"ratingCount": 24
	}
]
```

### GET `/api/patient-dashboard/doctors/:doctorId/slots?date=YYYY-MM-DD`

**Params**

| Param | Type | Required |
| :--- | :--- | :---: |
| `doctorId` | string | Yes |

**Query**

| Key | Type | Required | Notes |
| :--- | :--- | :---: | :--- |
| `date` | string | Yes | `YYYY-MM-DD` |

**Success (200)**

```json
["10:00", "10:30", "11:00"]
```

**Error examples**

- `400`
	```json
	{ "message": "date: Use YYYY-MM-DD" }
	```
- `404`
	```json
	{ "message": "Doctor not found" }
	```

### POST `/api/patient-dashboard/appointments/book`

Creates a booking (stored as an appointment in the API).

**Request body** (`application/json`)

| Field | Type | Required | Notes |
| :--- | :--- | :---: | :--- |
| `doctorId` | string | Yes | ObjectId |
| `date` | string | Yes | `YYYY-MM-DD` |
| `time` | string | Yes | `HH:MM` (24h) |
| `mode` | string | No | `offline` or `online` (default `offline`) |

**Example request**

```json
{ "doctorId": "507f1f77bcf86cd799439011", "date": "2026-04-19", "time": "10:00", "mode": "online" }
```

**Success (201)**

```json
{
	"_id": "507f1f77bcf86cd799439030",
	"patient": "507f1f77bcf86cd799439013",
	"doctor": "507f1f77bcf86cd799439011",
	"hospital": "507f1f77bcf86cd799439012",
	"date": "2026-04-19",
	"time": "10:00",
	"mode": "online",
	"status": "pending",
	"notes": "Online appointment requested. Waiting for doctor acceptance and Meet link upload.",
	"createdAt": "2026-04-19T09:45:00.000Z",
	"updatedAt": "2026-04-19T09:45:00.000Z"
}
```

**Error examples**

- `400` (slot not allowed)
	```json
	{ "message": "Selected time is not available" }
	```
- `404` (doctor not found)
	```json
	{ "message": "Doctor not found" }
	```
- `409` (double booking)
	```json
	{ "message": "Time slot already booked" }
	```

### POST `/api/patient-dashboard/appointments/:appointmentId/review`

Submits a review for a completed booking (API calls it an appointment).

**Params**

| Param | Type | Required |
| :--- | :--- | :---: |
| `appointmentId` | string | Yes |

**Request body**

| Field | Type | Required | Notes |
| :--- | :--- | :---: | :--- |
| `rating` | number | Yes | int 1..5 |
| `comment` | string | No | max 1000 chars |

**Example request**

```json
{ "rating": 5, "comment": "Very helpful." }
```

**Success (201)**

```json
{
	"_id": "507f1f77bcf86cd799439040",
	"appointment": "507f1f77bcf86cd799439030",
	"doctor": "507f1f77bcf86cd799439011",
	"rating": 5,
	"comment": "Very helpful.",
	"createdAt": "2026-04-19T11:00:00.000Z"
}
```

**Error examples**

- `400` (not completed)
	```json
	{ "message": "You can only review after the session is completed" }
	```
- `409` (duplicate)
	```json
	{ "message": "You already reviewed this appointment" }
	```

---

## Provider (Role: `doctor`)

### POST `/api/doctor/login`

**Auth:** none

**Request body**

```json
{ "email": "provider@example.com", "password": "secret123" }
```

**Success (200)**

```json
{
	"role": "doctor",
	"_id": "507f1f77bcf86cd799439011",
	"fullName": "Asha Verma",
	"email": "provider@example.com",
	"specialty": "Soil Advisory",
	"licenseNumber": "PROV-12345",
	"hospital": "507f1f77bcf86cd799439012",
	"isAvailable": true
}
```

**Error examples**

- `400`
	```json
	{ "message": "Invalid credentials" }
	```

> All endpoints below require: **Auth required + role `doctor`**.

### PATCH `/api/doctor/availability`

**Request body**

```json
{ "isAvailable": true }
```

**Success (200)**

```json
{ "isAvailable": true }
```

**Error examples**

- `400`
	```json
	{ "message": "isAvailable: Expected boolean, received string" }
	```

### GET `/api/doctor/appointments?date=YYYY-MM-DD`

Lists bookings assigned to the current provider (API calls them appointments).

**Query**: `date` optional

**Success (200)**

```json
[
	{
		"_id": "507f1f77bcf86cd799439030",
		"patient": { "_id": "507f1f77bcf86cd799439013", "fullName": "Rahul Sharma", "email": "rahul@example.com", "patientType": "general" },
		"doctor": "507f1f77bcf86cd799439011",
		"hospital": "507f1f77bcf86cd799439012",
		"date": "2026-04-19",
		"time": "10:00",
		"mode": "online",
		"status": "pending"
	}
]
```

### GET `/api/doctor/appointments/current`

**Success (200)**

```json
{
	"_id": "507f1f77bcf86cd799439031",
	"patient": { "_id": "507f1f77bcf86cd799439013", "fullName": "Rahul Sharma", "email": "rahul@example.com", "patientType": "general" },
	"doctor": "507f1f77bcf86cd799439011",
	"hospital": "507f1f77bcf86cd799439012",
	"date": "2026-04-19",
	"time": "10:30",
	"mode": "offline",
	"status": "booked"
}
```

If none:

```json
null
```

### PATCH `/api/doctor/appointments/:appointmentId/decision`

Accepts or rejects a booking request (API calls it an appointment).

**Request body**

```json
{ "decision": "accept" }
```

**Success (200)** (updated appointment)

```json
{
	"_id": "507f1f77bcf86cd799439030",
	"patient": { "_id": "507f1f77bcf86cd799439013", "fullName": "Rahul Sharma", "email": "rahul@example.com", "patientType": "general" },
	"doctor": "507f1f77bcf86cd799439011",
	"hospital": "507f1f77bcf86cd799439012",
	"date": "2026-04-19",
	"time": "10:00",
	"mode": "online",
	"status": "booked",
	"doctorDecisionAt": "2026-04-19T09:50:00.000Z",
	"notes": "Doctor accepted the online appointment request. Waiting for Meet link upload.",
	"meetLink": null,
	"meetLinkUploadedAt": null,
	"createdAt": "2026-04-19T09:45:00.000Z",
	"updatedAt": "2026-04-19T09:50:00.000Z"
}
```

**Error examples**

- `400`
	```json
	{ "message": "decision must be accept or reject" }
	```
- `404`
	```json
	{ "message": "Appointment not found" }
	```

### PATCH `/api/doctor/appointments/:appointmentId/meet-link`

Adds the Google Meet link for a remote booking (API calls it an online appointment).

**Request body**

```json
{ "meetLink": "https://meet.google.com/abc-defg-hij" }
```

**Success (200)** (updated appointment)

```json
{
	"_id": "507f1f77bcf86cd799439030",
	"patient": { "_id": "507f1f77bcf86cd799439013", "fullName": "Rahul Sharma", "email": "rahul@example.com", "patientType": "general" },
	"doctor": "507f1f77bcf86cd799439011",
	"hospital": "507f1f77bcf86cd799439012",
	"date": "2026-04-19",
	"time": "10:00",
	"mode": "online",
	"status": "booked",
	"meetLink": "https://meet.google.com/abc-defg-hij",
	"meetLinkUploadedAt": "2026-04-19T09:55:00.000Z",
	"notes": "Meet link uploaded.",
	"updatedAt": "2026-04-19T09:55:00.000Z"
}
```

**Error examples**

- `400`
	```json
	{ "message": "meetLink must be a valid https URL" }
	```

### PATCH `/api/doctor/appointments/:appointmentId/complete`

Marks a booking as completed (API calls it an appointment).

**Success (200)** (updated appointment)

```json
{
	"_id": "507f1f77bcf86cd799439031",
	"patient": { "_id": "507f1f77bcf86cd799439013", "fullName": "Rahul Sharma", "email": "rahul@example.com", "patientType": "general" },
	"doctor": "507f1f77bcf86cd799439011",
	"hospital": "507f1f77bcf86cd799439012",
	"date": "2026-04-19",
	"time": "10:30",
	"mode": "offline",
	"status": "completed",
	"notes": "Session completed.",
	"updatedAt": "2026-04-19T11:30:00.000Z"
}
```

**Error examples**

- `400`
	```json
	{ "message": "Only booked appointments can be marked completed" }
	```

### POST `/api/doctor/reports`

**Request body**

```json
{ "patientId": "507f1f77bcf86cd799439013", "title": "Field Visit Summary", "notes": "Action items noted." }
```

**Success (201)**

```json
{
	"_id": "507f1f77bcf86cd799439020",
	"patient": "507f1f77bcf86cd799439013",
	"doctor": "507f1f77bcf86cd799439011",
	"hospital": "507f1f77bcf86cd799439012",
	"title": "Field Visit Summary",
	"notes": "Action items noted.",
	"uploadedByRole": "doctor",
	"createdAt": "2026-04-19T10:10:00.000Z",
	"updatedAt": "2026-04-19T10:10:00.000Z"
}
```

### GET `/api/doctor/patients?search=...&q=...`

**Success (200)**

```json
[
	{
		"_id": "507f1f77bcf86cd799439013",
		"fullName": "Rahul Sharma",
		"email": "rahul@example.com",
		"patientType": "general"
	}
]
```

### GET `/api/doctor/patients/:patientId/reports`

**Success (200)**

```json
[
	{
		"_id": "507f1f77bcf86cd799439020",
		"patient": "507f1f77bcf86cd799439013",
		"doctor": { "_id": "507f1f77bcf86cd799439011", "fullName": "Dr. Asha Verma", "specialty": "Cardiology" },
		"hospital": "507f1f77bcf86cd799439012",
		"title": "Follow-up Report",
		"notes": "Vitals normal.",
		"fileUrl": "https://res.cloudinary.com/.../report.pdf",
		"uploadedByRole": "admin",
		"createdAt": "2026-04-19T10:10:00.000Z",
		"updatedAt": "2026-04-19T10:10:00.000Z"
	}
]
```

**Error examples**

- `403`
	```json
	{ "message": "Not allowed to view this patient's reports" }
	```

### GET `/api/doctor/reports/:reportId/download`

**Success (302 redirect)**

- Redirects to the PDF URL (Location header)

**Error examples**

- `404`
	```json
	{ "message": "Report not found" }
	```
- `403`
	```json
	{ "message": "Not allowed to download this report" }
	```
- `404` (no PDF available)
	```json
	{ "message": "No PDF available for this report" }
	```

---

## Platform Admin (Role: `admin`)

### POST `/api/admin/register`

**Auth:** none

**Request body**

```json
{ "hospitalName": "AgriHub Operations", "email": "admin@agrihub.com", "password": "secret123", "registerToken": "optional" }
```

Note: `hospitalName` is the backend field name for the organization/platform admin profile.

**Success (201)**

```json
{ "role": "admin", "_id": "507f1f77bcf86cd799439012", "hospitalName": "AgriHub Operations", "email": "admin@agrihub.com" }
```

**Error examples**

- `403`
	```json
	{ "message": "Invalid admin register token" }
	```
- `409`
	```json
	{ "message": "Admin already exists with this email" }
	```

### POST `/api/admin/login`

**Request body**

```json
{ "email": "admin@agrihub.com", "password": "secret123" }
```

**Success (200)**

```json
{ "role": "admin", "_id": "507f1f77bcf86cd799439012", "hospitalName": "AgriHub Operations", "email": "admin@agrihub.com" }
```

**Error examples**

- `400`
	```json
	{ "message": "Invalid credentials" }
	```
- `400` (validation)
	```json
	{ "message": "email: Invalid email" }
	```

> All endpoints below require: **Auth required + role `admin`**.

### POST `/api/admin/doctors`

Creates a provider account (API calls them doctors).

**Request body**

```json
{ "fullName": "Asha Verma", "email": "provider@example.com", "password": "secret123", "specialty": "Soil Advisory", "licenseNumber": "PROV-12345" }
```

**Success (201)**

```json
{
	"_id": "507f1f77bcf86cd799439011",
	"fullName": "Asha Verma",
	"email": "provider@example.com",
	"specialty": "Soil Advisory",
	"licenseNumber": "PROV-12345",
	"isAvailable": true
}
```

### GET `/api/admin/doctors`

Lists provider accounts (API calls them doctors).

**Success (200)**

```json
[
	{
		"_id": "507f1f77bcf86cd799439011",
		"fullName": "Asha Verma",
		"email": "provider@example.com",
		"specialty": "Soil Advisory",
		"licenseNumber": "PROV-12345",
		"hospital": "507f1f77bcf86cd799439012",
		"isAvailable": true,
		"slots": [],
		"averageRating": 4.6,
		"ratingCount": 24,
		"stats": { "total": 12, "booked": 2 }
	}
]
```

### GET `/api/admin/doctors/:doctorId/reviews`

Fetches reviews for a provider (API calls them a doctor).

**Success (200)**

```json
{
	"doctor": {
		"_id": "507f1f77bcf86cd799439011",
		"fullName": "Asha Verma",
		"email": "provider@example.com",
		"specialty": "Soil Advisory",
		"licenseNumber": "PROV-12345",
		"averageRating": 4.6,
		"ratingCount": 24,
		"isAvailable": true
	},
	"reviews": [
		{
			"_id": "507f1f77bcf86cd799439040",
			"appointment": { "_id": "507f1f77bcf86cd799439030", "date": "2026-04-19", "time": "10:00", "mode": "online" },
			"patient": { "_id": "507f1f77bcf86cd799439013", "fullName": "Rahul Sharma", "email": "rahul@example.com", "patientType": "general" },
			"rating": 5,
			"comment": "Very helpful.",
			"createdAt": "2026-04-19T11:00:00.000Z"
		}
	]
}
```

### PUT `/api/admin/doctors/:doctorId/slots`

Updates availability slots for a provider (API calls them a doctor).

**Request body**

```json
{ "date": "2026-04-19", "times": ["10:00", "10:30"] }
```

**Success (200)**

```json
{ "message": "Slots updated" }
```

**Error examples**

- `400`
	```json
	{ "message": "date: Use YYYY-MM-DD" }
	```

### DELETE `/api/admin/doctors/:doctorId`

**Success (200)**

```json
{ "message": "Doctor deleted" }
```

### GET `/api/admin/appointments?doctorId=...`

Lists booking history (API calls them appointments).

**Query**

| Key | Type | Required | Notes |
| :--- | :--- | :---: | :--- |
| `doctorId` | string | No | ObjectId |

**Success (200)**

```json
[
	{
		"_id": "507f1f77bcf86cd799439030",
		"patient": { "_id": "507f1f77bcf86cd799439013", "fullName": "Rahul Sharma", "email": "rahul@example.com", "patientType": "general" },
		"doctor": { "_id": "507f1f77bcf86cd799439011", "fullName": "Asha Verma", "email": "provider@example.com", "specialty": "Soil Advisory" },
		"hospital": "507f1f77bcf86cd799439012",
		"date": "2026-04-19",
		"time": "10:00",
		"mode": "online",
		"status": "booked",
		"meetLink": "https://meet.google.com/abc-defg-hij",
		"createdAt": "2026-04-19T09:45:00.000Z",
		"updatedAt": "2026-04-19T09:55:00.000Z"
	}
]
```

### GET `/api/admin/feedback?limit=50`

**Success (200)**

```json
[
	{
		"_id": "507f1f77bcf86cd799439050",
		"submittedByRole": "patient",
		"submittedById": "507f1f77bcf86cd799439013",
		"name": "Rahul Sharma",
		"email": "rahul@example.com",
		"rating": 5,
		"message": "Great experience.",
		"createdAt": "2026-04-19T12:00:00.000Z"
	}
]
```

### GET `/api/admin/patients?search=...&q=...`

Searches farmers (API calls them patients).

**Success (200)**

```json
[
	{ "_id": "507f1f77bcf86cd799439013", "fullName": "Rahul Sharma", "email": "rahul@example.com", "patientType": "general" }
]
```

### GET `/api/admin/patients/:patientId/reports`

**Success (200)**

```json
[
	{
		"_id": "507f1f77bcf86cd799439020",
		"patient": "507f1f77bcf86cd799439013",
		"doctor": { "_id": "507f1f77bcf86cd799439011", "fullName": "Asha Verma", "specialty": "Soil Advisory" },
		"hospital": "507f1f77bcf86cd799439012",
		"title": "Soil Test Report",
		"notes": "Uploaded by admin",
		"fileUrl": "https://res.cloudinary.com/.../report.pdf",
		"uploadedByRole": "admin",
		"createdAt": "2026-04-19T12:30:00.000Z",
		"updatedAt": "2026-04-19T12:30:00.000Z"
	}
]
```

**Error examples**

- `404`
	```json
	{ "message": "Patient not found" }
	```
- `403`
	```json
	{ "message": "Patient is not associated with this hospital" }
	```

### POST `/api/admin/reports/upload` (multipart/form-data)

Uploads a farmer report PDF.

**Auth:** required + role `admin`

**Form fields**

- `file`: PDF file (**required**)
- `patientId`: ObjectId (**required**)
- `title`: string (**required**)
- `notes`: string (optional)

**Success (201)** (report document)

```json
{
	"_id": "507f1f77bcf86cd799439020",
	"patient": "507f1f77bcf86cd799439013",
	"hospital": "507f1f77bcf86cd799439012",
	"title": "Soil Test Report",
	"notes": "Uploaded by admin",
	"fileUrl": "https://res.cloudinary.com/.../report.pdf",
	"filePublicId": "reports/.../report_...",
	"fileOriginalName": "soil-test.pdf",
	"fileMimeType": "application/pdf",
	"fileBytes": 345678,
	"uploadedByRole": "admin",
	"createdAt": "2026-04-19T12:30:00.000Z",
	"updatedAt": "2026-04-19T12:30:00.000Z"
}
```

**Error examples**

- `503`
	```json
	{ "message": "Cloudinary not configured" }
	```
- `400`
	```json
	{ "message": "Only PDF files are allowed" }
	```

### GET `/api/admin/reports/:reportId/download`

**Success (302 redirect)**

- Redirects to the PDF URL (Location header)

**Error examples**

- `404`
	```json
	{ "message": "Report not found" }
	```
- `404` (no PDF available)
	```json
	{ "message": "No PDF available for this report" }
	```

---

## Feedback (Role: `patient`)

### POST `/api/feedback/`

**Auth:** required + role `patient` (Farmer)

**Request body**

```json
{ "message": "Great experience.", "rating": 5 }
```

**Success (201)**

```json
{ "message": "Feedback submitted", "feedbackId": "507f1f77bcf86cd799439050" }
```

**Error examples**

- `400`
	```json
	{ "message": "message: String must contain at least 3 character(s)" }
	```

---

## Gesture Service Proxy

These endpoints proxy requests to an external gesture service (configured via server env vars).

### POST `/api/gesture/start`

**Auth:** none

**Success (200)**

```json
{ "message": "Gesture control started", "gesture": { "ok": true } }
```

**Error examples**

- `502` (gesture service error)
	```json
	{
		"message": "Gesture service returned an error",
		"gesture": { "status": 500, "body": "..." }
	}
	```
- `502` (timeout/unreachable)
	```json
	{
		"message": "Gesture service timed out",
		"error": "The operation was aborted.",
		"gestureServiceUrl": "http://localhost:5001"
	}
	```

### POST `/api/gesture/stop`

**Auth:** none

**Success (200)**

```json
{ "message": "Gesture control stopped", "gesture": { "ok": true } }
```

**Error examples:** same as `/api/gesture/start` (`502`)
