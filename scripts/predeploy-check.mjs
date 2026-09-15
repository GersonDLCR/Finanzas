import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const required=[
  "app/page.tsx","app/login/page.tsx","middleware.ts","types.ts",
  "lib/use-finance-store.ts","lib/finance/domain.ts","lib/finance/repository.ts",
  "lib/finance/supabase-mappers.ts","supabase/schema.sql",".env.example",".gitignore"
];
const missing=required.filter(f=>!fs.existsSync(path.join(root,f)));
if(missing.length) throw new Error(`Archivos críticos faltantes: ${missing.join(", ")}`);
const env=fs.readFileSync(path.join(root,".env.example"),"utf8");
if(!env.includes("NEXT_PUBLIC_SUPABASE_URL=")||!env.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY=")) throw new Error(".env.example incompleto");
const schema=fs.readFileSync(path.join(root,"supabase/schema.sql"),"utf8");
for(const token of ["create table public.financial_movements","source_type","currency char(3)","row level security","assert_parent_same_user"]){
  if(!schema.toLowerCase().includes(token.toLowerCase())) throw new Error(`Contrato Supabase incompleto: ${token}`);
}
const gitignore=fs.readFileSync(path.join(root,".gitignore"),"utf8");
for(const token of ["node_modules/",".env",".next/",".vercel/"]){if(!gitignore.includes(token)) throw new Error(`.gitignore no protege ${token}`);}
console.log("FINANZAS 360 predeploy contract: OK");
