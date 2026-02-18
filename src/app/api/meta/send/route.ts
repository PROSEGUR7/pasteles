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

function normalizeMimeType(mime: string | null | undefined) {
    const raw = (mime || "").trim();
    if (!raw) return "";
    return raw.split(";")[0]?.trim() || raw;
}

async function sanitizeFileForMetaUpload(file: File) {
    const normalizedType = normalizeMimeType(file.type);
    if (!normalizedType || normalizedType === file.type) return file;
    const buffer = Buffer.from(await file.arrayBuffer());
    return new File([buffer], file.name || `upload-${Date.now()}.bin`, { type: normalizedType });
}

type AudioContainer = "ogg" | "webm" | "mp4" | "mp3" | "wav" | "unknown";

function sniffAudioContainer(buffer: Buffer): AudioContainer {
    if (!buffer || buffer.length < 12) return "unknown";

    // OGG
    if (buffer.slice(0, 4).toString("ascii") === "OggS") return "ogg";

    // EBML / WebM
    if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) return "webm";

    // WAV (RIFF....WAVE)
    if (buffer.slice(0, 4).toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WAVE") {
        return "wav";
    }

    // MP3
    if (buffer.slice(0, 3).toString("ascii") === "ID3") return "mp3";
    if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return "mp3";

    // MP4/M4A (....ftyp)
    if (buffer.slice(4, 8).toString("ascii") === "ftyp") return "mp4";

    return "unknown";
}

async function shouldTranscodeAudio(file: File) {
    const mime = (file.type || "").toLowerCase();
    const normalized = normalizeMimeType(mime);
    const name = (file.name || "").toLowerCase();

    try {
        const headBuffer = Buffer.from(await file.slice(0, 64).arrayBuffer());
        const container = sniffAudioContainer(headBuffer);

        // Only skip transcoding when it's already MP3.
        if (container === "mp3") return false;

        // Otherwise, convert everything else to MP3 for maximum compatibility.
        return true;
    } catch {
        // If sniffing fails, fallback to heuristics and default to transcoding.
    }

    if (mime.includes("codecs=")) return true;
    if (normalized !== mime && normalized.startsWith("audio/")) return true;
    if (name.endsWith(".webm") || name.endsWith(".m4a") || name.endsWith(".mp4") || name.endsWith(".opus")) {
        return true;
    }
    if (mime.includes("webm") || mime.includes("mp4") || mime.includes("opus")) return true;

    // Even if the browser claims it's mpeg/mp3, we couldn't sniff it; transcode to be safe.
    return true;
}

async function transcodeAudioToMp3(inputFile: File): Promise<File> {
    if (!ffmpegPath) {
        throw new Error(
            "No hay ffmpeg disponible para convertir audio. Sube el audio como archivo (.mp3). (HTTP 400)"
        );
    }

    const ffmpegBinary = ffmpegPath;

    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "pasteles-audio-"));
    const inPath = path.join(tmpDir, "input.bin");
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
                    "-c:a",
                    "libmp3lame",
                    "-b:a",
                    "64k",
                    "-ac",
                    "1",
                    "-ar",
                    "48000",
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
                (await shouldTranscodeAudio(file))
            ) {
                uploadFile = await transcodeAudioToMp3(file);
            }

            uploadFile = await sanitizeFileForMetaUpload(uploadFile);

            const uploaded = await uploadMetaMedia(uploadFile);
            const sent = await sendMetaMessage(
                type === "audio"
                    ? { to: waId, type: "audio", mediaId: uploaded.mediaId }
                    : { to: waId, type: "image", mediaId: uploaded.mediaId, caption: caption || undefined }
            );

            const previewBody =
                type === "audio"
                    ? "🎵 Audio"
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
