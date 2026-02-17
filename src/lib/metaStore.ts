import pool from "@/lib/db";

let tablesReady = false;

export interface ConversationSummary {
    waId: string;
    nombre: string;
    canal: string;
    lastMessage: string | null;
    lastMessageAt: string | null;
    unreadCount: number;
}

export interface ConversationMessage {
    messageId: string;
    direction: "inbound" | "outbound";
    body: string | null;
    timestamp: string;
}

type MetaWebhookPayload = {
    field?: string;
    value?: {
        contacts?: Array<{
            wa_id?: string;
            profile?: { name?: string };
        }>;
        messages?: MetaWebhookMessage[];
    };
    object?: string;
    entry?: Array<{
        id?: string;
        changes?: Array<{
            field?: string;
            value?: {
                contacts?: Array<{
                    wa_id?: string;
                    profile?: { name?: string };
                }>;
                messages?: MetaWebhookMessage[];
            };
        }>;
    }>;
};

type NormalizedChange = {
    field?: string;
    value?: {
        contacts?: Array<{
            wa_id?: string;
            profile?: { name?: string };
        }>;
        messages?: MetaWebhookMessage[];
    };
};

type MetaWebhookMessage = {
    id: string;
    from?: string;
    to?: string;
    timestamp?: string;
    type?: string;
    text?: { body?: string };
    button?: { text?: string };
    interactive?: {
        type?: string;
        button_reply?: { title?: string };
        list_reply?: { title?: string };
    };
    image?: { caption?: string };
    audio?: Record<string, unknown>;
    sticker?: Record<string, unknown>;
    document?: { filename?: string };
};

async function ensureMetaTables() {
    if (tablesReady) return;
    await pool.query(`
        CREATE TABLE IF NOT EXISTS meta_conversations (
            wa_id TEXT PRIMARY KEY,
            nombre TEXT NOT NULL,
            canal TEXT NOT NULL DEFAULT 'WhatsApp',
            last_message TEXT,
            last_message_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS meta_messages (
            id SERIAL PRIMARY KEY,
            wa_id TEXT NOT NULL REFERENCES meta_conversations(wa_id) ON DELETE CASCADE,
            message_id TEXT UNIQUE,
            direction TEXT NOT NULL,
            body TEXT,
            timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            raw JSONB,
            read_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    `);
    tablesReady = true;
}

function getMessagePreview(message: MetaWebhookMessage): string {
    if (message.type === "text" && message.text?.body) return message.text.body;
    if (message.type === "button" && message.button?.text) return message.button.text;
    if (message.type === "interactive") {
        if (message.interactive?.button_reply?.title) return message.interactive.button_reply.title;
        if (message.interactive?.list_reply?.title) return message.interactive.list_reply.title;
    }
    if (message.type === "image" && message.image?.caption) return message.image.caption;
    if (message.type === "document" && message.document?.filename) return `Archivo: ${message.document.filename}`;
    return message.type ? `Mensaje ${message.type}` : "Mensaje";
}

function parseTimestamp(value?: string) {
    if (!value) return new Date();
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
        return new Date(numeric * 1000);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date() : date;
}

async function upsertConversation(params: {
    waId: string;
    nombre: string;
    canal: string;
    lastMessage: string | null;
    lastMessageAt: Date;
}) {
    const { waId, nombre, canal, lastMessage, lastMessageAt } = params;
    await pool.query(
        `INSERT INTO meta_conversations (wa_id, nombre, canal, last_message, last_message_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (wa_id)
         DO UPDATE SET nombre = EXCLUDED.nombre,
                       canal = EXCLUDED.canal,
                       last_message = EXCLUDED.last_message,
                       last_message_at = EXCLUDED.last_message_at;`,
        [waId, nombre, canal, lastMessage, lastMessageAt.toISOString()]
    );
}

