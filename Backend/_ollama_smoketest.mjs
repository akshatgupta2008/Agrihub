import { Ollama } from "ollama";

const host = process.env.OLLAMA_URL || "http://localhost:11434";
const o = new Ollama({ host });
console.log("host", host);

try {
  const s = await o.chat({
    model: "medgemma",
    messages: [{ role: "user", content: "hi" }],
    stream: true,
  });

  for await (const part of s) {
    console.log("part", Object.keys(part));
    break;
  }
} catch (e) {
  console.error("ERR", e);
  process.exitCode = 1;
}
