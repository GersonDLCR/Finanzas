import { NextResponse } from "next/server";
export async function POST(){const out=NextResponse.json({ok:true});out.cookies.set("f360-session","",{expires:new Date(0),path:"/"});out.cookies.set("f360-refresh","",{expires:new Date(0),path:"/"});return out;}
