const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml"
};

const readBody = (req) => new Promise((resolve, reject) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 1_000_000) {
      reject(new Error("Request too large"));
      req.destroy();
    }
  });
  req.on("end", () => resolve(body));
  req.on("error", reject);
});

const fallbackAnswer = (message = "") => {
  const raw = String(message).trim();
  const lower = raw.toLowerCase();
  if (!raw) return "Schreib mir deine Aufgabe, dann helfe ich dir Schritt für Schritt.";

  if (["translate", "uebersetze", "übersetze", "was heisst", "was heißt"].some((word) => lower.includes(word))) {
    return "Bei einer Übersetzung gebe ich dir die Bedeutung direkt und danach ein kurzes Beispiel. Schreib am besten das genaue Wort oder den ganzen Satz.";
  }

  if (/[0-9]\s*[\+\-\*x:\/]\s*[0-9]|\([^)]*[\+\-\*x:\/][^)]*\)/.test(lower)) {
    const bracket = raw.match(/\(([^()]+)\)/);
    if (bracket) {
      return `Ich würde zuerst die Klammer anschauen: ${bracket[1]}. Rechne diesen Zwischenschritt aus und setze das Ergebnis danach wieder in die Aufgabe ein.`;
    }
    return "Bei Mathe starten wir mit der Reihenfolge: Klammern, dann Punktrechnung, dann Strichrechnung. Markiere zuerst den Teil, der nach dieser Regel dran ist.";
  }

  return `Lass uns das als Lerncoach zerlegen: 1. Was ist gegeben? 2. Was wird gesucht? 3. Welcher erste Schritt passt? Zu deiner Frage "${raw}" würde ich zuerst die wichtigsten Begriffe klären und dann ein kleines Beispiel machen.`;
};

const sendJson = (res, status, data) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
};

const callOpenAI = async (message) => {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions: "Du bist Lynxly AI, ein vertrauenswürdiger Lerncoach für Schüler. Antworte auf Deutsch, erkläre Schritt für Schritt, stelle Rückfragen und gib nicht nur Endlösungen ohne Erklärung.",
      input: message
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "KI-Anfrage fehlgeschlagen");
  return data.output_text || fallbackAnswer(message);
};

const handleChat = async (req, res) => {
  try {
    const raw = await readBody(req);
    const body = raw ? JSON.parse(raw) : {};
    const message = body.message || body.attachmentName || "";
    if (process.env.OPENAI_API_KEY) {
      const answer = await callOpenAI(message);
      sendJson(res, 200, { answer, offline: false });
      return;
    }
    sendJson(res, 200, {
      answer: fallbackAnswer(message),
      offline: true
    });
  } catch (error) {
    sendJson(res, 200, { answer: fallbackAnswer(""), offline: true, warning: error.message || "Lynxly AI konnte die Anfrage nicht lesen." });
  }
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:4173");

  if (url.pathname === "/api/chat") {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    handleChat(req, res);
    return;
  }

  const requestedPath = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  const filePath = path.normalize(path.join(root, requestedPath));

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "text/plain; charset=utf-8" });
    res.end(data);
  });
});

server.listen(4173, "127.0.0.1", () => {
  console.log("Lynxly running at http://127.0.0.1:4173");
});