async function insertMessage(params: {
    waId: string;
    messageId: string;
    direction: "inbound" | "outbound";
    body: string | null;
    timestamp: Date;
    raw: MetaWebhookMessage;
}) {
    const { waId, messageId, direction, body, timestamp, raw } = params;
    await pool.query(
        `INSERT INTO meta_messages (wa_id, message_id, direction, body, timestamp, raw, read_at)
         VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $3 = 'inbound' THEN NULL ELSE NOW() END)
         ON CONFLICT (message_id) DO NOTHING;`,
        [waId, messageId, direction, body, timestamp.toISOString(), raw]
    );
}

export async function persistMetaWebhookPayload(payload: unknown) {
    await ensureMetaTables();
    const data = payload as MetaWebhookPayload;
    const changes: NormalizedChange[] = [];

    if (Array.isArray(data.entry)) {
        for (const entry of data.entry) {
            for (const change of entry.changes ?? []) {
                changes.push(change);
            }
        }
    }

    if (data.field === "messages" && data.value) {
        changes.push({ field: data.field, value: data.value });
    }

    for (const change of changes) {
        const value = change.value;
        if (!value) continue;
        const messages = value.messages ?? [];
        if (!messages.length) continue;
        const contacts = value.contacts ?? [];

        for (const message of messages) {
            const waId = message.from || message.to;
            if (!waId) continue;
            const contact = contacts.find((c) => c.wa_id === waId) ?? contacts[0];
            const nombre = contact?.profile?.name || waId;
            const canal = "WhatsApp";
            const body = getMessagePreview(message);
            const timestamp = parseTimestamp(message.timestamp);
            const direction: "inbound" | "outbound" = message.from ? "inbound" : "outbound";

            await upsertConversation({
                waId,
                nombre,
                canal,
                lastMessage: body,
                lastMessageAt: timestamp,
            });

            await insertMessage({
                waId,
                messageId: message.id,
                direction,
                body,
                timestamp,
                raw: message,
            });
        }
    }
}

export async function listMetaConversations(canal?: string): Promise<ConversationSummary[]> {
    await ensureMetaTables();
    const params: string[] = [];
    let whereClause = "";
    if (canal) {
        params.push(canal);
        whereClause = `WHERE c.canal = $${params.length}`;
    }

    const result = await pool.query(
        `WITH unread AS (
            SELECT wa_id, COUNT(*) AS unread_count
            FROM meta_messages
            WHERE direction = 'inbound' AND read_at IS NULL
            GROUP BY wa_id
        )
        SELECT c.wa_id, c.nombre, c.canal, c.last_message, c.last_message_at,
               COALESCE(u.unread_count, 0) AS unread_count
        FROM meta_conversations c
        LEFT JOIN unread u ON u.wa_id = c.wa_id
        ${whereClause}
        ORDER BY c.last_message_at DESC NULLS LAST
        LIMIT 200;`,
        params
    );

    return result.rows.map((row) => ({
        waId: row.wa_id,
        nombre: row.nombre,
        canal: row.canal,
        lastMessage: row.last_message,
        lastMessageAt: row.last_message_at,
        unreadCount: Number(row.unread_count || 0),
    }));
}

export async function getMetaConversationMessages(waId: string): Promise<ConversationMessage[]> {
    await ensureMetaTables();
    const result = await pool.query(
        `SELECT message_id, direction, body, timestamp
         FROM meta_messages
         WHERE wa_id = $1
         ORDER BY timestamp ASC
         LIMIT 500;`,
        [waId]
    );

    return result.rows.map((row) => ({
        messageId: row.message_id,
        direction: row.direction,
        body: row.body,
        timestamp: row.timestamp,
    }));
}

export async function markConversationRead(waId: string) {
    await ensureMetaTables();
    await pool.query(
        `UPDATE meta_messages
         SET read_at = NOW()
         WHERE wa_id = $1 AND direction = 'inbound' AND read_at IS NULL;`,
        [waId]
    );
}
