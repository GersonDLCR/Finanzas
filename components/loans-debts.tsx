"use client";
import React, { useState } from "react";
import type * as T from "@/types";
import * as UI from "@/components/ui";
import { money, num, pct, today, addDays, periodRate, scheduleFor } from "@/lib/format";
import { frequencies, fuels, methods } from "@/data/demo";
const { Btn, Badge, Field, CardBox, Stat, Detail, Modal, ConfirmDialog, Pagination, Icon, PageHead } = UI;

function LoansPage({loans,borrowers,payments,accounts,open,payment,reverse,detail,removeLoan}:{loans:T.Loan[];borrowers:T.Borrower[];payments:T.LoanPayment[];accounts:T.FinancialAccount[];open:(m:string,d?:any)=>void;payment:(loan:T.Loan)=>void;reverse:(p:T.LoanPayment)=>void;detail:(l:T.Loan)=>void;removeLoan:(id:string)=>void}){
 const currencyOf=(id?:string):T.Currency=>(accounts.find(a=>a.id===id)?.currency)||"PEN";
 const m=(n:number,id?:string)=>money(n,currencyOf(id));
 const totalsByCurrency=(field:keyof Pick<T.Loan,"balance"|"principal"|"recovered"|"installment">)=>({PEN:loans.filter(l=>currencyOf(l.accountId)==="PEN").reduce((a,l)=>a+(Number(l[field])||0),0),USD:loans.filter(l=>currencyOf(l.accountId)==="USD").reduce((a,l)=>a+(Number(l[field])||0),0)});
 const totalBalance=loans.reduce((a,l)=>a+l.balance,0);
 const loanPEN=totalsByCurrency("balance").PEN, loanUSD=totalsByCurrency("balance").USD;
 const totalPrincipal=loans.reduce((a,l)=>a+l.principal,0);
 const totalRecovered=loans.reduce((a,l)=>a+l.recovered,0);
 const scheduled=loans.reduce((a,l)=>a+l.installment,0);
 const overdue=loans.filter(l=>l.status==='En mora');
 const active=loans.filter(l=>l.status!=='Pagado');
 const recoveryRate=totalPrincipal?totalRecovered/totalPrincipal*100:0;
 const nextLoan=[...active].sort((a,b)=>a.nextPayment.localeCompare(b.nextPayment))[0];
 const recentPayments=[...payments].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
 const [confirm,setConfirm]=useState<null|{kind:"delete";id:string;borrower:string;amount:number}|{kind:"reverse";payment:T.LoanPayment}>(null);
 const portfolio=loans.map(l=>({label:l.borrower,value:l.balance})).sort((a,b)=>b.value-a.value).slice(0,5);
 const risk=loans.map(l=>({loan:l,ratio:l.principal?l.balance/l.principal*100:0})).sort((a,b)=>b.ratio-a.ratio);
 return <div className="loansPage">
  <PageHead title="Préstamos que tú otorgas" desc="Controla el dinero que prestas, cuánto has recuperado, qué queda por cobrar y qué préstamos necesitan seguimiento." action="Nuevo préstamo" onAction={()=>open("loan")}/>

  <div className="stats loanStats">
   <Stat label="Por cobrar · PEN" value={money(totalsByCurrency("balance").PEN)} sub={`${active.filter(l=>currencyOf(l.accountId)==="PEN").length} activos`} tone="blue"/>
   <Stat label="Por cobrar · USD" value={money(totalsByCurrency("balance").USD,"USD")} sub={`${active.filter(l=>currencyOf(l.accountId)==="USD").length} activos`} />
   <Stat label="Capital prestado · PEN" value={money(totalsByCurrency("principal").PEN)} sub="Capital original"/>
   <Stat label="Recuperado · PEN" value={money(totalsByCurrency("recovered").PEN)} sub={`${pct(recoveryRate)} del capital`} tone="green"/>
  </div>

  <div className="loanDecisionGrid">
   <CardBox title="Salud de tu cartera">
    <div className="loanPortfolioHero">
     <div><span>Capital todavía expuesto · PEN</span><strong>{money(loanPEN)}</strong><small>{loanUSD?`Además ${money(loanUSD,"USD")} en USD. `:""}{totalPrincipal?`${pct(totalBalance/totalPrincipal*100)} del capital original sigue pendiente.`:"Registra un préstamo para comenzar."}</small></div>
     <div className="loanPortfolioRing" style={{'--loan-progress':`${Math.min(100,recoveryRate)}%`} as React.CSSProperties}><b>{pct(recoveryRate)}</b><span>recuperado</span></div>
    </div>
    <div className="loanSignals">
     <div><span>En mora</span><b className={overdue.length?"redText":"greenText"}>{overdue.length}</b><small>{overdue.length?"Requieren seguimiento":"Sin préstamos en mora"}</small></div>
     <div><span>Próximo cobro</span><b>{nextLoan?m(nextLoan.installment,nextLoan.accountId):"—"}</b><small>{nextLoan?`${nextLoan.borrower} · ${nextLoan.nextPayment}`:"No hay cobros pendientes"}</small></div>
     <div><span>Promedio por préstamo</span><b>{money(loans.filter(l=>currencyOf(l.accountId)==="PEN").length?loanPEN/loans.filter(l=>currencyOf(l.accountId)==="PEN").length:0)}</b><small>Saldo pendiente promedio</small></div>
    </div>
   </CardBox>

   <CardBox title="Distribución del saldo">
    <div className="loanDistribution">
     {portfolio.length?portfolio.map((x,i)=><div className="loanDistRow" key={`${x.label}-${i}`}><div><span>{x.label}</span><b>{m(x.value, loans.find(l=>l.borrower===x.label)?.accountId)}</b></div><div className="metricTrack"><i style={{width:`${totalBalance?x.value/totalBalance*100:0}%`}}/></div></div>):<div className="chartEmpty">Aún no tienes préstamos registrados.</div>}
    </div>
    <div className="loanCardFoot">La concentración muestra dónde está expuesto tu capital. Si una persona concentra gran parte del saldo, conviene vigilar su capacidad de pago.</div>
   </CardBox>
  </div>

  <CardBox title="Préstamos activos" action="Nuevo préstamo" onAction={()=>open("loan")}>
   {loans.length?<div className="loanPortfolioTable">
    <div className="loanPortfolioHead"><span>Prestatario</span><span>Condiciones</span><span>Saldo</span><span>Próximo cobro</span><span>Estado</span><span>Acciones</span></div>
    {loans.map(l=>{
      const recovered=l.principal?Math.min(100,l.recovered/l.principal*100):0;
      return <div className="loanPortfolioRow" key={l.id}>
       <span className="loanBorrower"><i>{l.borrower.slice(0,1).toUpperCase()}</i><b>{l.borrower}</b><small>{borrowers.find(b=>b.id===l.borrowerId)?.notes||"Sin notas"}</small></span>
       <span className="loanTerms"><b>{l.frequency} · {l.term} cuotas</b><small>{l.rate?`${pct(l.rate*100)} por periodo · `:"Sin interés · "}{m(l.installment,l.accountId)} por cuota</small><em><i><b style={{width:`${recovered}%`}}/></i> {pct(recovered)} recuperado</em></span>
       <span><strong>{m(l.balance,l.accountId)}</strong><small>{m(l.principal,l.accountId)} original</small></span>
       <span><b>{l.nextPayment}</b><small>{m(l.installment,l.accountId)}</small></span>
       <span><Badge tone={l.status==='En mora'?'danger':l.status==='Pagado'?'green':l.status==='Próximo'?'blue':'neutral'}>{l.status}</Badge></span>
       <span className="actions"><button onClick={()=>detail(l)}>Detalle</button><button onClick={()=>open("loan",l)}>Editar</button><button onClick={()=>payment(l)}>Cobrar</button><button className="dangerText" onClick={()=>setConfirm({kind:"delete",id:l.id,borrower:l.borrower,amount:l.balance})}>Eliminar</button></span>
      </div>
    })}
   </div>:<div className="emptyState"><b>No tienes préstamos registrados</b><span>Registra el primer préstamo para controlar saldo, cuotas y recuperación.</span><Btn onClick={()=>open("loan")}>＋ Nuevo préstamo</Btn></div>}
  </CardBox>

  <div className="loanLowerGrid">
   <CardBox title="Seguimiento de riesgo">
    <div className="riskList">
     {risk.length?risk.slice(0,5).map(({loan:l,ratio})=><div className="riskRow" key={l.id}><div><b>{l.borrower}</b><small>{l.status} · {m(l.balance,l.accountId)} pendientes</small></div><strong className={ratio>=80?"redText":ratio>=50?"":"greenText"}>{pct(ratio)}</strong><div className="metricTrack"><i style={{width:`${Math.min(100,ratio)}%`}}/></div></div>):<div className="chartEmpty">No hay datos suficientes para evaluar riesgo.</div>}
    </div>
    <p className="copy">El porcentaje indica qué parte del capital original todavía no has recuperado. No sustituye una evaluación real de solvencia.</p>
   </CardBox>

   <CardBox title="Últimos cobros" action="Ver historial" onAction={()=>document.getElementById("loan-history")?.scrollIntoView({behavior:"smooth",block:"start"})}>
    {recentPayments.length?<div className="paymentFeed">{recentPayments.map(p=><div className="paymentFeedRow" key={p.id}><span className="paymentIcon">↗</span><div><b>{loans.find(l=>l.id===p.loanId)?.borrower||"Préstamo"}</b><small>{p.date} · Capital {m(p.principal,loans.find(l=>l.id===p.loanId)?.accountId)} · Interés {m(p.interest,loans.find(l=>l.id===p.loanId)?.accountId)}</small></div><strong className={p.status==='Anulado'?"redText":"greenText"}>{p.status==='Anulado'?"Anulado":m(p.amount,loans.find(l=>l.id===p.loanId)?.accountId)}</strong>{p.status==='Confirmado'&&<button className="reverseAction" onClick={()=>setConfirm({kind:"reverse",payment:p})}>Revertir</button>}</div>)}</div>:<div className="chartEmpty">Todavía no hay cobros registrados.</div>}
   <div className="loanCardFoot">Los cobros confirmados actualizan el saldo del préstamo. Puedes revertirlos desde aquí si fueron registrados por error.</div>
  </CardBox>
  </div>

  <CardBox title="Cómo tomar decisiones con tu cartera">
   <div className="loanStrategyGrid">
    <div><span>1</span><b>Concentración</b><p>Evita que una sola persona represente una parte desproporcionada de lo que tienes por cobrar.</p></div>
    <div><span>2</span><b>Liquidez</b><p>Compara los próximos cobros con tus propios compromisos antes de prestar nuevamente.</p></div>
    <div><span>3</span><b>Riesgo</b><p>Un préstamo con alto saldo pendiente merece seguimiento antes de ampliar el crédito.</p></div>
   </div>
  </CardBox>

  <CardBox title="Historial de cobros">
   <div id="loan-history" className="table loanHistoryTable"><div className="thead"><span>Fecha</span><span>Prestatario</span><span>Pago</span><span>Distribución</span><span>Acción</span></div>{payments.length?payments.map(p=><div className="tr" key={p.id}><span>{p.date}</span><span>{loans.find(l=>l.id===p.loanId)?.borrower||"—"}</span><span>{m(p.amount,loans.find(l=>l.id===p.loanId)?.accountId)} {p.status==='Anulado'&&<Badge tone="danger">Anulado</Badge>}</span><span>Capital {m(p.principal,loans.find(l=>l.id===p.loanId)?.accountId)} · Interés {m(p.interest,loans.find(l=>l.id===p.loanId)?.accountId)} · Mora {m(p.lateFee,loans.find(l=>l.id===p.loanId)?.accountId)}</span><span>{p.status==='Confirmado'&&<button className="reverseAction" onClick={()=>setConfirm({kind:"reverse",payment:p})}>Revertir</button>}</span></div>):<div className="emptyState compact"><b>Sin historial</b><span>Los cobros registrados aparecerán aquí.</span></div>}</div>
  </CardBox>
  {confirm?.kind==="delete"&&<ConfirmDialog title="¿Eliminar este préstamo?" message="Se eliminará el registro y dejará de formar parte de tu cartera. Esta acción no se puede deshacer." summary={<><span>{confirm.borrower}</span><b>{m(confirm.amount,loans.find(l=>l.id===confirm.id)?.accountId)}</b></>} confirmLabel="Eliminar préstamo" onClose={()=>setConfirm(null)} onConfirm={()=>{removeLoan(confirm.id);setConfirm(null)}}/>}
  {confirm?.kind==="reverse"&&<ConfirmDialog title="¿Revertir este cobro?" message="El cobro pasará a estado anulado y el saldo del préstamo se ajustará nuevamente." summary={<><span>{confirm.payment.date}</span><b>{m(confirm.payment.amount,loans.find(l=>l.id===confirm.payment.loanId)?.accountId)}</b></>} confirmLabel="Revertir cobro" onClose={()=>setConfirm(null)} onConfirm={()=>{reverse(confirm.payment);setConfirm(null)}}/>}
 </div>
}
function DebtsPage({debts,payments,accounts,open,payment,reverse,detail,removeDebt}:{debts:T.Debt[];payments:T.DebtPayment[];accounts:T.FinancialAccount[];open:(m:string,d?:any)=>void;payment:(d:T.Debt)=>void;reverse:(p:T.DebtPayment)=>void;detail:(d:T.Debt)=>void;removeDebt:(id:string)=>void}){
 const currencyOf=(id?:string):T.Currency=>(accounts.find(a=>a.id===id)?.currency)||"PEN";
 const m=(n:number,id?:string)=>money(n,currencyOf(id));
 const totalsByCurrency=(field:keyof Pick<T.Debt,"balance"|"principal"|"installment">)=>({PEN:debts.filter(d=>currencyOf(d.accountId)==="PEN").reduce((a,d)=>a+(Number(d[field])||0),0),USD:debts.filter(d=>currencyOf(d.accountId)==="USD").reduce((a,d)=>a+(Number(d[field])||0),0)});
 const active=debts.filter(d=>d.status!=="Pagada");
 const debtPEN=totalsByCurrency("balance").PEN, debtUSD=totalsByCurrency("balance").USD;
 const total=active.reduce((a,d)=>a+d.balance,0);
 const principal=active.reduce((a,d)=>a+d.principal,0);
 const commitment=active.reduce((a,d)=>a+d.installment,0);
 const weightedTcea=active.length?active.reduce((a,d)=>a+d.tcea*d.balance,0)/Math.max(total,1):0;
 const next=[...active].sort((a,b)=>a.nextPayment.localeCompare(b.nextPayment))[0];
 const highestCost=[...active].sort((a,b)=>b.tcea-a.tcea)[0];
 const totalInterest=payments.filter(p=>p.status==="Confirmado").reduce((a,p)=>a+p.interest,0);
 const progress=principal?Math.max(0,Math.min(100,(principal-total)/principal*100)):0;
 const avalanche=[...active].sort((a,b)=>b.tcea-a.tcea);
 const snowball=[...active].sort((a,b)=>a.balance-b.balance);
 const recent=[...payments].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
 const [confirm,setConfirm]=useState<null|{kind:"delete";id:string;lender:string;amount:number}|{kind:"reverse";payment:T.DebtPayment}>(null);
 const statusTone=(s:T.Debt["status"])=>s==="Pagada"?"green":s==="Activa"?"blue":"neutral";
 return <div className="debtsPage">
  <PageHead title="Deudas que tú tienes" desc="Entiende cuánto debes, cuánto te cuesta cada deuda y qué conviene priorizar antes de hacer un pago adicional." action="Nueva deuda" onAction={()=>open("debt")}/>

  <div className="stats debtStats">
   <Stat label="Deuda total · PEN" value={money(totalsByCurrency("balance").PEN)} sub={`${active.filter(d=>currencyOf(d.accountId)==="PEN").length} activas`} tone="blue"/>
   <Stat label="Deuda total · USD" value={money(totalsByCurrency("balance").USD,"USD")} sub={`${active.filter(d=>currencyOf(d.accountId)==="USD").length} activas`}/>
   <Stat label="Compromiso · PEN" value={money(totalsByCurrency("installment").PEN)} sub="Cuotas activas"/>
   <Stat label="Próximo pago" value={next?m(next.installment,next.accountId):"—"} sub={next?`${next.lender} · ${next.nextPayment}`:"Sin pagos pendientes"} tone="green"/>
  </div>

  <div className="debtDecisionGrid">
   <CardBox title="Salud de tu endeudamiento">
    <div className="debtHealthHero">
     <div><span>Capital que todavía debes · PEN</span><strong>{money(debtPEN)}</strong><small>{debtUSD?`Además ${money(debtUSD,"USD")} en USD. `:""}{principal?`${pct(progress)} del capital original ya está amortizado.`:"Registra una deuda para comenzar."}</small></div>
     <div className="debtHealthRing" style={{'--debt-progress':`${progress}%`} as React.CSSProperties}><b>{pct(progress)}</b><span>amortizado</span></div>
    </div>
    <div className="debtSignals">
     <div><span>Mayor costo</span><b>{highestCost?`${highestCost.tcea}% TCEA`:"—"}</b><small>{highestCost?`${highestCost.lender} · ${highestCost.product}`:"Sin deuda activa"}</small></div>
     <div><span>Intereses registrados · PEN</span><b>{money(totalInterest)}</b><small>Pagos confirmados</small></div>
     <div><span>Cuota promedio · PEN</span><b>{money(totalsByCurrency("installment").PEN/(active.filter(d=>currencyOf(d.accountId)==="PEN").length||1))}</b><small>Por obligación activa</small></div>
    </div>
   </CardBox>

   <CardBox title="Dónde está tu mayor presión">
    <div className="debtPressureList">
     {active.length?active.slice().sort((a,b)=>b.balance-a.balance).slice(0,5).map(d=><div className="debtPressureRow" key={d.id}>
      <div><b>{d.lender}</b><small>{d.product} · TCEA {d.tcea}%</small></div><strong><b>{m(d.balance,d.accountId)}</b><small>Saldo pendiente</small></strong>
      <div className="metricTrack"><i style={{width:`${total?Math.min(100,d.balance/total*100):0}%`}}/></div>
     </div>):<div className="chartEmpty">Aún no tienes deudas activas.</div>}
    </div>
    <div className="debtCardFoot">Una deuda con alto saldo no siempre es la más cara. Para decidir, mira juntos saldo pendiente, TCEA y cuota.</div>
   </CardBox>
  </div>

  <CardBox title="Tus deudas" action="Nueva deuda" onAction={()=>open("debt")}>
   {debts.length?<div className="debtPortfolioTable">
    <div className="debtPortfolioHead"><span>Acreedor</span><span>Condiciones</span><span>Saldo</span><span>Próximo</span><span>Estado</span><span>Acciones</span></div>
    {debts.map(d=>{
     const paid=d.principal?Math.max(0,Math.min(100,(d.principal-d.balance)/d.principal*100)):0;
     return <div className="debtPortfolioRow" key={d.id}>
      <span className="debtIdentity"><i>{d.lender.slice(0,1).toUpperCase()}</i><b>{d.lender}</b><small>{d.product}</small></span>
      <span className="debtTerms"><b>TEA {d.tea}% · TCEA {d.tcea}%</b><small>{d.frequency} · {d.term} cuotas · desgravamen {d.desgravamen}%</small><em><i><b style={{width:`${paid}%`}}/></i> {pct(paid)} amortizado</em></span>
      <span><strong>{m(d.balance,d.accountId)}</strong><small>{m(d.principal,d.accountId)} original</small></span>
      <span><b>{d.nextPayment}</b><small>{m(d.installment,d.accountId)} por cuota</small></span>
      <span><Badge tone={statusTone(d.status)}>{d.status}</Badge></span>
      <span className="actions"><button onClick={()=>detail(d)}>Detalle</button><button onClick={()=>open("debt",d)}>Editar</button><button onClick={()=>payment(d)}>Pagar</button><button className="dangerText" onClick={()=>setConfirm({kind:"delete",id:d.id,lender:d.lender,amount:d.balance})}>Eliminar</button></span>
     </div>
    })}
   </div>:<div className="emptyState"><b>No tienes deudas registradas</b><span>Registra una deuda para empezar a comparar costo, cuota y estrategia de pago.</span><Btn onClick={()=>open("debt")}>＋ Nueva deuda</Btn></div>}
  </CardBox>

  <div className="debtStrategyGrid">
   <CardBox title="Avalancha · menor costo total">
    {avalanche.length?avalanche.slice(0,4).map((d,i)=><div className="debtPriorityRow" key={d.id}><span>{i+1}</span><div><b>{d.lender} · {d.product}</b><small>TCEA {d.tcea}% · saldo {m(d.balance,d.accountId)}</small></div><strong>{i===0?"Prioridad":"Después"}</strong></div>):<div className="chartEmpty">Sin deudas activas.</div>}
    <p className="copy">Prioriza la deuda con mayor TCEA manteniendo las cuotas mínimas del resto. Es la referencia para reducir el costo financiero.</p>
   </CardBox>
   <CardBox title="Bola de nieve · liberar obligaciones">
    {snowball.length?snowball.slice(0,4).map((d,i)=><div className="debtPriorityRow" key={d.id}><span>{i+1}</span><div><b>{d.lender} · {d.product}</b><small>Saldo {m(d.balance,d.accountId)} · cuota {m(d.installment,d.accountId)}</small></div><strong>{i===0?"Prioridad":"Después"}</strong></div>):<div className="chartEmpty">Sin deudas activas.</div>}
    <p className="copy">Prioriza el menor saldo para intentar cerrar obligaciones antes y simplificar tu carga mensual.</p>
   </CardBox>
  </div>

  <CardBox title="Lectura para tomar decisiones">
   <div className="debtInsightGrid">
    <div><span>01</span><b>Ataca primero el costo</b><p>{highestCost?`“${highestCost.lender} · ${highestCost.product}” tiene la TCEA más alta (${highestCost.tcea}%). Si tienes dinero extra, es el primer candidato a revisar.`:"Cuando registres deudas, aquí aparecerá la de mayor costo."}</p></div>
    <div><span>02</span><b>Protege tu flujo</b><p>{commitment?`Tus cuotas activas suman ${money(totalsByCurrency("installment").PEN)} por periodo en PEN${totalsByCurrency("installment").USD?` y ${money(totalsByCurrency("installment").USD,"USD")} en USD`:""}. Antes de adelantar capital, asegúrate de conservar liquidez para tus gastos.`:"Sin cuotas activas registradas."}</p></div>
    <div><span>03</span><b>Compara antes de pagar</b><p>Usa el simulador de amortización para estimar cuánto interés podrías ahorrar y si conviene reducir plazo o cuota.</p></div>
   </div>
  </CardBox>

  <CardBox title="Historial de pagos" action="Ver amortización" onAction={()=>document.getElementById("debt-amortization")?.scrollIntoView({behavior:"smooth",block:"start"})}>
   <div className="table debtHistoryTable">
    <div className="thead"><span>Fecha</span><span>Deuda</span><span>Pago</span><span>Distribución</span><span>Acción</span></div>
    {recent.length?recent.map(p=><div className="tr" key={p.id}><span>{p.date}</span><span>{debts.find(d=>d.id===p.debtId)?.lender||"—"}</span><span>{m(p.amount,debts.find(d=>d.id===p.debtId)?.accountId)} {p.status==="Anulado"&&<Badge tone="danger">Anulado</Badge>}</span><span>Capital {m(p.principal,debts.find(d=>d.id===p.debtId)?.accountId)} · Interés {m(p.interest,debts.find(d=>d.id===p.debtId)?.accountId)} · Seguro {m(p.insurance,debts.find(d=>d.id===p.debtId)?.accountId)}</span><span>{p.status==="Confirmado"&&<button className="reverseAction" onClick={()=>setConfirm({kind:"reverse",payment:p})}>Revertir</button>}</span></div>):<div className="emptyState compact"><b>Sin pagos registrados</b><span>Los pagos confirmados aparecerán aquí.</span></div>}
   </div>
  </CardBox>

  <CardBox title="Simuladores de amortización anticipada">
   <div id="debt-amortization" className="debtAmortList">
    {active.length?active.map(d=><div className="debtAmortRow" key={d.id}><div><b>{d.lender} · {d.product}</b><small>Saldo {m(d.balance,d.accountId)} · TCEA {d.tcea}% · cuota {m(d.installment,d.accountId)}</small></div><button className="link" onClick={()=>open("amortization",d)}>Simular prepago</button></div>):<div className="chartEmpty">No hay deudas activas para simular.</div>}
   </div>
  </CardBox>
  {confirm?.kind==="delete"&&<ConfirmDialog title="¿Eliminar esta deuda?" message="Se eliminará el registro de tu cartera de deudas. Esta acción no se puede deshacer." summary={<><span>{confirm.lender}</span><b>{m(confirm.amount,debts.find(d=>d.id===confirm.id)?.accountId)}</b></>} confirmLabel="Eliminar deuda" onClose={()=>setConfirm(null)} onConfirm={()=>{removeDebt(confirm.id);setConfirm(null)}}/>}
  {confirm?.kind==="reverse"&&<ConfirmDialog title="¿Revertir este pago?" message="El pago pasará a estado anulado y el saldo de la deuda se ajustará nuevamente." summary={<><span>{confirm.payment.date}</span><b>{m(confirm.payment.amount,debts.find(d=>d.id===confirm.payment.debtId)?.accountId)}</b></>} confirmLabel="Revertir pago" onClose={()=>setConfirm(null)} onConfirm={()=>{reverse(confirm.payment);setConfirm(null)}}/>}
 </div>
}
export default LoansPage;
export { DebtsPage };
