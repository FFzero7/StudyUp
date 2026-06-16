const DEFAULT_MODEL = "gpt-4.1-mini";
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Wird nur verwendet, wenn kein API-Key vorhanden ist.
 */
const fallbackAnswer = (message = "", hasImage = false) => {
  const raw = String(message || "").trim();
  const lower = raw.toLowerCase();

  if (hasImage) {
    return [
      "Antwort:",
      "Das Foto wurde empfangen, kann im Offline-Modus aber nicht ausgewertet werden.",
      "",
      "Lösungsweg:",
      "1. Prüfe, ob OPENAI_API_KEY in Vercel eingerichtet ist.",
      "2. Führe danach ein neues Deployment durch.",
      "3. Sende das Foto anschließend noch einmal."
    ].join("\n");
  }

  if (!raw) {
    return "Schreib mir deine Aufgabe, dann gebe ich dir die Antwort und den Lösungsweg.";
  }

  if (
    ["translate", "uebersetze", "übersetze", "was heisst", "was heißt"]
      .some((word) => lower.includes(word))
  ) {
    return [
      "Antwort:",
      "Bitte gib das genaue Wort oder den vollständigen Satz an.",
      "",
      "Lösungsweg:",
      "Danach gebe ich dir zuerst die Übersetzung und anschließend eine kurze Erklärung mit Beispiel."
    ].join("\n");
  }

  if (
    /[0-9]\s*[\+\-\*x:\/]\s*[0-9]|\([^)]*[\+\-\*x:\/][^)]*\)/.test(lower)
  ) {
    const bracket = raw.match(/\(([^()]+)\)/);

    if (bracket) {
      return [
        "Antwort:",
        `Berechne zuerst den Ausdruck in der Klammer: ${bracket[1]}.`,
        "",
        "Lösungsweg:",
        "1. Zuerst die Klammer berechnen.",
        "2. Das Ergebnis wieder in die ursprüngliche Aufgabe einsetzen.",
        "3. Danach Punktrechnung vor Strichrechnung beachten."
      ].join("\n");
    }

    return [
      "Antwort:",
      "Berechne die Aufgabe mit der richtigen Rechenreihenfolge.",
      "",
      "Lösungsweg:",
      "1. Klammern berechnen.",
      "2. Multiplikation und Division berechnen.",
      "3. Addition und Subtraktion berechnen."
    ].join("\n");
  }

  return [
    "Antwort:",
    `Deine Frage lautet: "${raw}". Im Offline-Modus kann ich keine vollständige KI-Antwort erstellen.`,
    "",
    "Lösungsweg:",
    "1. Prüfe den OpenAI API-Key.",
    "2. Führe ein neues Vercel-Deployment aus.",
    "3. Stelle die Frage danach erneut."
  ].join("\n");
};

/**
 * Liest den Request-Body sicher aus.
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
      throw new Error("Der Request enthält kein gültiges JSON.");
    }
  }

  return {};
};

/**
 * Erkennt den Bildtyp anhand des Dateinamens.
 */
const inferImageMimeType = (attachmentName = "") => {
  const name = String(attachmentName).toLowerCase();

  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";

  return "image/jpeg";
};

/**
 * Unterstützt:
 * - vollständige Base64 Data-URLs
 * - normale HTTPS-Bild-URLs
 * - rohe Base64-Bilddaten
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
    "Das Bildformat ist ungültig. Sende eine Bild-URL oder Base64-Bilddaten."
  );
};

/**
 * Erstellt den Input für die Responses API.
 */
const buildAiInput = (message, imageData, attachmentName) => {
  const text =
    String(message || "").trim() ||
    (
      attachmentName
        ? `Löse die Aufgabe auf diesem Foto: ${attachmentName}`
        : "Löse die Aufgabe auf diesem Foto."
    );

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
          image_url: imageData,
          detail: "high"
        }
      ]
    }
  ];
};

/**
 * Liest den generierten Text aus der rohen API-Antwort.
 */
const extractOutputText = (data) => {
  if (
    typeof data?.output_text === "string" &&
    data.output_text.trim()
  ) {
    return data.output_text.trim();
  }

  const textParts = [];

  for (const outputItem of Array.isArray(data?.output) ? data.output : []) {
    if (outputItem?.type !== "message") {
      continue;
    }

    for (
      const contentItem of Array.isArray(outputItem.content)
        ? outputItem.content
        : []
    ) {
      if (
        contentItem?.type === "output_text" &&
        typeof contentItem.text === "string" &&
        contentItem.text.trim()
      ) {
        textParts.push(contentItem.text.trim());
      }

      if (
        contentItem?.type === "refusal" &&
        typeof contentItem.refusal === "string" &&
        contentItem.refusal.trim()
      ) {
        textParts.push(contentItem.refusal.trim());
      }
    }
  }

  return textParts.join("\n\n").trim();
};

