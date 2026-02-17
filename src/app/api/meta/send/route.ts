import { NextRequest, NextResponse } from "next/server";
import { sendMetaMessage, uploadMetaMedia } from "@/lib/metaApi";
import { persistOutboundMetaMessage } from "@/lib/metaStore";

export const runtime = "nodejs";

type SenderType = "ia" | "humano" | "sistema";

function getBearerToken(authorization: string | null) {
    if (!authorization) return null;
    const [scheme, value] = authorization.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !value) return null;
    return value.trim();
}

function isAuthorized(request: NextRequest) {
    const inboundToken = process.env.N8N_INBOUND_TOKEN || process.env.N8N_TOKEN;
    if (!inboundToken) return true;

    const bearer = getBearerToken(request.headers.get("authorization"));
    const direct = request.headers.get("x-n8n-token")?.trim();
    return bearer === inboundToken || direct === inboundToken;
}

export async function POST(request: NextRequest) {
    try {
        if (!isAuthorized(request)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const contentType = request.headers.get("content-type") || "";

        if (contentType.includes("multipart/form-data")) {
            const form = await request.formData();
            const waId = String(form.get("waId") || form.get("to") || form.get("phone") || "").trim();
            const nombre = String(form.get("nombre") || "").trim() || undefined;
            const typeRaw = String(form.get("type") || "image").trim().toLowerCase();
            const type = typeRaw === "audio" ? "audio" : "image";
            const senderType = String(form.get("senderType") || "humano") as SenderType;
            const source = String(form.get("source") || "dashboard") as "n8n" | "dashboard" | "meta";
            const caption = String(form.get("caption") || "").trim();
            const file = form.get("file");

            if (!waId) {
                return NextResponse.json({ error: "waId/to es requerido" }, { status: 400 });
            }

            if (!(file instanceof File)) {
                return NextResponse.json({ error: "file es requerido para multipart" }, { status: 400 });
            }

            const uploaded = await uploadMetaMedia(file);
            const sent = await sendMetaMessage(
                type === "audio"
                    ? { to: waId, type: "audio", mediaId: uploaded.mediaId }
                    : { to: waId, type: "image", mediaId: uploaded.mediaId, caption: caption || undefined }
            );

            const previewBody = type === "audio" ? `🎵 Audio (${file.name || "sin nombre"})` : (caption || `📷 Imagen (${file.name || "sin nombre"})`);

            await persistOutboundMetaMessage({
                waId,
                nombre,
                body: previewBody,
                messageId: sent.messageId,
                mediaType: type,
                caption: caption || undefined,
                senderType,
                source,
            });

            return NextResponse.json({
                ok: true,
                to: waId,
                type,
                messageId: sent.messageId || null,
                mediaId: uploaded.mediaId,
            });
        }

        const body = (await request.json()) as {
            waId?: string;
            to?: string;
            phone?: string;
            nombre?: string;
            type?: "text" | "image" | "audio";
            remitente?: SenderType;
            sender?: SenderType;
            mensaje?: string;
            message?: string;
            text?: string;
            body?: string;
            urlImagen?: string;
            imageUrl?: string;
            audioUrl?: string;
            mediaUrl?: string;
            mediaId?: string;
            caption?: string;
            senderType?: SenderType;
            source?: "n8n" | "dashboard" | "meta";
        };

                const waId = (body.waId || body.to || body.phone || "").trim();
                const message = (body.mensaje || body.message || body.text || body.body || "").trim();
                const imageUrl = (body.urlImagen || body.imageUrl || body.mediaUrl || "").trim();

                const type: "text" | "image" | "audio" = body.type
                        ? body.type
                        : imageUrl
                            ? "image"
                            : "text";

        if (!waId) {
            return NextResponse.json({ error: "waId/to es requerido" }, { status: 400 });
        }

        if (type === "text" && !message) {
            return NextResponse.json({ error: "message/text es requerido para type=text" }, { status: 400 });
        }

        if (type === "image" && !imageUrl && !body.mediaId) {
            return NextResponse.json(
                { error: "urlImagen/imageUrl/mediaId es requerido para type=image" },
                { status: 400 }
            );
        }

        const sent = await sendMetaMessage(
            type === "image"
                ? {
                      to: waId,
                      type: "image",
                      imageUrl,
                      mediaId: body.mediaId,
                      caption: body.caption || message || undefined,
                  }
                : type === "audio"
                  ? {
                        to: waId,
                        type: "audio",
                        audioUrl: body.audioUrl || body.mediaUrl,
                        mediaId: body.mediaId,
                    }
                  : {
                        to: waId,
                        type: "text",
                        message,
                    }
        );

        const previewBody =
            type === "image"
                ? body.caption?.trim() || message || "📷 Imagen"
                : type === "audio"
                  ? "🎵 Audio"
                  : message;

        await persistOutboundMetaMessage({
            waId,
            nombre: body.nombre,
            body: previewBody,
            messageId: sent.messageId,
            mediaType: type === "image" || type === "audio" ? type : undefined,
            caption: type === "image" ? (body.caption || message || undefined) : undefined,
            senderType: body.senderType || body.remitente || body.sender || "ia",
            source: body.source || "n8n",
        });

        return NextResponse.json({
            ok: true,
            to: waId,
            type,
            messageId: sent.messageId || null,
        });
    } catch (error) {
        console.error("[Meta Send] Error:", error);
        const message = error instanceof Error ? error.message : "No se pudo enviar mensaje a Meta";
        const statusMatch = message.match(/\(HTTP\s+(\d{3})\)/i);
        const statusFromMessage = statusMatch ? Number(statusMatch[1]) : null;
        const status = statusFromMessage && statusFromMessage >= 400 && statusFromMessage < 600
            ? statusFromMessage
            : 500;
        return NextResponse.json(
            {
                error: message,
            },
            { status }
        );
    }
}
