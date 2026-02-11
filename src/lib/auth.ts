import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'pasteles-admin-secret-2026';

export interface TokenPayload {
    id_empleado: number;
    nombre: string;
    usuario: string;
    cargo: string;
    rol: string;
    id_sede: number;
}

export function signToken(payload: TokenPayload): string {
    return jwt.sign(payload, SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): TokenPayload | null {
    try {
        return jwt.verify(token, SECRET) as TokenPayload;
    } catch {
        return null;
    }
}
