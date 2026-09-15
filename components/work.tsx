"use client";
import React, { useMemo, useState } from "react";
import type * as T from "@/types";
import * as UI from "@/components/ui";
import { money, num } from "@/lib/format";
const { Btn, CardBox, Stat, Pagination, PageHead } = UI;

function Work({sessions,bonuses,vehicles,quick,edit,remove,bonusOpen,removeBonus}:{sessions:T.WorkSession[];bonuses:T.Bonus[];vehicles:T.Vehicle[];quick:(s:string,d?:any)=>void;edit:(x:any)=>void;remove:(id:string|number)=>void;bonusOpen:(x:any)=>void;removeBonus:(id:number)=>void}){
 const [page,setPage]=useState(1), pageSize=8;
 const [pendingDelete,setPendingDelete]=useState<T.WorkSession|null>(null);
 const visible=sessions.slice((page-1)*pageSize,page*pageSize);
 const metrics=useMemo(()=>{
  const gross=sessions.reduce((a,s)=>a+s.gross,0), comm=sessions.reduce((a,s)=>a+s.commission,0), bonus=sessions.reduce((a,s)=>a+s.bonuses,0);
  const fuel=sessions.reduce((a,s)=>a+s.fuelCost,0), other=sessions.reduce((a,s)=>a+s.otherCost,0), hours=sessions.reduce((a,s)=>a+s.hours,0), km=sessions.reduce((a,s)=>a+s.km,0), trips=sessions.reduce((a,s)=>a+s.trips,0);
  const net=gross-comm+bonus-fuel-other; const afterCommission=gross-comm+bonus;
  return {gross,comm,bonus,fuel,other,cost:fuel+other,hours,km,trips,net,afterCommission,avgTrip:trips?net/trips:0,perHour:hours?net/hours:0,perKm:km?net/km:0};
 },[sessions]);
 const appTotals=useMemo(()=>{const m:Record<string,number>={};sessions.forEach(s=>s.apps.forEach(a=>m[a]=(m[a]||0)+s.gross));return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,4)},[sessions]);
 const costShare=metrics.gross?Math.round(metrics.cost/metrics.gross*100):0;
 return <div className="workPage">
  <PageHead title="Trabajo" desc="Mide cuánto produces, cuánto te cuesta trabajar y cuál es tu utilidad real por jornada." action="Nueva jornada" onAction={()=>quick("work")}/>
  <section className="workHero">
   <div><span className="eyebrow">RENTABILIDAD OPERATIVA</span><h2>{metrics.net>=0?"Tu trabajo está generando utilidad":"Revisa tus costos operativos"}</h2><p>El resultado considera ingresos, comisiones, bonos y costos registrados. Úsalo como referencia para decidir qué jornadas y aplicativos te convienen más.</p></div>
   <div className="workHeroValue"><span>Utilidad acumulada</span><strong className={metrics.net>=0?"green":"red"}>{money(metrics.net)}</strong><small>{money(metrics.perHour)} por hora · {money(metrics.avgTrip)} por viaje</small></div>
  </section>
  <div className="stats workStats">
   <Stat label="Ingreso bruto" value={money(metrics.gross)} sub="Facturación registrada" tone="green"/>
   <Stat label="Comisiones" value={money(metrics.comm)} sub="Apps"/>
   <Stat label="Bonos" value={money(metrics.bonus)} sub="Incentivos" tone="green"/>
   <Stat label="Costos" value={money(metrics.cost)} sub={`${metrics.fuel?money(metrics.fuel):money(0)} combustible`}/>
   <Stat label="Utilidad" value={money(metrics.net)} sub="Resultado real" tone={metrics.net>=0?"green":"red"}/>
   <Stat label="Utilidad / hora" value={money(metrics.perHour)} sub={`${metrics.hours.toFixed(1)} horas`} tone="green"/>
  </div>
  <div className="workGrid workGridTop">
   <CardBox title="Economía de una jornada"><div className="economics"><div className="economicsBar"><i style={{width:`${metrics.gross?Math.max(0,Math.min(100,(metrics.gross-metrics.cost)/metrics.gross*100)):0}%`}}/></div><div className="economicsLegend"><span><i className="dot incomeDot"/>Ingreso <b>{money(metrics.gross)}</b></span><span><i className="dot costDot"/>Costos <b>{money(metrics.cost)}</b></span><span><i className="dot commissionDot"/>Comisiones <b>{money(metrics.comm)}</b></span></div><div className="workMiniGrid"><div><small>Margen neto</small><b>{metrics.gross?Math.round(metrics.net/metrics.gross*100):0}%</b></div><div><small>Costo / ingreso</small><b>{costShare}%</b></div><div><small>Costo / km</small><b>{money(metrics.perKm)}</b></div></div></div></CardBox>
   <CardBox title="Aplicativos que generan ingresos"><div className="appList">{appTotals.length?appTotals.map(([app,value])=>{const share=metrics.gross?value/metrics.gross*100:0;return <div className="appRow" key={app}><div><b>{app}</b><small>{Math.round(share)}% de facturación</small></div><strong>{money(value)}</strong><div className="appTrack"><i style={{width:`${Math.min(100,share)}%`}}/></div></div>}):<div className="chartEmpty">Registra jornadas para comparar aplicativos.</div>}</div></CardBox>
  </div>
  <CardBox title={`Jornadas · ${sessions.length}`} action="Nueva jornada" onAction={()=>quick("work")}>
   <div className="workTableWrap"><div className="workTable"><div className="workThead"><span>Fecha</span><span>Jornada</span><span>Vehículo</span><span>Resultado</span><span></span></div>{visible.map(s=>{const vehicle=vehicles.find(v=>v.id===s.vehicleId);const result=s.gross-s.commission+s.bonuses-s.fuelCost-s.otherCost;return <div className="workTr" key={s.id}><span className="workDate">{s.date}</span><span><b>{s.start} – {s.end}</b><small>{s.hours.toFixed(1)} h · {num(s.km)} km · {s.trips} viajes</small></span><span><b>{vehicle?`${vehicle.brand} ${vehicle.model}`:"Sin vehículo"}</b><small>{vehicle?.plate||"—"}</small></span><span><b className={result>=0?"green":"red"}>{money(result)}</b><small>{s.apps.join(" + ")} · bruto {money(s.gross)}</small></span><span className="workActions"><button onClick={()=>edit(s)}>Editar</button><button className="dangerText" onClick={()=>setPendingDelete(s)}>Eliminar</button></span></div>})}</div></div>
   {sessions.length===0&&<div className="workEmpty"><b>Registra tu primera jornada</b><span>Guarda horas, viajes, ingresos y costos para empezar a medir tu rentabilidad.</span><Btn onClick={()=>quick("work")}>Registrar jornada</Btn></div>}
   <Pagination page={page} pages={Math.ceil(sessions.length/pageSize)} onChange={setPage} total={sessions.length} label="jornadas"/>
  </CardBox>
  {pendingDelete&&<div className="confirmOverlay" onMouseDown={()=>setPendingDelete(null)}><div className="confirmModal" onMouseDown={e=>e.stopPropagation()}><div className="confirmIcon">!</div><span className="eyebrow">CONFIRMAR ACCIÓN</span><h3>¿Eliminar esta jornada?</h3><p>Se eliminará el registro del {pendingDelete.date} y dejará de participar en tus indicadores de trabajo. Esta acción no se puede deshacer.</p><div className="confirmSummary"><span>{pendingDelete.start} – {pendingDelete.end}</span><b>{money(pendingDelete.gross)}</b></div><div className="confirmActions"><Btn secondary onClick={()=>setPendingDelete(null)}>Cancelar</Btn><Btn danger onClick={()=>{remove(pendingDelete.id);setPendingDelete(null)}}>Eliminar jornada</Btn></div></div></div>}
  <div className="workGrid workGridBottom">
   <CardBox title="Bonos por aplicativo" action="Registrar bono" onAction={()=>quick("bonus")}>{bonuses.length?bonuses.map(b=><div className="bonusRow" key={b.id}><div><b>{b.app}</b><span>{b.name}</span></div><strong>{money(b.amount)}</strong><small>{b.achieved}/{b.target} viajes · {b.status} · {b.date}</small><div><button className="link" onClick={()=>bonusOpen(b)}>Editar</button><button className="link dangerText" onClick={()=>removeBonus(b.id)}>Eliminar</button></div></div>):<div className="workEmpty compact"><b>Aún no hay bonos registrados</b><span>Registra metas de viajes para medir cuánto aportan a tu utilidad.</span><Btn secondary onClick={()=>quick("bonus")}>Registrar bono</Btn></div>}</CardBox>
   <CardBox title="Indicadores operativos"><div className="operatorGrid"><div><span>Horas trabajadas</span><b>{metrics.hours.toFixed(1)} h</b></div><div><span>Kilómetros</span><b>{num(metrics.km)} km</b></div><div><span>Viajes</span><b>{num(metrics.trips)}</b></div><div><span>Ingreso / viaje</span><b>{money(metrics.trips?metrics.gross/metrics.trips:0)}</b></div><div><span>Ingreso / km</span><b>{money(metrics.km?metrics.gross/metrics.km:0)}</b></div><div><span>Jornadas</span><b>{sessions.length}</b></div></div></CardBox>
  </div>
 </div>
}
export default Work;
