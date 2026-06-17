const { aiInstructions, buildAiInput, fallbackAnswer } = require("../ai-chat-core");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const message = req.body?.message || req.body?.attachmentName || "";
  const imageData = req.body?.imageData || "";
  const attachmentName = req.body?.attachmentName || "";

  if (!process.env.OPENAI_API_KEY) {
    res.status(200).json({ answer: fallbackAnswer(message, Boolean(imageData)), offline: true });
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
        instructions: aiInstructions,
        input: buildAiInput(message, imageData, attachmentName)
      })
    });

    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json({ error: data.error?.message || "KI-Anfrage fehlgeschlagen" });
      return;
    }

    res.status(200).json({ answer: data.output_text || fallbackAnswer(message, Boolean(imageData)), offline: false });
  } catch (error) {
    res.status(200).json({ answer: fallbackAnswer(message, Boolean(imageData)), offline: true, warning: error.message });
  }
};
