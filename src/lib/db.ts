import { Pool, PoolConfig } from 'pg';

function parsePort(raw?: string, fallback = 5432) {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
}

const isRailwayRuntime = Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_PROJECT_ID ||
    process.env.RAILWAY_STATIC_URL
);

const connectionCandidates = isRailwayRuntime
    ? [process.env.DATABASE_URL, process.env.DATABASE_PUBLIC_URL]
    : [process.env.DATABASE_PUBLIC_URL, process.env.DATABASE_URL];

const connectionString = connectionCandidates.find((value) => typeof value === 'string' && value.length > 0);

const poolConfig: PoolConfig = connectionString
    ? {
        connectionString,
        ssl: { rejectUnauthorized: false },
    }
    : {
        host: process.env.DB_HOST || process.env.PGHOST,
        port: parsePort(process.env.DB_PORT || process.env.PGPORT, 5432),
        database: process.env.DB_NAME || process.env.PGDATABASE,
        user: process.env.DB_USER || process.env.PGUSER,
        password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
        ssl: { rejectUnauthorized: false },
    };

const pool = new Pool({
    ...poolConfig,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

export default pool;
