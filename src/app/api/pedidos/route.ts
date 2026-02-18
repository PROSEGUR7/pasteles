import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

function getBearerToken(authorization: string | null) {
    if (!authorization) return null;
    const [scheme, value] = authorization.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !value) return null;
    return value.trim();
}

function isAuthorized(request: NextRequest) {
    const inboundToken = process.env.N8N_INBOUND_TOKEN || process.env.N8N_TOKEN;
    if (!inboundToken) return true;

    const bearer = getBearerToken(request.headers.get('authorization'));
    const direct = request.headers.get('x-n8n-token')?.trim();
    return bearer === inboundToken || direct === inboundToken;
}

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

type PedidoDetalleInput = {
    id_producto: number;
    cantidad: number;
    precio_unitario?: number;
    subtotal?: number;
};

export async function POST(request: NextRequest) {
    try {
        if (!isAuthorized(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = (await request.json()) as {
            numero_ticket?: string;
            id_cliente?: number;
            id_empleado?: number | null;
            id_sede?: number;
            fecha?: string;
            estado?: string;
            total?: number;
            detalles?: PedidoDetalleInput[];
        };

        const idCliente = Number(body.id_cliente);
        const idSede = Number(body.id_sede);
        const idEmpleado = body.id_empleado === null || body.id_empleado === undefined
            ? null
            : Number(body.id_empleado);

        if (!Number.isFinite(idCliente) || idCliente <= 0) {
            return NextResponse.json({ error: 'id_cliente es requerido' }, { status: 400 });
        }
        if (!Number.isFinite(idSede) || idSede <= 0) {
            return NextResponse.json({ error: 'id_sede es requerido' }, { status: 400 });
        }

        const detallesRaw = Array.isArray(body.detalles) ? body.detalles : [];
        if (detallesRaw.length === 0) {
            return NextResponse.json(
                { error: 'detalles es requerido (al menos 1 producto)' },
                { status: 400 }
            );
        }

        const detallesValidated = detallesRaw.map((d) => ({
            id_producto: Number(d.id_producto),
            cantidad: Number(d.cantidad),
            precio_unitario: d.precio_unitario === undefined ? undefined : Number(d.precio_unitario),
            subtotal: d.subtotal === undefined ? undefined : Number(d.subtotal),
        }));

        for (const d of detallesValidated) {
            if (!Number.isFinite(d.id_producto) || d.id_producto <= 0) {
                return NextResponse.json({ error: 'Cada detalle requiere id_producto válido' }, { status: 400 });
            }
            if (!Number.isFinite(d.cantidad) || d.cantidad <= 0) {
                return NextResponse.json({ error: 'Cada detalle requiere cantidad > 0' }, { status: 400 });
            }
        }

        const productoIds = Array.from(new Set(detallesValidated.map((d) => d.id_producto)));
        const preciosRes = await pool.query(
            'SELECT id_producto, precio FROM productos WHERE id_producto = ANY($1::int[])',
            [productoIds]
        );
        const precioById = new Map<number, number>();
        for (const row of preciosRes.rows) {
            precioById.set(Number(row.id_producto), Number(row.precio));
        }
        for (const productId of productoIds) {
            if (!precioById.has(productId)) {
                return NextResponse.json(
                    { error: `Producto no encontrado: id_producto=${productId}` },
                    { status: 400 }
                );
            }
        }

        const normalizedDetalles = detallesValidated.map((d) => {
            const unit = Number.isFinite(d.precio_unitario as number)
                ? (d.precio_unitario as number)
                : (precioById.get(d.id_producto) || 0);
            const subtotal = Number.isFinite(d.subtotal as number)
                ? (d.subtotal as number)
                : unit * d.cantidad;
            return {
                id_producto: d.id_producto,
                cantidad: d.cantidad,
                precio_unitario: unit,
                subtotal,
            };
        });

        const computedTotal = normalizedDetalles.reduce((acc, d) => acc + (Number(d.subtotal) || 0), 0);
        const total = Number.isFinite(Number(body.total)) ? Number(body.total) : computedTotal;
        const estado = (body.estado || 'pendiente').trim() || 'pendiente';
        const fecha = body.fecha ? new Date(body.fecha) : null;
        if (body.fecha && Number.isNaN(fecha?.getTime() ?? NaN)) {
            return NextResponse.json({ error: 'fecha inválida (usa ISO string)' }, { status: 400 });
        }

        const numeroTicket = (body.numero_ticket || '').trim() || `TK-${Date.now()}`;

        await pool.query('BEGIN');
        try {
            const pedidoRes = await pool.query(
                `INSERT INTO pedidos (numero_ticket, id_cliente, id_empleado, id_sede, fecha, estado, total)
                 VALUES ($1, $2, $3, $4, COALESCE($5, NOW()), $6, $7)
                 RETURNING *`,
                [numeroTicket, idCliente, idEmpleado, idSede, fecha ? fecha.toISOString() : null, estado, total]
            );

            const pedido = pedidoRes.rows[0];
            const pedidoId = Number(pedido.id_pedido);

            for (const d of normalizedDetalles) {
                await pool.query(
                    `INSERT INTO pedido_detalle (id_pedido, id_producto, cantidad, precio_unitario, subtotal)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [pedidoId, d.id_producto, d.cantidad, d.precio_unitario, d.subtotal]
                );
            }

            await pool.query('COMMIT');

            return NextResponse.json(
                {
                    pedido,
                    detalles: normalizedDetalles,
                },
                { status: 201 }
            );
        } catch (error) {
            await pool.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Pedidos create error:', error);
        return NextResponse.json({ error: 'Error al crear pedido' }, { status: 500 });
    }
}
