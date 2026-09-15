"use client";
import React, { useMemo, useState } from "react";
import type * as T from "@/types";
import * as UI from "@/components/ui";
import { money, pct } from "@/lib/format";
const { Btn, Badge, Field, CardBox, Stat, Modal, PageHead } = UI;

type Props={cards:T.Card[];operations:T.CardOperation[];open:(m:string,d?:any)=>void;remove:(id:number)=>void;removeCard:(id:string)=>void;simulate:(s:string)=>void};

function CardsPage({cards,operations,open,remove,removeCard,simulate}:Props){
 const [selected,setSelected]=useState(cards[0]?.id||"");
 const activeCards=cards.filter(c=>c.status==="Activa");
 const currencyTotals=useMemo(()=>({
   PEN:cards.filter(c=>c.currency==="PEN").reduce((a,c)=>({line:a.line+c.line,used:a.used+c.used}),{line:0,used:0}),
   USD:cards.filter(c=>c.currency==="USD").reduce((a,c)=>({line:a.line+c.line,used:a.used+c.used}),{line:0,used:0})
  }),[cards]);
 const totalLine=currencyTotals.PEN.line;
 const totalUsed=currencyTotals.PEN.used;
 const available=Math.max(0,totalLine-totalUsed);
 const utilization=totalLine?totalUsed/totalLine*100:0;
 const selectedCard=cards.find(c=>c.id===selected)||cards[0];
 const cardOps=useMemo(()=>selectedCard?operations.filter(o=>o.cardId===selectedCard.id):[],[operations,selectedCard]);
 const opTotals=useMemo(()=>({charges:cardOps.filter(o=>o.type!=="Pago").reduce((a,o)=>a+o.amount+o.fee,0),payments:cardOps.filter(o=>o.type==="Pago").reduce((a,o)=>a+o.amount,0),purchases:cardOps.filter(o=>o.type==="Compra").reduce((a,o)=>a+o.amount+o.fee,0)}),[cardOps]);
 const utilizationTone=utilization>=80?"red":utilization>=60?"": "green";
 return <div className="cardsPage">
  <PageHead title="Tarjetas de crédito" desc="Controla utilización, costos, compras, pagos y decisiones de crédito sin perder de vista tu liquidez." action="Agregar tarjeta" onAction={()=>open("card")}/>

  <div className="stats cardStats">
   <Stat label="Línea total PEN" value={money(currencyTotals.PEN.line,"PEN")} sub={`${cards.filter(c=>c.currency==="PEN").length} tarjetas en PEN`}/>
   <Stat label="Deuda usada PEN" value={money(currencyTotals.PEN.used,"PEN")} sub={`${pct(utilization)} de utilización`} tone={utilizationTone}/>
   <Stat label="Línea total USD" value={money(currencyTotals.USD.line,"USD")} sub={`${cards.filter(c=>c.currency==="USD").length} tarjetas en USD`}/>
   <Stat label="Deuda usada USD" value={money(currencyTotals.USD.used,"USD")} sub="Se mantiene separada de PEN" tone={currencyTotals.USD.used>currencyTotals.USD.line*.8?"red":"green"}/>
  </div>

  <div className="cardDecisionGrid">
   <CardBox title="Lectura rápida" action="Nueva operación" onAction={()=>open("card-operation")}>
    <div className="creditOverview">
     <div className="creditOverviewMain">
      <span>Uso global de líneas</span>
      <strong>{pct(utilization)}</strong>
      <div className="creditProgress"><i style={{width:`${Math.min(100,utilization)}%`}}/></div>
      <small>{money(totalUsed,"PEN")} usados de {money(totalLine,"PEN")} · {money(available,"PEN")} disponibles · vista global PEN</small>
     </div>
     <div className="creditSignals">
      <div><span>Compras registradas</span><b>{money(opTotals.purchases,selectedCard?.currency||"PEN")}</b></div>
      <div><span>Pagos registrados</span><b className="greenText">{money(opTotals.payments,selectedCard?.currency||"PEN")}</b></div>
      <div><span>Tarjetas activas</span><b>{activeCards.length}</b></div>
     </div>
    </div>
    <div className="decisionNote"><b>{utilization>=80?"Utilización alta":utilization>=60?"Utilización moderada":"Buen margen disponible"}</b><span>{utilization>=80?"Prioriza pagos y evita nuevas compras no esenciales hasta recuperar margen.":utilization>=60?"Vigila nuevas compras si tienes pagos próximos o gastos variables altos.":"Tienes margen para operar, pero conviene mantener una reserva de crédito."}</span></div>
   </CardBox>

   <CardBox title="Tarjeta seleccionada">
    {selectedCard?<>
      <div className="selectedCredit">
       <div className="selectedCreditTop"><span>{selectedCard.bank} · {selectedCard.currency}</span><b>•••• {selectedCard.last4}</b></div>
       <small>{selectedCard.product}</small>
       <strong>{money(selectedCard.used,selectedCard.currency)}</strong>
       <div className="creditProgress"><i style={{width:`${Math.min(100,selectedCard.line?selectedCard.used/selectedCard.line*100:0)}%`}}/></div>
       <div className="selectedCreditMeta"><span>Disponible <b>{money(Math.max(0,selectedCard.line-selectedCard.used),selectedCard.currency)}</b></span><span>Uso <b>{pct(selectedCard.line?selectedCard.used/selectedCard.line*100:0)}</b></span></div>
       <div className="selectedCreditDates"><span>Cierre <b>{selectedCard.closing || "—"}</b></span><span>Pago <b>{selectedCard.payment || "—"}</b></span></div>
      </div>
      <div className="miniDetails"><span>TEA <b>{selectedCard.tea}%</b></span><span>TCEA <b>{selectedCard.tcea}%</b></span><span>Membresía <b>{money(selectedCard.membership,selectedCard.currency)}</b></span></div>
     </>:<div className="emptyState compact"><b>No hay tarjetas</b><span>Registra una tarjeta para comenzar.</span></div>}
   </CardBox>
  </div>

  <section className="creditWallet">
   <div className="cardhead"><div><h3>Tus tarjetas</h3><p>Selecciona una para revisar su utilización y operaciones.</p></div><button onClick={()=>open("card")}>Agregar tarjeta →</button></div>
   {cards.length===0?<div className="emptyState"><b>No tienes tarjetas registradas</b><span>Agrega tu primera tarjeta para controlar línea, deuda y costos.</span><Btn onClick={()=>open("card")}>＋ Agregar tarjeta</Btn></div>:<div className="creditCardsGrid">{cards.map(c=>{
    const use=c.line?c.used/c.line*100:0;
    return <article className={`creditCardVisual ${selectedCard?.id===c.id?"selected":""}`} key={c.id} onClick={()=>setSelected(c.id)}>
      <div className="creditCardGlow"/>
      <div className="creditCardTop"><div><b>{c.bank}</b><small>{c.product} · {c.currency}</small></div><span>{c.status}</span></div>
      <div className="creditChip"><i/><i/><i/><i/></div>
      <div className="creditNumber">•••• &nbsp;•••• &nbsp;•••• &nbsp;{c.last4}</div>
      <div className="creditCardBottom"><div><small>UTILIZADA</small><strong>{money(c.used,c.currency)}</strong></div><div><small>LÍNEA</small><strong>{money(c.line,c.currency)}</strong></div><div className="creditPct">{pct(use)}</div></div>
      <div className="creditCardSchedule"><span>Cierre <b>{c.closing || "—"}</b></span><span>Pago <b>{c.payment || "—"}</b></span></div><div className="creditCardActions"><button onClick={e=>{e.stopPropagation();open("card",c)}}>Editar</button><button onClick={e=>{e.stopPropagation();open("card-detail",c)}}>Detalle</button><button className="dangerText" onClick={e=>{e.stopPropagation();removeCard(c.id)}}>Eliminar</button></div>
    </article>
   })}</div>}
  </section>

  <CardBox title="Operaciones" action="Nueva operación" onAction={()=>open("card-operation")}>
   <div className="operationSummary"><div><span>Tarjeta</span><select value={selected} onChange={e=>setSelected(e.target.value)}>{cards.map(c=><option key={c.id} value={c.id}>{c.bank} · •••• {c.last4}</option>)}</select></div><div><span>Cargos</span><b>{money(opTotals.charges,selectedCard?.currency||"PEN")}</b></div><div><span>Pagos</span><b className="greenText">{money(opTotals.payments,selectedCard?.currency||"PEN")}</b></div><div><span>Movimientos</span><b>{cardOps.length}</b></div></div>
   <div className="table cardOperationsTable"><div className="thead"><span>Fecha</span><span>Tipo</span><span>Concepto</span><span>Importe</span><span>Estado</span><span>Acciones</span></div>
    {cardOps.length?cardOps.map(o=><div className="tr" key={o.id}><span>{o.date}</span><span><Badge tone={o.type==="Pago"?"green":o.type==="Compra"?"blue":"neutral"}>{o.type}</Badge>{o.purchaseMode&&<small>{o.purchaseMode}{o.installments?` · ${o.currentInstallment||1}/${o.installments}`:""}</small>}</span><span><b>{o.concept}</b>{o.intermediary&&<small>{o.intermediary}</small>}</span><strong className={o.type==="Pago"?"greenText":""}>{o.type==="Pago"?"−":"+"}{money(o.amount,selectedCard?.currency||"PEN")}</strong><span>{o.status}</span><span className="actions"><button onClick={()=>open("card-operation",o)}>Editar</button><button className="dangerText" onClick={()=>remove(o.id)}>Eliminar</button></span></div>):<div className="emptyState compact"><b>Sin operaciones para esta tarjeta</b><span>Registra compras, pagos o cargos para construir el historial.</span><Btn secondary onClick={()=>open("card-operation")}>＋ Registrar operación</Btn></div>}
   </div>
  </CardBox>

  <CardBox title="Simulador de pago">
   <CardPaymentSimulator cards={cards} onResult={simulate}/>
  </CardBox>
 </div>
}

