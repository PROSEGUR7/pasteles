import { NextResponse } from "next/server";
import pool from "@/lib/db";

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

export async function GET() {
    try {
        const result = await pool.query(
            `SELECT
                c.id_cliente,
                c.nombre,
                c.telefono,
                COUNT(p.id_pedido) AS total_pedidos,
                COALESCE(SUM(CASE WHEN p.estado = 'cancelado' THEN 1 ELSE 0 END), 0) AS pedidos_cancelados,
                MAX(p.fecha) AS ultimo_pedido
             FROM clientes c
             LEFT JOIN pedidos p ON p.id_cliente = c.id_cliente
             GROUP BY c.id_cliente, c.nombre, c.telefono
             ORDER BY MAX(p.fecha) DESC NULLS LAST, c.nombre ASC
             LIMIT 50;`
        );

        const clientes = result.rows.map((row) => ({
            id: Number(row.id_cliente),
            nombre: row.nombre as string,
            telefono: row.telefono as string | null,
            totalPedidos: Number(row.total_pedidos || 0),
            pedidosCancelados: Number(row.pedidos_cancelados || 0),
            ultimoPedido: row.ultimo_pedido ? new Date(row.ultimo_pedido).toISOString() : null,
        }));

        return NextResponse.json({ clientes });
    } catch (error) {
        if (isDbConnectivityError(error)) {
            console.warn("[Clientes] Base de datos no disponible. Respuesta vacía temporal.");
            return NextResponse.json({ clientes: [], degraded: true });
        }
        console.error("[Clientes] Error listando:", error);
        return NextResponse.json({ error: "No se pudieron obtener los clientes" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = (await request.json()) as {
            id?: number;
            nombre?: string;
            telefono?: string | null;
        };

        const id = Number(body.id);
        if (!Number.isFinite(id) || id <= 0) {
            return NextResponse.json({ error: "id inválido" }, { status: 400 });
        }

        const nombre = (body.nombre || "").trim();
        if (!nombre) {
            return NextResponse.json({ error: "nombre es requerido" }, { status: 400 });
        }

        const telefonoRaw = body.telefono ?? "";
        const telefono = typeof telefonoRaw === "string" ? telefonoRaw.trim() : "";

        const result = await pool.query(
            `UPDATE clientes
             SET nombre = $2,
                 telefono = NULLIF($3, '')
             WHERE id_cliente = $1
             RETURNING id_cliente, nombre, telefono;`,
            [id, nombre, telefono]
        );

        if (!result.rowCount) {
            return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
        }

        return NextResponse.json({ ok: true, cliente: result.rows[0] });
    } catch (error) {
        if (isDbConnectivityError(error)) {
            return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 });
        }
        console.error("[Clientes] Error actualizando:", error);
        return NextResponse.json({ error: "No se pudo actualizar el cliente" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const body = (await request.json()) as { id?: number };
        const id = Number(body.id);

        if (!Number.isFinite(id) || id <= 0) {
            return NextResponse.json({ error: "id inválido" }, { status: 400 });
        }

        const result = await pool.query(
            `DELETE FROM clientes
             WHERE id_cliente = $1
             RETURNING id_cliente;`,
            [id]
        );

        if (!result.rowCount) {
            return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
        }

        return NextResponse.json({ ok: true, id });
    } catch (error) {
        const candidate = error as { code?: string } | undefined;
        if (candidate?.code === "23503") {
            return NextResponse.json(
                { error: "No se puede eliminar: el cliente tiene pedidos asociados" },
                { status: 409 }
            );
        }
        if (isDbConnectivityError(error)) {
            return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 });
        }
        console.error("[Clientes] Error eliminando:", error);
        return NextResponse.json({ error: "No se pudo eliminar el cliente" }, { status: 500 });
    }
}
