const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body || {};

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY is missing" });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: [
          {
            role: "system",
            content:
              "You are StudyUp AI, a friendly homework helper. Explain step by step and do not just give final answers. You may answer normal math questions, but guide the student through the first steps, ask short checking questions when useful, and then explain the result clearly."
          },
          {
            role: "user",
            content: message
          }
        ],
        max_output_tokens: 500
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "OpenAI API error"
      });
    }

    return res.status(200).json({
      answer: data.output_text || "I could not make an answer."
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
};
