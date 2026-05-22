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

    // Block math questions before calling OpenAI.
    // This saves API credits and keeps StudyUp focused on non-math feedback.
    const mathPattern =
      /(\d+\s*[\+\-\*\/x÷=]\s*\d+|solve|equation|algebra|geometry|calculus|factor|simplify|fraction|percentage|percent|graph|formula|quadratic|linear|pythagoras|trigonometry|sin|cos|tan|derivative|integral|math|maths|mathe|gleichung|bruch|prozent|geometrie)/i;

    if (mathPattern.test(message)) {
      return res.status(200).json({
        answer:
          "Sorry, StudyUp AI does not answer math questions right now. Try asking about studying, planning, flashcards, summaries, or revision tips."
      });
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
              "You are StudyUp AI, a friendly homework helper. Explain step by step and do not just give final answers. Do not answer math questions; instead say StudyUp AI does not answer math questions right now."
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
