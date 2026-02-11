import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const pedidoId = parseInt(id);

        const pedido = await pool.query(
            `SELECT p.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono, c.email as cliente_email,
              s.nombre as sede_nombre, s.direccion as sede_direccion,
              e.nombre as empleado_nombre
       FROM pedidos p
       LEFT JOIN clientes c ON p.id_cliente = c.id_cliente
       LEFT JOIN sedes s ON p.id_sede = s.id_sede
       LEFT JOIN empleados e ON p.id_empleado = e.id_empleado
       WHERE p.id_pedido = $1`,
            [pedidoId]
        );

        if (pedido.rows.length === 0) {
            return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
        }

        const detalles = await pool.query(
            `SELECT pd.*, pr.nombre as producto_nombre, pr.descripcion as producto_descripcion
       FROM pedido_detalle pd
       JOIN productos pr ON pd.id_producto = pr.id_producto
       WHERE pd.id_pedido = $1
       ORDER BY pd.id_detalle`,
            [pedidoId]
        );

        const pagos = await pool.query(
            `SELECT pa.*, mp.nombre as metodo_nombre
       FROM pagos pa
       JOIN metodos_pago mp ON pa.id_metodo = mp.id_metodo
       WHERE pa.id_pedido = $1
       ORDER BY pa.fecha`,
            [pedidoId]
        );

        return NextResponse.json({
            pedido: pedido.rows[0],
            detalles: detalles.rows,
            pagos: pagos.rows,
        });
    } catch (error) {
        console.error('Pedido detail error:', error);
        return NextResponse.json({ error: 'Error al obtener pedido' }, { status: 500 });
    }
}
