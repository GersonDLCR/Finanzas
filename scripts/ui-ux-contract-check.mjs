import fs from 'node:fs';
import assert from 'node:assert/strict';

const page=fs.readFileSync('app/page.tsx','utf8');
const css=fs.readFileSync('app/globals.css','utf8');
const sections=['dashboard','trabajo','finanzas','tarjetas','prestamos','deudas','vehiculos','presupuesto','ahorros','patrimonio','calendario','alertas','reportes','configuracion'];
for(const section of sections) assert.match(page,new RegExp(`section===\\"${section}\\"`),`Missing section ${section}`);
assert.match(page,/searchTrigger/,'Global search trigger missing');
assert.match(page,/commandOverlay/,'Global command/search overlay missing');
assert.match(page,/themeToggle/,'Theme toggle missing');
assert.match(page,/bottomnav/,'Mobile bottom navigation missing');
assert.match(page,/pendingConfirm/,'Destructive-action confirmation state missing');
assert.match(page,/localStorage/,'Local demo persistence missing');
assert.match(css,/prefers-reduced-motion:reduce/,'Reduced-motion accessibility rule missing');
for(const bp of ['1250px','1000px','800px','700px','560px','430px']) assert.match(css,new RegExp(`max-width:${bp.replace('px','\\\\?')}px`),`Responsive breakpoint ${bp} missing`);
assert.match(css,/overflow-x:auto/,'At least one horizontal-scroll escape hatch is required for dense tables');
console.log(`FINANZAS 360 UI/UX source contract: OK (${sections.length} sections + responsive/accessibility/navigation safeguards)`);