/**
 * Verhindert einen Fehler, falls OpenAI keine JSON-Antwort zurückgibt.
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

  if (!process.env.OPENAI_API_KEY) {
    res.status(200).json({
      answer: fallbackAnswer(
        message || attachmentName,
        hasImage
      ),
      offline: true,
      warning:
        "OPENAI_API_KEY ist in dieser Vercel-Umgebung nicht verfügbar."
    });

    return;
  }

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

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

          max_output_tokens: 1200,

          instructions: `
Du bist Lynxly AI, ein freundlicher Lernassistent für Schüler.

Deine wichtigste Aufgabe:
Gib bei einer konkreten Aufgabe zuerst die endgültige Antwort und danach
einen klaren Lösungsweg, der zeigt, wie du zu dieser Antwort gekommen bist.

Verwende bei Aufgaben immer dieses Format:

Antwort:
[Hier steht zuerst die endgültige Antwort.]

Lösungsweg:
1. [Erster Schritt]
2. [Zweiter Schritt]
3. [Weitere Schritte, falls nötig]

Regeln:

- Gib nicht nur Hinweise, sondern löse die Aufgabe vollständig.
- Gib die endgültige Antwort zuerst deutlich an.
- Erkläre danach verständlich, wie die Antwort berechnet oder hergeleitet wurde.
- Stelle keine Rückfrage, wenn die Aufgabe mit den vorhandenen Informationen lösbar ist.
- Stelle nur dann eine kurze Rückfrage, wenn wirklich wichtige Angaben fehlen.
- Antworte in derselben Sprache wie der Nutzer.
- Wenn keine Sprache klar erkennbar ist, antworte auf Deutsch.
- Halte die Erklärung klar und für Schüler verständlich.
- Verwende keine unnötig komplizierten Fachbegriffe.

Bei Mathematik:

- Schreibe zuerst das Endergebnis.
- Zeige danach jeden wichtigen Rechenschritt.
- Beachte Klammern, Vorzeichen und Rechenreihenfolge.
- Führe am Ende wenn sinnvoll eine kurze Probe durch.
- Erfinde keine fehlenden Zahlen oder Informationen.

Beispiel:

Antwort:
x = 4

Lösungsweg:
1. Ausgangsgleichung: 2x + 3 = 11
2. Auf beiden Seiten 3 abziehen: 2x = 8
3. Beide Seiten durch 2 teilen: x = 4
4. Probe: 2 · 4 + 3 = 11

Bei Übersetzungen:

Antwort:
[Genaue Übersetzung]

Erklärung:
[Kurze Erklärung der Bedeutung und ein kurzes Beispiel.]

Bei Sachfragen:

Antwort:
[Direkte Antwort]

Erklärung:
[Kurze, verständliche Begründung.]

Bei Fotos:

- Lies zuerst die sichtbare Aufgabe sorgfältig.
- Gib dann die Lösung an.
- Erkläre anschließend den Lösungsweg.
- Wenn ein wichtiger Teil des Fotos unlesbar ist, sage genau, welcher Teil fehlt.
- Erfinde keinen Text und keine Zahlen, die auf dem Foto nicht erkennbar sind.

Bei einer einfachen Begrüßung oder Unterhaltung musst du nicht künstlich
„Antwort“ und „Lösungsweg“ schreiben. Antworte dort natürlich.
          `.trim(),

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
      const apiError =
        data?.error?.message ||
        data?.rawText ||
        "Die KI-Anfrage ist fehlgeschlagen.";

      console.error("OpenAI API error:", {
        status: response.status,
        requestId,
        message: apiError
      });

      res
        .status(response.status >= 500 ? 502 : response.status)
        .json({
          error: apiError,
          offline: false,
          requestId: requestId || undefined
        });

      return;
    }

    const answer = extractOutputText(data);

    if (!answer) {
      console.error("OpenAI returned no readable text:", {
        requestId,
        status: data?.status,
        incompleteDetails: data?.incomplete_details
      });

      res.status(502).json({
        error:
          "Die KI-Anfrage war erfolgreich, enthielt aber keine lesbare Antwort.",
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

    console.error("OpenAI request failed:", {
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
