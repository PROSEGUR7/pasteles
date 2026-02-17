"use client";
import { useEffect, useState, useCallback, useRef } from "react";

interface Pedido {
    id_pedido: number;
    numero_ticket: string;
    cliente_nombre: string;
    cliente_telefono: string;
    sede_nombre: string;
    empleado_nombre: string;
    estado: string;
    total: string;
    fecha: string;
}

interface PedidoDetalle {
    pedido: Pedido & {
        cliente_email: string;
        sede_direccion: string;
    };
    detalles: Array<{
        id_detalle: number;
        producto_nombre: string;
        producto_descripcion: string;
        cantidad: number;
        precio_unitario: string;
        subtotal: string;
    }>;
    pagos: Array<{
        id_pago: number;
        metodo_nombre: string;
        monto: string;
        fecha: string;
    }>;
}

type PedidoDetalleResponse = PedidoDetalle | { error: string };

interface Sede {
    id_sede: number;
    nombre: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface CancelAlert {
    id: number;
    ticket: string;
    cliente: string;
}

const formatCOP = (val: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(val);

const ESTADOS = ["pendiente", "enviado", "pagado", "entregado", "cancelado"];

export default function PedidosPage() {
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [sedes, setSedes] = useState<Sede[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [filtroSede, setFiltroSede] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("");
    const [detalle, setDetalle] = useState<PedidoDetalle | null>(null);
    const [detalleOpen, setDetalleOpen] = useState(false);
    const [updatingEstado, setUpdatingEstado] = useState<number | null>(null);
    const [menuAccionesAbierto, setMenuAccionesAbierto] = useState<number | null>(null);
    const [cancelAlert, setCancelAlert] = useState<CancelAlert | null>(null);
    const pedidosEstadoPrevioRef = useRef<Map<number, string>>(new Map());
    const inicializadoRef = useRef(false);

    const reproducirAlertaCancelacion = useCallback(() => {
        const alertAudio = new Audio("/sounds/alert.mp3");
        alertAudio.volume = 1;
        alertAudio.play().catch(() => {
        const audioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!audioContextClass) return;

        const context = new audioContextClass();
        const gain = context.createGain();
        gain.connect(context.destination);
        gain.gain.setValueAtTime(0.0001, context.currentTime);

        const beep1 = context.createOscillator();
        beep1.type = "sine";
        beep1.frequency.setValueAtTime(880, context.currentTime);
        beep1.connect(gain);

        const beep2 = context.createOscillator();
        beep2.type = "sine";
        beep2.frequency.setValueAtTime(660, context.currentTime + 0.15);
        beep2.connect(gain);

        gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.3);

        beep1.start(context.currentTime);
        beep1.stop(context.currentTime + 0.15);
        beep2.start(context.currentTime + 0.15);
        beep2.stop(context.currentTime + 0.3);

        setTimeout(() => {
            context.close().catch(() => { });
        }, 350);
        });
    }, []);

    const fetchPedidos = useCallback(async (page = 1, options?: { silent?: boolean; detectarCancelados?: boolean }) => {
        const silent = options?.silent ?? false;
        const detectarCancelados = options?.detectarCancelados ?? false;
        if (!silent) setLoading(true);
        const params = new URLSearchParams();
        params.set("page", String(page));
        if (filtroSede) params.set("sede", filtroSede);
        if (filtroEstado) params.set("estado", filtroEstado);

        try {
            const res = await fetch(`/api/pedidos?${params}`);
            const data = await res.json();
            const pedidosNuevos: Pedido[] = data.pedidos || [];

            if (detectarCancelados && inicializadoRef.current) {
                const canceladosNuevos = pedidosNuevos.find((pedido) => {
                    const estadoPrevio = pedidosEstadoPrevioRef.current.get(pedido.id_pedido);
                    return estadoPrevio && estadoPrevio !== "cancelado" && pedido.estado === "cancelado";
                });

                if (canceladosNuevos) {
                    setCancelAlert({
                        id: canceladosNuevos.id_pedido,
                        ticket: canceladosNuevos.numero_ticket || `#${canceladosNuevos.id_pedido}`,
                        cliente: canceladosNuevos.cliente_nombre || "Sin cliente",
                    });
                    reproducirAlertaCancelacion();
                }
            }

            pedidosEstadoPrevioRef.current = new Map(pedidosNuevos.map((pedido) => [pedido.id_pedido, pedido.estado]));
            if (!inicializadoRef.current) inicializadoRef.current = true;

            setPedidos(pedidosNuevos);
            setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
        } catch (err) {
            console.error(err);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [filtroSede, filtroEstado, reproducirAlertaCancelacion]);

    useEffect(() => {
        fetch("/api/sedes").then(r => r.json()).then(setSedes).catch(() => { });
    }, []);

    useEffect(() => {
        fetchPedidos(1);
    }, [fetchPedidos]);

    useEffect(() => {
        if (!cancelAlert) return;
        const timeout = setTimeout(() => setCancelAlert(null), 5000);
        return () => clearTimeout(timeout);
    }, [cancelAlert]);

    useEffect(() => {
        const interval = setInterval(() => {
            fetchPedidos(pagination.page, { silent: true, detectarCancelados: true });
        }, 10000);

        return () => clearInterval(interval);
    }, [fetchPedidos, pagination.page]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element | null;
            if (!target?.closest("[data-acciones-container='true']")) {
                setMenuAccionesAbierto(null);
            }
        };

        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    const openDetalle = async (id: number) => {
        try {
            const res = await fetch(`/api/pedidos/${id}`);
            let data: PedidoDetalleResponse = { error: "Respuesta inválida" };
            try {
                data = await res.json();
            } catch {
                setDetalle(null);
                setDetalleOpen(false);
                return;
            }

            if (!res.ok || !("pedido" in data)) {
                setDetalle(null);
                setDetalleOpen(false);
                return;
            }

            setDetalle(data);
            setDetalleOpen(true);
        } catch (err) {
            void err;
            setDetalle(null);
            setDetalleOpen(false);
        }
    };

    const cambiarEstado = async (id: number, nuevoEstado: string) => {
        setUpdatingEstado(id);
        try {
            const pedidoActual = pedidos.find((pedido) => pedido.id_pedido === id);
            const res = await fetch(`/api/pedidos/${id}/estado`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ estado: nuevoEstado }),
            });
            if (res.ok) {
                if (nuevoEstado === "cancelado" && pedidoActual?.estado !== "cancelado") {
                    setCancelAlert({
                        id,
                        ticket: pedidoActual?.numero_ticket || `#${id}`,
                        cliente: pedidoActual?.cliente_nombre || "Sin cliente",
                    });
                    reproducirAlertaCancelacion();
                }
                fetchPedidos(pagination.page);
                setMenuAccionesAbierto(null);
                if (detalle?.pedido && detalle.pedido.id_pedido === id) {
                    setDetalle({
                        ...detalle,
                        pedido: { ...detalle.pedido, estado: nuevoEstado },
                    });
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setUpdatingEstado(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="animate-in">
                <h1 className="text-2xl font-bold text-surface-50">Pedidos</h1>
                <p className="text-surface-400 text-sm mt-1">Gestión y seguimiento de todos los pedidos</p>
            </div>

            {/* Filters */}
            <div className="glass-card p-4 flex flex-wrap items-center gap-4 animate-in" style={{ animationDelay: "100ms" }}>
                <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-500">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    <span className="text-sm text-surface-400">Filtros:</span>
                </div>

                <select value={filtroSede} onChange={(e) => setFiltroSede(e.target.value)} className="select-field">
                    <option value="">Todas las sedes</option>
                    {sedes.map((s) => (
                        <option key={s.id_sede} value={s.id_sede}>{s.nombre}</option>
                    ))}
                </select>

                <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="select-field">
                    <option value="">Todos los estados</option>
                    {ESTADOS.map((e) => (
                        <option key={e} value={e} className="capitalize">{e}</option>
                    ))}
                </select>

                <button
                    onClick={() => { setFiltroSede(""); setFiltroEstado(""); }}
                    className="text-xs text-surface-500 hover:text-primary-400 transition-colors ml-auto"
                >
                    Limpiar filtros
                </button>
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between animate-in" style={{ animationDelay: "150ms" }}>
                <p className="text-sm text-surface-500">{pagination.total} pedidos encontrados</p>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden animate-in" style={{ animationDelay: "200ms" }}>
                {loading ? (
                    <div className="p-6 space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="loading-skeleton h-12 rounded-lg" />
                        ))}
                    </div>
                ) : pedidos.length === 0 ? (
                    <div className="text-center py-16 text-surface-500">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-surface-600">
                            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                            <rect x="9" y="3" width="6" height="4" rx="1" />
                        </svg>
                        <p className="text-sm">No hay pedidos que mostrar</p>
                        <p className="text-xs text-surface-600 mt-1">Ajusta los filtros o espera nuevos pedidos</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-surface-800/50 bg-surface-900/30">
                                    <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider py-3 px-5">Ticket</th>
                                    <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider py-3 px-5">Cliente</th>
                                    <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider py-3 px-5">Sede</th>
                                    <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider py-3 px-5">Estado</th>
                                    <th className="text-right text-xs font-medium text-surface-500 uppercase tracking-wider py-3 px-5">Total</th>
                                    <th className="text-right text-xs font-medium text-surface-500 uppercase tracking-wider py-3 px-5">Fecha</th>
                                    <th className="text-center text-xs font-medium text-surface-500 uppercase tracking-wider py-3 px-5">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-800/20">
                                {pedidos.map((p) => (
                                    <tr key={p.id_pedido} className="table-row">
                                        <td className="py-3.5 px-5">
                                            <span className="text-sm font-semibold text-surface-200">{p.numero_ticket || `#${p.id_pedido}`}</span>
                                        </td>
                                        <td className="py-3.5 px-5">
                                            <div>
                                                <p className="text-sm text-surface-300">{p.cliente_nombre || "Sin cliente"}</p>
                                                {p.cliente_telefono && (
                                                    <p className="text-xs text-surface-500">{p.cliente_telefono}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-5 text-sm text-surface-400">{p.sede_nombre || "—"}</td>
                                        <td className="py-3.5 px-5">
                                            <span className={`badge badge-${p.estado}`}>{p.estado}</span>
                                        </td>
                                        <td className="py-3.5 px-5 text-sm font-semibold text-surface-200 text-right">{formatCOP(parseFloat(p.total))}</td>
                                        <td className="py-3.5 px-5 text-sm text-surface-500 text-right">
                                            {new Date(p.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                        </td>
                                        <td className="py-3.5 px-5 text-center">
                                            <div className="relative inline-block" data-acciones-container="true">
                                                <button
                                                    onClick={() => setMenuAccionesAbierto(menuAccionesAbierto === p.id_pedido ? null : p.id_pedido)}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-surface-500 hover:text-primary-500 hover:bg-primary-500/10 transition-colors"
                                                    aria-label="Abrir acciones"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                        <circle cx="12" cy="5" r="1.8" />
                                                        <circle cx="12" cy="12" r="1.8" />
                                                        <circle cx="12" cy="19" r="1.8" />
                                                    </svg>
                                                </button>

                                                {menuAccionesAbierto === p.id_pedido && (
                                                    <div className="absolute right-0 mt-1 w-44 glass-card-light p-1.5 z-20 border border-surface-800/40">
                                                        <button
                                                            onClick={() => {
                                                                openDetalle(p.id_pedido);
                                                                setMenuAccionesAbierto(null);
                                                            }}
                                                            className="w-full text-left px-3 py-2 rounded-md text-xs text-surface-300 hover:bg-primary-500/10 transition-colors"
                                                        >
                                                            Ver detalle
                                                        </button>

                                                        {ESTADOS.map((estado) => (
                                                            <button
                                                                key={estado}
                                                                onClick={() => cambiarEstado(p.id_pedido, estado)}
                                                                disabled={updatingEstado === p.id_pedido || estado === p.estado}
                                                                className="w-full text-left px-3 py-2 rounded-md text-xs text-surface-300 hover:bg-primary-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                Marcar como {estado}
                                                            </button>
                                                        ))}
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

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-surface-800/30">
                        <p className="text-xs text-surface-500">
                            Página {pagination.page} de {pagination.totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => fetchPedidos(pagination.page - 1)}
                                disabled={pagination.page <= 1}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-800/50 text-surface-300 hover:bg-surface-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => fetchPedidos(pagination.page + 1)}
                                disabled={pagination.page >= pagination.totalPages}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-800/50 text-surface-300 hover:bg-surface-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Slide-Over */}
            {detalleOpen && detalle?.pedido && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDetalleOpen(false)} />
                    <div className="relative w-full max-w-lg bg-surface-900 border-l border-surface-800/50 overflow-y-auto animate-in" style={{ animation: "slideIn 0.3s ease" }}>
                        <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

                        {/* Header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-surface-800/50 bg-surface-900/95 backdrop-blur-sm">
                            <div>
                                <h2 className="text-lg font-bold text-surface-100">Detalle del Pedido</h2>
                                <p className="text-sm text-surface-500">{detalle.pedido.numero_ticket || `#${detalle.pedido.id_pedido}`}</p>
                            </div>
                            <button
                                onClick={() => setDetalleOpen(false)}
                                className="p-2 rounded-lg hover:bg-surface-800 text-surface-400 transition-colors"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Status + Info */}
                            <div className="flex items-center">
                                <span className={`badge badge-${detalle.pedido.estado} text-sm`}>{detalle.pedido.estado}</span>
                            </div>

                            {/* Cliente info */}
                            <div className="glass-card-light p-4 space-y-2">
                                <h4 className="text-xs font-medium text-surface-500 uppercase tracking-wider">Cliente</h4>
                                <p className="text-sm font-medium text-surface-200">{detalle.pedido.cliente_nombre || "Sin nombre"}</p>
                                {detalle.pedido.cliente_telefono && (
                                    <p className="text-xs text-surface-400">📞 {detalle.pedido.cliente_telefono}</p>
                                )}
                                {detalle.pedido.cliente_email && (
                                    <p className="text-xs text-surface-400">✉️ {detalle.pedido.cliente_email}</p>
                                )}
                            </div>

                            {/* Desglose */}
                            <div>
                                <h4 className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-3">Productos</h4>
                                {detalle.detalles.length > 0 ? (
                                    <div className="space-y-2">
                                        {detalle.detalles.map((d) => (
                                            <div key={d.id_detalle} className="glass-card-light p-3 flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-surface-200">{d.producto_nombre}</p>
                                                    <p className="text-xs text-surface-500">{d.cantidad} × {formatCOP(parseFloat(d.precio_unitario))}</p>
                                                </div>
                                                <span className="text-sm font-bold text-primary-400">{formatCOP(parseFloat(d.subtotal))}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-surface-500">Sin detalles de productos</p>
                                )}
                            </div>

                            {/* Total */}
                            <div className="glass-card p-4 flex items-center justify-between">
                                <span className="text-sm font-medium text-surface-300">Total</span>
                                <span className="text-xl font-bold text-primary-400">{formatCOP(parseFloat(detalle.pedido.total))}</span>
                            </div>

                            {/* Pagos */}
                            {detalle.pagos.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-3">Pagos</h4>
                                    <div className="space-y-2">
                                        {detalle.pagos.map((pa) => (
                                            <div key={pa.id_pago} className="glass-card-light p-3 flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-surface-200">{pa.metodo_nombre}</p>
                                                    <p className="text-xs text-surface-500">{new Date(pa.fecha).toLocaleDateString("es-CO")}</p>
                                                </div>
                                                <span className="text-sm font-semibold text-emerald-400">{formatCOP(parseFloat(pa.monto))}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Meta */}
                            <div className="glass-card-light p-4 space-y-2 text-xs text-surface-500">
                                <div className="flex justify-between"><span>Sede:</span><span className="text-surface-300">{detalle.pedido.sede_nombre}</span></div>
                                <div className="flex justify-between"><span>Empleado:</span><span className="text-surface-300">{detalle.pedido.empleado_nombre || "—"}</span></div>
                                <div className="flex justify-between"><span>Fecha:</span><span className="text-surface-300">{new Date(detalle.pedido.fecha).toLocaleString("es-CO")}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {cancelAlert && (
                <div className="fixed top-6 right-6 z-[60] max-w-sm w-full">
                    <div className="glass-card border border-red-500/40 p-4 shadow-xl animate-in">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-red-400">Pedido cancelado</p>
                                <p className="text-sm font-semibold text-surface-100 mt-1">{cancelAlert.ticket}</p>
                                <p className="text-xs text-surface-400 mt-1">Cliente: {cancelAlert.cliente}</p>
                            </div>
                            <button
                                onClick={() => setCancelAlert(null)}
                                className="text-surface-400 hover:text-surface-200 transition-colors"
                                aria-label="Cerrar alerta"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
