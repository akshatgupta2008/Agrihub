const DAYS = 1000 * 60 * 60 * 24;

const normalizeText = (text) =>
  (text || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ");

const daysBetween = (d1, d2) =>
  Math.abs(new Date(d2) - new Date(d1)) / DAYS;

export function getReportSummary({ latestReport }) {
  if (!latestReport?.notes) return "No report notes available. Consider consulting a local agri expert for details.";
  return latestReport.notes.slice(0, 200) + (latestReport.notes.length > 200 ? "..." : "");
}

export function calculateFarmScore({ reports, bookings, appointments } = {}) {
  const bookingEvents = bookings ?? appointments;
  let score = 50;

  if (!reports || reports.length === 0) return 20;

  const latest = reports[0];
  if (latest?.createdAt) {
    const daysSinceReport = daysBetween(latest.createdAt, new Date());
    if (daysSinceReport <= 30) score += 15;
    else if (daysSinceReport <= 90) score += 8;
    else if (daysSinceReport <= 180) score += 3;
  }

  if (reports.length >= 3) score += 10;
  else if (reports.length === 2) score += 5;

  if (bookingEvents && bookingEvents.length >= 2) score += 10;
  else if (bookingEvents && bookingEvents.length === 1) score += 5;

  if (bookingEvents && bookingEvents.length > 0) {
    const sorted = [...bookingEvents].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
    const latestBooking = sorted[0];
    if (latestBooking?.date && daysBetween(latestBooking.date, new Date()) <= 30)
      score += 5;
  }

  const notesText = normalizeText(latest?.notes);
  const goodKeywords = ["optimal", "good", "stable", "suitable", "adequate", "healthy", "no issue", "improved"];
  const concernKeywords = ["pest", "disease", "deficiency", "low", "high", "salinity", "ph", "drought", "flood", "warning", "infestation"];

  if (goodKeywords.some((k) => notesText.includes(k))) score += 5;
  const concerns = concernKeywords.filter((k) => notesText.includes(k)).length;
  score -= concerns * 10;

  return Math.max(0, Math.min(100, score));
}

export function getFarmDos({ reports } = {}) {
  const dos = [];
  const allNotes = (reports || [])
    .map((r) => normalizeText(r?.notes || ""))
    .join(" ");

  const patterns = [
    { keywords: ["soil test", "ph", "ec", "salinity"], text: "Run periodic soil testing (pH/EC) before input decisions" },
    { keywords: ["irrigation", "water", "drip", "moisture"], text: "Plan irrigation based on soil moisture and weather" },
    { keywords: ["fertilizer", "npk", "urea", "dap"], text: "Apply fertilizer in split doses based on crop stage" },
    { keywords: ["pest", "insect", "infestation"], text: "Scout for pests regularly and act early" },
    { keywords: ["disease", "fungus", "blight"], text: "Monitor for disease symptoms and follow recommended control" },
    { keywords: ["mulch", "organic", "compost"], text: "Use organic matter/compost to improve soil health" },
    { keywords: ["rotation", "crop rotation"], text: "Follow crop rotation to reduce pest and disease pressure" },
    { keywords: ["weather", "forecast", "rain"], text: "Track weather alerts before spraying or harvesting" },
  ];

  for (const { keywords, text } of patterns) {
    if (keywords.some((k) => allNotes.includes(k)) && !dos.includes(text)) {
      dos.push(text);
    }
  }

  if (dos.length === 0) {
    dos.push("Check weather forecast before key farm operations");
    dos.push("Inspect crops weekly for pests and nutrient issues");
    dos.push("Irrigate based on soil moisture, not just a fixed schedule");
  }

  return dos.slice(0, 4);
}

export function getFarmDonts({ reports } = {}) {
  const donts = [];
  const allNotes = (reports || [])
    .map((r) => normalizeText(r?.notes || ""))
    .join(" ");

  const patterns = [
    { keywords: ["overwater", "waterlogging"], text: "Avoid overwatering and prolonged waterlogging" },
    { keywords: ["excess", "overuse", "too much fertilizer"], text: "Avoid excess fertilizer — follow dose recommendations" },
    { keywords: ["spray", "pesticide", "chemical"], text: "Avoid spraying in high wind or right before rain" },
    { keywords: ["burn", "stubble burning"], text: "Avoid crop residue burning — prefer mulching/composting" },
    { keywords: ["late harvest", "delay"], text: "Avoid delaying harvest beyond maturity window" },
    { keywords: ["mix", "tank mix"], text: "Avoid unsafe pesticide tank mixes without guidance" },
  ];

  for (const { keywords, text } of patterns) {
    if (keywords.some((k) => allNotes.includes(k)) && !donts.includes(text)) {
      donts.push(text);
    }
  }

  return donts.slice(0, 4);
}

export function getInputRecommendations({ reports } = {}) {
  const recs = [];
  const allNotes = (reports || [])
    .map((r) => normalizeText(r?.notes || ""))
    .join(" ");

  const patterns = [
    { keywords: ["nitrogen", "urea"], text: "Nitrogen (e.g., urea) — consider split application" },
    { keywords: ["phosphorus", "dap"], text: "Phosphorus (e.g., DAP) — apply near sowing/transplant" },
    { keywords: ["potassium", "mop"], text: "Potassium (e.g., MOP) — support stress tolerance" },
    { keywords: ["zinc", "zn"], text: "Zinc supplementation — if deficiency symptoms appear" },
    { keywords: ["boron", "b"], text: "Boron supplementation — for flowering/fruiting support" },
    { keywords: ["fungus", "blight"], text: "Fungicide — if fungal disease risk is confirmed" },
    { keywords: ["pest", "aphid", "worm"], text: "Targeted pest control — follow local recommendations" },
    { keywords: ["seed treatment"], text: "Seed treatment — reduce early-stage disease/pest risk" },
  ];

  for (const { keywords, text } of patterns) {
    if (keywords.some((k) => allNotes.includes(k)) && !recs.includes(text)) {
      recs.push(text);
    }
  }

  return recs.slice(0, 4);
}

export function analyzeFarmerForProvider({ reports } = {}) {
  const actionItems = [];
  const possibleIssues = [];
  let insightText = "";

  if (!reports || reports.length === 0) {
    return {
      reportCount: 0,
      firstReportDate: null,
      lastReportDate: null,
      daysSinceLastReport: null,
      actionItems,
      possibleIssues,
      lacking: actionItems,
      possibleDiagnoses: possibleIssues,
      insightText: "No reports on file for this farmer.",
    };
  }

  const sorted = [...reports].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );
  const firstReportDate = sorted[0]?.createdAt;
  const lastReportDate = sorted[sorted.length - 1]?.createdAt;
  const daysSinceLastReport = Math.floor(
    (new Date() - new Date(lastReportDate)) / DAYS
  );

  const allNotes = reports
    .map((r) => normalizeText(r?.notes || ""))
    .join(" ");
  const allTitles = reports
    .map((r) => normalizeText(r?.title || ""))
    .join(" ");

  const actionItemPatterns = [
    { keywords: ["follow up", "monitor", "needs monitoring"], text: "Follow-up field visit recommended" },
    { keywords: ["soil test", "ph", "ec"], text: "Soil testing / lab report review needed" },
    { keywords: ["irrigation", "water", "drip"], text: "Irrigation plan review recommended" },
    { keywords: ["fertilizer", "npk", "dose"], text: "Input dose plan review recommended" },
    { keywords: ["pest", "insect", "infestation"], text: "Pest scouting and control plan needed" },
    { keywords: ["disease", "blight", "fungus"], text: "Disease identification and control plan needed" },
    { keywords: ["weed", "weeds"], text: "Weed management review recommended" },
    { keywords: ["harvest", "maturity"], text: "Harvest timing and post-harvest plan review" },
  ];

  for (const { keywords, text } of actionItemPatterns) {
    if (keywords.some((k) => allNotes.includes(k) || allTitles.includes(k))) {
      actionItems.push(text);
    }
  }

  const issuePatterns = [
    { keywords: ["pest", "insect", "aphid", "worm"], text: "Pest pressure" },
    { keywords: ["disease", "blight", "fungus"], text: "Crop disease risk" },
    { keywords: ["deficiency", "yellow", "chlorosis"], text: "Nutrient deficiency indicators" },
    { keywords: ["ph", "salinity", "ec"], text: "Soil pH/salinity concern" },
    { keywords: ["drought", "dry"], text: "Drought stress" },
    { keywords: ["flood", "waterlogging"], text: "Waterlogging risk" },
    { keywords: ["weed", "weeds"], text: "Weed pressure" },
    { keywords: ["yield", "low yield"], text: "Yield risk" },
  ];

  for (const { keywords, text } of issuePatterns) {
    if (keywords.some((k) => allNotes.includes(k) || allTitles.includes(k))) {
      if (!possibleIssues.includes(text)) possibleIssues.push(text);
    }
  }

  const conditionsCount = possibleIssues.length;
  const lackingCount = actionItems.length;

  if (reports.length === 1) {
    insightText = `Only one report on file (dated ${new Date(firstReportDate).toLocaleDateString()}). Limited history — recommend an initial field assessment.`;
  } else if (daysSinceLastReport > 90) {
    insightText = `No new reports in ${daysSinceLastReport} days. Consider a follow-up farm visit or updated soil/crop report.`;
  } else if (conditionsCount >= 3) {
    insightText = `Reports show ${conditionsCount} issue indicators (${possibleIssues.join(", ")}). Recommend a focused action plan.`;
  } else if (lackingCount >= 2) {
    insightText = `There are ${lackingCount} action items (${actionItems.join(", ")}). Recommend addressing these in the next visit.`;
  } else if (conditionsCount > 0 && lackingCount > 0) {
    insightText = `Issues noted (${possibleIssues.join(" and ")}) with ${lackingCount} action items (${actionItems.join(", ")}). Prioritize follow-up.`;
  } else if (conditionsCount > 0) {
    insightText = `Issues noted (${possibleIssues.join(", ")}). Monitor and manage proactively.`;
  } else {
    const daysSince = Math.floor((new Date() - new Date(lastReportDate)) / DAYS);
    insightText = `Last report was ${daysSince} days ago. Overall status appears stable — routine monitoring recommended.`;
  }

  return {
    reportCount: reports.length,
    firstReportDate,
    lastReportDate,
    daysSinceLastReport,
    actionItems: actionItems.slice(0, 5),
    possibleIssues: possibleIssues.slice(0, 6),
    lacking: actionItems.slice(0, 5),
    possibleDiagnoses: possibleIssues.slice(0, 6),
    insightText,
  };
}

// (Intentionally no health-sector backward-compat exports)
