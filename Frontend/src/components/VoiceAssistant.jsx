import { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { voiceCommandDataset, voiceLanguages, getMessage } from "../data/voiceCommands";
import { normalizeVoiceText, resolveVoiceIntentWithSuggestions } from "../lib/voiceCommandResolver";
import { axiosInstance } from "../lib/axios";

const SpeechRecognitionApi =
  window.SpeechRecognition || window.webkitSpeechRecognition;

// ── Mood support videos (ported from /new-project/MotivationSupport.jsx) ─────
const SUPPORT_VIDEO_POOL = [
  {
    id: 1,
    title: "Original Motivation",
    url: "https://youtu.be/fOFUVKnjWgI?si=7dxuh7GBpGgno2N3",
  },
  {
    id: 2,
    title: "Nature Calm",
    url: "https://youtu.be/vk7sxXM3D1k?si=cZlWdS2mGc5EBPoA",
  },
  {
    id: 3,
    title: "Daily Inspiration",
    url: "https://youtu.be/4dJC_NKti9A?si=iq7khInIAVcR8YiF",
  },
  {
    id: 4,
    title: "Breathing & Focus",
    url: "https://youtu.be/t-vha-KrE2M?si=gay9M9kkzgK9Ffx_",
  },
  {
    id: 5,
    title: "Motivation Boost 1",
    url: "https://youtu.be/2qkUaQQwOE8?si=C8HtUMWZvqyh0LVp",
  },
  {
    id: 6,
    title: "Motivation Boost 2",
    url: "https://youtu.be/D5SHwJRif4A?si=OtG2PM3zdkwC1dGp",
  },
  {
    id: 7,
    title: "Motivation Boost 3",
    url: "https://youtu.be/1Sn-QvKYNFM?si=YGRSGkUQFBvcW1QK",
  },
];

const toYouTubeEmbedUrl = (rawUrl) => {
  try {
    const u = new URL(rawUrl);
    let videoId = "";

    if (u.hostname === "youtu.be") {
      videoId = u.pathname.replace("/", "").trim();
    } else if (u.searchParams.get("v")) {
      videoId = u.searchParams.get("v");
    } else if (u.pathname.includes("/embed/")) {
      const parts = u.pathname.split("/embed/");
      videoId = (parts[1] || "").split("/")[0];
    }

    if (!videoId) return null;

    // Autoplay is usually blocked unless muted.
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=1&rel=0`;
  } catch {
    return null;
  }
};

const resolveSupportTrigger = (transcript) => {
  const text = normalizeVoiceText(transcript);
  if (!text) return null;

  // Focus on “feeling low” phrases (avoid hijacking generic "help" commands).
  const patterns = [
    { test: /(i am|im|i'm) feeling sad|feeling sad|very sad|so sad/, reason: "Feeling sad" },
    { test: /(i am|im|i'm) lost|im lost|lost man|i feel lost|feeling lost/, reason: "Feeling lost" },
    { test: /(i am|im|i'm) the worst|i feel like the worst|i'm the worst/, reason: "Feeling low" },
    { test: /unhappy|crying|hurting|alone|lonely|depressed|down/, reason: "Feeling low" },
    { test: /bot.*(sad|lost|worst|alone|lonely)/, reason: "Feeling low" },

    // Extra “I can't / I fail” triggers (English + Hindi)
    { test: /(i can t do this|i cannot do this|cant do this|can t do this)/, reason: "I can't do this" },
    { test: /मुझसे (ये|यह) नहीं होगा/, reason: "I can't do this" },
    { test: /(i m not good enough|im not good enough|i am not good enough)/, reason: "Not good enough" },
    { test: /मैं इतना अच्छा नहीं हूँ/, reason: "Not good enough" },
    { test: /(what s the point|whats the point|what is the point)/, reason: "What's the point" },
    { test: /इसका क्या फायदा/, reason: "What's the point" },
    { test: /(i always fail|i keep failing|i fail every time)/, reason: "I always fail" },
    { test: /मैं हमेशा फेल हो जाता हूँ/, reason: "I always fail" },
    { test: /(this is too hard|too hard for me)/, reason: "This is too hard" },
    { test: /ये बहुत मुश्किल है/, reason: "This is too hard" },
  ];

  const hit = patterns.find((p) => p.test.test(text));
  return hit ? hit.reason : null;
};

const dashboardPathFor = (user) => {
  if (!user?.role) return "/";
  if (user.role === "admin") return "/dashboard/admin";
  if (user.role === "doctor") return "/dashboard/provider";
  if (user.role === "patient") {
    return user.patientType === "special" ? "/dashboard/farmer-plus" : "/dashboard/farmer";
  }
  return "/";
};

const canAccessPath = (path, user) => {
  if (!path.startsWith("/dashboard")) {
    return true;
  }

  if (!user) {
    return false;
  }

  if (path === "/dashboard") {
    return true;
  }

  if (path === "/dashboard/admin") return user.role === "admin";
  if (path === "/dashboard/provider") return user.role === "doctor";
  if (path === "/dashboard/farmer") return user.role === "patient" && user.patientType === "general";
  if (path === "/dashboard/farmer-plus") return user.role === "patient" && user.patientType === "special";

  return false;
};

const loginPathForDashboard = (path) => {
  if (path === "/dashboard/admin") return "/admin/login";
  if (path === "/dashboard/provider") return "/provider/login";
  return "/farmer/login";
};

const detectResponseLanguage = (text) => {
  if (!text) return navigator.language || "en-US";

  if (/[\u0980-\u09FF]/u.test(text)) return "bn-IN";
  if (/[\u0900-\u097F]/u.test(text)) return "hi-IN";

  const normalized = text.toLowerCase();
  if (/(\bque\b|\bquien\b|\babrir\b|\bidiomas\b|\bpaciente\b)/.test(normalized)) {
    return "es-ES";
  }
  if (/(\bkya\b|\bmujhe\b|\bhai\b|\bkaise\b)/.test(normalized)) {
    return "hi-IN";
  }
  if (/(\bki\b|\bkoro\b|\bbolo\b|\bbangla\b)/.test(normalized)) {
    return "bn-IN";
  }

  return navigator.language || "en-US";
};

const fallbackReplyFor = (transcript, language = "en-US") => {
  const lang = detectResponseLanguage(transcript);
  return getMessage("fallbackError", lang || language);
};

const resolveSmallTalk = (transcript) => {
  const text = (transcript || "").toLowerCase().trim();

  const patterns = [
    {
      test: /(how are you|how r you|kaise ho|aap kaise ho|tum kaise ho|como estas|kemon acho|কেমন আছ)/,
      message:
        "I am doing great and ready to help you. You can ask me to open pages, dashboards, or explain AgriHub features.",
    },
    {
      test: /(what is your name|your name|who are you|tumhara naam|aapka naam|তোমার নাম|como te llamas|quien eres)/,
      message:
        "I am AgriHub Voice Assistant, built to support accessible and multilingual farm navigation.",
    },
    {
      test: /(what can you do|help me|can you help|madad karo|কি করতে পারো|que puedes hacer)/,
      message:
        "I can open pages, guide dashboards by role, and answer questions about AgriHub features for farmers, service providers, and admins.",
    },
    {
      test: /(thank you|thanks|dhanyavaad|shukriya|ধন্যবাদ|gracias)/,
      message: "You are welcome. I am always here to help you.",
    },
    {
      test: /(^|\s)(hello|hi|hey|namaste|salaam|hola|হ্যালো)(\s|$)/,
      message:
        "Hello. I am your AgriHub voice assistant. Tell me where you want to go, or ask me about website features.",
    },
  ];

  const matched = patterns.find((entry) => entry.test.test(text));
  return matched?.message || null;
};

const formatYyyyMmDd = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseDateFromText = (normalizedText) => {
  if (!normalizedText) return null;

  const cleaned = normalizedText.replace(/\b(\d{1,2})(st|nd|rd|th)\b/g, "$1");

  const iso = cleaned.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    const [_, y, m, d] = iso;
    return `${y}-${m}-${d}`;
  }

  const slash = cleaned.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
  if (slash) {
    // Interpret as DD/MM/YYYY (common in India) and also accept DD-MM-YYYY.
    const day = Number(slash[1]);
    const month = Number(slash[2]);
    const year = Number(slash[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const today = new Date();
  if (/\btoday\b|\baaj\b|\baj\b|আজ/.test(cleaned)) {
    return formatYyyyMmDd(today);
  }
  if (/\btomorrow\b|\bkal\b|আগামীকাল/.test(cleaned)) {
    const t = new Date(today);
    t.setDate(t.getDate() + 1);
    return formatYyyyMmDd(t);
  }

  // Month name parsing: "19 april" / "april 19" (English only)
  const months = {
    january: 1,
    jan: 1,
    february: 2,
    feb: 2,
    march: 3,
    mar: 3,
    april: 4,
    apr: 4,
    may: 5,
    june: 6,
    jun: 6,
    july: 7,
    jul: 7,
    august: 8,
    aug: 8,
    september: 9,
    sep: 9,
    sept: 9,
    october: 10,
    oct: 10,
    november: 11,
    nov: 11,
    december: 12,
    dec: 12,
  };

  const m1 = cleaned.match(
    /\b(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(\d{4}))?\b/
  );
  const m2 = cleaned.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:\s+(\d{4}))?\b/
  );
  const monthToken = m1?.[2] || m2?.[1];
  const dayToken = m1?.[1] || m2?.[2];
  const yearToken = m1?.[3] || m2?.[3];
  if (monthToken && dayToken) {
    const month = months[monthToken];
    const day = Number(dayToken);
    if (month && day >= 1 && day <= 31) {
      const year = yearToken ? Number(yearToken) : today.getFullYear();
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  return null;
};

const parseTimeFromText = (normalizedText) => {
  if (!normalizedText) return null;

  // Accept HH:MM in 24h format.
  const hhmm = normalizedText.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (hhmm) {
    return `${String(hhmm[1]).padStart(2, "0")}:${hhmm[2]}`;
  }

  // Accept "5 pm", "5pm", "5 30 pm" => convert to HH:MM.
  const ampm = normalizedText.match(/\b(\d{1,2})(?:\s*[: ]\s*(\d{2}))?\s*(am|pm)\b/);
  if (ampm) {
    let h = Number(ampm[1]);
    const m = Number(ampm[2] || "0");
    const ap = ampm[3];
    if (h >= 1 && h <= 12 && m >= 0 && m <= 59) {
      if (ap === "pm" && h !== 12) h += 12;
      if (ap === "am" && h === 12) h = 0;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }

  return null;
};

const parseBookingRequest = (transcript) => {
  const normalized = normalizeVoiceText(transcript);
  if (!normalized) return null;

  const looksLikeBooking = /(book|booking|appointment|schedule)(\s|$)/.test(normalized);
  if (!looksLikeBooking) return null;

  const mode = /(online|video|meet|google meet)/.test(normalized)
    ? "online"
    : /(offline|in person|in-person|on site|on-site|field|farm)/.test(normalized)
      ? "offline"
      : null;

  const date = parseDateFromText(normalized);
  const time = parseTimeFromText(normalized);

  // Extract provider query after "provider"/"doctor" tokens.
  let doctorQuery = null;
  const drMatch = normalized.match(/\b(dr|doctor|provider)\s+([a-z\s]{2,})/);
  if (drMatch) {
    doctorQuery = drMatch[2]
      .replace(/\b(on|for|at|today|tomorrow|online|offline|appointment|book|booking)\b.*$/g, "")
      .trim();
  }

  return {
    doctorQuery: doctorQuery || null,
    date,
    time,
    mode,
    raw: transcript,
  };
};

const parseBookingFields = (transcript, options = {}) => {
  const { allowDoctorFallback = false } = options;
  const normalized = normalizeVoiceText(transcript);
  if (!normalized) return { doctorQuery: null, date: null, time: null, mode: null };

  const mode = /(online|video|meet|google meet)/.test(normalized)
    ? "online"
    : /(offline|in person|in-person|on site|on-site|field|farm)/.test(normalized)
      ? "offline"
      : null;

  const date = parseDateFromText(normalized);
  const time = parseTimeFromText(normalized);

  let doctorQuery = null;
  const drMatch = normalized.match(/\b(?:dr|doctor|provider)\s+([a-z\s]{2,})/);
  if (drMatch) {
    doctorQuery = drMatch[1]
      .replace(/\b(on|for|at|today|tomorrow|online|offline|appointment|book|booking|schedule)\b.*$/g, "")
      .trim();
  } else if (allowDoctorFallback) {
    // When the assistant explicitly asked “Which provider?”, accept bare names like “Sharma”.
    doctorQuery = normalized
      .replace(/\b(online|offline|appointment|book|booking|schedule|on|for|at)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return {
    doctorQuery: doctorQuery || null,
    date,
    time,
    mode,
  };
};

const tokenizeName = (value) =>
  normalizeVoiceText(value)
    .replace(/\b(dr|doctor|provider)\b/g, " ")
    .split(" ")
    .filter(Boolean);

const findBestDoctorMatch = (doctors, doctorQuery) => {
  const queryTokens = tokenizeName(doctorQuery);
  if (!queryTokens.length) return null;

  const scored = (doctors || [])
    .map((doc) => {
      const nameTokens = tokenizeName(doc.fullName);
      const nameSet = new Set(nameTokens);
      const matched = queryTokens.filter((t) => nameSet.has(t)).length;
      const coverage = matched / queryTokens.length;
      const density = matched / Math.max(nameTokens.length, 1);
      return { doc, score: coverage * 0.8 + density * 0.2 };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best) return null;

  // Require most tokens to match to avoid booking wrong doctor.
  if (best.score < 0.72) return null;
  return best.doc;
};

const VoiceAssistant = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = useAuthStore((s) => s.authUser);
  const recognitionRef = useRef(null);
  const keepListeningRef = useRef(false);
  const restartTimeoutRef = useRef(null);
  const restartBackoffRef = useRef(300);
  const restartAttemptsRef = useRef(0);
  const lastSpokenRef = useRef("");
  const pendingConfirmRef = useRef(null);
  const isProcessingRef = useRef(false);
  const pendingBookingRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState("");
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [includeDebugExport, setIncludeDebugExport] = useState(true);
  const [recognitionLang, setRecognitionLang] = useState(() => navigator.language || "en-US");
  const [pendingConfirmUi, setPendingConfirmUi] = useState(null);

  // Voice agent awake/standby (so you can say “hello agent” / “stop agent”)
  const [_agentAwake, setAgentAwake] = useState(true);
  const agentAwakeRef = useRef(true);
  const setAwake = (nextAwake) => {
    agentAwakeRef.current = nextAwake;
    setAgentAwake(nextAwake);
  };

  // Mood support modal state
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportReason, setSupportReason] = useState("");
  const [supportVideoIndex, setSupportVideoIndex] = useState(0);

  const unsupported = useMemo(() => !SpeechRecognitionApi, []);

  const appendHistory = (entry) => {
    setHistory((prev) => [entry, ...prev].slice(0, 5));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const exportHistory = () => {
    if (!history.length) return;

    const payload = includeDebugExport
      ? {
          exportedAt: new Date().toISOString(),
          mode: "auto-language",
          entries: history,
        }
      : history.map((entry) => ({
          command: entry.command,
          destination: entry.destination,
          recognized: entry.recognized,
        }));

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "agrihub-voice-history.json";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const speak = (message) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = detectResponseLanguage(message);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
    lastSpokenRef.current = message;
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
  };

  const isYes = (normalizedText) => {
    return /(^|\s)(yes|yeah|yup|ok|okay|confirm|sure|haan|han|ha|ji|si)(\s|$)/.test(normalizedText);
  };

  const isNo = (normalizedText) => {
    return /(^|\s)(no|nah|nope|cancel|stop|nahi|nai|na)(\s|$)/.test(normalizedText);
  };

  const promptConfirmation = (intentForAction, language = "en-US") => {
    const prompt = getMessage("confirmationPrompt", language);
    const expiresAt = Date.now() + 12_000;
    pendingConfirmRef.current = { intent: intentForAction, expiresAt };
    setPendingConfirmUi({ expiresAt });
    setStatus(prompt);
    speak(prompt);
  };

  const clearPendingConfirmation = () => {
    pendingConfirmRef.current = null;
    setPendingConfirmUi(null);
  };

  const intentLabelForSuggestions = (intent) => {
    if (!intent) return "";
    if (intent.type === "comingSoon" && intent.featureLabel) return intent.featureLabel;
    if (intent.type === "informational") return intent.id || "information";
    if (intent.type === "clientAction") return intent.action || intent.id;
    if (intent.path) {
      const label = intent.path
        .split("/")
        .filter(Boolean)
        .join(" ");
      return `open ${label || "home"}`;
    }
    return intent.id || "command";
  };

  const handleClientAction = (intent, transcript, matchStrategy, confidencePercent, language = "en-US") => {
    const action = intent.action;

    const runAction = () => {
      if (action === "repeat") {
        const message = lastSpokenRef.current || status || "Ready.";
        appendHistory({
          command: transcript,
          destination: "Repeat last response",
          recognized: true,
          strategy: matchStrategy,
          confidence: confidencePercent,
        });
        setStatus(message);
        speak(message);
        return;
      }

      if (action === "stopSpeaking") {
        stopSpeaking();
        const message = getMessage("stopSpeaking", language);
        appendHistory({
          command: transcript,
          destination: "Stop speaking",
          recognized: true,
          strategy: matchStrategy,
          confidence: confidencePercent,
        });
        setStatus(message);
        return;
      }

      if (action === "goBack") {
        navigate(-1);
        const message = getMessage("goBack", language);
        appendHistory({
          command: transcript,
          destination: "Navigate back",
          recognized: true,
          strategy: matchStrategy,
          confidence: confidencePercent,
        });
        setStatus(message);
        speak(message);
        return;
      }

      if (action === "clearHistory") {
        clearHistory();
        const message = getMessage("clearVoiceHistory", language);
        appendHistory({
          command: transcript,
          destination: "Clear voice history",
          recognized: true,
          strategy: matchStrategy,
          confidence: confidencePercent,
        });
        setStatus(message);
        speak(message);
        return;
      }

      if (action === "exportHistory") {
        exportHistory();
        const message = getMessage("exportVoiceHistory", language);
        appendHistory({
          command: transcript,
          destination: "Export voice history",
          recognized: true,
          strategy: matchStrategy,
          confidence: confidencePercent,
        });
        setStatus(message);
        speak(message);
        return;
      }

      const message = "This action is not supported yet.";
      appendHistory({
        command: transcript,
        destination: "Unknown client action",
        recognized: false,
        strategy: matchStrategy,
        confidence: confidencePercent,
      });
      setStatus(message);
      speak(message);
    };

    if (intent.requiresConfirmation && matchStrategy !== "confirm-yes") {
      promptConfirmation(intent, language);
      return;
    }

    runAction();
  };

  const stopListening = () => {
    keepListeningRef.current = false;
    setAwake(true);
    clearPendingConfirmation();

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setStatus("Microphone stopped");
  };

  const openSupportModal = (reason, language = "en-US") => {
    const randomIndex = Math.floor(Math.random() * SUPPORT_VIDEO_POOL.length);
    setSupportVideoIndex(randomIndex);
    setSupportReason(reason);

    if ("vibrate" in navigator) {
      try {
        navigator.vibrate([200, 100, 250, 800, 200, 100, 250]);
      } catch {
        // ignore
      }
    }

    stopListening();
    setSupportOpen(true);

    const message = "I hear you. Let’s watch a short calming video together. You are not alone.";
    setStatus(message);
    speak(message);
  };

  const closeSupportModal = () => {
    setSupportOpen(false);
    setSupportReason("");
    window.speechSynthesis?.cancel();
    setStatus("Support session closed. You can start the mic again anytime.");
  };

  const createRecognitionSession = () => {
    if (unsupported) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionApi();
    recognition.lang = recognitionLang || navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError("");
      setStatus("Listening...");
      restartBackoffRef.current = 300;
      restartAttemptsRef.current = 0;
    };

    recognition.onresult = async (event) => {
      const latestResult = event.results?.[event.results.length - 1];
      const transcript = latestResult?.[0]?.transcript || "";
      const isFinal = Boolean(latestResult?.isFinal);

      setLastCommand(transcript);

      // Only act on FINAL results to avoid repeated triggers from interim updates.
      if (!isFinal) return;

      if (isProcessingRef.current) {
        return;
      }
      isProcessingRef.current = true;

      try {
        const normalizedTranscript = normalizeVoiceText(transcript);

      // Handle pending confirmation (for destructive client actions).
      if (pendingConfirmRef.current) {
        const { intent, expiresAt } = pendingConfirmRef.current;

        if (Date.now() > expiresAt) {
          clearPendingConfirmation();
          const message = getMessage("confirmationTimeout", recognitionLang);
          setStatus(message);
          speak(message);
          return;
        }

        if (isYes(normalizedTranscript)) {
          clearPendingConfirmation();
          handleClientAction(intent, transcript, "confirm-yes", 100, recognitionLang);
          return;
        }

        if (isNo(normalizedTranscript)) {
          clearPendingConfirmation();
          const message = getMessage("confirmationCancelled", recognitionLang);
          appendHistory({
            command: transcript,
            destination: "Cancelled confirmation",
            recognized: true,
            strategy: "confirm-no",
            confidence: 100,
          });
          setStatus(message);
          speak(message);
          return;
        }

        const message = getMessage("confirmationYesAnswer", recognitionLang);
        setStatus(message);
        speak(message);
        return;
      }

      const stopMicHit =
        /\bstop\s+agent\b/.test(normalizedTranscript) ||
        /\bstop\s+voice\s+agent\b/.test(normalizedTranscript) ||
        /\bstop\s+listening\b/.test(normalizedTranscript);

      const standbyHit =
        /\b(sleep|pause)\s+agent\b/.test(normalizedTranscript) ||
        /\bstandby\s+agent\b/.test(normalizedTranscript);

      const wakeAgentHit =
        /\b(hello|hi|hey|ok|okay|start)\s+agent\b/.test(normalizedTranscript) ||
        /\b(start|hello|hi|hey)\s+voice\s+agent\b/.test(normalizedTranscript);

      if (stopMicHit) {
        appendHistory({
          command: transcript,
          destination: "Microphone stopped",
          recognized: true,
          strategy: "stop-mic-phrase",
          confidence: 100,
        });

        window.speechSynthesis?.cancel();
        stopListening();

        const langKey = recognitionLang.split("-")[0];
        let message = "Okay. Microphone stopped. Click the mic button to start again.";
        if (langKey === "hi") message = "ठीक है। माइक बंद हो गया है। फिर से शुरू करने के लिए माइक बटन पर क्लिक करें।";
        else if (langKey === "bn") message = "ঠিক আছে। মাইক বন্ধ হয়েছে। আবার শুরু করতে মাইক বোতাম ক্লিক করুন।";
        else if (langKey === "es") message = "Está bien. Micrófono detenido. Haz clic en el botón del micrófono para comenzar de nuevo.";
        setStatus(message);
        speak(message);
        return;
      }

      if (standbyHit) {
        appendHistory({
          command: transcript,
          destination: "Voice agent standby",
          recognized: true,
          strategy: "standby-phrase",
          confidence: 100,
        });

        if (agentAwakeRef.current) {
          window.speechSynthesis?.cancel();
          setAwake(false);
          const langKey = recognitionLang.split("-")[0];
          let msg = "Okay. I am on standby. Say 'hello agent' to continue.";
          if (langKey === "hi") msg = "ठीक है। मैं स्टैंडबाय पर हूँ। जारी रखने के लिए नमस्ते कहें।";
          else if (langKey === "bn") msg = "ঠিক আছে। আমি স্ট্যান্ডবাইতে আছি। চালিয়ে যেতে হ্যালো বলুন।";
          else if (langKey === "es") msg = "Está bien. Estoy en espera. Di hola para continuar.";
          setStatus(msg);
          speak(msg);
        } else {
          const langKey = recognitionLang.split("-")[0];
          let msg = "Standby. Say hello to continue.";
          if (langKey === "hi") msg = "स्टैंडबाय। जारी रखने के लिए नमस्ते कहें।";
          else if (langKey === "bn") msg = "স্ট্যান্ডবাই। চালিয়ে যেতে হ্যালো বলুন।";
          else if (langKey === "es") msg = "Espera. Di hola para continuar.";
          setStatus(msg);
        }
        return;
      }

      if (wakeAgentHit) {
        appendHistory({
          command: transcript,
          destination: "Voice agent awake",
          recognized: true,
          strategy: "wake-phrase",
          confidence: 100,
        });

        if (!agentAwakeRef.current) {
          setAwake(true);
          const langKey = recognitionLang.split("-")[0];
          let msg = "I am listening.";
          if (langKey === "hi") msg = "मैं सुन रहा हूँ।";
          else if (langKey === "bn") msg = "আমি শুনছি।";
          else if (langKey === "es") msg = "Estoy escuchando.";
          setStatus(msg);
          speak(msg);
        } else {
          setStatus("Listening...");
        }
        return;
      }

      if (!agentAwakeRef.current) {
        // Ignore commands while on standby (until the user says “hello agent”).
        return;
      }

      if (pendingBookingRef.current && /(^|\s)(cancel|stop|never mind|nevermind)(\s|$)/.test(normalizedTranscript)) {
        pendingBookingRef.current = null;
        const message = "Okay. Cancelled booking request.";
        appendHistory({
          command: transcript,
          destination: "Booking cancelled",
          recognized: true,
          strategy: "booking-cancel",
          confidence: 100,
        });
        setStatus(message);
        speak(message);
        return;
      }

      // Multi-turn booking: if we previously asked for missing doctor/date, try to fill from this message.
      if (pendingBookingRef.current) {
        const current = pendingBookingRef.current;
        const patch = parseBookingFields(transcript, {
          allowDoctorFallback: !current.doctorQuery,
        });
        pendingBookingRef.current = {
          ...current,
          doctorQuery: current.doctorQuery || patch.doctorQuery,
          date: current.date || patch.date,
          time: current.time || patch.time,
          // Allow follow-up replies like "tomorrow online" to override mode.
          mode: patch.mode || current.mode,
        };
      }

      const bookingRequest = pendingBookingRef.current || parseBookingRequest(transcript);
      if (bookingRequest) {
        if (!authUser || authUser.role !== "patient") {
          pendingBookingRef.current = null;
          const message = "Please log in as a farmer to place a booking request. Opening farmer login.";
          appendHistory({
            command: transcript,
            destination: "/farmer/login",
            recognized: true,
            strategy: "booking-rule",
            confidence: 100,
          });
          setStatus(message);
          speak(message);
          if (location.pathname !== "/farmer/login") navigate("/farmer/login");
          return;
        }

        if (!bookingRequest.doctorQuery) {
          pendingBookingRef.current = {
            ...bookingRequest,
            doctorQuery: null,
          };
          const message = "Which service provider? Please say: book with Provider <name>.";
          setStatus(message);
          speak(message);
          return;
        }

        if (!bookingRequest.date) {
          pendingBookingRef.current = {
            ...bookingRequest,
            date: null,
          };
          const message = "For which date? Please say a date like 2026-04-25 or tomorrow.";
          setStatus(message);
          speak(message);
          return;
        }

        const mode = bookingRequest.mode || "offline";

        setStatus("Checking available slots...");

        try {
          const doctorsRes = await axiosInstance.get("/patient-dashboard/doctors");
          const doctors = doctorsRes.data || [];
          const doctor = findBestDoctorMatch(doctors, bookingRequest.doctorQuery);

          if (!doctor) {
            pendingBookingRef.current = null;
            const message = `No such provider exists: ${bookingRequest.doctorQuery}.`;
            appendHistory({
              command: transcript,
              destination: "Provider not found",
              recognized: true,
              strategy: "booking-rule",
              confidence: 100,
            });
            setStatus(message);
            speak(message);
            return;
          }

          const date = bookingRequest.date;
          const slotsRes = await axiosInstance.get(`/patient-dashboard/doctors/${doctor._id}/slots`, {
            params: { date },
          });

          const availableTimes = Array.isArray(slotsRes.data) ? slotsRes.data : [];

          if (availableTimes.length === 0) {
            pendingBookingRef.current = null;
            const message = `No slots available for ${doctor.fullName} on ${date}.`;
            appendHistory({
              command: transcript,
              destination: "No slots",
              recognized: true,
              strategy: "booking-rule",
              confidence: 100,
            });
            setStatus(message);
            speak(message);
            return;
          }

          const requestedTime = bookingRequest.time;
          const timeToBook = requestedTime && availableTimes.includes(requestedTime)
            ? requestedTime
            : availableTimes[0];

          if (requestedTime && !availableTimes.includes(requestedTime)) {
            // Inform but continue by booking the nearest available slot.
            const note = `Requested time ${requestedTime} is not available. Booking ${timeToBook} instead.`;
            setStatus(note);
            speak(note);
          }

          const apptRes = await axiosInstance.post("/patient-dashboard/appointments/book", {
            doctorId: doctor._id,
            date,
            time: timeToBook,
            mode,
          });

          const createdAppt = apptRes?.data;

          pendingBookingRef.current = null;

          const apptStatus = createdAppt?.status;
          const message =
            mode === "online" && apptStatus === "pending"
              ? `Remote booking requested with ${doctor.fullName} on ${date} at ${timeToBook}. Waiting for provider acceptance.`
              : `Booking confirmed with ${doctor.fullName} on ${date} at ${timeToBook}.`;

          appendHistory({
            command: transcript,
            destination: "Booking created",
            recognized: true,
            strategy: "booking-rule",
            confidence: 100,
          });
          setStatus(message);
          speak(message);

          // Let dashboards refresh their appointment list immediately.
          try {
            window.dispatchEvent(
              new CustomEvent("agrihub:appointmentsUpdated", {
                detail: { appointment: createdAppt || null },
              })
            );
          } catch {
            // ignore
          }

          return;
        } catch (e) {
          const statusCode = e?.response?.status;
          const apiMessage = e?.response?.data?.message;

          pendingBookingRef.current = null;

          let message = apiMessage || "Could not place the booking right now.";

          if (statusCode === 401) {
            message = "Please log in again. Your session expired.";
            if (location.pathname !== "/farmer/login") navigate("/farmer/login");
          } else if (statusCode === 403) {
            message = "Only farmers can place booking requests.";
          } else if (statusCode === 404) {
            message = "No such provider exists.";
          } else if (statusCode === 409) {
            message = "That time slot is already booked. Please try another slot.";
          } else if (statusCode === 400 && apiMessage) {
            message = apiMessage;
          }

          appendHistory({
            command: transcript,
            destination: "Booking error",
            recognized: true,
            strategy: "booking-rule",
            confidence: 100,
          });
          setStatus(message);
          speak(message);
          return;
        }
      }

      const supportReasonHit = resolveSupportTrigger(transcript);
      if (supportReasonHit) {
        appendHistory({
          command: transcript,
          destination: "Mood support video",
          recognized: true,
          strategy: "support-video-rule",
          confidence: 100,
        });
        openSupportModal(supportReasonHit, recognitionLang);
        return;
      }

      const smallTalkMessage = resolveSmallTalk(transcript);
      if (smallTalkMessage) {
        appendHistory({
          command: transcript,
          destination: "Small-talk response",
          recognized: true,
          strategy: "small-talk-rule",
          confidence: 100,
        });
        setStatus(smallTalkMessage);
        speak(smallTalkMessage);
        return;
      }

      const { match, suggestions } = resolveVoiceIntentWithSuggestions(transcript, voiceCommandDataset, {
        minScore: 0.52,
        suggestionCount: 3,
      });

      if (!match) {
        const suggestionText = (suggestions || [])
          .slice(0, 2)
          .map((s) => intentLabelForSuggestions(s.intent))
          .filter(Boolean);

        appendHistory({
          command: transcript,
          destination: "No route",
          recognized: false,
          strategy: "none",
          confidence: 0,
        });

        if (suggestionText.length) {
          const message = `I could not understand that. Did you mean ${suggestionText.join(" or ")}?`;
          setStatus(message);
          speak(message);
          return;
        }

        setStatus(`Command not recognized: ${transcript}`);
        speak(fallbackReplyFor(transcript, recognitionLang));
        return;
      }

      const matchResult = match;
      const matchedRoute = matchResult.intent;

      let destinationPath = matchedRoute.path;
      let statusMessage = matchedRoute.messageKey ? getMessage(matchedRoute.messageKey, recognitionLang) : matchedRoute.message;

      if (matchedRoute.type === "informational") {
        appendHistory({
          command: transcript,
          destination: "Information response",
          recognized: true,
          strategy: matchResult.strategy,
          confidence: Math.round((matchResult.score || 0) * 100),
        });
        setStatus(statusMessage);
        speak(statusMessage);
        return;
      }

      if (matchedRoute.type === "clientAction") {
        handleClientAction(
          matchedRoute,
          transcript,
          matchResult.strategy,
          Math.round((matchResult.score || 0) * 100),
          recognitionLang
        );
        return;
      }

      if (matchedRoute.type === "comingSoon") {
        const langKey = recognitionLang.split("-")[0];
        let comingSoonMessage = `${matchedRoute.featureLabel} is planned in AgriHub and will be available soon.`;
        if (langKey === "hi") comingSoonMessage = `${matchedRoute.featureLabel} AgriHub में शीघ्र ही उपलब्ध होगा।`;
        else if (langKey === "bn") comingSoonMessage = `${matchedRoute.featureLabel} AgriHub-এ শীঘ্রই উপলব্ধ হবে।`;
        else if (langKey === "es") comingSoonMessage = `${matchedRoute.featureLabel} estará disponible en AgriHub pronto.`;
        appendHistory({
          command: transcript,
          destination: `Coming soon: ${matchedRoute.featureLabel}`,
          recognized: true,
          strategy: matchResult.strategy,
          confidence: Math.round((matchResult.score || 0) * 100),
        });
        setStatus(comingSoonMessage);
        speak(comingSoonMessage);
        return;
      }

      if (matchedRoute.path === "/dashboard") {
        if (!authUser) {
          destinationPath = "/farmer/login";
          statusMessage = "Please log in first. Opening farmer login.";
        } else {
          destinationPath = dashboardPathFor(authUser);
          statusMessage = "Opening your dashboard.";
        }
      } else if (matchedRoute.path.startsWith("/dashboard") && !canAccessPath(matchedRoute.path, authUser)) {
        if (!authUser) {
          destinationPath = loginPathForDashboard(matchedRoute.path);
          statusMessage = "Please log in first. Redirecting to login.";
        } else {
          destinationPath = dashboardPathFor(authUser);
          statusMessage = "Access denied for that dashboard. Opening your dashboard.";
        }
      }

      if (location.pathname !== destinationPath) {
        navigate(destinationPath);
      }

      appendHistory({
        command: transcript,
        destination: destinationPath,
        recognized: true,
        strategy: matchResult.strategy,
        confidence: Math.round((matchResult.score || 0) * 100),
      });

      setStatus(statusMessage);
      speak(statusMessage);
      } finally {
        isProcessingRef.current = false;
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted" && !keepListeningRef.current) {
        return;
      }

      let message = `Microphone error: ${event.error}.`;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        message = "Microphone permission denied. Please allow microphone access in your browser settings.";
      } else if (event.error === "no-speech") {
        message = "I did not hear anything. Please try again.";
      } else if (event.error === "audio-capture") {
        message = "No microphone detected. Please check your audio input device.";
      }

      setError(message);
      setStatus("Voice assistant unavailable");
      setIsListening(false);

      if (keepListeningRef.current && event.error !== "not-allowed" && event.error !== "service-not-allowed") {
        restartAttemptsRef.current += 1;
        restartBackoffRef.current = Math.min(restartBackoffRef.current * 1.6, 4000);

        // Avoid infinite restart loops.
        if (restartAttemptsRef.current <= 6) {
          restartTimeoutRef.current = setTimeout(() => {
            createRecognitionSession();
          }, restartBackoffRef.current);
        } else {
          keepListeningRef.current = false;
          setStatus("Microphone stopped due to repeated errors");
        }
      }
    };

    recognition.onend = () => {
      if (!keepListeningRef.current) {
        setIsListening(false);
        return;
      }

      restartBackoffRef.current = Math.min(restartBackoffRef.current * 1.3, 2500);
      restartTimeoutRef.current = setTimeout(() => {
        createRecognitionSession();
      }, restartBackoffRef.current);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const startListening = () => {
    keepListeningRef.current = true;
    createRecognitionSession();
  };

  const onToggle = () => {
    if (isListening) {
      stopListening();
      return;
    }
    startListening();
  };

  const currentSupportVideo = SUPPORT_VIDEO_POOL[supportVideoIndex] ?? SUPPORT_VIDEO_POOL[0];
  const supportEmbedUrl = currentSupportVideo ? toYouTubeEmbedUrl(currentSupportVideo.url) : null;

  return (
    <>
      {supportOpen ? (
        <div
          className="support-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Motivation support video"
        >
          <div className="support-modal">
            <button
              type="button"
              className="support-modal-close"
              onClick={closeSupportModal}
              aria-label="Close support video"
            >
              ×
            </button>

            <div className="support-modal-header">
              <p className="support-modal-title">Support video</p>
              {supportReason ? <p className="support-modal-subtitle">Trigger: {supportReason}</p> : null}
            </div>

            <div className="support-video-frame">
              {supportEmbedUrl ? (
                <iframe
                  className="support-video"
                  src={supportEmbedUrl}
                  title={currentSupportVideo.title}
                  frameBorder="0"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="support-video-fallback">Could not load video.</div>
              )}
            </div>

            <div className="support-modal-footer">
              <p className="support-modal-source">
                Source: <strong>{currentSupportVideo.title}</strong>
              </p>
              <p className="support-modal-tip">
                If you still feel low, consider talking to a trusted person or a field support professional.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="voice-assistant-panel" role="region" aria-label="Voice assistant">
        <button
          className={`voice-assistant-button ${isListening ? "listening" : ""}`}
          onClick={onToggle}
          aria-label={isListening ? "Stop voice assistant" : "Start voice assistant"}
        >
          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        <div className="voice-assistant-info">
          <div className="voice-assistant-title">
            <Volume2 size={14} />
            <span>Voice Agent</span>
          </div>
          <label className="voice-assistant-language" htmlFor="voice-agent-language">
            <span>Language</span>
            <select
              id="voice-agent-language"
              value={recognitionLang}
              onChange={(e) => setRecognitionLang(e.target.value)}
              disabled={unsupported}
            >
              {voiceLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </label>
          <p className="voice-assistant-status">{unsupported ? "Not supported on this browser" : status}</p>
          {lastCommand ? <p className="voice-assistant-command">Last: "{lastCommand}"</p> : null}
          {error ? <p className="voice-assistant-error">{error}</p> : null}
          {pendingConfirmUi ? (
            <p className="voice-assistant-hint">Waiting for confirmation (say yes/no)...</p>
          ) : null}
          {history.length ? (
            <div className="voice-history" aria-label="Voice command history">
              <div className="voice-history-actions">
                <button type="button" className="voice-history-btn" onClick={clearHistory}>
                  Clear
                </button>
                <button type="button" className="voice-history-btn" onClick={exportHistory}>
                  Export
                </button>
              </div>
              <label className="voice-export-toggle" htmlFor="voice-export-debug">
                <input
                  id="voice-export-debug"
                  type="checkbox"
                  checked={includeDebugExport}
                  onChange={(event) => setIncludeDebugExport(event.target.checked)}
                />
                <span>Include debug fields</span>
              </label>
              {history.map((item, index) => (
                <div key={`${item.command}-${index}`} className="voice-history-item">
                  <p className="voice-history-command">"{item.command}"</p>
                  <p className="voice-history-meta">
                    {item.recognized ? `-> ${item.destination}` : "-> Unrecognized"} | {item.strategy} | {item.confidence}%
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default VoiceAssistant;
