import { NextRequest, NextResponse } from "next/server";
import {
    closeMetaConversation,
    getMetaConversationMessages,
    markConversationRead,
    setMetaConversationBotStatus,
} from "@/lib/metaStore";
import pool from "@/lib/db";

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

        const waDigits = waId.replace(/\D/g, "");
        if (!waDigits) {
            return NextResponse.json({ error: "No se pudo interpretar el teléfono del chat" }, { status: 400 });
        }

        let clienteResult = await pool.query(
            `WITH candidates AS (
                SELECT
                    id_cliente,
                    REGEXP_REPLACE(COALESCE(telefono, ''), '\\D', '', 'g') AS telefono_digits
                FROM clientes
            ), ranked AS (
                SELECT
                    id_cliente,
                    CASE
                        WHEN telefono_digits = $1 THEN 3
                        WHEN RIGHT(telefono_digits, 10) = RIGHT($1, 10) THEN 2
                        WHEN telefono_digits LIKE '%' || $1 THEN 1
                        ELSE 0
                    END AS score,
                    LENGTH(telefono_digits) AS len
                FROM candidates
                WHERE telefono_digits <> ''
                  AND (
                    telefono_digits = $1
                    OR RIGHT(telefono_digits, 10) = RIGHT($1, 10)
                    OR telefono_digits LIKE '%' || $1
                  )
                ORDER BY score DESC, len ASC
                LIMIT 1
            )
            UPDATE clientes c
            SET estado = $2
            FROM ranked r
            WHERE c.id_cliente = r.id_cliente
            RETURNING c.id_cliente, c.estado;`,
            [waDigits, body.botStatus]
        );

        if (!clienteResult.rowCount) {
            const conversationResult = await pool.query(
                `SELECT nombre
                 FROM meta_conversations
                 WHERE wa_id = $1
                 LIMIT 1;`,
                [waId]
            );

            const conversationName = conversationResult.rows[0]?.nombre as string | undefined;
            if (conversationName) {
                clienteResult = await pool.query(
                    `WITH ranked AS (
                        SELECT id_cliente
                        FROM clientes
                        WHERE LOWER(TRIM(COALESCE(nombre, ''))) = LOWER(TRIM($1))
                        ORDER BY id_cliente DESC
                        LIMIT 1
                    )
                    UPDATE clientes c
                    SET estado = $2
                    FROM ranked r
                    WHERE c.id_cliente = r.id_cliente
                    RETURNING c.id_cliente, c.estado;`,
                    [conversationName, body.botStatus]
                );
            }
        }

        return NextResponse.json({
            ok: true,
            botStatus: body.botStatus,
            clienteUpdated: Boolean(clienteResult.rowCount),
            cliente: clienteResult.rows[0] ?? null,
            warning: clienteResult.rowCount
                ? null
                : "No se encontró cliente vinculado para actualizar estado en la tabla clientes",
        });
    } catch (error) {
        console.error("[Conversaciones] Error actualizando bot:", error);
        return NextResponse.json({ error: "No se pudo actualizar el estado del bot" }, { status: 500 });
    }
}
