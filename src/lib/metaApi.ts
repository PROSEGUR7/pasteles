interface SendMetaTextInput {
    to: string;
    message: string;
}

interface MetaSendResponse {
    messaging_product?: string;
    contacts?: Array<{ input?: string; wa_id?: string }>;
    messages?: Array<{ id?: string }>;
    error?: { message?: string };
}

export async function sendMetaTextMessage(input: SendMetaTextInput) {
    const token = process.env.META_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiVersion = process.env.META_API_VERSION || "v21.0";

    if (!token) {
        throw new Error("Falta META_ACCESS_TOKEN en variables de entorno");
    }

    if (!phoneNumberId) {
        throw new Error("Falta META_PHONE_NUMBER_ID en variables de entorno");
    }

    const to = input.to.replace(/\D/g, "");
    if (!to) {
        throw new Error("Número destino inválido para Meta");
    }

    const response = await fetch(
        `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to,
                type: "text",
                text: {
                    body: input.message,
                    preview_url: false,
                },
            }),
        }
    );

    const data = (await response.json().catch(() => ({}))) as MetaSendResponse;

    if (!response.ok) {
        const backendMessage = data?.error?.message || "Error enviando mensaje a Meta";
        throw new Error(`${backendMessage} (HTTP ${response.status})`);
    }

    const messageId = data?.messages?.[0]?.id;
    return { messageId, raw: data };
}
