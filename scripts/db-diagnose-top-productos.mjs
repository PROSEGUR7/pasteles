import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

function loadEnvLocal() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const envPath = path.resolve(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!key) continue;
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DATABASE_PUBLIC_URL/DATABASE_URL in env.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function safeQuery(label, sql) {
  try {
    const res = await pool.query(sql);
    return { ok: true, label, rows: res.rows };
  } catch (e) {
    return { ok: false, label, error: e?.message || String(e) };
  }
}

const results = [];
results.push(await safeQuery("counts", "select (select count(*)::int from pedidos) as pedidos, (select count(*)::int from pedido_detalle) as pedido_detalle, (select count(*)::int from productos) as productos"));
results.push(
  await safeQuery(
    "sample_pedidos",
    "select id_pedido, numero_ticket, id_cliente, id_sede, estado, total, fecha from pedidos order by fecha desc limit 8"
  )
);
results.push(
  await safeQuery(
    "tables",
    "select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by table_name"
  )
);
results.push(
  await safeQuery(
    "pedidos_columns",
    "select column_name, data_type from information_schema.columns where table_schema='public' and table_name='pedidos' order by ordinal_position"
  )
);
results.push(
  await safeQuery(
    "pedido_detalle_columns",
    "select column_name, data_type from information_schema.columns where table_schema='public' and table_name='pedido_detalle' order by ordinal_position"
  )
);
results.push(
  await safeQuery(
    "n8n_chat_histories_columns",
    "select column_name, data_type from information_schema.columns where table_schema='public' and table_name='n8n_chat_histories' order by ordinal_position"
  )
);
results.push(
  await safeQuery(
    "meta_messages_columns",
    "select column_name, data_type from information_schema.columns where table_schema='public' and table_name='meta_messages' order by ordinal_position"
  )
);
results.push(
  await safeQuery(
    "meta_conversations_columns",
    "select column_name, data_type from information_schema.columns where table_schema='public' and table_name='meta_conversations' order by ordinal_position"
  )
);
results.push(
  await safeQuery(
    "n8n_message_shape",
    "select jsonb_typeof(message) as type, count(*)::int as count from n8n_chat_histories group by jsonb_typeof(message) order by count desc"
  )
);
results.push(
  await safeQuery(
    "n8n_sample_keys",
    "select id, created_at, (select array_agg(key order by key) from jsonb_object_keys(message) as key) as keys from n8n_chat_histories where jsonb_typeof(message)='object' order by id desc limit 8"
  )
);
results.push(
  await safeQuery(
    "n8n_tool_call_names",
    "select distinct (tc->>'name') as name from n8n_chat_histories, jsonb_array_elements(message->'tool_calls') tc where jsonb_typeof(message)='object' and message ? 'tool_calls' and jsonb_typeof(message->'tool_calls')='array' order by name"
  )
);
results.push(await safeQuery(
  "top_by_subtotal",
  "select p.id_producto, p.nombre, sum(pd.cantidad)::int as total_vendido, sum(pd.subtotal::numeric) as total_ingreso from pedido_detalle pd join productos p on pd.id_producto=p.id_producto group by p.id_producto, p.nombre order by total_vendido desc limit 5"
));
results.push(await safeQuery(
  "top_by_unit",
  "select p.id_producto, p.nombre, sum(pd.cantidad)::int as total_vendido, sum((pd.precio_unitario::numeric*pd.cantidad)) as total_ingreso from pedido_detalle pd join productos p on pd.id_producto=p.id_producto group by p.id_producto, p.nombre order by total_vendido desc limit 5"
));
results.push(await safeQuery(
  "sample_detalle",
  "select id_detalle, id_pedido, id_producto, cantidad, precio_unitario, subtotal from pedido_detalle order by id_detalle desc limit 5"
));

try {
  console.log(JSON.stringify(results, null, 2));
} finally {
  await pool.end().catch(() => null);
}
