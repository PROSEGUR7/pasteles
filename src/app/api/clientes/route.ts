import { NextResponse } from "next/server";
import pool from "@/lib/db";

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
        console.error("[Clientes] Error listando:", error);
        return NextResponse.json({ error: "No se pudieron obtener los clientes" }, { status: 500 });
    }
}
