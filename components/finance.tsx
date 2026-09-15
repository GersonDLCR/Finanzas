"use client";
import React, { useMemo, useState } from "react";
import type * as T from "@/types";
import * as UI from "@/components/ui";
import { money } from "@/lib/format";
import { DonutChart, MetricBars, TrendBars } from "@/components/charts";
const { Btn, Badge, CardBox, Stat, Pagination, PageHead } = UI;

function Finance({movements,accounts,accountBalances,open,remove}:{movements:T.Movement[];accounts:T.FinancialAccount[];accountBalances:T.FinancialAccount[];open:(m:string,d?:any)=>void;remove:(id:number|string)=>void}){
 const [page,setPage]=useState(1), pageSize=10;
 const [query,setQuery]=useState(""), [type,setType]=useState("Todos"), [category,setCategory]=useState("Todas");
 const categories=useMemo(()=>Array.from(new Set(movements.map(m=>m.category).filter(Boolean))).sort(),[movements]);
 const filtered=useMemo(()=>movements.filter(m=>{
   const q=query.trim().toLowerCase();
   return (!q || `${m.concept} ${m.category} ${m.method}`.toLowerCase().includes(q)) &&
     (type==="Todos" || m.type===type) && (category==="Todas" || m.category===category);
 }),[movements,query,type,category]);
 const visible=filtered.slice((page-1)*pageSize,page*pageSize);
 const analytics=movements.filter(m=>(m.currency||"PEN")==="PEN"&&m.status!=="Anulado");
 const analyticsUsd=movements.filter(m=>(m.currency||"PEN")==="USD"&&m.status!=="Anulado");
 const metrics=useMemo(()=>{
   const income=analytics.filter(m=>m.type==="Ingreso").reduce((a,m)=>a+m.amount,0);
   const expense=analytics.filter(m=>m.type==="Gasto").reduce((a,m)=>a+m.amount,0);
   const workIncome=analytics.filter(m=>m.type==="Ingreso"&&m.work).reduce((a,m)=>a+m.amount,0);
   const workExpense=analytics.filter(m=>m.type==="Gasto"&&m.work).reduce((a,m)=>a+m.amount,0);
   const net=income-expense, rate=income?net/income*100:0;
   return {income,expense,net,rate,workIncome,workExpense,workNet:workIncome-workExpense};
 },[movements]);
 const monthly=useMemo(()=>{
   const map=new Map<string,{income:number;expense:number}>();
   [...analytics].sort((a,b)=>a.date.localeCompare(b.date)).forEach(m=>{const key=m.date.slice(0,7);const x=map.get(key)||{income:0,expense:0};m.type==="Ingreso"?x.income+=m.amount:x.expense+=m.amount;map.set(key,x)});
   return Array.from(map.entries()).slice(-6).map(([label,x])=>({label:label.slice(5),value:x.income,secondary:x.expense}));
 },[movements]);
 const categoryData=useMemo(()=>{const map:Record<string,number>={};analytics.filter(m=>m.type==="Gasto").forEach(m=>map[m.category]=(map[m.category]||0)+m.amount);return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([label,value])=>({label,value}));},[movements]);
 const workShare=metrics.income?Math.round(metrics.workIncome/metrics.income*100):0;
 return <div className="financePage">
  <PageHead title="Finanzas" desc="Registra y entiende cada movimiento para saber cuánto entra, cuánto sale y dónde puedes tomar mejores decisiones." action="Nuevo movimiento" onAction={()=>open("movement")}/>
  <CardBox title="Cuentas y liquidez" action="Nueva cuenta" onAction={()=>open("account")}><div className="compactRowGrid">{accountBalances.map(a=><div className="compactRow" key={a.id}><div><b>{a.name}</b><small>{a.type} · {a.currency}</small></div><strong>{money(a.balance,a.currency)}</strong></div>)}{!accountBalances.length&&<div className="chartEmpty">Registra una cuenta para controlar liquidez real.</div>}</div><div className="quickActions"><Btn secondary onClick={()=>open("transfer")}>↔ Transferir entre cuentas</Btn></div></CardBox>
  <div className="stats financeStats">
   <Stat label="Ingresos" value={money(metrics.income)} sub="Entradas del periodo" tone="green"/>
   <Stat label="Gastos" value={money(metrics.expense)} sub="Salidas del periodo"/>
   <Stat label="Saldo neto" value={money(metrics.net)} sub={metrics.net>=0?"Superávit del periodo":"Déficit del periodo"} tone={metrics.net>=0?"green":"red"}/>
   <Stat label="Tasa de ahorro" value={`${metrics.rate.toFixed(1)}%`} sub="Neto / ingresos" tone={metrics.rate>=0?"green":"red"}/>
  </div>
  {analyticsUsd.length>0&&<div className="currencyNote"><b>Actividad USD separada</b><span>{money(analyticsUsd.filter(m=>m.type==="Ingreso").reduce((a,m)=>a+m.amount,0),"USD")} de ingresos · {money(analyticsUsd.filter(m=>m.type==="Gasto").reduce((a,m)=>a+m.amount,0),"USD")} de gastos. No se convierte automáticamente a PEN.</span></div>}
  <section className="financeInsight"><div className="insightIcon">↗</div><div><b>{metrics.net>=0?"Tu flujo es positivo":"Tu flujo requiere atención"}</b><span>{metrics.net>=0?`Conservas ${money(metrics.net)} después de tus gastos. Una tasa de ahorro de ${metrics.rate.toFixed(1)}% es tu principal indicador de control.`:`Tus gastos superan tus ingresos en ${money(Math.abs(metrics.net))}. Revisa primero las categorías de mayor impacto y los gastos no esenciales.`}</span></div><div className="insightMetric"><small>Gasto / ingreso</small><strong>{metrics.income?(metrics.expense/metrics.income*100).toFixed(1):"0.0"}%</strong></div></section>
  <div className="financeGrid financeCharts">
   <CardBox title="Ingresos vs. gastos"><div className="financeChartPad"><TrendBars data={monthly} title="Últimos 6 meses" mode="finance"/></div></CardBox>
   <CardBox title="En qué se va tu dinero"><div className="financeChartPad"><DonutChart items={categoryData} total={metrics.expense}/></div></CardBox>
  </div>
  <div className="financeGrid financeDecisionGrid">
   <CardBox title="Categorías de mayor impacto"><div className="financeChartPad"><MetricBars data={categoryData}/></div></CardBox>
   <CardBox title="Trabajo dentro de tus finanzas"><div className="decisionPanel"><div className="decisionNumbers"><div><small>Ingresos laborales</small><b>{money(metrics.workIncome)}</b></div><div><small>Gastos laborales</small><b>{money(metrics.workExpense)}</b></div><div><small>Resultado laboral</small><b className={metrics.workNet>=0?"green":"red"}>{money(metrics.workNet)}</b></div></div><div className="decisionTrack"><i style={{width:`${Math.min(100,workShare)}%`}}/></div><p>{workShare}% de tus ingresos están marcados como laborales. Esto ayuda a separar la rentabilidad del trabajo de tus finanzas personales.</p><Badge tone={metrics.workNet>=0?"green":"red"}>{metrics.workNet>=0?"Actividad laboral positiva":"Revisar costos laborales"}</Badge></div></CardBox>
  </div>
  <CardBox title={`Movimientos · ${filtered.length}`} action="Nuevo movimiento" onAction={()=>open("movement")}>
   <div className="financeToolbar"><div className="financeSearch"><span>⌕</span><input value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder="Buscar concepto, categoría o método…"/></div><select value={type} onChange={e=>{setType(e.target.value);setPage(1)}}><option>Todos</option><option>Ingreso</option><option>Gasto</option></select><select value={category} onChange={e=>{setCategory(e.target.value);setPage(1)}}><option>Todas</option>{categories.map(c=><option key={c}>{c}</option>)}</select></div>
   <div className="table financeTable financeResultsArea"><div className="thead"><span>Fecha</span><span>Movimiento</span><span>Categoría</span><span>Método</span><span>Importe</span><span>Acciones</span></div>{visible.map(m=><div className="tr" key={m.id}><span>{m.date}</span><span><b>{m.concept}</b>{m.work&&<Badge tone="blue">Laboral</Badge>}</span><span>{m.category}</span><span>{m.method}</span><span><b className={m.type==="Ingreso"?"green":"red"}>{m.type==="Ingreso"?"+":"−"}{money(m.amount,m.currency||"PEN")}</b></span><span className="actions"><button onClick={()=>open("movement",m)} title="Editar movimiento">Editar</button><button className="dangerText" onClick={()=>remove(m.id)} title="Eliminar movimiento">Eliminar</button></span></div>)}</div>
   {!visible.length&&<div className="emptyState financeEmpty"><h2>No encontramos movimientos</h2><p>Prueba con otros filtros o registra un nuevo movimiento.</p><Btn onClick={()=>open("movement")}>Registrar movimiento</Btn></div>}
   <Pagination page={page} pages={Math.max(1,Math.ceil(filtered.length/pageSize))} onChange={setPage} total={filtered.length} label="movimientos"/>
  </CardBox>
  <div className="financeFootnote"><span>💡</span><p><b>Regla de decisión:</b> no mires solo el gasto total. Prioriza las categorías que crecen, los gastos recurrentes y aquellos que reducen tu capacidad de ahorro.</p></div>
 </div>
}
export default Finance;
