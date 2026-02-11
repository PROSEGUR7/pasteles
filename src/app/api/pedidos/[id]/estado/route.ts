import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { fireWebhook } from '@/lib/webhook';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const pedidoId = parseInt(id);
        const { estado } = await request.json();

        const validEstados = ['pendiente', 'pagado', 'cancelado', 'entregado'];
        if (!validEstados.includes(estado)) {
            return NextResponse.json(
                { error: `Estado inválido. Opciones: ${validEstados.join(', ')}` },
                { status: 400 }
            );
        }

        const current = await pool.query(
            'SELECT estado FROM pedidos WHERE id_pedido = $1',
            [pedidoId]
        );

        if (current.rows.length === 0) {
            return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
        }

        const estadoAnterior = current.rows[0].estado;

        await pool.query(
            'UPDATE pedidos SET estado = $1 WHERE id_pedido = $2',
            [estado, pedidoId]
        );

        const pedidoCompleto = await pool.query(
            `SELECT p.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono,
              s.nombre as sede_nombre
       FROM pedidos p
       LEFT JOIN clientes c ON p.id_cliente = c.id_cliente
       LEFT JOIN sedes s ON p.id_sede = s.id_sede
       WHERE p.id_pedido = $1`,
            [pedidoId]
        );

        // Fire n8n webhook (non-blocking)
        fireWebhook({
            evento: 'cambio_estado',
            pedido: pedidoCompleto.rows[0],
            estado_anterior: estadoAnterior,
            estado_nuevo: estado,
        });

        return NextResponse.json({
            message: 'Estado actualizado',
            pedido: pedidoCompleto.rows[0],
        });
    } catch (error) {
        console.error('Estado update error:', error);
        return NextResponse.json({ error: 'Error al actualizar estado' }, { status: 500 });
    }
}
