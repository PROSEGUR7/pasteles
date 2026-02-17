"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type FiltroCanal = "Todos" | "WhatsApp" | "Instagram" | "Web";

interface ConversationSummary {
    waId: string;
    nombre: string;
    canal: string;
    lastMessage: string | null;
    lastMessageAt: string | null;
    unreadCount: number;
    estado: "abierto" | "cerrado";
    botStatus: "activo" | "inactivo";
}

interface ConversationMessage {
    messageId: string;
    direction: "inbound" | "outbound";
    body: string | null;
    timestamp: string;
    senderType: "ia" | "humano" | "cliente" | "sistema";
    interventionStatus: "activo" | "inactivo" | null;
    source: "meta" | "n8n";
}

const FILTROS: FiltroCanal[] = ["Todos", "WhatsApp", "Instagram", "Web"];

function formatRelative(dateInput?: string | null) {
    if (!dateInput) return "";
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return "";
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const dayMs = 1000 * 60 * 60 * 24;
    if (diff < dayMs && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    }
    if (diff < dayMs * 2) return "ayer";
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function formatHour(dateInput?: string | null) {
    if (!dateInput) return "";
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function getSenderLabel(senderType: ConversationMessage["senderType"]) {
    if (senderType === "ia") return "IA";
    if (senderType === "humano") return "Humano";
    if (senderType === "cliente") return "Cliente";
    return "Sistema";
}

function getSenderBadgeClass(senderType: ConversationMessage["senderType"]) {
    if (senderType === "ia") return "bg-emerald-500/15 text-emerald-700";
    if (senderType === "humano") return "bg-blue-500/15 text-blue-700";
    if (senderType === "cliente") return "bg-surface-900/10 text-surface-500";
    return "bg-violet-500/15 text-violet-700";
}

export default function ConversacionesPage() {
    const [conversaciones, setConversaciones] = useState<ConversationSummary[]>([]);
    const [mensajes, setMensajes] = useState<ConversationMessage[]>([]);
    const [busqueda, setBusqueda] = useState("");
    const [filtro, setFiltro] = useState<FiltroCanal>("Todos");
    const [seleccionada, setSeleccionada] = useState<string | null>(null);
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [loadingMensajes, setLoadingMensajes] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [closingChat, setClosingChat] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [updatingBot, setUpdatingBot] = useState(false);
    const [draftMessage, setDraftMessage] = useState("");

    const fetchConversaciones = useCallback(
        async (silent = false) => {
            try {
                if (!silent) setLoadingConvs(true);
                const query = filtro !== "Todos" ? `?canal=${encodeURIComponent(filtro)}` : "";
                const res = await fetch(`/api/conversaciones${query}`, { cache: "no-store" });
                if (!res.ok) throw new Error("Error cargando conversaciones");
                const data = await res.json();
                setConversaciones(data.conversations || []);
                setError(null);
            } catch (err) {
                console.error("[Conversaciones] Fetch error", err);
                setError("No pudimos cargar las conversaciones");
            } finally {
                if (!silent) setLoadingConvs(false);
            }
        },
        [filtro]
    );

    const fetchMensajes = useCallback(
        async (waId: string) => {
            try {
                setLoadingMensajes(true);
                const encodedWaId = encodeURIComponent(waId);
                const res = await fetch(`/api/conversaciones/${encodedWaId}`, { cache: "no-store" });
                if (!res.ok) throw new Error("Error cargando mensajes");
                const data = await res.json();
                setMensajes(data.messages || []);
                await fetch(`/api/conversaciones/${encodedWaId}`, { method: "PATCH" });
                fetchConversaciones(true);
            } catch (err) {
                console.error("[Conversaciones] Mensajes error", err);
            } finally {
                setLoadingMensajes(false);
            }
        },
        [fetchConversaciones]
    );

    const handleSeleccion = useCallback(
        (waId: string) => {
            setSeleccionada(waId);
            fetchMensajes(waId);
        },
        [fetchMensajes]
    );

    const conversacionActiva = conversaciones.find((c) => c.waId === seleccionada) || null;
    const botActivo = conversacionActiva?.botStatus === "activo";
    const inputBloqueado = !conversacionActiva || conversacionActiva.estado === "cerrado" || botActivo;

    const handleCerrarChat = useCallback(async () => {
        if (!seleccionada || closingChat) return;
        try {
            setActionError(null);
            setClosingChat(true);
            const encodedWaId = encodeURIComponent(seleccionada);
            const res = await fetch(`/api/conversaciones/${encodedWaId}`, { method: "DELETE" });
            if (!res.ok) {
                let backendMessage = "Error cerrando la conversación";
                try {
                    const data = await res.json();
                    if (typeof data?.error === "string") backendMessage = data.error;
                } catch {
                    // noop
                }
                throw new Error(backendMessage);
            }

            setConversaciones((prev) =>
                prev.map((conversation) =>
                    conversation.waId === seleccionada
                        ? { ...conversation, estado: "cerrado" }
                        : conversation
                )
            );
            setMensajes([]);
            setSeleccionada(null);
            setDraftMessage("");
            fetchConversaciones(true);
        } catch (err) {
            console.error("[Conversaciones] Cerrar chat", err);
            setActionError(
                err instanceof Error && err.message
                    ? err.message
                    : "No pudimos cerrar el chat. Intenta nuevamente."
            );
        } finally {
            setClosingChat(false);
        }
    }, [seleccionada, closingChat, fetchConversaciones]);

    const handleToggleBot = useCallback(async () => {
        if (!conversacionActiva || updatingBot) return;
        try {
            setActionError(null);
            setUpdatingBot(true);
            const encodedWaId = encodeURIComponent(conversacionActiva.waId);
            const nextStatus = conversacionActiva.botStatus === "activo" ? "inactivo" : "activo";
            const res = await fetch(`/api/conversaciones/${encodedWaId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ botStatus: nextStatus }),
            });

            if (!res.ok) {
                let backendMessage = "No se pudo actualizar el estado del bot";
                try {
                    const data = await res.json();
                    if (typeof data?.error === "string") backendMessage = data.error;
                } catch {
                    // noop
                }
                throw new Error(backendMessage);
            }

            setConversaciones((prev) =>
                prev.map((c) =>
                    c.waId === conversacionActiva.waId
                        ? {
                            ...c,
                            botStatus: nextStatus,
                        }
                        : c
                )
            );
        } catch (err) {
            console.error("[Conversaciones] Toggle bot", err);
            setActionError(
                err instanceof Error && err.message
                    ? err.message
                    : "No pudimos actualizar el estado del bot."
            );
        } finally {
            setUpdatingBot(false);
        }
    }, [conversacionActiva, updatingBot]);

    useEffect(() => {
        fetchConversaciones();
        const interval = setInterval(() => fetchConversaciones(true), 5000);
        return () => clearInterval(interval);
    }, [fetchConversaciones]);

    useEffect(() => {
        if (!conversaciones.length) {
            setSeleccionada(null);
            setMensajes([]);
            return;
        }
        if (seleccionada && conversaciones.some((c) => c.waId === seleccionada)) return;
        setSeleccionada(null);
        setMensajes([]);
    }, [conversaciones, seleccionada]);

    useEffect(() => {
        setActionError(null);
        setClosingChat(false);
    }, [seleccionada]);

    const conversacionesFiltradas = useMemo(() => {
        const term = busqueda.trim().toLowerCase();
        if (!term) return conversaciones;
        return conversaciones.filter(
            (c) =>
                c.nombre.toLowerCase().includes(term) ||
                (c.lastMessage?.toLowerCase().includes(term) ?? false)
        );
    }, [busqueda, conversaciones]);

    return (
        <div className="h-full flex flex-col gap-4 overflow-y-auto overflow-x-hidden min-h-0 pr-1">
            <div className="animate-in">
                <h1 className="text-3xl font-bold text-surface-50">Conversaciones</h1>
                <p className="text-surface-400 text-sm mt-1">
                    Recibe y responde mensajes de Meta en tiempo real.
                </p>
            </div>

            <div className="glass-card overflow-hidden animate-in flex-1 min-h-0" style={{ animationDelay: "100ms" }}>
                    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] h-full">
                    <aside className="border-r border-surface-800/30 bg-white/50 flex flex-col min-h-0">
                        <div className="p-4 border-b border-surface-800/20 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.2em] text-surface-500">Chats</p>
                                    <h2 className="text-lg font-semibold text-surface-100">
                                        {loadingConvs ? "Cargando..." : `${conversacionesFiltradas.length} activos`}
                                    </h2>
                                </div>
                                <span className="text-[11px] text-surface-400">Actualiza cada 5s</span>
                            </div>

                            <div className="relative">
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"
                                >
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.3-4.3" />
                                </svg>
                                <input
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    className="input-field pl-9 text-sm"
                                    placeholder="Buscar por nombre o mensaje"
                                />
                            </div>

                            <div className="flex gap-2 overflow-x-auto text-xs">
                                {FILTROS.map((opcion) => (
                                    <button
                                        key={opcion}
                                        onClick={() => setFiltro(opcion)}
                                        className={`px-3 py-1.5 rounded-full border text-[11px] ${
                                            filtro === opcion
                                                ? "bg-primary-500 text-white border-primary-500"
                                                : "border-surface-800/30 text-surface-400"
                                        }`}
                                    >
                                        {opcion}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="px-4 py-3 text-xs text-primary-600 bg-primary-500/10 border border-primary-500/30">
                                {error}
                            </div>
                        )}

                        <div className="divide-y divide-surface-800/15 flex-1 overflow-y-auto min-h-0">
                            {conversacionesFiltradas.map((conversacion) => {
                                const activo = seleccionada === conversacion.waId;
                                return (
                                    <button
                                        key={conversacion.waId}
                                        onClick={() => handleSeleccion(conversacion.waId)}
                                        className={`w-full text-left px-4 py-3 transition ${
                                            activo ? "bg-primary-500/10" : "hover:bg-primary-500/5"
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-9 h-9 rounded-full bg-surface-900 text-surface-50 text-xs font-bold flex items-center justify-center uppercase">
                                                {conversacion.nombre
                                                    .split(" ")
                                                    .filter(Boolean)
                                                    .slice(0, 2)
                                                    .map((n) => n[0])
                                                    .join("")}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-semibold text-surface-100 truncate">
                                                        {conversacion.nombre}
                                                    </p>
                                                    <span className="text-[10px] text-surface-500 shrink-0">
                                                        {formatRelative(conversacion.lastMessageAt)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-surface-400 truncate">
                                                    {conversacion.lastMessage || "Sin mensajes"}
                                                </p>
                                                <div className="mt-2 flex items-center gap-2 text-[10px] text-surface-500">
                                                    <span className="inline-flex items-center gap-1">
                                                        <span
                                                            className={`h-2 w-2 rounded-full ${
                                                                conversacion.estado === "cerrado"
                                                                    ? "bg-surface-400"
                                                                    : "bg-emerald-500"
                                                            }`}
                                                        />
                                                        {conversacion.canal}
                                                    </span>
                                                    {conversacion.estado === "cerrado" && (
                                                        <span className="px-2 py-0.5 rounded-full bg-surface-900/10 text-surface-500">
                                                            Cerrado
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {conversacion.unreadCount > 0 && (
                                                <span className="shrink-0 w-5 h-5 rounded-full bg-primary-500 text-white text-[10px] font-semibold flex items-center justify-center">
                                                    {conversacion.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}

                            {!loadingConvs && conversacionesFiltradas.length === 0 && (
                                <div className="p-6 text-center text-surface-500 text-sm">
                                    Aún no hay conversaciones.
                                </div>
                            )}
                        </div>
                    </aside>

                    <section className="relative bg-white/30 flex flex-col min-h-0 overflow-hidden">
                        {conversacionActiva ? (
                            <>
                                <div className="px-6 py-4 border-b border-surface-800/20 bg-white/70 space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-semibold text-surface-100">{conversacionActiva.nombre}</p>
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-surface-400 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <span
                                                        className={`h-2 w-2 rounded-full ${
                                                            conversacionActiva.estado === "cerrado"
                                                                ? "bg-surface-400"
                                                                : "bg-emerald-500"
                                                        }`}
                                                    />
                                                    {conversacionActiva.estado === "cerrado"
                                                        ? "Conversación cerrada"
                                                        : "Conversación activa"}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full bg-surface-900 text-surface-200">
                                                    {conversacionActiva.canal}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 text-xs">
                                            <button className="px-3 py-2 border border-surface-800/30 rounded-md text-surface-400">
                                                Programar
                                            </button>
                                            <button className="px-3 py-2 border border-surface-800/30 rounded-md text-surface-400">
                                                Etiquetar
                                            </button>
                                            <button
                                                onClick={handleCerrarChat}
                                                disabled={closingChat || conversacionActiva.estado === "cerrado"}
                                                className={`px-3 py-2 rounded-md text-white ${
                                                    closingChat || conversacionActiva.estado === "cerrado"
                                                        ? "bg-primary-500/60 cursor-not-allowed"
                                                        : "bg-primary-500 hover:bg-primary-600"
                                                }`}
                                            >
                                                {conversacionActiva.estado === "cerrado"
                                                    ? "Chat cerrado"
                                                    : closingChat
                                                        ? "Cerrando..."
                                                        : "Cerrar chat"}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-3 text-xs">
                                        <div className="flex items-center justify-between gap-4 rounded-2xl border border-surface-800/20 bg-white px-3 py-2 min-w-[220px]">
                                            <div>
                                                <p className="text-[10px] uppercase tracking-[0.2em] text-surface-500">Bot IA</p>
                                                <p className="text-sm font-semibold text-surface-100">
                                                    {botActivo ? "En espera" : "Desactivado"}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleToggleBot}
                                                disabled={updatingBot}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                    botActivo ? "bg-emerald-500" : "bg-surface-700"
                                                } ${
                                                    updatingBot
                                                        ? "opacity-60 cursor-not-allowed"
                                                        : "cursor-pointer"
                                                }`}
                                                aria-label="Activar o desactivar bot"
                                            >
                                                <span
                                                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                                                        botActivo ? "translate-x-5" : "translate-x-1"
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                    {actionError && (
                                        <div className="text-[11px] text-primary-600 bg-primary-500/10 border border-primary-500/30 rounded-md px-3 py-2">
                                            {actionError}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-white/20 min-h-0">
                                    {loadingMensajes && (
                                        <div className="text-center text-xs text-surface-400">Cargando mensajes...</div>
                                    )}
                                    {mensajes.map((mensaje) => (
                                        <div
                                            key={mensaje.messageId}
                                            className={`flex ${mensaje.direction === "outbound" ? "justify-end" : "justify-start"}`}
                                        >
                                            <div
                                                className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                                                    mensaje.direction === "outbound"
                                                        ? "bg-primary-500 text-white"
                                                        : "bg-white border border-surface-800/15 text-surface-100"
                                                }`}
                                            >
                                                <div className="mb-1.5 flex items-center gap-2">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                            mensaje.direction === "outbound"
                                                                ? "bg-white/20 text-white"
                                                                : getSenderBadgeClass(mensaje.senderType)
                                                        }`}
                                                    >
                                                        {getSenderLabel(mensaje.senderType)}
                                                    </span>
                                                    {mensaje.interventionStatus && (
                                                        <span
                                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                                mensaje.interventionStatus === "activo"
                                                                    ? "bg-emerald-500/15 text-emerald-700"
                                                                    : "bg-surface-900/10 text-surface-500"
                                                            }`}
                                                        >
                                                            {mensaje.interventionStatus === "activo" ? "Activo" : "Inactivo"}
                                                        </span>
                                                    )}
                                                </div>
                                                <p>{mensaje.body || "Mensaje sin texto"}</p>
                                                <p
                                                    className={`mt-1 text-[10px] ${
                                                        mensaje.direction === "outbound" ? "text-white/70" : "text-surface-400"
                                                    }`}
                                                >
                                                    {formatHour(mensaje.timestamp)} · {mensaje.source.toUpperCase()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}

                                    {!loadingMensajes && mensajes.length === 0 && (
                                        <div className="text-center text-surface-400 text-sm py-12">
                                            Aún no hay mensajes registrados para este contacto.
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-surface-800/20 bg-white/70 p-4">
                                    <div className="flex gap-3">
                                        <input
                                            value={draftMessage}
                                            onChange={(e) => setDraftMessage(e.target.value)}
                                            className={`flex-1 input-field ${
                                                inputBloqueado ? "bg-surface-100 text-surface-500" : "bg-white"
                                            }`}
                                            placeholder={`Escribe un mensaje para ${conversacionActiva.nombre}`}
                                            disabled={inputBloqueado}
                                        />
                                        <button className="btn-primary whitespace-nowrap" disabled={inputBloqueado}>
                                            Enviar
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-surface-400 mt-2">
                                        {conversacionActiva.estado === "cerrado"
                                            ? "Este chat está cerrado."
                                            : botActivo
                                                ? "Bot IA activo: desactívalo para responder manualmente."
                                                : "Modo manual activo: ya puedes escribir."}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex items-center justify-center p-8">
                                <div className="text-center">
                                    <div className="w-20 h-20 rounded-2xl bg-surface-800/60 flex items-center justify-center mx-auto mb-4">
                                        <svg
                                            width="34"
                                            height="34"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.7"
                                            className="text-surface-500"
                                        >
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-surface-100">Selecciona una conversación</h3>
                                    <p className="text-sm text-surface-500 mt-2">
                                        Elige un contacto del panel izquierdo para ver su chat.
                                    </p>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
