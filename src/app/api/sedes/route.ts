import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const includeInactive = searchParams.get('include_inactive') === '1';
        const result = await pool.query(
            `SELECT * FROM sedes ${includeInactive ? '' : 'WHERE activa = true'} ORDER BY nombre`
        );
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Sedes error:', error);
        return NextResponse.json({ error: 'Error al obtener sedes' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { nombre, direccion, telefono, activa } = await request.json();

        if (!nombre) {
            return NextResponse.json(
                { error: 'Nombre es requerido' },
                { status: 400 }
            );
        }

        const result = await pool.query(
            `INSERT INTO sedes (nombre, direccion, telefono, activa)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [nombre, direccion || null, telefono || null, activa !== false]
        );

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error('Sede create error:', error);
        return NextResponse.json({ error: 'Error al crear sede' }, { status: 500 });
    }
}
