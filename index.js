import axios from "axios";
import express from "express";
import cron from "node-cron";

import { db } from "./shared/firebaseAdmin.js";

const app = express();
app.use(express.json());

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

cron.schedule("* * * * *", async () => {
  console.log("[Monitor] Running check...");

  for (const api of APIS) {
    const start = Date.now();
    let status = "online";
    let message = "OK";
    let responseTime = null;

    try {
      const res = await axios.get(api.url, { timeout: 5000 });
      responseTime = Date.now() - start;

      if (responseTime > 1500) {
        status = "slow";
        message = "High traffic — expect delays.";
      }
    } catch (err) {
      status = "down";
      message = "Service unreachable.";
    }

    await db.collection("apis-status").doc(api.name).set({
      status,
      message,
      responseTime,
      lastChecked: Date.now(),
    });

    console.log(`[Monitor] ${api.name}: ${status}`);
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "OK", uptime: process.uptime() });
});

app.get("/", (req, res) => {
  res.send("Monitor API running");
});

app.listen(3000, () => console.log("Monitor API active on port 3000"));
