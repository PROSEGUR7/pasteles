import { NextRequest, NextResponse } from "next/server";
import { sendMetaTextMessage } from "@/lib/metaApi";
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

        const body = (await request.json()) as {
            waId?: string;
            to?: string;
            phone?: string;
            nombre?: string;
            message?: string;
            text?: string;
            body?: string;
            senderType?: SenderType;
            source?: "n8n" | "dashboard" | "meta";
        };

        const waId = (body.waId || body.to || body.phone || "").trim();
        const message = (body.message || body.text || body.body || "").trim();

        if (!waId) {
            return NextResponse.json({ error: "waId/to es requerido" }, { status: 400 });
        }

        if (!message) {
            return NextResponse.json({ error: "message/text es requerido" }, { status: 400 });
        }

        const sent = await sendMetaTextMessage({
            to: waId,
            message,
        });

        await persistOutboundMetaMessage({
            waId,
            nombre: body.nombre,
            body: message,
            messageId: sent.messageId,
            senderType: body.senderType || "ia",
            source: body.source || "n8n",
        });

        return NextResponse.json({
            ok: true,
            to: waId,
            messageId: sent.messageId || null,
        });
    } catch (error) {
        console.error("[Meta Send] Error:", error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "No se pudo enviar mensaje a Meta",
            },
            { status: 500 }
        );
    }
}
