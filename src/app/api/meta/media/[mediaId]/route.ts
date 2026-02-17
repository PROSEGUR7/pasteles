import { NextRequest, NextResponse } from "next/server";

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

        const mediaRes = await fetch(metaInfo.url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        });

        if (!mediaRes.ok) {
            const fallback = await mediaRes.text().catch(() => "");
            return NextResponse.json(
                { error: fallback || "No se pudo descargar media desde Meta" },
                { status: mediaRes.status || 502 }
            );
        }

        const arrayBuffer = await mediaRes.arrayBuffer();
        const contentType = mediaRes.headers.get("content-type") || metaInfo.mime_type || "application/octet-stream";

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
