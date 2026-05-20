const STOP_WORDS = new Set([
  "please",
  "kindly",
  "can",
  "could",
  "you",
  "me",
  "to",
  "the",
  "a",
  "an",
  "take",
  "go",
  "open",
  "my",
  "mujhe",
  "kripya",
  "zara",
  "mera",
  "hume",
  "humen",
  "por",
  "favor",
  "se",
  "ko",
  "hai",
  "ki",
  "ke",
  "ka",
  "kya",
  "ami",
  "amar",
  "tumi",
  "que",
  "de",
  "la",
  "el",
  "mi",
  "es",
  "un",
  "una",
]);

export const normalizeVoiceText = (value) => {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const tokenize = (value) => {
  return normalizeVoiceText(value)
    .split(" ")
    .filter((token) => token && !STOP_WORDS.has(token));
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const containsWholePhrase = (normalizedText, normalizedPhrase) => {
  if (!normalizedText || !normalizedPhrase) return false;

  // Prefer whole-word matches to avoid accidental substring triggers.
  // Example: "home" should not match "homer".
  const pattern = new RegExp(`(^|\\s)${escapeRegExp(normalizedPhrase)}(\\s|$)`, "i");
  return pattern.test(normalizedText);
};

const scoreIntent = (commandTokens, intent) => {
  const commandSet = new Set(commandTokens);
  let bestScore = 0;

  for (const phrase of intent.phrases) {
    const phraseTokens = tokenize(phrase);
    if (!phraseTokens.length) continue;

    const matched = phraseTokens.filter((token) => commandSet.has(token)).length;
    const overlapScore = matched / phraseTokens.length;
    const densityScore = matched / Math.max(commandTokens.length, 1);
    const score = overlapScore * 0.8 + densityScore * 0.2;

    if (score > bestScore) {
      bestScore = score;
    }
  }

  if (intent.keywords?.length) {
    const keywordMatches = intent.keywords.filter((keyword) => commandSet.has(keyword)).length;
    bestScore += keywordMatches * 0.08;
  }

  return bestScore;
};

export const resolveVoiceIntent = (spokenText, dataset) => {
  const normalized = normalizeVoiceText(spokenText);
  if (!normalized) return null;

  let strongestDirectMatch = null;

  for (const intent of dataset) {
    for (const phrase of intent.phrases) {
      const normalizedPhrase = normalizeVoiceText(phrase);
      if (!normalizedPhrase) continue;

      if (containsWholePhrase(normalized, normalizedPhrase)) {
        if (!strongestDirectMatch || normalizedPhrase.length > strongestDirectMatch.phrase.length) {
          strongestDirectMatch = { intent, phrase: normalizedPhrase };
        }
      }
    }
  }

  if (strongestDirectMatch) {
    return {
      intent: strongestDirectMatch.intent,
      strategy: "direct",
      score: 1,
      matchedPhrase: strongestDirectMatch.phrase,
    };
  }

  const commandTokens = tokenize(normalized);
  if (!commandTokens.length) return null;

  let bestIntent = null;
  let bestScore = 0;

  for (const intent of dataset) {
    const score = scoreIntent(commandTokens, intent);
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  if (bestScore < 0.52 || !bestIntent) {
    return null;
  }

  return {
    intent: bestIntent,
    strategy: "fuzzy",
    score: Number(bestScore.toFixed(2)),
    matchedPhrase: null,
  };
};

export const resolveVoiceIntentWithSuggestions = (spokenText, dataset, options = {}) => {
  const {
    minScore = 0.52,
    suggestionCount = 3,
  } = options;

  const normalized = normalizeVoiceText(spokenText);
  if (!normalized) {
    return { match: null, suggestions: [] };
  }

  const direct = resolveVoiceIntent(spokenText, dataset);
  if (direct) {
    return { match: direct, suggestions: [] };
  }

  const commandTokens = tokenize(normalized);
  if (!commandTokens.length) {
    return { match: null, suggestions: [] };
  }

  const scored = dataset
    .map((intent) => ({ intent, score: scoreIntent(commandTokens, intent) }))
    .filter((entry) => Number.isFinite(entry.score) && entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const match = best && best.score >= minScore
    ? {
        intent: best.intent,
        strategy: "fuzzy",
        score: Number(best.score.toFixed(2)),
        matchedPhrase: null,
      }
    : null;

  const suggestions = scored
    .slice(0, Math.max(0, suggestionCount))
    .map((entry) => ({
      intent: entry.intent,
      score: Number(entry.score.toFixed(2)),
    }));

  return { match, suggestions };
};
