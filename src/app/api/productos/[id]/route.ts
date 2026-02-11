import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const productoId = parseInt(id);
        const { nombre, descripcion, precio, activo } = await request.json();

        if (!nombre || precio === undefined || precio === null) {
            return NextResponse.json(
                { error: 'Nombre y precio son requeridos' },
                { status: 400 }
            );
        }

        const parsedPrecio = Number(precio);
        if (Number.isNaN(parsedPrecio) || parsedPrecio < 0) {
            return NextResponse.json(
                { error: 'Precio invalido' },
                { status: 400 }
            );
        }

        const result = await pool.query(
            `UPDATE productos
             SET nombre = $1,
                 descripcion = $2,
                 precio = $3,
                 activo = $4
             WHERE id_producto = $5
             RETURNING *`,
            [nombre, descripcion || null, parsedPrecio, activo !== false, productoId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Producto update error:', error);
        return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const productoId = parseInt(id);

        const result = await pool.query(
            'UPDATE productos SET activo = false WHERE id_producto = $1 RETURNING *',
            [productoId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Producto desactivado', producto: result.rows[0] });
    } catch (error) {
        console.error('Producto delete error:', error);
        return NextResponse.json({ error: 'Error al eliminar producto' }, { status: 500 });
    }
}
