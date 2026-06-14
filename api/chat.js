```js
const DEFAULT_MODEL = "gpt-4.1-mini";
const REQUEST_TIMEOUT_MS = 25_000;

/**
 * Local response used only when OPENAI_API_KEY is unavailable.
 */
const fallbackAnswer = (message = "", hasImage = false) => {
  const raw = String(message || "").trim();
  const lower = raw.toLowerCase();

  if (hasImage) {
    return (
      "Ich habe dein Foto erhalten. Ohne verbundenen KI-Bildmodus kann ich " +
      "es lokal nicht sicher auslesen. Beschreibe kurz, was auf dem Foto " +
      "steht, dann helfe ich dir Schritt für Schritt."
    );
  }

  if (!raw) {
    return "Schreib mir deine Aufgabe, dann helfe ich dir Schritt für Schritt.";
  }

  if (
    ["translate", "uebersetze", "übersetze", "was heisst", "was heißt"]
      .some((word) => lower.includes(word))
  ) {
    return (
      "Bei einer Übersetzung gebe ich dir die Bedeutung direkt und danach " +
      "ein kurzes Beispiel. Schreib am besten das genaue Wort oder den ganzen Satz."
    );
  }

  if (
    /[0-9]\s*[\+\-\*x:\/]\s*[0-9]|\([^)]*[\+\-\*x:\/][^)]*\)/.test(lower)
  ) {
    const bracket = raw.match(/\(([^()]+)\)/);

    if (bracket) {
      return (
        `Ich würde zuerst die Klammer anschauen: ${bracket[1]}. ` +
        "Rechne diesen Zwischenschritt aus und setze das Ergebnis danach " +
        "wieder in die Aufgabe ein."
      );
    }

    return (
      "Bei Mathe starten wir mit der Reihenfolge: Klammern, dann " +
      "Punktrechnung, dann Strichrechnung. Markiere zuerst den Teil, " +
      "der nach dieser Regel dran ist."
    );
  }

  return (
    "Lass uns das als Lerncoach zerlegen: " +
    "1. Was ist gegeben? " +
    "2. Was wird gesucht? " +
    "3. Welcher erste Schritt passt? " +
    `Zu deiner Frage "${raw}" würde ich zuerst die wichtigsten Begriffe ` +
    "klären und dann ein kleines Beispiel machen."
  );
};

/**
 * Safely read a request body in Vercel/serverless environments.
 */
const parseRequestBody = (req) => {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      throw new Error("Der Anfrage-Body enthält kein gültiges JSON.");
    }
  }

  return {};
};

/**
 * Guess an image MIME type when the frontend sends only raw Base64.
 */
const inferImageMimeType = (attachmentName = "") => {
  const name = String(attachmentName).toLowerCase();

  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";

  return "image/jpeg";
};

/**
 * Accept:
 * - a complete data URL
 * - a normal HTTPS image URL
 * - raw Base64 image data
 */
const normalizeImageData = (imageData, attachmentName = "") => {
  const value = String(imageData || "").trim();

  if (!value) {
    return "";
  }

  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(value)) {
    return value;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (/^blob:/i.test(value)) {
    throw new Error(
      "Blob-URLs können vom Server nicht gelesen werden. " +
      "Sende das Bild als Base64-Daten-URL."
    );
  }

  const compactBase64 = value.replace(/\s/g, "");

  if (/^[a-z0-9+/=_-]+$/i.test(compactBase64)) {
    const mimeType = inferImageMimeType(attachmentName);
    return `data:${mimeType};base64,${compactBase64}`;
  }

  throw new Error(
    "Das Bildformat ist ungültig. Sende eine Bild-URL oder Base64-Daten."
  );
};

/**
 * Build the Responses API input.
 */
const buildAiInput = (message, imageData, attachmentName) => {
  const text =
    String(message || "").trim() ||
    (attachmentName
      ? `Hilf mir mit diesem Foto: ${attachmentName}`
      : "Analysiere dieses Foto und hilf mir beim Lernen.");

  if (!imageData) {
    return text;
  }

  return [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text
        },
        {
          type: "input_image",
          image_url: imageData
        }
      ]
    }
  ];
};

/**
 * Extract text from a raw Responses API JSON response.
 *
 * With raw fetch(), generated text normally appears inside:
 * data.output[].content[].text
 *
 * Some SDK responses may additionally provide data.output_text,
 * so this function supports both formats.
 */
const extractOutputText = (data) => {
  if (
    typeof data?.output_text === "string" &&
    data.output_text.trim()
  ) {
    return data.output_text.trim();
  }

  const chunks = [];

  for (const item of Array.isArray(data?.output) ? data.output : []) {
    if (item?.type !== "message") {
      continue;
    }

    for (const part of Array.isArray(item.content) ? item.content : []) {
      if (
        part?.type === "output_text" &&
        typeof part.text === "string" &&
        part.text.trim()
      ) {
        chunks.push(part.text.trim());
      }

      if (
        part?.type === "refusal" &&
        typeof part.refusal === "string" &&
        part.refusal.trim()
      ) {
        chunks.push(part.refusal.trim());
      }
    }
  }

  return chunks.join("\n\n").trim();
};

/**
 * Read an OpenAI response without crashing if an upstream error
 * returns non-JSON content.
 */
const readResponseData = async (response) => {
  const rawText = await response.text();

  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return {
      rawText
    };
  }
};

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    res.status(405).json({
      error: "Method not allowed",
      offline: false
    });

    return;
  }

  let body;

  try {
    body = parseRequestBody(req);
  } catch (error) {
    res.status(400).json({
      error: error.message,
      offline: false
    });

    return;
  }

  const message = String(body.message || "").trim();
  const attachmentName = String(body.attachmentName || "").trim();

  let imageData = "";

  try {
    imageData = normalizeImageData(
      body.imageData,
      attachmentName
    );
  } catch (error) {
    res.status(400).json({
      error: error.message,
      offline: false
    });

    return;
  }

  const hasImage = Boolean(imageData);

  if (!message && !hasImage && !attachmentName) {
    res.status(400).json({
      error: "Bitte sende eine Frage oder ein Foto.",
      offline: false
    });

    return;
  }

  /**
   * This should only happen when the environment variable is not
   * available to the deployed function.
   */
  if (!process.env.OPENAI_API_KEY) {
    res.status(200).json({
      answer: fallbackAnswer(message || attachmentName, hasImage),
      offline: true,
      warning: "OPENAI_API_KEY ist in dieser Umgebung nicht verfügbar."
    });

    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          model:
            process.env.OPENAI_MODEL ||
            DEFAULT_MODEL,

          store: false,

          max_output_tokens: 900,

          instructions:
            "Du bist Lynxly AI, ein freundlicher und vertrauenswürdiger " +
            "Lerncoach für Schüler. Antworte in derselben Sprache wie der " +
            "Nutzer, standardmäßig auf Deutsch. Beantworte die konkrete " +
            "Frage direkt. Erkläre Aufgaben verständlich und Schritt für " +
            "Schritt. Stelle nur dann eine Rückfrage, wenn wichtige " +
            "Informationen fehlen. Gib bei Mathematik nicht nur eine " +
            "Endlösung, sondern erkläre den Lösungsweg. Wenn ein Foto " +
            "vorhanden ist, lies den sichtbaren Inhalt sorgfältig aus und " +
            "hilf beim Verstehen der Aufgabe. Erfinde keinen Bildinhalt, " +
            "wenn etwas nicht lesbar ist.",

          input: buildAiInput(
            message,
            imageData,
            attachmentName
          )
        })
      }
    );

    const data = await readResponseData(response);
    const requestId = response.headers.get("x-request-id");

    if (!response.ok) {
      const apiMessage =
        data?.error?.message ||
        data?.rawText ||
        "Die OpenAI-Anfrage ist fehlgeschlagen.";

      console.error("OpenAI API error", {
        status: response.status,
        requestId,
        message: apiMessage
      });

      res
        .status(response.status >= 500 ? 502 : response.status)
        .json({
          error: apiMessage,
          offline: false,
          requestId: requestId || undefined
        });

      return;
    }

    const answer = extractOutputText(data);

    if (!answer) {
      console.error("OpenAI returned no readable text", {
        requestId,
        status: data?.status,
        incompleteDetails: data?.incomplete_details
      });

      res.status(502).json({
        error:
          "Die KI-Anfrage war erfolgreich, enthielt aber keine lesbare Textantwort.",
        offline: false,
        requestId: requestId || undefined
      });

      return;
    }

    res.status(200).json({
      answer,
      offline: false
    });
  } catch (error) {
    const timedOut = error?.name === "AbortError";

    console.error("OpenAI request failed", {
      name: error?.name,
      message: error?.message
    });

    res.status(timedOut ? 504 : 500).json({
      error: timedOut
        ? "Die KI-Anfrage hat zu lange gedauert. Bitte versuche es erneut."
        : "Lynxly AI konnte keine Verbindung zur KI herstellen.",
      details: error?.message || undefined,
      offline: false
    });
  } finally {
    clearTimeout(timeoutId);
  }
};
```
