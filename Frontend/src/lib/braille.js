export const brailleMap = {
  a: "⠁",
  b: "⠃",
  c: "⠉",
  d: "⠙",
  e: "⠑",
  f: "⠋",
  g: "⠛",
  h: "⠓",
  i: "⠊",
  j: "⠚",
  k: "⠅",
  l: "⠇",
  m: "⠍",
  n: "⠝",
  o: "⠕",
  p: "⠏",
  q: "⠟",
  r: "⠗",
  s: "⠎",
  t: "⠞",
  u: "⠥",
  v: "⠧",
  w: "⠺",
  x: "⠭",
  y: "⠽",
  z: "⠵",
  " ": " ",
  0: "⠴",
  1: "⠂",
  2: "⠆",
  3: "⠒",
  4: "⠲",
  5: "⠢",
  6: "⠖",
  7: "⠶",
  8: "⠦",
  9: "⠔",
  ".": "⠲",
  ",": "⠂",
  "!": "⠖",
  "?": "⠦",
  "-": "⠤",
};

export const toBraille = (text) =>
  String(text || "")
    .toLowerCase()
    .split("")
    .map((ch) => brailleMap[ch] ?? ch)
    .join("");

const buildReverse = (preferDigits) => {
  const entries = Object.entries(brailleMap);

  const priority = (ch) => {
    if (ch === " ") return 0;
    if (ch >= "a" && ch <= "z") return 1;
    const isDigit = ch >= "0" && ch <= "9";
    const isPunc = [".", ",", "!", "?", "-"].includes(ch);

    if (isDigit && isPunc) return 2;
    if (isPunc) return preferDigits ? 3 : 2;
    if (isDigit) return preferDigits ? 2 : 3;
    return 4;
  };

  entries.sort((a, b) => priority(a[0]) - priority(b[0]));

  const reverse = {};
  for (const [ch, br] of entries) {
    if (reverse[br] == null) reverse[br] = ch;
  }
  return reverse;
};

const reversePreferPunct = buildReverse(false);
const reversePreferDigits = buildReverse(true);

export const fromBraille = (braille) => {
  const str = String(braille || "");
  const hasDigitContext = /[⠴⠆⠒⠢⠶⠔]/.test(str);
  const reverse = hasDigitContext ? reversePreferDigits : reversePreferPunct;

  return str
    .split("")
    .map((cell) => reverse[cell] ?? cell)
    .join("");
};
