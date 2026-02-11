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
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({
        id_producto: null as number | null,
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

    const resetForm = () => {
        setForm({ id_producto: null, nombre: "", descripcion: "", precio: "", activo: true });
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
            const payload = {
                nombre: form.nombre.trim(),
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
        setForm({
            id_producto: prod.id_producto,
            nombre: prod.nombre || "",
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {productos.map((prod, i) => (
                    <div key={prod.id_producto} className="stat-card animate-in" style={{ animationDelay: `${i * 80}ms` }}>
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 flex items-center justify-center text-2xl">
                                {getIcon(prod.nombre)}
                            </div>
                            <span className={`badge ${prod.activo ? "badge-pagado" : "badge-cancelado"}`}>
                                {prod.activo ? "Activo" : "Inactivo"}
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-surface-100 mb-1">{prod.nombre}</h3>
                        <p className="text-sm text-surface-400 mb-4 line-clamp-2">{prod.descripcion}</p>
                        <div className="flex items-center justify-between pt-3 border-t border-surface-800/30">
                            <span className="text-2xl font-bold text-primary-400">{formatCOP(parseFloat(prod.precio))}</span>
                            <span className="text-xs text-surface-600">
                                Desde {new Date(prod.created_at).toLocaleDateString("es-CO", { month: "short", year: "numeric" })}
                            </span>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                            <button
                                onClick={() => handleEdit(prod)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-600 hover:bg-primary-500/10"
                            >
                                Editar
                            </button>
                            <button
                                onClick={() => handleDelete(prod)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-500/10"
                            >
                                Desactivar
                            </button>
                        </div>
                    </div>
                ))}
            </div>

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
