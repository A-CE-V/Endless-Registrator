import axios from "axios";
import express from "express";
import cron from "node-cron";

import { db } from "./shared/firebaseAdmin.js";

const app = express();
app.use(express.json());

// -------------------------
// CORS + ORIGIN PROTECTION
// -------------------------
app.use((req, res, next) => {
  const allowedOrigin = process.env.ALLOWED_ORIGINS;

  // Allow internal cron job (no Origin header)
  if (!req.headers.origin) return next();

  if (req.headers.origin === allowedOrigin) {
    res.header("Access-Control-Allow-Origin", allowedOrigin);
    res.header("Access-Control-Allow-Methods", "GET,POST");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    return next();
  }

  return res.status(403).json({ error: "Forbidden: Unauthorized origin" });
});

// -------------------------
// API LIST
// -------------------------
const APIS = [
  { name: "endless codeTools", url: "https://endless-code-tools-api.onrender.com/health" },
  { name: "endless gateway", url: "https://endless-gateways.onrender.com/health" },
  { name: "endless conversions", url: "https://endless-conversions.onrender.com/health" },
  { name: "endless bureaucracy", url: "https://endless-bureaucracy.onrender.com/health" },
  { name: "endless cloudflare service", url: "https://endless-verifications.onrender.com/health" },
  { name: "endless artificial connections", url: "https://endless-artificial-connections.onrender.com/health" },
  { name: "endless pdf tool box", url: "https://endless-pdfs-pr2f.onrender.com/health" },
  { name: "endless vector conversions", url: "https://endless-vectors-gxda.onrender.com/health" },
  { name: "endless image conversions", url: "https://endless-images-second-life.onrender.com/health" },
];

// -------------------------
// Helper: Format Spanish Date
// -------------------------
function spanishDate() {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

// -------------------------
// CRON JOB — EVERY 1 MINUTE
// -------------------------
cron.schedule("* * * * *", async () => {
  console.log("[Monitor] Running check...");

  for (const api of APIS) {
    const start = Date.now();
    let status = "online";
    let message = "OK";
    let responseTime = null;
    const formattedDate = spanishDate();

    try {
      await axios.get(api.url, { timeout: 5000 });
      responseTime = Date.now() - start;

      if (responseTime > 1500) {
        status = "slow";
        message = "High traffic — expect delays.";
      }
    } catch (err) {
      status = "down";
      message = "Service unreachable.";
    }

    const docRef = db.collection("apis-status").doc(api.name);
    const doc = await docRef.get();
    let history = doc.exists ? doc.data().history || [] : [];

    // Log history only when DOWN
    if (status === "down") {
      history.push({
        status: "down",
        date: formattedDate,
      });
    }

    await docRef.set({
      status,
      message,
      responseTime,
      lastChecked: formattedDate,
      history,
    });

    console.log(`[Monitor] ${api.name}: ${status}`);
  }
});

// -------------------------
// HEALTH ENDPOINT
// -------------------------
app.get("/health", (req, res) => {
  res.json({ status: "OK", uptime: process.uptime() });
});

// -------------------------
// DEFAULT ROUTE
// -------------------------
app.get("/", (req, res) => {
  res.send("Monitor API running");
});

app.listen(3000, () => console.log("Monitor API active on port 3000"));
