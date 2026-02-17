import { NextRequest, NextResponse } from "next/server";
import { listMetaConversations } from "@/lib/metaStore";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const canal = searchParams.get("canal") || undefined;
        const conversations = await listMetaConversations(canal || undefined);
        return NextResponse.json({ conversations });
    } catch (error) {
        console.error("[Conversaciones] Error listando:", error);
        return NextResponse.json({ error: "No se pudieron obtener las conversaciones" }, { status: 500 });
    }
}
