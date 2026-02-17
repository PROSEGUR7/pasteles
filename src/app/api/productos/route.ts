import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

function isDbConnectivityError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const candidate = error as { code?: string; errors?: Array<{ code?: string }> };
    const dbCodes = new Set(['ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT']);

    if (candidate.code && dbCodes.has(candidate.code)) return true;
    if (Array.isArray(candidate.errors)) {
        return candidate.errors.some((nested) => !!nested?.code && dbCodes.has(nested.code));
    }
    return false;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const includeInactive = searchParams.get('include_inactive') === '1';
        const result = await pool.query(
            `SELECT * FROM productos ${includeInactive ? '' : 'WHERE activo = true'} ORDER BY nombre`
        );
        return NextResponse.json(result.rows);
    } catch (error) {
        if (isDbConnectivityError(error)) {
            console.warn('[Productos] Base de datos no disponible. Respuesta vacía temporal.');
            return NextResponse.json([]);
        }
        console.error('Productos error:', error);
        return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
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
            `INSERT INTO productos (nombre, descripcion, precio, activo)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [nombre, descripcion || null, parsedPrecio, activo !== false]
        );

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error('Productos create error:', error);
        return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 });
    }
}
