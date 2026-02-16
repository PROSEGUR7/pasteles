import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

function timingSafeEqualHex(a: string, b: string) {
    const bufferA = Buffer.from(a, "hex");
    const bufferB = Buffer.from(b, "hex");
    if (bufferA.length !== bufferB.length) return false;
    return crypto.timingSafeEqual(bufferA, bufferB);
}

function validateSignature(rawBody: string, signatureHeader: string | null, appSecret?: string) {
    if (!appSecret) return true;
    if (!signatureHeader) return false;

    const [algo, signature] = signatureHeader.split("=");
    if (algo !== "sha256" || !signature) return false;

    const expected = crypto
        .createHmac("sha256", appSecret)
        .update(rawBody)
        .digest("hex");

    return timingSafeEqualHex(expected, signature);
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    const verifyToken = process.env.META_VERIFY_TOKEN;

    if (mode === "subscribe" && token && verifyToken && token === verifyToken) {
        return new NextResponse(challenge || "", { status: 200 });
    }

    return NextResponse.json(
        {
            error: "Webhook verification failed",
            hint: "Configura META_VERIFY_TOKEN y usa el mismo valor en Meta",
        },
        { status: 403 }
    );
}

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();
        const signatureHeader = request.headers.get("x-hub-signature-256");
        const appSecret = process.env.META_APP_SECRET;

        const signatureOk = validateSignature(rawBody, signatureHeader, appSecret);
        if (!signatureOk) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        let payload: unknown;
        try {
            payload = JSON.parse(rawBody);
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        console.log("[Meta Webhook] Payload recibido:", JSON.stringify(payload));

        return NextResponse.json({ received: true }, { status: 200 });
    } catch (error) {
        console.error("[Meta Webhook] Error:", error);
        return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
    }
}
