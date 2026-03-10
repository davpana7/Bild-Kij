// Erlaubt Google Sites, Bilder anzuzeigen
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// kleine Testseite (weckt den Server)
app.get("/", (req, res) => {
  res.send("OK");
});import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// Hugging Face Token kommt von Render (Environment Variable)
const HF_TOKEN = process.env.HF_TOKEN;

// Einfaches Schüler-Limit (2 Bilder pro Tag)
const limits = {};

app.post("/generate", async (req, res) => {
  const ip =
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    "unknown";

  const today = new Date().toISOString().slice(0, 10);
  const key = ip + today;

  limits[key] = (limits[key] || 0) + 1;

  // MAX 2 Bilder pro Tag
  if (limits[key] > 2) {
    return res.status(429).json({
      error: "Tageslimit erreicht"
    });
  }

  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: req.body.prompt
        })
      }
    );

    const buffer = await response.arrayBuffer();

    res.set("Content-Type", "image/png");
    res.send(Buffer.from(buffer));
  } catch (error) {
    res.status(500).json({
      error: "Fehler bei der KI"
    });
  }
});

app.listen(3000, () => {
  console.log("Server läuft auf Port 3000");
});