function CardPaymentSimulator({cards,onResult}:{cards:T.Card[];onResult:(s:string)=>void}){
 const [id,setId]=useState(cards[0]?.id||""),[pay,setPay]=useState("1000"),[extra,setExtra]=useState("0"),[result,setResult]=useState<any>(null);
 const c=cards.find(x=>x.id===id)||cards[0];
 const run=()=>{if(!c){return}const planned=Math.max(0,Number(pay)||0),additional=Math.max(0,Number(extra)||0),total=Math.min(c.used,planned+additional);const monthlyRate=Math.pow(1+(c.tea||0)/100,1/12)-1;const currentInterest=c.used*monthlyRate;const after=Math.max(0,c.used-total);const afterInterest=after*monthlyRate;setResult({total,after,currentInterest,interestSaved:Math.max(0,currentInterest-afterInterest)});onResult("Escenario calculado")};
 return <div className="simulatorGrid">
  <div className="simulatorControls"><div className="form2"><Field label="Tarjeta"><select value={id} onChange={e=>{setId(e.target.value);setResult(null)}}>{cards.map(c=><option key={c.id} value={c.id}>{c.bank} · •••• {c.last4}</option>)}</select></Field><Field label={`Pago planeado · ${c?.currency||"PEN"}`}><div className="moneyInput"><span>{c?.currency||"PEN"}</span><input type="number" min="0" value={pay} onChange={e=>setPay(e.target.value)}/></div></Field><Field label={`Pago adicional · ${c?.currency||"PEN"}`}><div className="moneyInput"><span>{c?.currency||"PEN"}</span><input type="number" min="0" value={extra} onChange={e=>setExtra(e.target.value)}/></div></Field></div><div className="notice"><b>Decisión, no solo cálculo</b><p>El simulador estima cómo cambia tu saldo si aumentas el pago. No modifica la tarjeta ni registra un pago real.</p></div><Btn onClick={run}>Simular escenario</Btn></div>
  <div className="simulatorResult">{result?<><span>Después del pago</span><strong>{money(result.after,c.currency)}</strong><div className="simResultGrid"><div><small>Pago total</small><b>{money(result.total,c.currency)}</b></div><div><small>Interés mensual estimado</small><b>{money(result.currentInterest,c.currency)}</b></div><div><small>Interés evitado estimado</small><b className="greenText">{money(result.interestSaved,c.currency)}</b></div></div></>:<div className="simPlaceholder"><span>↗</span><b>Configura un escenario</b><small>Aquí aparecerá el nuevo saldo y el impacto estimado del pago.</small></div>}</div>
 </div>
}

export default CardsPage;
export { CardPaymentSimulator };
