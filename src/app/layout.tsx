import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Pasteles Admin — Panel de Gestión",
    description: "Panel administrativo premium para gestión de ventas de pasteles colombianos",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&family=Manrope:wght@300;400;500;600;700;800&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>{children}</body>
        </html>
    );
}
