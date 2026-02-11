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

    useEffect(() => {
        fetch("/api/productos")
            .then((r) => r.json())
            .then((data) => { setProductos(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

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
            <div className="animate-in">
                <h1 className="text-2xl font-bold text-surface-50">Productos</h1>
                <p className="text-surface-400 text-sm mt-1">Catálogo de pasteles disponibles</p>
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
                    </div>
                ))}
            </div>
        </div>
    );
}
