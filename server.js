const http = require("http");
const fs = require("fs");
const path = require("path");
const { aiInstructions, buildAiInput, fallbackAnswer } = require("./ai-chat-core");

const root = __dirname;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

const readBody = (req) => new Promise((resolve, reject) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 6_000_000) {
      reject(new Error("Request too large"));
      req.destroy();
    }
  });
  req.on("end", () => resolve(body));
  req.on("error", reject);
});

const sendJson = (res, status, data) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
};

const callOpenAI = async (message, imageData, attachmentName) => {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions: aiInstructions,
      input: buildAiInput(message, imageData, attachmentName)
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "KI-Anfrage fehlgeschlagen");
  return data.output_text || fallbackAnswer(message, Boolean(imageData));
};

const handleChat = async (req, res) => {
  try {
    const raw = await readBody(req);
    const body = raw ? JSON.parse(raw) : {};
    const message = body.message || body.attachmentName || "";
    const imageData = body.imageData || "";
    const attachmentName = body.attachmentName || "";
    if (process.env.OPENAI_API_KEY) {
      const answer = await callOpenAI(message, imageData, attachmentName);
      sendJson(res, 200, { answer, offline: false });
      return;
    }
    sendJson(res, 200, {
      answer: fallbackAnswer(message, Boolean(imageData)),
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
