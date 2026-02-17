interface SendMetaMessageInput {
    to: string;
    type?: "text" | "image" | "audio";
    message?: string;
    imageUrl?: string;
    audioUrl?: string;
    mediaId?: string;
    caption?: string;
}

interface MetaSendResponse {
    messaging_product?: string;
    contacts?: Array<{ input?: string; wa_id?: string }>;
    messages?: Array<{ id?: string }>;
    error?: { message?: string };
}

function buildPayload(input: SendMetaMessageInput, to: string) {
    const base = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
    };

    if (!input.type || input.type === "text") {
        const message = input.message?.trim();
        if (!message) throw new Error("message/text es requerido para type=text");
        return {
            ...base,
            type: "text",
            text: {
                body: message,
                preview_url: false,
            },
        };
    }

    if (input.type === "image") {
        const imageLink = input.imageUrl?.trim();
        const mediaId = input.mediaId?.trim();
        if (!imageLink && !mediaId) {
            throw new Error("imageUrl o mediaId es requerido para type=image");
        }

        return {
            ...base,
            type: "image",
            image: {
                ...(mediaId ? { id: mediaId } : { link: imageLink }),
                ...(input.caption?.trim() ? { caption: input.caption.trim() } : {}),
            },
        };
    }

    const audioLink = input.audioUrl?.trim();
    const audioMediaId = input.mediaId?.trim();
    if (!audioLink && !audioMediaId) {
        throw new Error("audioUrl o mediaId es requerido para type=audio");
    }

    return {
        ...base,
        type: "audio",
        audio: {
            ...(audioMediaId ? { id: audioMediaId } : { link: audioLink }),
        },
    };
}

export async function sendMetaMessage(input: SendMetaMessageInput) {
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

    const payload = buildPayload(input, to);

    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => ({}))) as MetaSendResponse;

    if (!response.ok) {
        const backendMessage = data?.error?.message || "Error enviando mensaje a Meta";
        throw new Error(`${backendMessage} (HTTP ${response.status})`);
    }

    const messageId = data?.messages?.[0]?.id;
    return { messageId, raw: data };
}
