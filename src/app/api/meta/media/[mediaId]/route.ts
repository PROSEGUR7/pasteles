import { NextRequest, NextResponse } from "next/server";
import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

export const runtime = "nodejs";

interface Params {
    params: Promise<{ mediaId: string }>;
}

function getMetaConfig() {
    const token = process.env.META_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
    const apiVersion = process.env.META_API_VERSION || "v21.0";

    if (!token) {
        throw new Error("Falta META_ACCESS_TOKEN en variables de entorno");
    }

    return { token, apiVersion };
}

function normalizeMime(mime: string | null | undefined) {
    const raw = (mime || "").trim();
    if (!raw) return "";
    return raw.split(";")[0]?.trim() || raw;
}

async function transcodeBufferToMp3(inputBuffer: Buffer): Promise<Buffer> {
    if (!ffmpegPath) {
        throw new Error("No hay ffmpeg disponible para convertir audio.");
    }

    const ffmpegBinary: string = ffmpegPath;

    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "pasteles-meta-media-"));
    const inPath = path.join(tmpDir, "input.bin");
    const outPath = path.join(tmpDir, "output.mp3");

    try {
        await writeFile(inPath, inputBuffer);

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
                    reject(new Error((stderr || error.message || "").trim() || "ffmpeg error"));
                }
            );
        });

        return await readFile(outPath);
    } finally {
        await rm(tmpDir, { recursive: true, force: true }).catch(() => null);
    }
}

export async function GET(_request: NextRequest, { params }: Params) {
    try {
        const { mediaId } = await params;
        const safeMediaId = decodeURIComponent(mediaId || "").trim();

        if (!safeMediaId) {
            return NextResponse.json({ error: "mediaId es requerido" }, { status: 400 });
        }

        const { token, apiVersion } = getMetaConfig();

        const metaInfoRes = await fetch(
            `https://graph.facebook.com/${apiVersion}/${encodeURIComponent(safeMediaId)}?fields=url,mime_type`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
            }
        );

        const metaInfo = (await metaInfoRes.json().catch(() => ({}))) as {
            url?: string;
            mime_type?: string;
            error?: { message?: string };
        };

        if (!metaInfoRes.ok || !metaInfo.url) {
            const message = metaInfo?.error?.message || "No se pudo resolver media URL en Meta";
            return NextResponse.json({ error: message }, { status: metaInfoRes.status || 502 });
        }

        const downloadUrl = new URL(metaInfo.url);
        // Force the current token, in case Meta returned a URL that carries an older/expired access_token.
        downloadUrl.searchParams.set("access_token", token);

        let mediaRes = await fetch(downloadUrl.toString(), {
            method: "GET",
            cache: "no-store",
        });

        if (!mediaRes.ok) {
            // Some Meta media URLs reject query access_token and require the Authorization header.
            // Retry without any access_token query param to avoid sending a stale token.
            const headerUrl = new URL(metaInfo.url);
            headerUrl.searchParams.delete("access_token");

            const retryRes = await fetch(headerUrl.toString(), {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
            });

            if (retryRes.ok) {
                mediaRes = retryRes;
            }
        }

        if (!mediaRes.ok) {
            const fallback = await mediaRes.text().catch(() => "");
            return NextResponse.json(
                { error: fallback || "No se pudo descargar media desde Meta" },
                { status: mediaRes.status || 502 }
            );
        }

        const arrayBuffer = await mediaRes.arrayBuffer();
        const rawContentType = mediaRes.headers.get("content-type") || metaInfo.mime_type || "application/octet-stream";
        const contentType = normalizeMime(rawContentType) || "application/octet-stream";

        const isAudio = contentType.startsWith("audio/");
        const isMp3 = contentType === "audio/mpeg" || contentType === "audio/mp3";

        if (isAudio && !isMp3 && ffmpegPath) {
            try {
                const mp3Buffer = await transcodeBufferToMp3(Buffer.from(arrayBuffer));
                return new NextResponse(new Uint8Array(mp3Buffer), {
                    status: 200,
                    headers: {
                        "Content-Type": "audio/mpeg",
                        "Cache-Control": "private, max-age=60",
                    },
                });
            } catch (transcodeError) {
                console.error("[Meta Media] Transcode error:", transcodeError);
            }
        }

        return new NextResponse(arrayBuffer, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "private, max-age=60",
            },
        });
    } catch (error) {
        console.error("[Meta Media] Error:", error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "No se pudo obtener media de Meta",
            },
            { status: 500 }
        );
    }
}
