export async function fireWebhook(payload: Record<string, unknown>) {
    const url = process.env.N8N_WEBHOOK_URL;
    if (!url) {
        console.log('[Webhook] N8N_WEBHOOK_URL not configured, skipping.');
        return;
    }
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...payload,
                timestamp: new Date().toISOString(),
                source: 'pasteles-admin',
            }),
        });
        console.log('[Webhook] Fired successfully to n8n');
    } catch (err) {
        console.error('[Webhook] Error firing webhook:', err);
    }
}
