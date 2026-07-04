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
  // Supports Line Messaging API (Push/Multicast/Broadcast) and Line Notify Token
  app.post("/api/line-notify", async (req, res) => {
    try {
      const { channelAccessToken, targetId, message, flexMessage, notifyToken } = req.body;

      if (!message && !flexMessage) {
        return res.status(400).json({ error: "Missing message content" });
      }

      // Option 1: Line Messaging API
      if (channelAccessToken && targetId) {
        const bodyData: any = {
          to: targetId,
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
            Authorization: `Bearer ${channelAccessToken.trim()}`,
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
      }

      // Option 2: Line Notify (Legacy or simple notify token)
      if (notifyToken) {
        const params = new URLSearchParams();
        params.append("message", message);

        const lineResponse = await fetch("https://notify-api.line.me/api/notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Bearer ${notifyToken.trim()}`,
          },
          body: params.toString(),
        });

        const responseData = await lineResponse.json().catch(() => ({}));

        if (!lineResponse.ok) {
          return res.status(lineResponse.status).json({
            error: responseData.message || "Line Notify error",
            details: responseData,
          });
        }

        return res.json({ success: true, method: "line-notify", result: responseData });
      }

      return res.status(400).json({
        error: "กรุณาระบุ Channel Access Token และ Target User/Group ID หรือ Line Notify Token",
      });
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
