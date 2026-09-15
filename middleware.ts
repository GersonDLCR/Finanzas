import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const modules = new Set(["dashboard","trabajo","finanzas","tarjetas","prestamos","deudas","vehiculos","presupuesto","ahorros","patrimonio","calendario","alertas","reportes","configuracion"]);

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname.replace(/^\/+|\/+$/g, "");
  if (modules.has(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard","/trabajo","/finanzas","/tarjetas","/prestamos","/deudas","/vehiculos","/presupuesto","/ahorros","/patrimonio","/calendario","/alertas","/reportes","/configuracion"],
};
