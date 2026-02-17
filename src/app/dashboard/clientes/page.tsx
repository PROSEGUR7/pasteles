"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ClienteResumen {
    id: number;
    nombre: string;
    telefono: string | null;
    totalPedidos: number;
    pedidosCancelados: number;
    ultimoPedido: string | null;
    botStatus?: "activo" | "inactivo" | null;
}

type PedidoResumen = {
    id_pedido: number;
    fecha: string;
    estado: string;
    total?: number | null;
};

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
    const [menuAbiertoId, setMenuAbiertoId] = useState<number | null>(null);
    const accionesRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    const [editando, setEditando] = useState<ClienteResumen | null>(null);
    const [eliminando, setEliminando] = useState<ClienteResumen | null>(null);
    const [viendoPerfil, setViendoPerfil] = useState<ClienteResumen | null>(null);
    const [perfilPedidos, setPerfilPedidos] = useState<PedidoResumen[]>([]);
    const [perfilLoading, setPerfilLoading] = useState(false);
    const [editNombre, setEditNombre] = useState("");
    const [editTelefono, setEditTelefono] = useState("");
    const [portalReady, setPortalReady] = useState(false);

    const accionesRefCallback = useMemo(() => {
        return (id: number) => (node: HTMLDivElement | null) => {
            const map = accionesRefs.current;
            if (!node) {
                map.delete(id);
                return;
            }
            map.set(id, node);
        };
    }, []);

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

    useEffect(() => {
        setPortalReady(true);
    }, []);

    useEffect(() => {
        if (menuAbiertoId === null) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node | null;
            if (!target) return;
            const container = accionesRefs.current.get(menuAbiertoId);
            if (container && container.contains(target)) return;
            setMenuAbiertoId(null);
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuAbiertoId]);

    const abrirEditar = (cliente: ClienteResumen) => {
        setError(null);
        setMenuAbiertoId(null);
        setEditando(cliente);
        setEditNombre(cliente.nombre || "");
        setEditTelefono(cliente.telefono || "");
    };

    const cancelarEditar = () => {
        setEditando(null);
        setEditNombre("");
        setEditTelefono("");
    };

    const confirmarEditar = async () => {
        if (!editando) return;

        const nombre = editNombre.trim();
        if (!nombre) {
            setError("El nombre es requerido");
            return;
        }

        try {
            setError(null);
            setSavingId(editando.id);
            const res = await fetch("/api/clientes", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: editando.id,
                    nombre,
                    telefono: editTelefono.trim(),
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(typeof data?.error === "string" ? data.error : "No se pudo editar");
            }

            cancelarEditar();
            await fetchClientes();
        } catch (err) {
            setError(err instanceof Error ? err.message : "No se pudo editar el cliente");
        } finally {
            setSavingId(null);
        }
    };

    const abrirEliminar = (cliente: ClienteResumen) => {
        setError(null);
        setMenuAbiertoId(null);
        setEliminando(cliente);
    };

    const abrirPerfil = async (cliente: ClienteResumen) => {
        setError(null);
        setMenuAbiertoId(null);
        setViendoPerfil(cliente);
        setPerfilPedidos([]);

        try {
            setPerfilLoading(true);
            const res = await fetch(`/api/pedidos?cliente=${encodeURIComponent(String(cliente.id))}&limit=10&page=1`, {
                cache: "no-store",
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(typeof data?.error === "string" ? data.error : "No se pudieron cargar los pedidos");
            }
            const data = await res.json();
            setPerfilPedidos((data.pedidos || []) as PedidoResumen[]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "No se pudieron cargar los pedidos");
        } finally {
            setPerfilLoading(false);
        }
    };

    const cerrarPerfil = () => {
        setViendoPerfil(null);
        setPerfilPedidos([]);
        setPerfilLoading(false);
    };

    const cancelarEliminar = () => {
        setEliminando(null);
    };

    const confirmarEliminar = async () => {
        if (!eliminando) return;

        try {
            setError(null);
            setSavingId(eliminando.id);
            const res = await fetch("/api/clientes", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: eliminando.id }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(typeof data?.error === "string" ? data.error : "No se pudo eliminar");
            }

            cancelarEliminar();
            await fetchClientes();
        } catch (err) {
            setError(err instanceof Error ? err.message : "No se pudo eliminar el cliente");
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div className="space-y-6 animate-in">
            {portalReady && (editando || eliminando || viendoPerfil)
                ? createPortal(
                      <div
                          className="fixed inset-0 z-50 flex items-center justify-center p-4"
                          role="dialog"
                          aria-modal="true"
                          onMouseDown={() => {
                              if (savingId) return;
                              if (editando) cancelarEditar();
                              if (eliminando) cancelarEliminar();
                              if (viendoPerfil) cerrarPerfil();
                          }}
                      >
                          <div className="absolute inset-0 bg-surface-50/50" />
                          <div
                              className="relative w-full max-w-2xl glass-card-light p-5 max-h-[85vh] overflow-y-auto"
                              onMouseDown={(e) => e.stopPropagation()}
                          >
                              <div className="flex items-start justify-between gap-4">
                                  <div>
                                      <p className="text-xs uppercase tracking-[0.2em] text-surface-500">
                                          {editando
                                              ? "Editar cliente"
                                              : eliminando
                                                ? "Eliminar cliente"
                                                : "Perfil"}
                                      </p>
                                      <h2 className="text-lg font-semibold text-surface-100 mt-1">
                                          {editando
                                              ? "Actualizar datos"
                                              : eliminando
                                                ? "Confirmar eliminación"
                                                : "Detalle del cliente"}
                                      </h2>
                                  </div>
                                  <button
                                      type="button"
                                      onClick={() => {
                                          if (savingId) return;
                                          if (editando) cancelarEditar();
                                          if (eliminando) cancelarEliminar();
                                          if (viendoPerfil) cerrarPerfil();
                                      }}
                                      className="h-9 w-9 rounded-md border border-surface-800/20 text-surface-500 hover:text-surface-50"
                                      aria-label="Cerrar"
                                  >
                                      ✕
                                  </button>
                              </div>

                              {editando ? (
                                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div>
                                          <label className="text-[11px] uppercase tracking-[0.2em] text-surface-500">
                                              Nombre
                                          </label>
                                          <input
                                              value={editNombre}
                                              onChange={(e) => setEditNombre(e.target.value)}
                                              className="input-field mt-2"
                                              placeholder="Nombre"
                                              disabled={savingId === editando.id}
                                              autoFocus
                                          />
                                      </div>
                                      <div>
                                          <label className="text-[11px] uppercase tracking-[0.2em] text-surface-500">
                                              Teléfono
                                          </label>
                                          <input
                                              value={editTelefono}
                                              onChange={(e) => setEditTelefono(e.target.value)}
                                              className="input-field mt-2"
                                              placeholder="Teléfono"
                                              disabled={savingId === editando.id}
                                          />
                                      </div>
                                  </div>
                              ) : eliminando ? (
                                  <div className="mt-4 text-sm text-surface-400">
                                      ¿Seguro que quieres eliminar a{" "}
                                      <span className="font-semibold text-surface-100">
                                          {eliminando?.nombre || "este cliente"}
                                      </span>
                                      ?
                                      <p className="text-[11px] mt-2">
                                          Si tiene pedidos asociados, el sistema no permitirá eliminarlo.
                                      </p>
                                  </div>
                              ) : (
                                  <div className="mt-4 space-y-4">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                          <div className="rounded-xl border border-surface-800/15 bg-white/70 p-3">
                                              <p className="text-[11px] uppercase tracking-[0.2em] text-surface-500">
                                                  Nombre
                                              </p>
                                              <p className="text-surface-100 font-semibold mt-1">
                                                  {viendoPerfil?.nombre || "—"}
                                              </p>
                                          </div>
                                          <div className="rounded-xl border border-surface-800/15 bg-white/70 p-3">
                                              <p className="text-[11px] uppercase tracking-[0.2em] text-surface-500">
                                                  Teléfono
                                              </p>
                                              <p className="text-surface-100 font-semibold mt-1">
                                                  {viendoPerfil?.telefono || "—"}
                                              </p>
                                          </div>
                                          <div className="rounded-xl border border-surface-800/15 bg-white/70 p-3">
                                              <p className="text-[11px] uppercase tracking-[0.2em] text-surface-500">
                                                  Pedidos
                                              </p>
                                              <p className="text-surface-100 font-semibold mt-1">
                                                  {viendoPerfil?.totalPedidos ?? 0}
                                              </p>
                                          </div>
                                          <div className="rounded-xl border border-surface-800/15 bg-white/70 p-3">
                                              <p className="text-[11px] uppercase tracking-[0.2em] text-surface-500">
                                                  Último pedido
                                              </p>
                                              <p className="text-surface-100 font-semibold mt-1">
                                                  {formatRelative(viendoPerfil?.ultimoPedido || null)}
                                              </p>
                                          </div>
                                      </div>

                                      <div>
                                          <p className="text-[11px] uppercase tracking-[0.2em] text-surface-500">
                                              Pedidos recientes
                                          </p>
                                          <div className="mt-2 rounded-xl border border-surface-800/15 bg-white/70 overflow-hidden">
                                              {perfilLoading ? (
                                                  <div className="p-3 text-sm text-surface-400">Cargando pedidos...</div>
                                              ) : perfilPedidos.length === 0 ? (
                                                  <div className="p-3 text-sm text-surface-400">Sin pedidos para mostrar.</div>
                                              ) : (
                                                  <div className="divide-y divide-surface-800/10">
                                                      {perfilPedidos.map((p) => (
                                                          <div
                                                              key={p.id_pedido}
                                                              className="p-3 flex items-center justify-between gap-3"
                                                          >
                                                              <div>
                                                                  <p className="text-sm font-semibold text-surface-100">
                                                                      #{p.id_pedido}
                                                                  </p>
                                                                  <p className="text-[11px] text-surface-400">
                                                                      {formatRelative(p.fecha)}
                                                                  </p>
                                                              </div>
                                                              <div className="text-right">
                                                                  <p className="text-xs text-surface-500">{p.estado}</p>
                                                              </div>
                                                          </div>
                                                      ))}
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                  </div>
                              )}

                              {error && (
                                  <div className="mt-4 text-xs text-primary-600 bg-primary-500/10 border border-primary-500/30 rounded-md px-3 py-2">
                                      {error}
                                  </div>
                              )}

                              <div className="mt-5 flex items-center justify-end gap-2">
                                  <button
                                      type="button"
                                      onClick={() => {
                                          if (savingId) return;
                                          if (editando) cancelarEditar();
                                          if (eliminando) cancelarEliminar();
                                          if (viendoPerfil) cerrarPerfil();
                                      }}
                                      className="px-4 py-2 rounded-md border border-surface-800/30 text-sm text-surface-400 hover:text-surface-50"
                                      disabled={Boolean(savingId)}
                                  >
                                      {viendoPerfil ? "Cerrar" : "Cancelar"}
                                  </button>
                                  {!viendoPerfil && (
                                      <button
                                          type="button"
                                          onClick={editando ? confirmarEditar : confirmarEliminar}
                                          className="btn-primary"
                                          disabled={Boolean(savingId)}
                                      >
                                          {savingId ? "Guardando..." : editando ? "Guardar" : "Eliminar"}
                                      </button>
                                  )}
                              </div>
                          </div>
                      </div>,
                      document.body
                  )
                : null}

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
                                    <th className="text-right font-medium px-5 py-3">Atención</th>
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
                                            <span
                                                className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${
                                                    cliente.botStatus === "inactivo"
                                                        ? "bg-blue-500/15 text-blue-700"
                                                        : cliente.botStatus === "activo"
                                                            ? "bg-emerald-500/15 text-emerald-700"
                                                            : "bg-surface-900/10 text-surface-500"
                                                }`}
                                            >
                                                {cliente.botStatus === "inactivo"
                                                    ? "Humano"
                                                    : cliente.botStatus === "activo"
                                                        ? "IA"
                                                        : "—"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <div
                                                ref={accionesRefCallback(cliente.id)}
                                                className="relative inline-flex items-center justify-end"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMenuAbiertoId((prev) => (prev === cliente.id ? null : cliente.id));
                                                    }}
                                                    disabled={savingId === cliente.id}
                                                    className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-surface-800/30 text-surface-400 hover:text-surface-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    aria-label="Acciones"
                                                    aria-haspopup="menu"
                                                    aria-expanded={menuAbiertoId === cliente.id}
                                                >
                                                    <svg
                                                        width="16"
                                                        height="16"
                                                        viewBox="0 0 24 24"
                                                        fill="currentColor"
                                                        className="opacity-80"
                                                    >
                                                        <circle cx="12" cy="5" r="2" />
                                                        <circle cx="12" cy="12" r="2" />
                                                        <circle cx="12" cy="19" r="2" />
                                                    </svg>
                                                </button>

                                                {menuAbiertoId === cliente.id && (
                                                    <div
                                                        role="menu"
                                                        className="absolute right-0 top-10 z-20 w-36 overflow-hidden rounded-xl border border-surface-800/20 bg-white shadow-sm"
                                                    >
                                                        <button
                                                            role="menuitem"
                                                            type="button"
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                setMenuAbiertoId(null);
                                                                await abrirPerfil(cliente);
                                                            }}
                                                            disabled={savingId === cliente.id}
                                                            className="w-full px-3 py-2 text-left text-xs text-surface-600 hover:bg-primary-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            Ver perfil
                                                        </button>
                                                        <button
                                                            role="menuitem"
                                                            type="button"
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                setMenuAbiertoId(null);
                                                                abrirEditar(cliente);
                                                            }}
                                                            disabled={savingId === cliente.id}
                                                            className="w-full px-3 py-2 text-left text-xs text-surface-600 hover:bg-primary-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            role="menuitem"
                                                            type="button"
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                setMenuAbiertoId(null);
                                                                abrirEliminar(cliente);
                                                            }}
                                                            disabled={savingId === cliente.id}
                                                            className="w-full px-3 py-2 text-left text-xs text-primary-600 hover:bg-primary-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                )}
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
