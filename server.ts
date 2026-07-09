import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API Route: Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API Route: Line Notification Proxy
  // Uses Line Messaging API with Channel Access Token & Group ID / Target ID
  app.post("/api/line-notify", async (req, res) => {
    try {
      const { channelAccessToken, targetId, message, flexMessage } = req.body;

      if (!message && !flexMessage) {
        return res.status(400).json({ error: "Missing message content" });
      }

      const cleanToken = channelAccessToken ? String(channelAccessToken).trim() : "";
      const cleanTarget = targetId ? String(targetId).trim().toLowerCase() : "";

      if (!cleanToken || !cleanTarget) {
        return res.status(400).json({
          error: "กรุณาระบุ Line Access Token และ Line Group ID ให้ครบถ้วน",
        });
      }

      const bodyData: any = {
        to: cleanTarget,
        messages: flexMessage
          ? [flexMessage]
          : [
              {
                type: "text",
                text: message,
              },
            ],
      };

      const lineResponse = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cleanToken}`,
        },
        body: JSON.stringify(bodyData),
      });

      const responseData = await lineResponse.json().catch(() => ({}));

      if (!lineResponse.ok) {
        console.error("Line API Error:", responseData);
        return res.status(lineResponse.status).json({
          error: responseData.message || "Line Messaging API returned an error",
          details: responseData,
        });
      }

      return res.json({ success: true, method: "messaging-api", result: responseData });
    } catch (err: any) {
      console.error("Error sending Line notification:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  // Vite middleware for development / Static file serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
