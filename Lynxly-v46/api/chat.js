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

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const message = req.body?.message || req.body?.attachmentName || "";

  if (!process.env.OPENAI_API_KEY) {
    res.status(200).json({ answer: fallbackAnswer(message), offline: true });
    return;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions: "Du bist Lynxly AI, ein Lerncoach für Schüler. Erkläre Schritt für Schritt, stelle Rückfragen und gib Hinweise. Gib bei Mathe keine reine Endantwort ohne Erklärung.",
        input: message
      })
    });

    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json({ error: data.error?.message || "KI-Anfrage fehlgeschlagen" });
      return;
    }

    res.status(200).json({ answer: data.output_text || fallbackAnswer(message), offline: false });
  } catch (error) {
    res.status(200).json({ answer: fallbackAnswer(message), offline: true, warning: error.message });
  }
};




