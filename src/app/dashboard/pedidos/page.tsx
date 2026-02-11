"use client";
import { useEffect, useState, useCallback } from "react";

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

const formatCOP = (val: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(val);

const ESTADOS = ["pendiente", "pagado", "entregado", "cancelado"];

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

    const fetchPedidos = useCallback(async (page = 1) => {
        setLoading(true);
        const params = new URLSearchParams();
        params.set("page", String(page));
        if (filtroSede) params.set("sede", filtroSede);
        if (filtroEstado) params.set("estado", filtroEstado);

        try {
            const res = await fetch(`/api/pedidos?${params}`);
            const data = await res.json();
            setPedidos(data.pedidos || []);
            setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filtroSede, filtroEstado]);

    useEffect(() => {
        fetch("/api/sedes").then(r => r.json()).then(setSedes).catch(() => { });
    }, []);

    useEffect(() => {
        fetchPedidos(1);
    }, [fetchPedidos]);

    const openDetalle = async (id: number) => {
        try {
            const res = await fetch(`/api/pedidos/${id}`);
            const data = await res.json();
            setDetalle(data);
            setDetalleOpen(true);
        } catch (err) {
            console.error(err);
        }
    };

    const cambiarEstado = async (id: number, nuevoEstado: string) => {
        setUpdatingEstado(id);
        try {
            const res = await fetch(`/api/pedidos/${id}/estado`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ estado: nuevoEstado }),
            });
            if (res.ok) {
                fetchPedidos(pagination.page);
                if (detalle && detalle.pedido.id_pedido === id) {
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
                                            <select
                                                value={p.estado}
                                                onChange={(e) => cambiarEstado(p.id_pedido, e.target.value)}
                                                disabled={updatingEstado === p.id_pedido}
                                                className={`badge badge-${p.estado} cursor-pointer border-0 outline-none text-xs font-semibold`}
                                                style={{ background: "transparent" }}
                                            >
                                                {ESTADOS.map((e) => (
                                                    <option key={e} value={e}>{e}</option>
                                                ))}
                                            </select>
                                            <span className={`badge badge-${p.estado} ml-1`}>{p.estado}</span>
                                        </td>
                                        <td className="py-3.5 px-5 text-sm font-semibold text-surface-200 text-right">{formatCOP(parseFloat(p.total))}</td>
                                        <td className="py-3.5 px-5 text-sm text-surface-500 text-right">
                                            {new Date(p.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                        </td>
                                        <td className="py-3.5 px-5 text-center">
                                            <button
                                                onClick={() => openDetalle(p.id_pedido)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-400 hover:bg-primary-500/10 transition-colors"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                                Ver Detalle
                                            </button>
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
            {detalleOpen && detalle && (
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
                            <div className="flex items-center justify-between">
                                <span className={`badge badge-${detalle.pedido.estado} text-sm`}>{detalle.pedido.estado}</span>
                                <select
                                    value={detalle.pedido.estado}
                                    onChange={(e) => cambiarEstado(detalle.pedido.id_pedido, e.target.value)}
                                    className="select-field text-xs"
                                >
                                    {ESTADOS.map((e) => (
                                        <option key={e} value={e}>{e}</option>
                                    ))}
                                </select>
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
        </div>
    );
}
