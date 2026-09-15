import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const ts=require("typescript");
const root=path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const skip=new Set(["node_modules",".next"]);
let count=0;
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(skip.has(entry.name))continue;const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(entry.name)){const src=fs.readFileSync(p,"utf8");const out=ts.transpileModule(src,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},reportDiagnostics:true});const errors=(out.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);if(errors.length){throw new Error(`${path.relative(root,p)}: ${errors.map(e=>ts.flattenDiagnosticMessageText(e.messageText," ")).join(" | ")}`)}count++;}}}
walk(root);
console.log(`FINANZAS 360 source syntax: OK (${count} TS/TSX files)`);
