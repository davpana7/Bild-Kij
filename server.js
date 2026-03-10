import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// CORS (für Google Sites)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Test-Route
app.get("/", (req, res) => {
  res.send("OK");
});

// GET /generate (für Google Sites <img>)
app.get("/generate", async (req, res) => {
  const prompt = req.query.prompt || "a blue car";

  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: prompt })
      }
    );

    const buffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "image/png");
    res.send(Buffer.from(buffer));
  } catch {
    res.status(500).send("Error generating image");
  }
});

// POST /generate (optional)
const limits = {};
app.post("/generate", async (req, res) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const today = new Date().toISOString().slice(0, 10);
  const key = ip + today;

  limits[key] = (limits[key] || 0) + 1;
  if (limits[key] > 2) {
    return res.status(429).json({ error: "Tageslimit erreicht" });
  }

  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: req.body.prompt })
      }
    );

    const buffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "image/png");
    res.send(Buffer.from(buffer));
  } catch {
    res.status(500).json({ error: "Fehler bei der KI" });
  }
});

app.listen(3000, () => {
  console.log("Server läuft auf Port 3000");
});
