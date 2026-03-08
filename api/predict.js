export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({
    error: "ANTHROPIC_API_KEY not set. Go to Vercel → Project → Settings → Environment Variables → add ANTHROPIC_API_KEY → Save → Redeploy."
  });

  try {
    let body = req.body;
    if (typeof body === "string") body = JSON.parse(body);

    // Force Haiku + low tokens + NO web search = ~$0.003 per refresh
    body.model = "claude-haiku-4-5-20251001";
    body.max_tokens = 1500;
    delete body.tools;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Internal error: " + err.message });
  }
}
