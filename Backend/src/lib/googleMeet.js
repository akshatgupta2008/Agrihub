import { google } from "googleapis";
import { ENV } from "./ENV.js";

const hasGoogleMeetConfig = () => {
  return Boolean(ENV.GOOGLE_CLIENT_EMAIL && ENV.GOOGLE_PRIVATE_KEY && ENV.GOOGLE_CALENDAR_ID);
};

const toPrivateKey = (raw) => {
  // Commonly stored with literal \n in env vars
  return String(raw).replace(/\\n/g, "\n");
};

const addMinutesToTime = (hhmm, minutesToAdd) => {
  const [hStr, mStr] = String(hhmm).split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;

  const total = h * 60 + m + minutesToAdd;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

export const createMeetLinkForAppointment = async ({
  hospitalName,
  doctorName,
  patientName,
  date,
  time,
  durationMinutes = 30,
}) => {
  if (!hasGoogleMeetConfig()) {
    const err = new Error("Google Meet integration not configured");
    err.code = "MEET_NOT_CONFIGURED";
    throw err;
  }

  const auth = new google.auth.JWT({
    email: ENV.GOOGLE_CLIENT_EMAIL,
    key: toPrivateKey(ENV.GOOGLE_PRIVATE_KEY),
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  const calendar = google.calendar({ version: "v3", auth });

  const endTime = addMinutesToTime(time, durationMinutes);
  if (!endTime) {
    const err = new Error("Invalid time format");
    err.code = "INVALID_TIME";
    throw err;
  }

  const summary = `AgriHub Booking: ${patientName} with ${doctorName}`;
  const description = hospitalName ? `Organization: ${hospitalName}` : "AgriHub Booking";

  const startDateTime = `${date}T${time}:00`;
  const endDateTime = `${date}T${endTime}:00`;

  const resp = await calendar.events.insert({
    calendarId: ENV.GOOGLE_CALENDAR_ID,
    conferenceDataVersion: 1,
    requestBody: {
      summary,
      description,
      start: { dateTime: startDateTime, timeZone: ENV.GOOGLE_TIMEZONE },
      end: { dateTime: endDateTime, timeZone: ENV.GOOGLE_TIMEZONE },
      conferenceData: {
        createRequest: {
          requestId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
    sendUpdates: "none",
  });

  const meetLink = resp?.data?.hangoutLink;
  if (!meetLink) {
    const err = new Error("Failed to create Meet link");
    err.code = "MEET_CREATE_FAILED";
    throw err;
  }

  return { meetLink };
};
