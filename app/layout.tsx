import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "FINANZAS 360", description: "Centro financiero personal — datos de prueba" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
