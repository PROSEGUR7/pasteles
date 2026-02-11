"use client";
import { useEffect, useState } from "react";

interface Sede {
    id_sede: number;
    nombre: string;
    direccion: string;
    telefono: string;
    activa: boolean;
    created_at: string;
}

const buildMapsUrl = (direccion: string, nombre: string) => {
    const query = encodeURIComponent(`${nombre}, ${direccion}`.trim());
    return `https://www.google.com/maps?q=${query}`;
};

const buildMapsEmbed = (direccion: string, nombre: string) => {
    const query = encodeURIComponent(`${nombre}, ${direccion}`.trim());
    return `https://www.google.com/maps?q=${query}&output=embed`;
};

export default function SedesPage() {
    const [sedes, setSedes] = useState<Sede[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInactivas, setShowInactivas] = useState(false);
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({
        id_sede: null as number | null,
        nombre: "",
        direccion: "",
        telefono: "",
        activa: true,
    });
    const [error, setError] = useState("");

    const fetchSedes = () => {
        setLoading(true);
        const params = showInactivas ? "?include_inactive=1" : "";
        fetch(`/api/sedes${params}`)
            .then((r) => r.json())
            .then((data) => { setSedes(data); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchSedes();
    }, [showInactivas]);

    const resetForm = () => {
        setForm({ id_sede: null, nombre: "", direccion: "", telefono: "", activa: true });
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
                direccion: form.direccion.trim(),
                telefono: form.telefono.trim(),
                activa: form.activa,
            };

            const res = await fetch(
                form.id_sede ? `/api/sedes/${form.id_sede}` : "/api/sedes",
                {
                    method: form.id_sede ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            );

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "No se pudo guardar la sede");
                return;
            }

            resetForm();
            setModalOpen(false);
            fetchSedes();
        } catch {
            setError("Error de conexion al guardar");
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (sede: Sede) => {
        setForm({
            id_sede: sede.id_sede,
            nombre: sede.nombre || "",
            direccion: sede.direccion || "",
            telefono: sede.telefono || "",
            activa: sede.activa,
        });
        setModalOpen(true);
    };

    const handleDelete = async (sede: Sede) => {
        if (!confirm(`Desactivar sede ${sede.nombre}?`)) return;
        try {
            await fetch(`/api/sedes/${sede.id_sede}`, { method: "DELETE" });
            fetchSedes();
        } catch {
            setError("Error al desactivar sede");
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-in">
                <div><h1 className="text-2xl font-bold text-surface-50">Sedes</h1></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
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
                    <h1 className="text-2xl font-bold text-surface-50">Sedes</h1>
                    <p className="text-surface-400 text-sm mt-1">Ubicaciones de venta activas</p>
                </div>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-surface-500">
                        <input
                            type="checkbox"
                            checked={showInactivas}
                            onChange={(e) => setShowInactivas(e.target.checked)}
                        />
                        Ver inactivas
                    </label>
                    <button
                        onClick={openCreate}
                        className="btn-primary flex items-center gap-2"
                    >
                        <span className="text-lg leading-none">+</span>
                        Nueva sede
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sedes.map((sede, i) => (
                    <div key={sede.id_sede} className="stat-card animate-in" style={{ animationDelay: `${i * 100}ms` }}>
                        <div className="flex items-start justify-between mb-5">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center text-blue-400">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                            </div>
                            <span className={`badge ${sede.activa ? "badge-pagado" : "badge-cancelado"}`}>
                                {sede.activa ? "Activa" : "Inactiva"}
                            </span>
                        </div>

                        <h3 className="text-xl font-bold text-surface-100 mb-4">{sede.nombre}</h3>

                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-500 mt-0.5 flex-shrink-0">
                                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                                <span className="text-sm text-surface-300">{sede.direccion || "Sin dirección"}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-500 flex-shrink-0">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                                <span className="text-sm text-surface-300">{sede.telefono || "Sin teléfono"}</span>
                            </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-surface-800/30">
                            <span className="text-xs text-surface-600">
                                Registrada el {new Date(sede.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
                            </span>
                        </div>

                        {sede.direccion && (
                            <div className="mt-4">
                                <div className="overflow-hidden rounded-xl border border-surface-800/40">
                                    <iframe
                                        title={`Mapa ${sede.nombre}`}
                                        src={buildMapsEmbed(sede.direccion, sede.nombre)}
                                        className="w-full h-44"
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                    />
                                </div>
                                <a
                                    href={buildMapsUrl(sede.direccion, sede.nombre)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-primary-600 hover:text-primary-500"
                                >
                                    <span>Ver en Google Maps</span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M7 17L17 7" />
                                        <path d="M7 7h10v10" />
                                    </svg>
                                </a>
                            </div>
                        )}

                        <div className="mt-4 flex items-center gap-2">
                            <button
                                onClick={() => handleEdit(sede)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-600 hover:bg-primary-500/10"
                            >
                                Editar
                            </button>
                            <button
                                onClick={() => handleDelete(sede)}
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
                                <h2 className="text-lg font-semibold text-surface-50">{form.id_sede ? "Editar sede" : "Nueva sede"}</h2>
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
                                    placeholder="EL BOSQUE"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-surface-400 mb-2">Telefono</label>
                                <input
                                    className="input-field"
                                    value={form.telefono}
                                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                                    placeholder="3110000000"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-surface-400 mb-2">Direccion</label>
                                <textarea
                                    className="input-field h-24 resize-none"
                                    value={form.direccion}
                                    onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                                    placeholder="Direccion completa"
                                />
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-xs text-surface-500">
                                    <input
                                        type="checkbox"
                                        checked={form.activa}
                                        onChange={(e) => setForm({ ...form, activa: e.target.checked })}
                                    />
                                    Activa
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
                                    {saving ? "Guardando..." : form.id_sede ? "Actualizar" : "Crear"}
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
