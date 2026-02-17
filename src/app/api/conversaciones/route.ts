import { NextRequest, NextResponse } from "next/server";
import { listMetaConversations } from "@/lib/metaStore";

function isDbConnectivityError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const candidate = error as { code?: string; errors?: Array<{ code?: string }> };
    const dbCodes = new Set(["ECONNREFUSED", "ENOTFOUND", "ECONNRESET", "ETIMEDOUT"]);

    if (candidate.code && dbCodes.has(candidate.code)) return true;
    if (Array.isArray(candidate.errors)) {
        return candidate.errors.some((nested) => !!nested?.code && dbCodes.has(nested.code));
    }
    return false;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const canal = searchParams.get("canal") || undefined;
        const conversations = await listMetaConversations(canal || undefined);
        return NextResponse.json({ conversations });
    } catch (error) {
        if (isDbConnectivityError(error)) {
            console.warn("[Conversaciones] Base de datos no disponible. Respuesta vacía temporal.");
            return NextResponse.json({ conversations: [], degraded: true });
        }
        console.error("[Conversaciones] Error listando:", error);
        return NextResponse.json({ error: "No se pudieron obtener las conversaciones" }, { status: 500 });
    }
}
