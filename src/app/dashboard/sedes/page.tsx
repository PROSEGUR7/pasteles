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

export default function SedesPage() {
    const [sedes, setSedes] = useState<Sede[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/sedes")
            .then((r) => r.json())
            .then((data) => { setSedes(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

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
            <div className="animate-in">
                <h1 className="text-2xl font-bold text-surface-50">Sedes</h1>
                <p className="text-surface-400 text-sm mt-1">Ubicaciones de venta activas</p>
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
                    </div>
                ))}
            </div>
        </div>
    );
}
