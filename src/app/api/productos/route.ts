import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
    try {
        const result = await pool.query(
            'SELECT * FROM productos WHERE activo = true ORDER BY nombre'
        );
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Productos error:', error);
        return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
    }
}
