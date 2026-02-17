import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sede = searchParams.get('sede');
        const estado = searchParams.get('estado');
        const cliente = searchParams.get('cliente') || searchParams.get('clienteId') || searchParams.get('id_cliente');
        const fechaInicio = searchParams.get('fecha_inicio');
        const fechaFin = searchParams.get('fecha_fin');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        const params: (string | number)[] = [];
        let paramIndex = 1;

        if (sede) {
            whereClause += ` AND p.id_sede = $${paramIndex++}`;
            params.push(parseInt(sede));
        }
        if (estado) {
            whereClause += ` AND p.estado = $${paramIndex++}`;
            params.push(estado);
        }
        if (cliente) {
            const clienteId = parseInt(cliente);
            if (!Number.isNaN(clienteId)) {
                whereClause += ` AND p.id_cliente = $${paramIndex++}`;
                params.push(clienteId);
            }
        }
        if (fechaInicio) {
            whereClause += ` AND p.fecha >= $${paramIndex++}`;
            params.push(fechaInicio);
        }
        if (fechaFin) {
            whereClause += ` AND p.fecha <= $${paramIndex++}`;
            params.push(fechaFin + ' 23:59:59');
        }

        const countResult = await pool.query(
            `SELECT COUNT(*) FROM pedidos p ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].count);

        const result = await pool.query(
            `SELECT p.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono,
              s.nombre as sede_nombre, e.nombre as empleado_nombre
       FROM pedidos p
       LEFT JOIN clientes c ON p.id_cliente = c.id_cliente
       LEFT JOIN sedes s ON p.id_sede = s.id_sede
       LEFT JOIN empleados e ON p.id_empleado = e.id_empleado
       ${whereClause}
       ORDER BY p.fecha DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
            [...params, limit, offset]
        );

        return NextResponse.json({
            pedidos: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Pedidos error:', error);
        return NextResponse.json({ error: 'Error al obtener pedidos' }, { status: 500 });
    }
}
