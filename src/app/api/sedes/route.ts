import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
    try {
        const result = await pool.query(
            'SELECT * FROM sedes WHERE activa = true ORDER BY nombre'
        );
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Sedes error:', error);
        return NextResponse.json({ error: 'Error al obtener sedes' }, { status: 500 });
    }
}
