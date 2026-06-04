import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Instagram Métricas",
  description: "Panel de métricas de Instagram",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: "#fafafa" }}>
        {children}
      </body>
    </html>
  );
}
