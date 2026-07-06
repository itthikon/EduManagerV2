export interface SendLinePayload {
  channelAccessToken: string;
  targetId: string;
  message?: string;
  flexMessage?: any;
}

export async function sendLineNotification(
  payload: SendLinePayload
): Promise<{ success: boolean; error?: string; result?: any }> {
  const token = payload.channelAccessToken ? payload.channelAccessToken.trim() : "";
  const target = payload.targetId ? payload.targetId.trim() : "";

  if (!token || !target) {
    return {
      success: false,
      error: "กรุณาระบุ Line Access Token และ Line Group ID ให้ครบถ้วน",
    };
  }

  try {
    const response = await fetch("/api/line-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelAccessToken: token,
        targetId: target,
        message: payload.message,
        flexMessage: payload.flexMessage,
      }),
    });

    const text = await response.text();
    let resData: any = null;
    try {
      resData = JSON.parse(text);
    } catch {
      // Non-JSON response (e.g. HTML 404 from Vercel or proxy)
      return await sendDirectLinePush(payload);
    }

    if (response.ok && resData?.success) {
      return { success: true, result: resData };
    } else {
      return {
        success: false,
        error: resData?.error || resData?.message || "เกิดข้อผิดพลาดจาก LINE API Server",
      };
    }
  } catch {
    // If network fetch to /api/line-notify failed, attempt direct client fallback
    return await sendDirectLinePush(payload);
  }
}

async function sendDirectLinePush(
  payload: SendLinePayload
): Promise<{ success: boolean; error?: string; result?: any }> {
  const token = payload.channelAccessToken ? payload.channelAccessToken.trim() : "";
  const target = payload.targetId ? payload.targetId.trim() : "";

  try {
    const directRes = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: target,
        messages: payload.flexMessage ? [payload.flexMessage] : [{ type: "text", text: payload.message }],
      }),
    });

    const directText = await directRes.text();
    let directData: any = {};
    try {
      directData = JSON.parse(directText);
    } catch {
      // ignore
    }

    if (directRes.ok) {
      return { success: true, result: directData };
    } else {
      return {
        success: false,
        error: directData.message || "เกิดข้อผิดพลาดจาก LINE Messaging API (โปรดตรวจสอบ Token และ Group ID)",
      };
    }
  } catch {
    return {
      success: false,
      error: "ไม่สามารถส่งแจ้งเตือนได้ กรุณาตรวจสอบการตั้งค่า Line Access Token และ Group ID",
    };
  }
}
