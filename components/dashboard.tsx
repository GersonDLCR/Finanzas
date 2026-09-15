"use client";
import React from "react";
import type * as T from "@/types";
import * as UI from "@/components/ui";
import { money, num, pct } from "@/lib/format";
import { DonutChart } from "@/components/charts";
import { movementTotals } from "@/lib/finance/engine";
import { filterPeriod, periodBounds } from "@/lib/finance/domain";
import { today } from "@/lib/format";
const { Btn, CardBox, Stat, Detail, PageHead } = UI;

function Dashboard({movements,vehicles,cards,loans,debts,go,quick,goals,snapshot,accountBalances,cashForecast}:{movements:T.Movement[];vehicles:T.Vehicle[];cards:T.Card[];loans:T.Loan[];debts:T.Debt[];go:(s:T.Section)=>void;quick:(s:string,d?:any)=>void;goals:T.Goal[];snapshot:T.FinancialSnapshot;accountBalances:T.FinancialAccount[];cashForecast:{days:number;current:number;scheduledInflows:number;scheduledOutflows:number;projected:number;minimumBuffer:number}}){
 const bounds=periodBounds("month",today); const current=filterPeriod(movements,bounds.start,bounds.end); const totals=movementTotals(current), income=snapshot.incomeByCurrency?.PEN??totals.income, expense=snapshot.expensesByCurrency?.PEN??totals.expenses, available=income-expense;
 const liquidity=accountBalances.filter(x=>x.currency==="PEN").reduce((a,x)=>a+x.balance,0);
 const lent=loans.reduce((a,x)=>a+x.balance,0), ownDebt=debts.reduce((a,x)=>a+x.balance,0), cardDebt=cards.reduce((a,x)=>a+x.used,0);
 const net=snapshot.netWorth;
 const categories=Object.entries(current.filter(x=>x.type==="Gasto").reduce((a,x)=>(a[x.category]=(a[x.category]||0)+x.amount,a),{} as Record<string,number>)).sort((a,b)=>b[1]-a[1]).map(([label,value])=>({label,value}));
 const work=current.filter(x=>x.work&&x.type==="Gasto").reduce((a,x)=>a+x.amount,0);
 const debtRatio=income>0?((ownDebt+cardDebt)/income)*100:0;
 const savingsRate=Number.isFinite(snapshot.savingsRate)?snapshot.savingsRate:(income>0?available/income*100:0);
 const recent=movements.slice(0,6);
 const trend=movements.slice(0,10).reverse().map((m)=>m.type==="Ingreso"?m.amount:-m.amount);
 const visibleGoals=goals.slice(0,3);
 const topCategory=categories[0];
 const forecast=cashForecast;
 return <>
  <PageHead title="Dashboard" desc="Una lectura clara de tu dinero, compromisos y próximos movimientos." action="Registrar movimiento" onAction={()=>quick("movement")}/>

  <section className="dashboardHero">
   <div><span className="eyebrow">SALUD FINANCIERA</span><h2>{available>=0?"Tienes flujo positivo":"Tu flujo está en negativo"}</h2><p>{available>=0?"Tu dinero disponible después de gastos registrados es el punto de partida para decidir qué hacer con él.":"Tus gastos superan los ingresos registrados. Revisa primero gastos variables y obligaciones próximas."}</p></div>
   <div className="heroBalance"><span>Disponible</span><strong className={available>=0?"green":"red"}>{money(Math.abs(available))}</strong><small>{available>=0?"saldo operativo estimado":"déficit del periodo"}</small></div>
  </section>

  <div className="stats dashboardStats">
   <Stat label="Liquidez actual" value={money(liquidity,"PEN")} sub="Cuentas + efectivo · PEN" tone="green"/>
   <Stat label="Flujo del mes" value={money(available)} sub="Ingresos − gastos" tone={available>=0?"green":"red"}/>
   <Stat label="Ingresos" value={money(income)} sub="Registrados este mes" tone="green"/>
   <Stat label="Gastos" value={money(expense)} sub="Consumo registrado"/>
   <Stat label="Deuda total" value={money(ownDebt+cardDebt)} sub="Préstamos + tarjetas" tone="red"/>
   <Stat label="Patrimonio" value={money(net)} sub="Activos − pasivos" tone="green"/>
  </div>

  <div className="dashboardGrid dashboardGridPulse">
   <CardBox title="Pulso financiero" action="Ver reportes" onAction={()=>go("reportes")}>
    <div className="pulseGrid">
     <div className="pulseItem"><span>Tasa de ahorro</span><strong className={savingsRate>=0?"green":"red"}>{pct(savingsRate)}</strong><small>{savingsRate>=20?"Buen margen para objetivos":"Revisa gastos variables"}</small></div>
     <div className="pulseItem"><span>Deuda / ingreso</span><strong className={debtRatio<=35?"green":debtRatio<=50?"":"red"}>{pct(debtRatio)}</strong><small>{debtRatio<=35?"Nivel controlado":"Prioriza obligaciones"}</small></div>
     <div className="pulseItem"><span>Utilización de tarjetas</span><strong className={snapshot.cardUtilization<=30?"green":snapshot.cardUtilization<=70?"":"red"}>{pct(snapshot.cardUtilization)}</strong><small>{snapshot.cardUtilization<=30?"Espacio saludable":"Evita seguir cargando deuda"}</small></div>
     <div className="pulseItem"><span>Me deben</span><strong className="blue">{money(lent)}</strong><small>Capital pendiente por cobrar</small></div>
    </div>
   </CardBox>
   <CardBox title="Decisiones rápidas">
    <div className="decisionList">
     <button onClick={()=>go("deudas")}><span className="decisionIcon">↘</span><div><b>Revisar deudas</b><small>{money(ownDebt+cardDebt)} pendientes</small></div><span>›</span></button>
     <button onClick={()=>go("prestamos")}><span className="decisionIcon">↗</span><div><b>Recuperar préstamos</b><small>{money(lent)} por cobrar</small></div><span>›</span></button>
     <button onClick={()=>go("presupuesto")}><span className="decisionIcon">◎</span><div><b>Revisar presupuesto</b><small>{topCategory?`${topCategory.label} concentra ${pct(topCategory.value/Math.max(expense,1)*100)}`:"Sin categorías aún"}</small></div><span>›</span></button>
    </div>
   </CardBox>
  </div>

  <CardBox title="Pronóstico de liquidez · 30 días"><div className="forecastMini"><div><span>Ingresos programados</span><b className="green">{money(forecast.scheduledInflows)}</b></div><div><span>Salidas programadas</span><b className="red">{money(forecast.scheduledOutflows)}</b></div><div><span>Saldo proyectado</span><b className={forecast.projected>=0?"green":"red"}>{money(forecast.projected)}</b></div><div><span>Mínimo estimado</span><b className={forecast.minimumBuffer>=0?"green":"red"}>{money(forecast.minimumBuffer)}</b></div></div><p className="mutedText">El pronóstico comparte el motor de eventos del calendario para evitar cifras o fechas desconectadas.</p></CardBox>

  <div className="dashboardGrid dashboardGridMain">
   <CardBox title="Flujo de dinero" action="Ver finanzas" onAction={()=>go("finanzas")}>
    <div className="cashflowChart">
      <div className="cashflowIntro"><div><span>Resultado del periodo</span><b className={available>=0?"green":"red"}>{available>=0?"+":"−"}{money(Math.abs(available))}</b></div><p>Compara lo que entró, lo que salió y cuánto quedó durante el mes actual. La longitud de cada barra representa su proporción respecto al mayor valor.</p></div>
      <div className="cashflowLegend"><span><i className="cashDot income"/>Ingresos</span><span><i className="cashDot expense"/>Gastos</span><span><i className="cashDot net"/>Neto</span></div>
      <div className="cashflowRows">
       <div className="cashflowRow"><div><b>Ingresos</b><small>Dinero que entró</small></div><div className="cashflowTrack"><i className="income" style={{width:`${income?Math.max(8,income/Math.max(income,expense)*100):8}%`}}/></div><strong className="green">{money(income)}</strong></div>
       <div className="cashflowRow"><div><b>Gastos</b><small>Dinero que salió</small></div><div className="cashflowTrack"><i className="expense" style={{width:`${expense?Math.max(8,expense/Math.max(income,expense)*100):8}%`}}/></div><strong className="red">{money(expense)}</strong></div>
       <div className="cashflowRow"><div><b>Neto</b><small>Lo que quedó</small></div><div className="cashflowTrack"><i className="net" style={{width:`${available?Math.max(8,Math.abs(available)/Math.max(income,expense)*100):8}%`}}/></div><strong className={available>=0?"green":"red"}>{available>=0?"+":"−"}{money(Math.abs(available))}</strong></div>
      </div>
    </div>
   </CardBox>
   <CardBox title="Distribución de gastos" action="Presupuesto" onAction={()=>go("presupuesto")}>
    <DonutChart items={categories.slice(0,6)} total={expense}/>
    {topCategory&&<div className="insight"><span>Mayor categoría</span><b>{topCategory.label}</b><small>{money(topCategory.value)} · {pct(topCategory.value/Math.max(expense,1)*100)}</small></div>}
   </CardBox>
  </div>

  <div className="dashboardGrid dashboardGridSecondary">
   <CardBox title="Señales para hoy"><div className="signalList">
    <div className="signal"><span className="signalIcon">↗</span><div><b>Gasto laboral</b><small>{money(work)} registrados como costo de trabajo.</small></div></div>
    <div className="signal"><span className="signalIcon">$</span><div><b>Obligaciones</b><small>{money(ownDebt+cardDebt)} pendientes entre deudas y tarjetas.</small></div></div>
    <div className="signal"><span className="signalIcon">◎</span><div><b>Dinero prestado</b><small>{money(lent)} todavía por recuperar.</small></div></div>
   </div></CardBox>
   <CardBox title="Metas en progreso" action="Ver ahorros" onAction={()=>go("ahorros")}>
    {visibleGoals.length?visibleGoals.map(g=>{const progress=Math.min(100,g.target?g.current/g.target*100:0);return <div className="goalRow" key={g.id}><div><b>{g.name}</b><span>{money(g.current)} de {money(g.target)}</span></div><div className="goalTrack"><i style={{width:`${progress}%`}}/></div><small>{Math.round(progress)}% · vence {g.deadline}</small></div>}):<div className="chartEmpty">Crea una meta para empezar a medir progreso.</div>}
   </CardBox>
  </div>

  <CardBox title="Actividad reciente" action="Ver todos" onAction={()=>go("finanzas")}>
   <div className="activityList">{recent.length?recent.map(m=><div className="activity" key={m.id}><span className={`activityIcon ${m.type==="Ingreso"?"in":"out"}`}>{m.type==="Ingreso"?"↗":"↘"}</span><div><b>{m.concept}</b><small>{m.date} · {m.category} · {m.method}</small></div><strong className={m.type==="Ingreso"?"green":""}>{m.type==="Ingreso"?"+":"−"}{money(m.amount)}</strong></div>):<div className="chartEmpty">Todavía no hay movimientos registrados.</div>}</div>
  </CardBox>

  <div className="dashboardGrid dashboardGridTertiary">
   <CardBox title="Vehículos" action="Ver vehículos" onAction={()=>go("vehiculos")}>
    {vehicles.slice(0,3).map(v=><div className="compactRow" key={v.id}><div><b>{v.brand} {v.model}</b><small>{v.plate} · {num(v.km)} km</small></div><span>{money(v.value)}</span></div>)}
    {!vehicles.length&&<div className="chartEmpty">No hay vehículos registrados.</div>}
   </CardBox>
   <CardBox title="Cobros pendientes" action="Préstamos" onAction={()=>go("prestamos")}>
    {loans.filter(l=>l.balance>0).slice(0,3).map(l=><div className="compactRow" key={l.id}><div><b>{l.borrower}</b><small>Próximo {l.nextPayment}</small></div><span>{money(l.balance)}</span></div>)}
    {!loans.filter(l=>l.balance>0).length&&<div className="chartEmpty">No tienes cobros pendientes.</div>}
   </CardBox>
   <CardBox title="Acciones rápidas"><div className="quickActions"><Btn onClick={()=>quick("movement")}>＋ Movimiento</Btn><Btn secondary onClick={()=>quick("work")}>＋ Jornada</Btn><Btn secondary onClick={()=>quick("fuel")}>＋ Combustible</Btn><Btn secondary onClick={()=>quick("debt-payment")}>＋ Pago de deuda</Btn></div></CardBox>
  </div>
 </>
}
export default Dashboard;
