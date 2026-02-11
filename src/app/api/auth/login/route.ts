import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const { usuario, password } = await request.json();

        if (!usuario || !password) {
            return NextResponse.json(
                { error: 'Usuario y contraseña son requeridos' },
                { status: 400 }
            );
        }

        const result = await pool.query(
            `SELECT e.*, r.nombre as rol
       FROM empleados e
       LEFT JOIN empleado_roles er ON e.id_empleado = er.id_empleado
       LEFT JOIN roles r ON er.id_rol = r.id_rol
       WHERE e.usuario = $1 AND e.activo = true`,
            [usuario]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'Credenciales inválidas' },
                { status: 401 }
            );
        }

        const empleado = result.rows[0];
        const validPassword = await bcrypt.compare(password, empleado.password);

        if (!validPassword) {
            return NextResponse.json(
                { error: 'Credenciales inválidas' },
                { status: 401 }
            );
        }

        const token = signToken({
            id_empleado: empleado.id_empleado,
            nombre: empleado.nombre,
            usuario: empleado.usuario,
            cargo: empleado.cargo,
            rol: empleado.rol || 'empleado',
            id_sede: empleado.id_sede,
        });

        return NextResponse.json({
            token,
            user: {
                id_empleado: empleado.id_empleado,
                nombre: empleado.nombre,
                usuario: empleado.usuario,
                cargo: empleado.cargo,
                rol: empleado.rol || 'empleado',
                id_sede: empleado.id_sede,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
