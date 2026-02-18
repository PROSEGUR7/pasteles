import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
    try {
        // Total ventas hoy
        const ventasHoy = await pool.query(
            `SELECT COALESCE(SUM(total), 0) as total_ventas, COUNT(*) as total_pedidos
       FROM pedidos WHERE DATE(fecha) = CURRENT_DATE`
        );

        // Pedidos por estado
        const porEstado = await pool.query(
            `SELECT estado, COUNT(*) as cantidad FROM pedidos GROUP BY estado`
        );

        // Ventas últimos 7 días
        const ventasSemana = await pool.query(
            `SELECT DATE(fecha) as dia, COALESCE(SUM(total), 0) as total, COUNT(*) as pedidos
       FROM pedidos
       WHERE fecha >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY DATE(fecha)
       ORDER BY dia`
        );

        // Top productos
        const topProductos = await pool.query(
            `SELECT p.nombre, SUM(pd.cantidad) as total_vendido, SUM(pd.subtotal) as total_ingreso
       FROM pedido_detalle pd
       JOIN productos p ON pd.id_producto = p.id_producto
       GROUP BY p.id_producto, p.nombre
       ORDER BY total_vendido DESC
       LIMIT 5`
        );

        // Ventas totales generales
        const ventasTotal = await pool.query(
            `SELECT COALESCE(SUM(total), 0) as total_general, COUNT(*) as pedidos_totales FROM pedidos`
        );

        // Pedidos recientes
        const recientes = await pool.query(
            `SELECT p.*, c.nombre as cliente_nombre, s.nombre as sede_nombre, e.nombre as empleado_nombre
       FROM pedidos p
       LEFT JOIN clientes c ON p.id_cliente = c.id_cliente
       LEFT JOIN sedes s ON p.id_sede = s.id_sede
       LEFT JOIN empleados e ON p.id_empleado = e.id_empleado
       ORDER BY p.fecha DESC
       LIMIT 10`
        );

        // Ventas por sede
        const ventasPorSede = await pool.query(
            `SELECT s.nombre as sede, COALESCE(SUM(p.total), 0) as total, COUNT(p.id_pedido) as pedidos
       FROM sedes s
       LEFT JOIN pedidos p ON s.id_sede = p.id_sede
       GROUP BY s.id_sede, s.nombre
       ORDER BY total DESC`
        );

        return NextResponse.json({
            ventasHoy: {
                total: parseFloat(ventasHoy.rows[0].total_ventas),
                pedidos: parseInt(ventasHoy.rows[0].total_pedidos),
            },
            porEstado: porEstado.rows,
            ventasSemana: ventasSemana.rows.map(r => ({
                dia: r.dia,
                total: parseFloat(r.total),
                pedidos: parseInt(r.pedidos),
            })),
            topProductos: topProductos.rows.map(r => ({
                nombre: r.nombre,
                vendido: parseInt(r.total_vendido),
                ingreso: parseFloat(r.total_ingreso),
            })),
            ventasTotal: {
                total: parseFloat(ventasTotal.rows[0].total_general),
                pedidos: parseInt(ventasTotal.rows[0].pedidos_totales),
            },
            recientes: recientes.rows,
            ventasPorSede: ventasPorSede.rows.map(r => ({
                sede: r.sede,
                total: parseFloat(r.total),
                pedidos: parseInt(r.pedidos),
            })),
        });
    } catch (error) {
        console.error('Stats error:', error);
        return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
    }
}
