function getWebhookUrl() {
    return (
        process.env.N8N_WEBHOOK_URL ||
        process.env.N8NWEBHOOKURL ||
        process.env.N8N_WEBHOOK_TEST_URL ||
        process.env.N8N_WEBHOOK
    );
}

export async function fireWebhook(payload: Record<string, unknown>) {
    const url = getWebhookUrl();
    if (!url) {
        console.log('[Webhook] N8N webhook URL not configured, skipping.');
        return;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...payload,
            timestamp: new Date().toISOString(),
            source: 'pasteles-admin',
        }),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Webhook relay failed (${response.status}): ${text}`);
    }

    console.log('[Webhook] Fired successfully to n8n');
}
