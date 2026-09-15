"use client";
import React, { useState } from "react";
import type * as T from "@/types";
import * as UI from "@/components/ui";
import { money, num, pct, today, addDays, periodRate, scheduleFor, dateMonthsAgo } from "@/lib/format";
import { frequencies, fuels, methods } from "@/data/demo";
import { TrendBars, MetricBars } from "@/components/charts";
import { workHours, workKm, workCost } from "@/lib/finance/engine";
import { filterPeriod } from "@/lib/finance/domain";
const { Btn, Badge, Field, CardBox, Stat, Detail, Modal, Pagination, Icon, PageHead } = UI;

function ReportsPage({sessions,vehicles,cards,loans,debts,fuel,maintenance,accounts=[],investments=[],goals=[]}:{sessions:T.WorkSession[];vehicles:T.Vehicle[];cards:T.Card[];loans:T.Loan[];debts:T.Debt[];fuel:T.FuelStop[];maintenance:T.Maintenance[];accounts?:T.FinancialAccount[];investments?:T.Investment[];goals?:T.Goal[]}){
  const [period,setPeriod]=useState<"3m"|"6m"|"12m"|"all">("6m");
  const start=period==="all"?"0000-01-01":dateMonthsAgo(today,period==="3m"?3:period==="12m"?12:6);
  const end=today;
  const rs=filterPeriod(sessions,start,end), rf=filterPeriod(fuel,start,end), rm=filterPeriod(maintenance,start,end);
  const gross=rs.reduce((a,s)=>a+s.gross,0);
  const commissions=rs.reduce((a,s)=>a+s.commission,0);
  const bonuses=rs.reduce((a,s)=>a+s.bonuses,0);
  const net=rs.reduce((a,s)=>a+s.gross-s.commission+s.bonuses-s.fuelCost-s.otherCost,0);
  const hours=workHours(rs), km=workKm(rs), operatingCost=workCost(rs);
  const energy=rf.reduce((a,f)=>a+f.total,0), maint=rm.reduce((a,m)=>a+m.partsCost+m.laborCost,0);
  const penAccounts=accounts.filter(a=>a.currency==='PEN'), usdAccounts=accounts.filter(a=>a.currency==='USD');
  const cashPen=penAccounts.reduce((a,c)=>a+Number(c.balance||0),0), cashUsd=usdAccounts.reduce((a,c)=>a+Number(c.balance||0),0);
  const investedPen=investments.filter(i=>i.currency==='PEN').reduce((a,i)=>a+i.currentValue,0), investedUsd=investments.filter(i=>i.currency==='USD').reduce((a,i)=>a+i.currentValue,0);
  const debtPen=debts.filter(d=>!d.accountId || accounts.find(a=>a.id===d.accountId)?.currency==='PEN').reduce((a,d)=>a+d.balance,0);
  const debtUsd=debts.filter(d=>accounts.find(a=>a.id===d.accountId)?.currency==='USD').reduce((a,d)=>a+d.balance,0);
  const cardsUsed=cards.reduce((a,c)=>a+c.used,0), debtBalance=debts.reduce((a,d)=>a+d.balance,0), receivable=loans.reduce((a,l)=>a+l.balance,0);
  const realCosts=Math.max(0,gross+bonuses-net);
  const margin=gross?net/gross*100:0;
  const costPerKm=km?operatingCost/km:0;
  const topCost=energy>=maint?{label:'Combustible / energía',value:energy}:{label:'Mantenimiento',value:maint};
  const health=margin>=30?'Rentabilidad saludable':margin>=15?'Rentabilidad en observación':'Margen bajo';
  return <div className="reportsPage">
    <PageHead title="Reportes" desc="Una lectura histórica de rentabilidad, costos, deuda y desempeño para tomar mejores decisiones."/>
    <div className="reportPeriodBar"><span>Periodo histórico</span><div>{([["3m","3 meses"],["6m","6 meses"],["12m","12 meses"],["all","Todo"]] as const).map(([id,label])=><button key={id} className={period===id?"active":""} onClick={()=>setPeriod(id)}>{label}</button>)}</div><small>{start} → {end}</small></div>
    <div className="reportHero">
      <div><small>RESUMEN FINANCIERO</small><h2>{money(net)}</h2><p>Utilidad real registrada después de comisiones, combustible y otros costos.</p></div>
      <div className="reportHeroSide"><span>MARGEN REAL</span><strong>{pct(margin)}</strong><small>{health}</small></div>
    </div>
    <div className="stats reportStatsPremium">
      <Stat label="Ingreso bruto" value={money(gross)} sub={`${rs.length} jornadas en el periodo`} tone="green"/>
      <Stat label="Utilidad real" value={money(net)} sub={`Margen ${pct(margin)}`} tone={net>=0?'green':'red'}/>
      <Stat label="Costos operativos" value={money(realCosts)} sub={`Comisiones ${money(commissions)}`} tone="warn"/>
      <Stat label="Ganancia por hora" value={money(hours?net/hours:0)} sub={km?`Costo/km ${money(costPerKm)}`:'Sin kilometraje'} tone={net>=0?'green':'red'}/>
    </div>
    <div className="reportgrid">
      <CardBox title="Trabajo"><div className="reportDetailList"><Detail label="Ingreso bruto" value={money(gross)}/><Detail label="Comisiones" value={money(commissions)}/><Detail label="Bonos" value={money(bonuses)}/><Detail label="Horas trabajadas" value={num(hours)}/><Detail label="Kilómetros" value={num(km)}/></div></CardBox>
      <CardBox title="Vehículos"><div className="reportDetailList"><Detail label="Vehículos" value={String(vehicles.length)}/><Detail label="Energía registrada" value={money(energy)}/><Detail label="Mantenimiento" value={money(maint)}/><Detail label="Costo operativo" value={money(operatingCost)}/></div></CardBox>
      <CardBox title="Crédito"><div className="reportDetailList"><Detail label="Tarjetas · PEN" value={money(cards.filter(c=>c.currency==='PEN').reduce((a,c)=>a+c.used,0),'PEN')}/><Detail label="Deudas · PEN" value={money(debtPen,'PEN')}/><Detail label="Por cobrar · PEN" value={money(loans.filter(l=>accounts.find(a=>a.id===l.accountId)?.currency==='PEN'||!l.accountId).reduce((a,l)=>a+l.balance,0),'PEN')}/><Detail label="Tarjetas · USD" value={money(cards.filter(c=>c.currency==='USD').reduce((a,c)=>a+c.used,0),'USD')}/><Detail label="Deudas · USD" value={money(debtUsd,'USD')}/></div></CardBox>
    </div>
    <div className="grid2 reportCharts">
      <CardBox title="Resultado del trabajo"><div className="reportResultChart">
        <div className="reportResultIntro"><div><b>Cómo leerlo</b><span>Partimos del ingreso bruto y vemos cuánto queda después de los costos para obtener la utilidad real.</span></div><div className="reportResultLegend"><span><i className="resultDot gross"/>Ingreso bruto</span><span><i className="resultDot cost"/>Costos</span><span><i className="resultDot net"/>Utilidad</span></div></div>
        <div className="reportResultRows">
          <div className="reportResultRow"><div><b>Ingreso bruto</b><small>Todo lo generado antes de costos</small></div><div className="resultBarArea"><div className="resultTrack"><i className="gross" style={{width:`${gross?100:0}%`}}/></div><strong>{money(gross)}</strong></div></div>
          <div className="reportResultRow"><div><b>Costos</b><small>Comisiones + combustible + otros</small></div><div className="resultBarArea"><div className="resultTrack"><i className="cost" style={{width:`${gross?Math.min(100,realCosts/gross*100):0}%`}}/></div><strong>{money(realCosts)}</strong></div></div>
          <div className="reportResultRow resultNetRow"><div><b>Utilidad real</b><small>Lo que queda después de costos</small></div><div className="resultBarArea"><div className="resultTrack"><i className="net" style={{width:`${gross?Math.min(100,Math.abs(net)/gross*100):0}%`}}/></div><strong>{money(net)}</strong></div></div>
        </div>
        <div className="reportResultFormula"><span>{money(gross)}</span><b>−</b><span>{money(realCosts)}</span><b>=</b><strong>{money(net)}</strong></div>
      </div></CardBox>
      <CardBox title="Dónde se concentra el costo"><MetricBars data={[{label:"Combustible / energía",value:energy},{label:"Mantenimiento",value:maint}]}/><div className="reportCallout"><span>Mayor costo</span><b>{topCost.label}</b><small>{money(topCost.value)} registrados</small></div></CardBox>
    </div>
    <div className="reportCapitalGrid"><CardBox title="Liquidez y capital"><div className="reportCurrencyGrid"><div><span>PEN · Cuentas</span><b>{money(cashPen,'PEN')}</b><small>Saldo disponible registrado</small></div><div><span>USD · Cuentas</span><b>{money(cashUsd,'USD')}</b><small>Saldo disponible registrado</small></div><div><span>PEN · Inversiones</span><b>{money(investedPen,'PEN')}</b><small>Valor actual de inversiones</small></div><div><span>USD · Inversiones</span><b>{money(investedUsd,'USD')}</b><small>Valor actual de inversiones</small></div></div></CardBox><CardBox title="Metas y progreso"><div className="reportGoalList">{goals.slice(0,5).map(g=><div key={g.id}><div><b>{g.name}</b><span>{Math.round(g.target?Math.min(100,g.current/g.target*100):0)}%</span></div><div className="reportGoalTrack"><i style={{width:`${g.target?Math.min(100,Math.max(0,g.current/g.target*100)):0}%`}}/></div><small>{money(g.current,'PEN')} de {money(g.target,'PEN')}</small></div>)}{!goals.length&&<p className="reportMuted">Registra metas para incluir su progreso en los reportes.</p>}</div></CardBox></div>
    <div className="reportDecisionGrid">
      <CardBox title="Lectura para decidir"><div className="reportInsights"><div><span>01</span><div><b>{margin>=25?'Protege tu margen':'Revisa tu estructura de costos'}</b><p>{margin>=25?'La utilidad representa una parte sólida del ingreso bruto. Evita que nuevos costos fijos reduzcan ese margen.':`Tu margen actual es ${pct(margin)}. Revisa comisiones, combustible y otros costos antes de asumir nuevos compromisos.`}</p></div></div><div><span>02</span><div><b>{costPerKm?'Controla el costo por kilómetro':'Completa el kilometraje'}</b><p>{costPerKm?`Cada kilómetro representa aproximadamente ${money(costPerKm)} de costo operativo. Usa este indicador para comparar jornadas y vehículos.`:'Registra kilómetros en tus jornadas para que el reporte pueda medir eficiencia real.'}</p></div></div><div><span>03</span><div><b>{debtBalance+cardsUsed>receivable?'La deuda merece seguimiento':'Mantén controlada tu exposición'}</b><p>{debtBalance+cardsUsed>receivable?'Tarjetas y deudas pendientes superan lo que tienes por cobrar. Prioriza liquidez y evita financiar costos recurrentes.':'Tu exposición crediticia está compensada por lo que tienes por cobrar. Mantén el seguimiento de vencimientos.'}</p></div></div></div></CardBox>
      <CardBox title="Siguiente decisión"><div className="reportNext"><small>RECOMENDACIÓN</small><strong>{margin<15?'Reducir costos antes de crecer':energy>maint?'Optimizar combustible':'Planificar mantenimiento'}</strong><p>{margin<15?'Identifica las partidas que más reducen tu utilidad y establece un límite operativo.':energy>maint?'El combustible es tu mayor costo registrado. Compara jornadas, consumo y rendimiento por vehículo.':'El mantenimiento concentra el mayor costo registrado. Programa las intervenciones para evitar gastos correctivos mayores.'}</p></div></CardBox>
    </div>
  </div>
}
function Settings({notify}:{notify:(s:string)=>void}){
  const [settings,setSettings]=useState(()=>{
    try{return JSON.parse(localStorage.getItem("f360-settings")||"{}")||{}}catch{return {}}
  });
  const update=(patch:Record<string,unknown>)=>{
    const next={...settings,...patch}; setSettings(next); localStorage.setItem("f360-settings",JSON.stringify(next)); notify("Preferencias guardadas");
  };
  const [theme,setThemeState]=useState<"light"|"dark">(()=>{try{return (localStorage.getItem("f360-theme")||"light") as "light"|"dark"}catch{return "light"}});
  const setTheme=(value:"light"|"dark")=>{
    setThemeState(value); localStorage.setItem("f360-theme",value); document.documentElement.dataset.theme=value; notify(value==="dark"?"Tema oscuro activado":"Tema claro activado");
  };
  const exportData=()=>{
    const data:Record<string,unknown>={exportedAt:new Date().toISOString(),version:"FINANZAS 360",storage:{}};
    for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith("f360-")){try{(data.storage as Record<string,unknown>)[key]=JSON.parse(localStorage.getItem(key)||"null")}catch{(data.storage as Record<string,unknown>)[key]=localStorage.getItem(key)}}}
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`finanzas-360-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); notify("Copia de seguridad exportada");
  };
  const reset=()=>{if(!window.confirm("¿Restablecer todos los datos de demostración? Esta acción no se puede deshacer."))return; for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i);if(key?.startsWith("f360-"))localStorage.removeItem(key)} notify("Datos demo restablecidos"); setTimeout(()=>location.reload(),250)};
  const importData=async(e:React.ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text());const storage=parsed?.storage;if(!storage||typeof storage!=="object")throw new Error("Formato inválido");for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i);if(key?.startsWith("f360-"))localStorage.removeItem(key)}Object.entries(storage).forEach(([key,value])=>localStorage.setItem(key,typeof value==="string"?value:JSON.stringify(value)));notify("Copia restaurada");setTimeout(()=>location.reload(),500)}catch{notify("No se pudo restaurar la copia")}};

  const demoLogout=async()=>{sessionStorage.removeItem("f360-demo-session");try{await fetch("/api/auth/logout",{method:"POST"})}finally{location.replace("/login")}};
  return <div className="settingsPage">
    <PageHead title="Configuración" desc="Personaliza tu experiencia, protege tus datos y controla cómo funciona Finanzas 360."/>
    <div className="settingsGrid">
      <div className="settingsMain">
        <CardBox title="Apariencia">
          <div className="settingsRows">
            <div className="settingsRow"><div><b>Tema de la aplicación</b><small>Cambia la apariencia sin afectar tus datos.</small></div><div className="segmented"><button className={theme==="light"?"active":""} onClick={()=>setTheme("light")}>Claro</button><button className={theme==="dark"?"active":""} onClick={()=>setTheme("dark")}>Oscuro</button></div></div>
            <div className="settingsRow"><div><b>Reducir animaciones</b><small>Disminuye transiciones y movimientos para una experiencia más calmada.</small></div><button className={`switch ${settings.reducedMotion?"on":""}`} aria-pressed={!!settings.reducedMotion} onClick={()=>update({reducedMotion:!settings.reducedMotion})}><i/></button></div>
          </div>
        </CardBox>
        <CardBox title="Preferencias financieras">
          <div className="settingsRows">
            <div className="settingsRow"><div><b>Moneda principal</b><small>La interfaz utiliza esta moneda para mostrar importes.</small></div><span className="settingsValue">S/ · Sol peruano</span></div>
            <div className="settingsRow"><div><b>Inicio de semana</b><small>Define cómo se organizan vistas semanales y calendarios.</small></div><select value={settings.weekStart||"monday"} onChange={e=>update({weekStart:e.target.value})}><option value="monday">Lunes</option><option value="sunday">Domingo</option></select></div>
            <div className="settingsRow"><div><b>Confirmar acciones destructivas</b><small>Solicita confirmación antes de eliminar o restablecer información.</small></div><button className={`switch ${settings.confirmDanger!==false?"on":""}`} aria-pressed={settings.confirmDanger!==false} onClick={()=>update({confirmDanger:settings.confirmDanger===false})}><i/></button></div>
          </div>
        </CardBox>
        <CardBox title="Alertas y recordatorios">
          <div className="settingsRows">
            <div className="settingsRow"><div><b>Recordatorios financieros</b><small>Prepara el sistema para avisos de vencimientos, cobros y obligaciones.</small></div><button className={`switch ${settings.reminders!==false?"on":""}`} aria-pressed={settings.reminders!==false} onClick={()=>update({reminders:settings.reminders===false})}><i/></button></div>
            <div className="settingsRow"><div><b>Priorizar alertas críticas</b><small>Las alertas de mayor impacto aparecen primero.</small></div><button className={`switch ${settings.priorityAlerts!==false?"on":""}`} aria-pressed={settings.priorityAlerts!==false} onClick={()=>update({priorityAlerts:settings.priorityAlerts===false})}><i/></button></div>
          </div>
        </CardBox>
        <CardBox title="Datos y privacidad">
          <div className="settingsRows">
            <div className="settingsRow"><div><b>Modo datos de prueba</b><small>Esta versión guarda información localmente en tu navegador. No solicita CVV, PIN ni contraseñas bancarias.</small></div><span className="statusPill">Local</span></div>
            <div className="settingsRow"><div><b>Copias de seguridad</b><small>Exporta o restaura tus datos demo en formato JSON. La restauración reemplaza los datos locales actuales.</small></div><div className="quickActions"><Btn secondary onClick={exportData}>Exportar datos</Btn><label className="settingsUpload">Restaurar<input type="file" accept="application/json,.json" onChange={importData}/></label></div></div>
          </div>
        </CardBox>
      </div>
      <aside className="settingsSide">
        <CardBox title="Tu sistema">
          <div className="settingsSystem"><div><span>Versión</span><b>FINANZAS 360 v79</b></div><div><span>Almacenamiento</span><b>LocalStorage</b></div><div><span>Autenticación</span><b>Preparada para Supabase Auth</b></div><div><span>Estado</span><strong>● Demo local</strong></div></div>
        </CardBox>
        <CardBox title="Seguridad">
          <div className="settingsSecurity"><div className="securityIcon">✓</div><b>Datos sensibles protegidos</b><p>No guardes CVV, PIN, contraseñas ni claves bancarias dentro de notas o movimientos.</p></div>
        </CardBox>
        <CardBox title="Zona de riesgo">
          <div className="settingsDanger"><b>Restablecer datos demo</b><p>Elimina los datos guardados localmente y devuelve la aplicación a su estado inicial.</p><Btn danger onClick={reset}>Restablecer datos</Btn><button className="textDanger" onClick={demoLogout}>Cerrar sesión demo</button></div>
        </CardBox>
      </aside>
    </div>
    <CardBox title="Sobre Finanzas 360"><div className="settingsAbout"><div><b>Diseñado para decidir mejor.</b><p>La configuración centraliza tus preferencias sin esconder las acciones importantes. A medida que conectemos backend, aquí también podremos gestionar cuentas, sincronización, exportaciones y permisos.</p></div><Badge tone="neutral">Privacidad primero</Badge></div></CardBox>
  </div>
}
export default ReportsPage;
export { Settings };
