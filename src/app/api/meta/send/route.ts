import { NextRequest, NextResponse } from "next/server";
import { sendMetaMessage, uploadMetaMedia } from "@/lib/metaApi";
import { persistOutboundMetaMessage } from "@/lib/metaStore";
import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

export const runtime = "nodejs";

type SenderType = "ia" | "humano" | "sistema";

async function transcodeWebmToMp3(inputFile: File): Promise<File> {
    if (!ffmpegPath) {
        throw new Error("No hay ffmpeg disponible para convertir audio. Sube el audio como archivo (.mp3/.ogg/.m4a). (HTTP 400)");
    }

    const ffmpegBinary = ffmpegPath;

    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "pasteles-audio-"));
    const inPath = path.join(tmpDir, "input.webm");
    const outPath = path.join(tmpDir, "output.mp3");

    try {
        const buffer = Buffer.from(await inputFile.arrayBuffer());
        await writeFile(inPath, buffer);

        await new Promise<void>((resolve, reject) => {
            execFile(
                ffmpegBinary,
                [
                    "-y",
                    "-i",
                    inPath,
                    "-vn",
                    "-ac",
                    "1",
                    "-ar",
                    "44100",
                    "-b:a",
                    "64k",
                    outPath,
                ],
                (error, _stdout, stderr) => {
                    if (!error) return resolve();
                    reject(
                        new Error(
                            `No se pudo convertir audio (ffmpeg). ${stderr || error.message || ""}`.trim()
                        )
                    );
                }
            );
        });

        const mp3Buffer = await readFile(outPath);
        return new File([mp3Buffer], `audio-${Date.now()}.mp3`, { type: "audio/mpeg" });
    } finally {
        await rm(tmpDir, { recursive: true, force: true }).catch(() => null);
    }
}

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

            let uploadFile = file;
            if (
                type === "audio" &&
                (file.type?.toLowerCase().includes("webm") || file.name?.toLowerCase().endsWith(".webm"))
            ) {
                uploadFile = await transcodeWebmToMp3(file);
            }

            const uploaded = await uploadMetaMedia(uploadFile);
            const sent = await sendMetaMessage(
                type === "audio"
                    ? { to: waId, type: "audio", mediaId: uploaded.mediaId }
                    : { to: waId, type: "image", mediaId: uploaded.mediaId, caption: caption || undefined }
            );

            const previewBody =
                type === "audio"
                    ? `🎵 Audio (${uploadFile.name || file.name || "sin nombre"})`
                    : (caption || `📷 Imagen (${file.name || "sin nombre"})`);

            await persistOutboundMetaMessage({
                waId,
                nombre,
                body: previewBody,
                messageId: sent.messageId,
                mediaType: type,
                mediaId: uploaded.mediaId,
                mediaUrl: `/api/meta/media/${encodeURIComponent(uploaded.mediaId)}`,
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

        const senderType = body.senderType || body.remitente || body.sender || "ia";
        const source = body.source || "n8n";

        let resolvedType: "text" | "image" | "audio" = type;
        let warning: string | null = null;

        const sendPayload =
            type === "image"
                ? {
                      to: waId,
                      type: "image" as const,
                      imageUrl,
                      mediaId: body.mediaId,
                      caption: body.caption || message || undefined,
                  }
                : type === "audio"
                  ? {
                        to: waId,
                        type: "audio" as const,
                        audioUrl: body.audioUrl || body.mediaUrl,
                        mediaId: body.mediaId,
                    }
                  : {
                        to: waId,
                        type: "text" as const,
                        message,
                    };

        let sent;
        try {
            sent = await sendMetaMessage(sendPayload);
        } catch (sendError) {
            const sendErrorMessage = sendError instanceof Error ? sendError.message : String(sendError);
            const isImagePermissionError =
                type === "image" &&
                /\(#10\)|does not have permission for this action/i.test(sendErrorMessage);

            if (isImagePermissionError && message) {
                sent = await sendMetaMessage({
                    to: waId,
                    type: "text",
                    message,
                });
                resolvedType = "text";
                warning = "Meta rechazó la imagen por permisos (#10). Se envió solo texto.";
            } else {
                throw sendError;
            }
        }

        const previewBody =
            resolvedType === "image"
                ? body.caption?.trim() || message || "📷 Imagen"
                : resolvedType === "audio"
                  ? "🎵 Audio"
                  : message;

        await persistOutboundMetaMessage({
            waId,
            nombre: body.nombre,
            body: previewBody,
            messageId: sent.messageId,
            mediaType: resolvedType === "image" || resolvedType === "audio" ? resolvedType : undefined,
            mediaId: resolvedType === "image" || resolvedType === "audio" ? body.mediaId : undefined,
            mediaUrl:
                resolvedType === "image"
                    ? imageUrl || undefined
                    : resolvedType === "audio"
                      ? body.audioUrl || body.mediaUrl || undefined
                      : undefined,
            caption: resolvedType === "image" ? (body.caption || message || undefined) : undefined,
            senderType,
            source,
        });

        return NextResponse.json({
            ok: true,
            to: waId,
            type: resolvedType,
            messageId: sent.messageId || null,
            warning,
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
