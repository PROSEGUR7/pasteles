"use client";
import { useEffect, useState } from "react";

interface Producto {
    id_producto: number;
    nombre: string;
    descripcion: string;
    precio: string;
    activo: boolean;
    created_at: string;
}

const formatCOP = (val: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(val);

const PRODUCT_ICONS: Record<string, string> = {
    "Carne": "🥩", "Pollo": "🐔", "Mixto": "🔀", "Queso": "🧀", "Hawaiano": "🍍",
};

function getIcon(nombre: string) {
    for (const [key, icon] of Object.entries(PRODUCT_ICONS)) {
        if (nombre.toLowerCase().includes(key.toLowerCase())) return icon;
    }
    return "🥟";
}

export default function ProductosPage() {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInactivos, setShowInactivos] = useState(false);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [menuAccionesAbierto, setMenuAccionesAbierto] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({
        id_producto: null as number | null,
        categoria: "Pastel",
        nombre: "",
        descripcion: "",
        precio: "",
        activo: true,
    });
    const [error, setError] = useState("");

    const fetchProductos = () => {
        setLoading(true);
        const params = showInactivos ? "?include_inactive=1" : "";
        fetch(`/api/productos${params}`)
            .then((r) => r.json())
            .then((data) => { setProductos(data); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchProductos();
    }, [showInactivos]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element | null;
            if (!target?.closest("[data-producto-acciones='true']")) {
                setMenuAccionesAbierto(null);
            }
        };

        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    const resetForm = () => {
        setForm({ id_producto: null, categoria: "Pastel", nombre: "", descripcion: "", precio: "", activo: true });
        setError("");
    };

    const openCreate = () => {
        resetForm();
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSaving(true);

        try {
            const baseNombre = form.nombre.trim();
            const fullNombre = form.categoria && form.categoria !== "Otro"
                ? `${form.categoria} - ${baseNombre}`
                : baseNombre;

            const payload = {
                nombre: fullNombre,
                descripcion: form.descripcion.trim(),
                precio: Number(form.precio),
                activo: form.activo,
            };

            const res = await fetch(
                form.id_producto ? `/api/productos/${form.id_producto}` : "/api/productos",
                {
                    method: form.id_producto ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            );

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "No se pudo guardar el producto");
                return;
            }

            resetForm();
            setModalOpen(false);
            fetchProductos();
        } catch {
            setError("Error de conexion al guardar");
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (prod: Producto) => {
        const parts = (prod.nombre || "").split(" - ");
        const categoria = parts.length > 1 ? parts[0] : "Otro";
        const nombre = parts.length > 1 ? parts.slice(1).join(" - ") : (prod.nombre || "");

        setForm({
            id_producto: prod.id_producto,
            categoria,
            nombre,
            descripcion: prod.descripcion || "",
            precio: String(prod.precio || ""),
            activo: prod.activo,
        });
        setModalOpen(true);
    };

    const handleDelete = async (prod: Producto) => {
        if (!confirm(`Desactivar producto ${prod.nombre}?`)) return;
        try {
            await fetch(`/api/productos/${prod.id_producto}`, { method: "DELETE" });
            fetchProductos();
        } catch {
            setError("Error al desactivar producto");
        }
    };

    const handleToggleActivo = async (prod: Producto) => {
        if (prod.activo) {
            await handleDelete(prod);
            return;
        }

        if (!confirm(`Activar producto ${prod.nombre}?`)) return;
        try {
            const payload = {
                nombre: prod.nombre,
                descripcion: prod.descripcion,
                precio: Number(prod.precio),
                activo: true,
            };

            await fetch(`/api/productos/${prod.id_producto}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            fetchProductos();
        } catch {
            setError("Error al activar producto");
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-in">
                <div><h1 className="text-2xl font-bold text-surface-50">Productos</h1></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="loading-skeleton h-48 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 animate-in">
                <div>
                    <h1 className="text-2xl font-bold text-surface-50">Productos</h1>
                    <p className="text-surface-400 text-sm mt-1">Catálogo de pasteles disponibles</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="glass-card-light p-1 inline-flex items-center gap-1">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                viewMode === "grid"
                                    ? "bg-primary-500/15 text-primary-600"
                                    : "text-surface-500 hover:text-primary-500"
                            }`}
                            aria-label="Ver en cuadricula"
                            title="Ver en cuadricula"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                viewMode === "list"
                                    ? "bg-primary-500/15 text-primary-600"
                                    : "text-surface-500 hover:text-primary-500"
                            }`}
                            aria-label="Ver en lista"
                            title="Ver en lista"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="8" y1="6" x2="21" y2="6" />
                                <line x1="8" y1="12" x2="21" y2="12" />
                                <line x1="8" y1="18" x2="21" y2="18" />
                                <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
                                <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
                                <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
                            </svg>
                        </button>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-surface-500">
                        <input
                            type="checkbox"
                            checked={showInactivos}
                            onChange={(e) => setShowInactivos(e.target.checked)}
                        />
                        Ver inactivos
                    </label>
                    <button
                        onClick={openCreate}
                        className="btn-primary flex items-center gap-2"
                    >
                        <span className="text-lg leading-none">+</span>
                        Nuevo producto
                    </button>
                </div>
            </div>

            {(() => {
                const categorize = (nombre: string) => {
                    const parts = nombre.split(" - ");
                    return parts.length > 1 ? parts[0] : "Otros";
                };
                const displayName = (nombre: string) => {
                    const parts = nombre.split(" - ");
                    return parts.length > 1 ? parts.slice(1).join(" - ") : nombre;
                };

                const sections = [
                    { key: "Pastel", label: "Pasteles" },
                    { key: "Sandwich", label: "Sandwiches" },
                    { key: "Arepa", label: "Arepas" },
                    { key: "Jugo", label: "Jugos naturales" },
                    { key: "Bebida", label: "Bebidas frias" },
                    { key: "Otros", label: "Otros" },
                ];

                const grouped = sections.map((section) => ({
                    ...section,
                    items: productos.filter((p) => categorize(p.nombre || "") === section.key),
                })).filter((section) => section.items.length > 0);

                return (
                    <div className="space-y-8">
                        {grouped.map((section, sectionIndex) => (
                            <div key={section.key} className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-semibold text-surface-50">{section.label}</h2>
                                    <span className="text-xs text-surface-500">{section.items.length} items</span>
                                </div>
                                {viewMode === "grid" ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {section.items.map((prod, i) => (
                                            <div key={prod.id_producto} className="stat-card animate-in" style={{ animationDelay: `${(sectionIndex * 6 + i) * 50}ms` }}>
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 flex items-center justify-center text-2xl">
                                                        {getIcon(prod.nombre)}
                                                    </div>
                                                    <span className={`badge ${prod.activo ? "badge-pagado" : "badge-cancelado"}`}>
                                                        {prod.activo ? "Activo" : "Inactivo"}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-bold text-surface-100 mb-1">{displayName(prod.nombre)}</h3>
                                                <p className="text-sm text-surface-400 mb-4 line-clamp-2">{prod.descripcion || "Sin descripcion"}</p>
                                                <div className="flex items-center justify-between pt-3 border-t border-surface-800/30">
                                                    <span className="text-2xl font-bold text-primary-400">{formatCOP(parseFloat(prod.precio))}</span>
                                                    <span className="text-xs text-surface-600">
                                                        Desde {new Date(prod.created_at).toLocaleDateString("es-CO", { month: "short", year: "numeric" })}
                                                    </span>
                                                </div>
                                                <div className="mt-4 flex justify-end">
                                                    <div className="relative" data-producto-acciones="true">
                                                        <button
                                                            onClick={() => setMenuAccionesAbierto(menuAccionesAbierto === prod.id_producto ? null : prod.id_producto)}
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-surface-500 hover:text-primary-500 hover:bg-primary-500/10 transition-colors"
                                                            aria-label="Abrir acciones"
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                                <circle cx="12" cy="5" r="1.8" />
                                                                <circle cx="12" cy="12" r="1.8" />
                                                                <circle cx="12" cy="19" r="1.8" />
                                                            </svg>
                                                        </button>

                                                        {menuAccionesAbierto === prod.id_producto && (
                                                            <div className="absolute right-0 mt-1 w-36 glass-card-light p-1.5 z-20 border border-surface-800/40">
                                                                <button
                                                                    onClick={() => {
                                                                        handleEdit(prod);
                                                                        setMenuAccionesAbierto(null);
                                                                    }}
                                                                    className="w-full text-left px-3 py-2 rounded-md text-xs text-surface-300 hover:bg-primary-500/10 transition-colors"
                                                                >
                                                                    Editar
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        handleToggleActivo(prod);
                                                                        setMenuAccionesAbierto(null);
                                                                    }}
                                                                    className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
                                                                        prod.activo
                                                                            ? "text-red-500 hover:bg-red-500/10"
                                                                            : "text-emerald-600 hover:bg-emerald-500/10"
                                                                    }`}
                                                                >
                                                                    {prod.activo ? "Desactivar" : "Activar"}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="glass-card overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="border-b border-surface-800/30 bg-surface-900/30">
                                                        <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider py-3 px-5">Producto</th>
                                                        <th className="text-left text-xs font-medium text-surface-500 uppercase tracking-wider py-3 px-5">Descripcion</th>
                                                        <th className="text-right text-xs font-medium text-surface-500 uppercase tracking-wider py-3 px-5">Precio</th>
                                                        <th className="text-center text-xs font-medium text-surface-500 uppercase tracking-wider py-3 px-5">Estado</th>
                                                        <th className="text-right text-xs font-medium text-surface-500 uppercase tracking-wider py-3 px-5">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-surface-800/20">
                                                    {section.items.map((prod) => (
                                                        <tr key={prod.id_producto} className="table-row">
                                                            <td className="py-3.5 px-5">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 flex items-center justify-center text-lg">
                                                                        {getIcon(prod.nombre)}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-semibold text-surface-200">{displayName(prod.nombre)}</p>
                                                                        <p className="text-xs text-surface-500">
                                                                            Desde {new Date(prod.created_at).toLocaleDateString("es-CO", { month: "short", year: "numeric" })}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-3.5 px-5 text-sm text-surface-400">{prod.descripcion || "Sin descripcion"}</td>
                                                            <td className="py-3.5 px-5 text-right text-sm font-bold text-primary-500">{formatCOP(parseFloat(prod.precio))}</td>
                                                            <td className="py-3.5 px-5 text-center">
                                                                <span className={`badge ${prod.activo ? "badge-pagado" : "badge-cancelado"}`}>
                                                                    {prod.activo ? "Activo" : "Inactivo"}
                                                                </span>
                                                            </td>
                                                            <td className="py-3.5 px-5 text-right">
                                                                <div className="relative inline-block" data-producto-acciones="true">
                                                                    <button
                                                                        onClick={() => setMenuAccionesAbierto(menuAccionesAbierto === prod.id_producto ? null : prod.id_producto)}
                                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-surface-500 hover:text-primary-500 hover:bg-primary-500/10 transition-colors"
                                                                        aria-label="Abrir acciones"
                                                                    >
                                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                                            <circle cx="12" cy="5" r="1.8" />
                                                                            <circle cx="12" cy="12" r="1.8" />
                                                                            <circle cx="12" cy="19" r="1.8" />
                                                                        </svg>
                                                                    </button>

                                                                    {menuAccionesAbierto === prod.id_producto && (
                                                                        <div className="absolute right-0 mt-1 w-36 glass-card-light p-1.5 z-20 border border-surface-800/40">
                                                                            <button
                                                                                onClick={() => {
                                                                                    handleEdit(prod);
                                                                                    setMenuAccionesAbierto(null);
                                                                                }}
                                                                                className="w-full text-left px-3 py-2 rounded-md text-xs text-surface-300 hover:bg-primary-500/10 transition-colors"
                                                                            >
                                                                                Editar
                                                                            </button>
                                                                            <button
                                                                                onClick={() => {
                                                                                    handleToggleActivo(prod);
                                                                                    setMenuAccionesAbierto(null);
                                                                                }}
                                                                                className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
                                                                                    prod.activo
                                                                                        ? "text-red-500 hover:bg-red-500/10"
                                                                                        : "text-emerald-600 hover:bg-emerald-500/10"
                                                                                }`}
                                                                            >
                                                                                {prod.activo ? "Desactivar" : "Activar"}
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
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                );
            })()}

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setModalOpen(false)}
                    />
                    <div className="relative w-full max-w-2xl glass-card p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-surface-50">{form.id_producto ? "Editar producto" : "Nuevo producto"}</h2>
                                <p className="text-xs text-surface-400">Completa los campos para guardar</p>
                            </div>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="p-2 rounded-lg hover:bg-surface-800/10 text-surface-500"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-surface-400 mb-2">Categoria</label>
                                <select
                                    className="input-field"
                                    value={form.categoria}
                                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                                >
                                    <option value="Pastel">Pastel</option>
                                    <option value="Sandwich">Sandwich</option>
                                    <option value="Arepa">Arepa</option>
                                    <option value="Jugo">Jugo</option>
                                    <option value="Bebida">Bebida</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-surface-400 mb-2">Nombre</label>
                                <input
                                    className="input-field"
                                    value={form.nombre}
                                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                                    placeholder="Pastel de pollo"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-surface-400 mb-2">Precio</label>
                                <input
                                    className="input-field"
                                    type="number"
                                    min="0"
                                    value={form.precio}
                                    onChange={(e) => setForm({ ...form, precio: e.target.value })}
                                    placeholder="4500"
                                    required
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-surface-400 mb-2">Descripcion</label>
                                <textarea
                                    className="input-field h-24 resize-none"
                                    value={form.descripcion}
                                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                                    placeholder="Descripcion del producto"
                                />
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-xs text-surface-500">
                                    <input
                                        type="checkbox"
                                        checked={form.activo}
                                        onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                                    />
                                    Activo
                                </label>
                            </div>
                            <div className="flex items-center gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => { resetForm(); setModalOpen(false); }}
                                    className="px-4 py-2 rounded-lg text-xs font-semibold text-surface-500 hover:text-surface-300"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn-primary disabled:opacity-60"
                                >
                                    {saving ? "Guardando..." : form.id_producto ? "Actualizar" : "Crear"}
                                </button>
                            </div>
                        </form>

                        {error && (
                            <div className="mt-4 text-xs text-red-500">{error}</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
