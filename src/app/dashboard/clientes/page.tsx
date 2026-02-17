"use client";

import { useEffect, useState } from "react";

interface ClienteResumen {
    id: number;
    nombre: string;
    telefono: string | null;
    totalPedidos: number;
    pedidosCancelados: number;
    ultimoPedido: string | null;
}

function formatRelative(dateInput?: string | null) {
    if (!dateInput) return "Sin pedidos";
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return "Sin pedidos";
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const dayMs = 1000 * 60 * 60 * 24;
    if (diff < dayMs && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    }
    if (diff < dayMs * 2) return "ayer";
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export default function ClientesPage() {
    const [clientes, setClientes] = useState<ClienteResumen[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [savingId, setSavingId] = useState<number | null>(null);

    const fetchClientes = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/clientes", { cache: "no-store" });
            if (!res.ok) {
                let backendMessage = "No pudimos cargar los clientes";
                try {
                    const errorData = await res.json();
                    if (typeof errorData?.error === "string") {
                        backendMessage = errorData.error;
                    }
                } catch {
                    // noop
                }
                setClientes([]);
                setError(backendMessage);
                return;
            }
            const data = await res.json();
            setClientes(data.clientes || []);
            setError(null);
        } catch {
            setClientes([]);
            setError("No pudimos cargar los clientes");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClientes();
    }, []);

    const handleEditar = async (cliente: ClienteResumen) => {
        const nombreActual = cliente.nombre || "";
        const telefonoActual = cliente.telefono || "";

        const nuevoNombre = window.prompt("Editar nombre", nombreActual);
        if (nuevoNombre === null) return;

        const nuevoTelefono = window.prompt("Editar teléfono", telefonoActual);
        if (nuevoTelefono === null) return;

        try {
            setError(null);
            setSavingId(cliente.id);
            const res = await fetch("/api/clientes", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: cliente.id,
                    nombre: nuevoNombre,
                    telefono: nuevoTelefono,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(typeof data?.error === "string" ? data.error : "No se pudo editar");
            }

            await fetchClientes();
        } catch (err) {
            setError(err instanceof Error ? err.message : "No se pudo editar el cliente");
        } finally {
            setSavingId(null);
        }
    };

    const handleEliminar = async (cliente: ClienteResumen) => {
        const ok = window.confirm(`¿Eliminar a ${cliente.nombre}?`);
        if (!ok) return;

        try {
            setError(null);
            setSavingId(cliente.id);
            const res = await fetch("/api/clientes", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: cliente.id }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(typeof data?.error === "string" ? data.error : "No se pudo eliminar");
            }

            await fetchClientes();
        } catch (err) {
            setError(err instanceof Error ? err.message : "No se pudo eliminar el cliente");
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div className="space-y-6 animate-in">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-surface-50">Clientes</h1>
                    <p className="text-surface-400 text-sm mt-1">Listado de clientes registrados en la base de datos.</p>
                </div>
                <button
                    onClick={fetchClientes}
                    disabled={loading}
                    className={`px-3 py-2 rounded-md text-xs border ${
                        loading
                            ? "border-surface-800/20 text-surface-500 cursor-not-allowed"
                            : "border-surface-800/30 text-surface-300 hover:text-surface-50"
                    }`}
                >
                    Actualizar
                </button>
            </div>

            <div className="glass-card overflow-hidden">
                {error && (
                    <div className="px-5 py-3 text-xs text-primary-600 bg-primary-500/10 border-b border-primary-500/20">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="p-6 text-sm text-surface-400">Cargando clientes...</div>
                ) : clientes.length === 0 ? (
                    <div className="p-6 text-sm text-surface-400">No hay clientes para mostrar.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-[11px] uppercase tracking-[0.2em] text-surface-500 border-b border-surface-800/20">
                                    <th className="text-left font-medium px-5 py-3">Cliente</th>
                                    <th className="text-left font-medium px-5 py-3">Teléfono</th>
                                    <th className="text-left font-medium px-5 py-3">Pedidos</th>
                                    <th className="text-left font-medium px-5 py-3">Último pedido</th>
                                    <th className="text-right font-medium px-5 py-3">Estado</th>
                                    <th className="text-right font-medium px-5 py-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientes.map((cliente) => (
                                    <tr key={cliente.id} className="border-b border-surface-800/15 last:border-b-0">
                                        <td className="px-5 py-3 text-surface-100 font-semibold">{cliente.nombre || "Sin nombre"}</td>
                                        <td className="px-5 py-3 text-surface-400">{cliente.telefono || "—"}</td>
                                        <td className="px-5 py-3 text-surface-300">{cliente.totalPedidos}</td>
                                        <td className="px-5 py-3 text-surface-300">{formatRelative(cliente.ultimoPedido)}</td>
                                        <td className="px-5 py-3 text-right">
                                            <span
                                                className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${
                                                    cliente.pedidosCancelados > 0
                                                        ? "bg-amber-500/15 text-amber-600"
                                                        : "bg-emerald-500/15 text-emerald-700"
                                                }`}
                                            >
                                                {cliente.pedidosCancelados > 0
                                                    ? `${cliente.pedidosCancelados} cancelados`
                                                    : "Sin cancelaciones"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <div className="inline-flex gap-2">
                                                <button
                                                    onClick={() => handleEditar(cliente)}
                                                    disabled={savingId === cliente.id}
                                                    className="px-2.5 py-1 rounded-md border border-surface-800/30 text-[11px] text-surface-400 hover:text-surface-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleEliminar(cliente)}
                                                    disabled={savingId === cliente.id}
                                                    className="px-2.5 py-1 rounded-md border border-primary-500/40 text-[11px] text-primary-600 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
