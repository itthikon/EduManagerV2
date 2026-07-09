export default async function handler(req: any, res: any) {
  // Support CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { channelAccessToken, targetId, message, flexMessage } = body;

    const cleanToken = channelAccessToken ? String(channelAccessToken).trim() : "";
    const cleanTarget = targetId ? String(targetId).trim() : "";

    if (!cleanToken || !cleanTarget) {
      return res.status(400).json({
        error: "กรุณาระบุ Line Access Token และ Line Group ID ให้ครบถ้วน",
      });
    }

    if (!message && !flexMessage) {
      return res.status(400).json({ error: "Missing message content" });
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

    return res.status(200).json({ success: true, method: "messaging-api", result: responseData });
  } catch (err: any) {
    console.error("Error sending Line notification:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
