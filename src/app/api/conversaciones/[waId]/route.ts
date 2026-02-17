import { NextRequest, NextResponse } from "next/server";
import { getMetaConversationMessages, markConversationRead } from "@/lib/metaStore";

interface Params {
    params: Promise<{ waId: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
    try {
        const { waId } = await params;
        const messages = await getMetaConversationMessages(waId);
        return NextResponse.json({ messages });
    } catch (error) {
        console.error("[Conversaciones] Error obteniendo mensajes:", error);
        return NextResponse.json({ error: "No se pudieron obtener los mensajes" }, { status: 500 });
    }
}

export async function PATCH(_request: NextRequest, { params }: Params) {
    try {
        const { waId } = await params;
        await markConversationRead(waId);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("[Conversaciones] Error marcando como leído:", error);
        return NextResponse.json({ error: "No se pudo actualizar el estado de lectura" }, { status: 500 });
    }
}
