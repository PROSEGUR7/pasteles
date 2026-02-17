"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

interface User {
    nombre: string;
    cargo: string;
    rol: string;
}

const NAV_ITEMS = [
    {
        href: "/dashboard",
        label: "Dashboard",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
        ),
    },
    {
        href: "/dashboard/pedidos",
        label: "Pedidos",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <path d="M9 14l2 2 4-4" />
            </svg>
        ),
    },
    {
        href: "/dashboard/conversaciones",
        label: "Conversaciones",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/clientes",
        label: "Clientes",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
        ),
    },
    {
        href: "/dashboard/productos",
        label: "Productos",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m7.5 4.27 9 5.15" />
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                <path d="m3.3 7 8.7 5 8.7-5" />
                <path d="M12 22V12" />
            </svg>
        ),
    },
    {
        href: "/dashboard/sedes",
        label: "Sedes",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
            </svg>
        ),
    },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const router = useRouter();
    const pathname = usePathname();
    const isConversationsRoute = pathname === "/dashboard/conversaciones";

    useEffect(() => {
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");
        if (!token || !userData) {
            router.push("/login");
            return;
        }
        setUser(JSON.parse(userData));
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
    };

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="loading-skeleton w-12 h-12 rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex">
            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full z-40 transition-all duration-300 ${sidebarOpen ? "w-64" : "w-20"
                    }`}
                style={{
                    background: "linear-gradient(180deg, rgba(255,250,245,0.98) 0%, rgba(250,244,237,0.95) 100%)",
                    borderRight: "1px solid rgba(199,180,167,0.35)",
                }}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-5 h-16 border-b border-surface-800/50">
                    {sidebarOpen && (
                        <div className="animate-in">
                            <h2 className="text-sm font-bold text-surface-50">Juan Pastel</h2>
                            <p className="text-[10px] text-primary-600 font-medium tracking-wider uppercase">Admin Panel</p>
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav className="p-3 space-y-1 mt-2">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`sidebar-link ${isActive ? "active" : ""} ${!sidebarOpen ? "justify-center px-0" : ""
                                    }`}
                                title={item.label}
                            >
                                {item.icon}
                                {sidebarOpen && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* User section at bottom */}
                {sidebarOpen && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-surface-800/50">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-surface-800 flex items-center justify-center text-primary-600 font-bold text-sm">
                                {user.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-surface-50 truncate">{user.nombre}</p>
                                <p className="text-[11px] text-surface-400 truncate">{user.cargo}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 rounded-lg hover:bg-red-500/10 text-surface-400 hover:text-red-400 transition-colors"
                                title="Cerrar sesión"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                    <polyline points="16 17 21 12 16 7" />
                                    <line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </aside>

            {/* Main Content */}
            <main
                className={`flex-1 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"} ${
                    isConversationsRoute ? "h-screen overflow-hidden" : ""
                }`}
            >
                {/* Top Bar */}
                <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-6 border-b border-surface-800/50" style={{ background: "rgba(255,250,245,0.85)", backdropFilter: "blur(12px)" }}>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 rounded-lg hover:bg-surface-800 text-surface-400 transition-colors"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>

                    <div className="flex items-center gap-4">
                        <span className="text-xs text-surface-400">
                            {new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                        </span>
                        <div className="badge badge-pagado text-[11px]">
                            {user.rol}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className={isConversationsRoute ? "p-6 h-[calc(100vh-64px)] overflow-hidden" : "p-6"}>
                    {children}
                </div>
            </main>
        </div>
    );
}
