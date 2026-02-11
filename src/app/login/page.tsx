"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [usuario, setUsuario] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ usuario, password }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Error al iniciar sesión");
                return;
            }

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            router.push("/dashboard");
        } catch {
            setError("Error de conexión con el servidor");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="absolute inset-0">
                <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-primary-300/20 blur-3xl" />
                <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-primary-500/15 blur-[100px]" />
                <div className="absolute top-1/3 left-1/2 h-40 w-[520px] -translate-x-1/2 rounded-full bg-white/50 blur-3xl" />
            </div>

            <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-12">
                <div className="w-full">
                    <div className="glass-card p-8 sm:p-10">
                        <div className="mb-8">
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-surface-400">Juan Pastel</p>
                                <h2 className="text-2xl font-semibold text-surface-50">Ingresar</h2>
                            </div>
                            <p className="text-sm text-surface-400 mt-3">Acceso seguro para administradores</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-surface-400 mb-2">
                                    Usuario
                                </label>
                                <input
                                    type="text"
                                    value={usuario}
                                    onChange={(e) => setUsuario(e.target.value)}
                                    className="input-field"
                                    placeholder="Ingrese su usuario"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-surface-400 mb-2">
                                    Contrasena
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field"
                                    placeholder="Ingrese su contrasena"
                                    required
                                />
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="15" y1="9" x2="9" y2="15" />
                                        <line x1="9" y1="9" x2="15" y2="15" />
                                    </svg>
                                    <span className="text-red-500 text-sm">{error}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Verificando...
                                    </>
                                ) : (
                                    "Iniciar sesion"
                                )}
                            </button>
                        </form>

                        <p className="text-xs text-surface-500 mt-6">
                            Al continuar aceptas las politicas de seguridad internas.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
