"use client";
import { useMemo, useState } from "react";

interface Conversacion {
    id: number;
    nombre: string;
    ultimoMensaje: string;
    hora: string;
    noLeidos: number;
}

const CONVERSACIONES: Conversacion[] = [
    { id: 1, nombre: "Erik Taveras", ultimoMensaje: "Generando respuesta para tu pedido.", hora: "ahora", noLeidos: 1 },
    { id: 2, nombre: "Carlos", ultimoMensaje: "Hola Carlos, te hablo por el pedido de hoy.", hora: "00:24", noLeidos: 0 },
    { id: 3, nombre: "Jairo", ultimoMensaje: "Gracias por tu interés en Juan Pastel.", hora: "ayer", noLeidos: 1 },
    { id: 4, nombre: "Yukata Yokoyama", ultimoMensaje: "¡Genial! Te envío la información completa.", hora: "ayer", noLeidos: 1 },
    { id: 5, nombre: "Brian Jose Lopez Silva", ultimoMensaje: "Con gusto, ¿me confirmas la sede?", hora: "ayer", noLeidos: 1 },
    { id: 6, nombre: "Raysa Taveras", ultimoMensaje: "¡Hola! ¿Cómo estás? Si necesitas apoyo, aquí estoy.", hora: "ayer", noLeidos: 1 },
];

export default function ConversacionesPage() {
    const [busqueda, setBusqueda] = useState("");
    const [seleccionada, setSeleccionada] = useState<number | null>(null);

    const conversacionesFiltradas = useMemo(() => {
        const term = busqueda.trim().toLowerCase();
        if (!term) return CONVERSACIONES;
        return CONVERSACIONES.filter((c) =>
            c.nombre.toLowerCase().includes(term) || c.ultimoMensaje.toLowerCase().includes(term)
        );
    }, [busqueda]);

    return (
        <div className="space-y-6">
            <div className="animate-in">
                <h1 className="text-2xl font-bold text-surface-50">Conversaciones</h1>
                <p className="text-surface-400 text-sm mt-1">Centro de chats con clientes</p>
            </div>

            <div className="glass-card overflow-hidden min-h-[70vh] animate-in" style={{ animationDelay: "100ms" }}>
                <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] min-h-[70vh]">
                    <aside className="border-r border-surface-800/30 bg-white/40">
                        <div className="p-4 border-b border-surface-800/20 space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-surface-100">Chats</h2>
                                <span className="text-xs text-surface-500">{conversacionesFiltradas.length}</span>
                            </div>

                            <div className="relative">
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500"
                                >
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.3-4.3" />
                                </svg>
                                <input
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    className="input-field pl-9 text-sm"
                                    placeholder="Buscar por nombre o mensaje..."
                                />
                            </div>
                        </div>

                        <div className="divide-y divide-surface-800/20">
                            {conversacionesFiltradas.map((conversacion) => {
                                const activo = seleccionada === conversacion.id;
                                return (
                                    <button
                                        key={conversacion.id}
                                        onClick={() => setSeleccionada(conversacion.id)}
                                        className={`w-full text-left px-4 py-3 transition-colors ${activo ? "bg-primary-500/10" : "hover:bg-primary-500/5"}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                                                {conversacion.nombre.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-semibold text-surface-100 truncate">{conversacion.nombre}</p>
                                                    <span className="text-[10px] text-surface-500 shrink-0">{conversacion.hora}</span>
                                                </div>
                                                <p className="text-xs text-surface-500 truncate mt-0.5">Tú: {conversacion.ultimoMensaje}</p>
                                            </div>
                                            {conversacion.noLeidos > 0 && (
                                                <span className="shrink-0 w-5 h-5 rounded-full bg-primary-500/20 text-primary-600 text-[10px] font-bold flex items-center justify-center">
                                                    {conversacion.noLeidos}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}

                            {conversacionesFiltradas.length === 0 && (
                                <div className="p-6 text-center text-surface-500 text-sm">
                                    No se encontraron conversaciones
                                </div>
                            )}
                        </div>
                    </aside>

                    <section className="relative bg-white/30">
                        {seleccionada ? (
                            <div className="h-full flex flex-col">
                                <div className="px-6 py-4 border-b border-surface-800/20 bg-white/40">
                                    <p className="text-sm font-semibold text-surface-100">
                                        {CONVERSACIONES.find((c) => c.id === seleccionada)?.nombre}
                                    </p>
                                    <p className="text-xs text-surface-500">Conversación activa</p>
                                </div>
                                <div className="flex-1 p-6 flex items-center justify-center">
                                    <div className="text-center text-surface-500">
                                        <p className="text-sm">Vista de conversación lista para integrar mensajes reales.</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center p-8">
                                <div className="text-center">
                                    <div className="w-20 h-20 rounded-2xl bg-surface-800/60 flex items-center justify-center mx-auto mb-4">
                                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="text-surface-500">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-surface-100">Selecciona una conversación</h3>
                                    <p className="text-sm text-surface-500 mt-2">Elige un contacto para ver su conversación.</p>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
