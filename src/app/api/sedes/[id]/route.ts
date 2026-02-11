import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const sedeId = parseInt(id);
        const { nombre, direccion, telefono, activa } = await request.json();

        if (!nombre) {
            return NextResponse.json(
                { error: 'Nombre es requerido' },
                { status: 400 }
            );
        }

        const result = await pool.query(
            `UPDATE sedes
             SET nombre = $1,
                 direccion = $2,
                 telefono = $3,
                 activa = $4
             WHERE id_sede = $5
             RETURNING *`,
            [nombre, direccion || null, telefono || null, activa !== false, sedeId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Sede no encontrada' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Sede update error:', error);
        return NextResponse.json({ error: 'Error al actualizar sede' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const sedeId = parseInt(id);

        const result = await pool.query(
            'UPDATE sedes SET activa = false WHERE id_sede = $1 RETURNING *',
            [sedeId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Sede no encontrada' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Sede desactivada', sede: result.rows[0] });
    } catch (error) {
        console.error('Sede delete error:', error);
        return NextResponse.json({ error: 'Error al eliminar sede' }, { status: 500 });
    }
}
