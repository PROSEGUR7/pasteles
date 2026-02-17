import { NextRequest, NextResponse } from "next/server";
import {
    closeMetaConversation,
    getMetaConversationMessages,
    markConversationRead,
    setMetaConversationBotStatus,
} from "@/lib/metaStore";

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

export async function DELETE(_request: NextRequest, { params }: Params) {
    try {
        const { waId } = await params;
        await closeMetaConversation(waId);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("[Conversaciones] Error cerrando chat:", error);
        return NextResponse.json({ error: "No se pudo cerrar la conversación" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: Params) {
    try {
        const { waId } = await params;
        const body = (await request.json()) as { botStatus?: "activo" | "inactivo" };

        if (body.botStatus !== "activo" && body.botStatus !== "inactivo") {
            return NextResponse.json({ error: "Estado de bot inválido" }, { status: 400 });
        }

        await setMetaConversationBotStatus(waId, body.botStatus);
        return NextResponse.json({ ok: true, botStatus: body.botStatus });
    } catch (error) {
        console.error("[Conversaciones] Error actualizando bot:", error);
        return NextResponse.json({ error: "No se pudo actualizar el estado del bot" }, { status: 500 });
    }
}
