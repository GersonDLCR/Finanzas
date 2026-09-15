import { NextResponse } from "next/server";

export async function GET(request:Request){
 const url=new URL(request.url); const code=url.searchParams.get("code"); const tokenHash=url.searchParams.get("token_hash"); const type=url.searchParams.get("type");
 const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL; const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!supabaseUrl||!anonKey){return NextResponse.redirect(new URL("/login?error=auth_not_configured",url.origin))}
 let body:Record<string,string>|null=null;
 if(code){const cookie=request.headers.get("cookie")||"";const match=cookie.match(/(?:^|; )f360-pkce=([^;]+)/);const verifier=match?decodeURIComponent(match[1]):"";if(!verifier)return NextResponse.redirect(new URL("/login?error=missing_pkce",url.origin));body={grant_type:"pkce",code,code_verifier:verifier};}
 else if(tokenHash&&type){body={token_hash:tokenHash,type};}
 else return NextResponse.redirect(new URL("/login?error=missing_code",url.origin));
 const endpoint=code?`${supabaseUrl}/auth/v1/token`:`${supabaseUrl}/auth/v1/verify`;
 const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json",apikey:anonKey},body:JSON.stringify(body),cache:"no-store"});
 if(!response.ok)return NextResponse.redirect(new URL("/login?error=auth_exchange_failed",url.origin));
 const session=await response.json();
 const accessToken=session.access_token;
 const refreshToken=session.refresh_token;
 if(!accessToken)return NextResponse.redirect(new URL("/login?error=no_session",url.origin));
 const target=new URL("/",url.origin); const out=NextResponse.redirect(target);
 out.cookies.set("f360-session",accessToken,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:session.expires_in||3600});
 if(refreshToken)out.cookies.set("f360-refresh",refreshToken,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*30});
 out.cookies.set("f360-pkce","",{expires:new Date(0),path:"/"});
 return out;
}
