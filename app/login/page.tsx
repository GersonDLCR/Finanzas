"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const configured=Boolean(supabaseUrl&&anonKey);

function base64url(bytes:ArrayBuffer|Uint8Array<ArrayBufferLike>){const view=bytes instanceof ArrayBuffer?new Uint8Array(bytes):bytes;return btoa(String.fromCharCode(...view)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}
async function pkce(){const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);const verifier=base64url(bytes);const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(verifier).buffer as ArrayBuffer);return {verifier,challenge:base64url(digest)}}

export default function LoginPage(){
 const router=useRouter(); const [email,setEmail]=useState(""); const [message,setMessage]=useState("");
 const continueDemo=()=>{sessionStorage.setItem("f360-demo-session","1");router.replace("/")};
 const google=async()=>{if(!configured){setMessage("Google queda preparado para Supabase. Para activarlo agrega las variables de entorno del proyecto.");return;}const {verifier,challenge}=await pkce();document.cookie=`f360-pkce=${encodeURIComponent(verifier)}; Max-Age=600; Path=/; SameSite=Lax`;const redirect=window.location.origin+"/api/auth/callback";window.location.href=`${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirect)}&code_challenge=${challenge}&code_challenge_method=S256`;};
 const magic=async()=>{if(!configured){setMessage("Configura Supabase para activar el acceso por enlace mágico.");return;}if(!email.includes("@")){setMessage("Escribe un correo válido.");return;}const redirect=window.location.origin+"/api/auth/callback";const r=await fetch(`${supabaseUrl}/auth/v1/otp`,{method:"POST",headers:{"Content-Type":"application/json",apikey:anonKey!},body:JSON.stringify({email,create_user:true,options:{emailRedirectTo:redirect}})});setMessage(r.ok?"Revisa tu correo. Te enviamos un enlace de acceso.":"No se pudo enviar el enlace. Revisa la configuración del proveedor.");};
 return <main className="authPage"><section className="authCard"><div className="authBrand"><span>F</span><div><b>FINANZAS 360</b><small>Personal Financial OS</small></div></div><div className="authIntro"><small>ACCESO SEGURO</small><h1>Tu dinero, en un solo lugar.</h1><p>Accede desde el celular sin guardar contraseñas bancarias, CVV ni PIN en la aplicación.</p></div><button className="authProvider" onClick={google}><b>G</b><span>Continuar con Google</span><i>→</i></button><div className="authDivider"><span>o usa tu correo</span></div><label className="authField"><span>Correo electrónico</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@correo.com" autoComplete="email"/></label><button className="authMagic" onClick={magic}>Enviarme un enlace de acceso</button>{message&&<p className="authMessage">{message}</p>}<button className="authDemo" onClick={continueDemo}>Continuar con datos demo</button><small className="authFoot">Demo local · Sin datos bancarios reales</small></section></main>
}
