"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type * as T from "@/types";
import { money } from "@/lib/format";
import { useFinanceStore } from "@/lib/use-finance-store";
import { Dashboard, Work, Finance, CardsPage, LoansPage, DebtsPage, VehiclesPage, BudgetPage, SavingsPage, NetWorth, CalendarPage, AlertsPage, ReportsPage, Settings } from "@/components";
import * as UI from "@/components/ui";
import * as M from "@/components/modals";
const { Btn, Badge, Detail, Modal, Icon } = UI;

const nav:[T.Section,string,string][]=[
  ["dashboard","Dashboard","dashboard"],["trabajo","Trabajo","work"],["finanzas","Finanzas","finance"],["tarjetas","Tarjetas","cards"],["prestamos","Préstamos","loan"],["deudas","Deudas","debt"],["vehiculos","Vehículos","vehicle"],["presupuesto","Presupuesto","budget"],["ahorros","Ahorros","savings"],["patrimonio","Patrimonio","net"],["calendario","Calendario","calendar"],["alertas","Alertas","alerts"],["reportes","Reportes","reports"],["configuracion","Configuración","settings"]
];

export default function Home(){
 const store=useFinanceStore();
 const pathname=usePathname();
 const pathToSection:Record<string,T.Section>={"/":"dashboard",...Object.fromEntries(nav.map(([id])=>[`/${id}`,id])) as Record<string,T.Section>};
 const sectionFromPath=pathToSection[pathname]??"dashboard";
 const [section,setSection]=useState<T.Section>(sectionFromPath);
 const [mobile,setMobile]=useState(false); const [sidebarCollapsed,setSidebarCollapsed]=useState(false); const [search,setSearch]=useState(""); const [toast,setToast]=useState("");
 const [theme,setTheme]=useState<"light"|"dark">("light"); const [modal,setModal]=useState<string|null>(null); const [editing,setEditing]=useState<any>(null); const [pendingConfirm,setPendingConfirm]=useState<{label:string;action:()=>void}|null>(null);
 const [selectedVehicle,setSelectedVehicle]=useState(store.vehicles[0]?.id||""); const [selectedLoan,setSelectedLoan]=useState<T.Loan|null>(null); const [selectedDebt,setSelectedDebt]=useState<T.Debt|null>(null); const [selectedAlert,setSelectedAlert]=useState<string|null>(null); const [commandOpen,setCommandOpen]=useState(false);
 useEffect(()=>{setTheme((localStorage.getItem("f360-theme") as "light"|"dark")||"light");setSidebarCollapsed(localStorage.getItem("f360-sidebar-collapsed")==="1");const demo=sessionStorage.getItem("f360-demo-session");fetch("/api/auth/session").then(r=>r.json()).then(x=>{if(!demo&&!x.authenticated)window.location.replace("/login")}).catch(()=>{if(!demo)window.location.replace("/login")})},[]);
 useEffect(()=>{localStorage.setItem("f360-sidebar-collapsed",sidebarCollapsed?"1":"0")},[sidebarCollapsed]);
 useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem("f360-theme",theme)},[theme]);
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setCommandOpen(v=>!v)}if(e.key==="Escape"){setCommandOpen(false);setModal(null)}};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[]);
 const notify=(s:string)=>{setToast(s);window.setTimeout(()=>setToast(""),2200)};
 const go=(s:T.Section)=>{
  setSection(s);
  setMobile(false);
  const nextPath=s==="dashboard"?"/":`/${s}`;
  if(window.location.pathname!==nextPath){
   window.history.pushState({section:s},"",nextPath);
  }
 };
 useEffect(()=>{
  const onPopState=()=>{
   const path=window.location.pathname;
   setSection(pathToSection[path]??"dashboard");
   setMobile(false);
  };
  window.addEventListener("popstate",onPopState);
  return()=>window.removeEventListener("popstate",onPopState);
 },[]);
 useEffect(()=>{if(section!==sectionFromPath && window.location.pathname!=="/" && pathToSection[window.location.pathname]===sectionFromPath)setSection(sectionFromPath)},[sectionFromPath,section]);
 const openSearch=()=>setCommandOpen(true); const open=(m:string,data:any=null)=>{setEditing(data);if(m==="amortization")setSelectedDebt(data??null);setModal(m)}; const close=()=>{setModal(null);setEditing(null)};
 const selected=store.vehicles.find(v=>v.id===selectedVehicle)??store.vehicles[0];
 useEffect(()=>{if(!selected && store.vehicles[0])setSelectedVehicle(store.vehicles[0].id)},[selected,store.vehicles]);
 const filteredMovements=useMemo(()=>{const q=search.trim().toLowerCase();if(!q)return store.movements;return store.movements.filter(m=>`${m.concept} ${m.category} ${m.method} ${m.type}`.toLowerCase().includes(q))},[store.movements,search]);
 const openFinancialSource=(e:T.FinancialEvent)=>{
  const id=e.sourceId;
  if(id==null)return;
  if(e.sourceType==="loan_payment"){const row=store.loans.find(x=>String(x.id)===String(id));if(row){setSelectedLoan(row);open("loan-detail");}return}
  if(e.sourceType==="debt_payment"){const row=store.debts.find(x=>String(x.id)===String(id));if(row){setSelectedDebt(row);open("debt-detail");}return}
  if(e.sourceType==="card_payment"){const row=store.cards.find(x=>String(x.id)===String(id));if(row)open("card-detail",row);return}
  if(e.sourceType==="recurring"){const row=store.recurringExpenses.find(x=>String(x.id)===String(id));if(row)open("recurring",row);return}
  if(e.sourceType==="maintenance"){const row=store.maintenance.find(x=>String(x.id)===String(id));if(row){setSelectedVehicle(row.vehicleId);open("maintenance",row);}return}
  if(e.sourceType==="insurance"){const row=store.insurance.find(x=>String(x.id)===String(id));if(row){setSelectedVehicle(row.vehicleId);open("insurance",row);}return}
  if(e.sourceType==="fine"){const row=store.fines.find(x=>String(x.id)===String(id));if(row){setSelectedVehicle(row.vehicleId);open("fine",row);}return}
  if(e.sourceType==="document"){const row=store.documents.find(x=>String(x.id)===String(id));if(row){setSelectedVehicle(row.vehicleId);open("document",row);}return}
};
const crud=<E extends {id:number|string}>(setter:(v:any)=>void,entity:E,success:string)=>{store.crud(setter as any,entity,success.toLowerCase().includes("movimiento")?"Movimiento":"Registro");close();notify(success)};
 const alertsCount=store.alerts.length;
 const confirmDelete=(label:string,action:()=>void)=>setPendingConfirm({label,action});
 const removeMovement=(id:number|string)=>confirmDelete("el movimiento",()=>{store.removeMovement(id);notify("Movimiento eliminado o anulado")});
 const saveWork=(x:T.WorkSession)=>{store.saveWork(x);close();notify(editing?"Jornada actualizada y conectada":"Jornada registrada y conectada")};
 const saveBonus=(x:T.Bonus)=>{store.crud(store.setBonuses,x);close();notify("Bono guardado")};
 const saveGoalContribution=(amount:number)=>{if(!editing)return;if(store.saveGoalContribution(editing,amount)){close();notify(amount>=0?"Aporte registrado y conectado":"Retiro registrado y conectado")}else notify("El monto no es válido o supera el saldo de la meta")};
 return <div className={`shell ${sidebarCollapsed?"sidebar-collapsed":""}`}>
  <aside className={`${mobile?"sidebar open":"sidebar"} ${sidebarCollapsed?"collapsed":""}`} aria-label="Navegación principal">
   <div className="logo"><b>F</b><div className="brandcopy"><strong>FINANZAS <i>360</i></strong><small>Personal Financial OS</small></div><button className="sidebarToggle" onClick={()=>setSidebarCollapsed(v=>!v)} aria-label={sidebarCollapsed?"Expandir barra lateral":"Contraer barra lateral"} title={sidebarCollapsed?"Expandir sidebar":"Contraer sidebar"}>{sidebarCollapsed?"›":"‹"}</button></div>
   <button className="profile" title={sidebarCollapsed?"Mi espacio · Datos de prueba":"Mi espacio"} aria-label="Mi espacio" onClick={()=>go("configuracion")}><span>GD</span><div className="profilecopy"><b>Mi espacio</b><small>Datos de prueba</small></div><span className="profileArrow">›</span></button>
   <nav>{nav.map(([id,label,ico])=><button key={id} data-tooltip={label} title={sidebarCollapsed?label:undefined} aria-label={label} className={section===id?"active":""} onClick={()=>go(id)}><span className="ico"><Icon name={ico}/></span><span className="navlabel">{label}</span>{id==="alertas"&&alertsCount>0&&<span className="navcount">{alertsCount}</span>}</button>)}</nav>
   <div className="sidefoot" title={sidebarCollapsed?"Modo demo · Persistencia local temporal":undefined}><span className="statusdot">●</span><span className="sidecopy"><b>Modo demo</b><small>Persistencia local temporal</small></span></div>
  </aside>
  <button className={mobile?"sidebarScrim show":"sidebarScrim"} aria-label="Cerrar menú" onClick={()=>setMobile(false)} />
  <main className="main">
   <header className="top"><button className="hamb" aria-label={mobile?"Cerrar menú":"Abrir menú"} onClick={()=>setMobile(v=>!v)}>{mobile?"×":"☰"}</button><div className="breadcrumb">Finanzas 360 <b>/</b> {nav.find(n=>n[0]===section)?.[1]}</div><div className="topright"><button className="search searchTrigger" onClick={openSearch} aria-label="Abrir búsqueda global"><span className="searchicon">⌕</span><span className="searchPlaceholder">Buscar en Finanzas 360...</span><kbd>⌘ K</kbd></button><button className="themeToggle" title="Cambiar tema" onClick={()=>setTheme(v=>v==="light"?"dark":"light")} aria-label="Cambiar tema">{theme==="light"?"☾":"☀"}<span>{theme==="light"?"Oscuro":"Claro"}</span></button><button className="bell" title="Ver alertas" onClick={()=>go("alertas")}>◔<i>{alertsCount}</i></button><button className="avatar" title="Abrir configuración" onClick={()=>go("configuracion")}>GD</button></div></header>
   {commandOpen&&<div className="commandOverlay" onMouseDown={()=>setCommandOpen(false)}><div className="command" onMouseDown={e=>e.stopPropagation()}><div className="commandTop"><span className="commandMark"><Icon name="dashboard"/></span><input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar módulos, movimientos o conceptos..."/><kbd>ESC</kbd></div><div className="commandHint">Navegación global · Enter para abrir el primer resultado</div><div className="commandGrid">{nav.filter(([id,label])=>`${id} ${label}`.toLowerCase().includes(search.trim().toLowerCase())).map(([id,label,ico])=><button key={id} onClick={()=>{go(id);setCommandOpen(false);setSearch("")}}><span><Icon name={ico}/></span><b>{label}</b><small>{id==="dashboard"?"Resumen y decisiones":id==="finanzas"?"Ingresos y gastos":"Abrir módulo"}</small></button>)}{filteredMovements.slice(0,5).map(m=><button key={`m-${m.id}`} onClick={()=>{go("finanzas");setCommandOpen(false);setSearch(m.concept)}}><span><Icon name="finance"/></span><b>{m.concept}</b><small>{m.category} · {money(m.amount)}</small></button>)}</div>{!nav.some(([id,label])=>`${id} ${label}`.toLowerCase().includes(search.trim().toLowerCase()))&&!filteredMovements.length&&<div className="commandEmpty">No encontramos resultados para “{search}”.</div>}</div></div>}
   <div className="content">
    {section==="dashboard"&&<Dashboard movements={store.movements} vehicles={store.vehicles} cards={store.cards} loans={store.loans} debts={store.debts} goals={store.goals} snapshot={store.snapshot} accountBalances={store.accountBalances} cashForecast={store.getCashForecast(30)} go={go} quick={open}/>} 
    {section==="trabajo"&&<Work sessions={store.sessions} bonuses={store.bonuses} vehicles={store.vehicles} quick={open} edit={x=>open("work",x)} remove={id=>confirmDelete("la jornada",()=>{store.remove(store.setSessions,id);notify("Jornada eliminada")})} bonusOpen={x=>open("bonus",x)} removeBonus={id=>confirmDelete("el bono",()=>{store.remove(store.setBonuses,id);notify("Bono eliminado")})}/>}
    {section==="finanzas"&&<Finance movements={filteredMovements} accounts={store.accounts} accountBalances={store.accountBalances} open={open} remove={removeMovement}/>} 
    {section==="tarjetas"&&<CardsPage cards={store.cards} operations={store.cardOps} open={open} remove={id=>confirmDelete("la operación de tarjeta",()=>{store.removeCardOperation(id);notify("Operación eliminada")})} removeCard={id=>confirmDelete("la tarjeta y sus operaciones",()=>{store.deleteCard(id);notify("Tarjeta eliminada")})} simulate={notify}/>} 
    {section==="prestamos"&&<LoansPage loans={store.loans} borrowers={store.borrowers} payments={store.loanPayments} accounts={store.accounts} open={open} payment={l=>{setSelectedLoan(l);open("loan-payment")}} reverse={p=>{store.reverseLoanPayment(p);notify("Cobro revertido")}} detail={l=>{setSelectedLoan(l);open("loan-detail")}} removeLoan={id=>confirmDelete("el préstamo y su historial",()=>{store.deleteLoan(id);notify("Préstamo eliminado junto con su historial")})}/>}
    {section==="deudas"&&<DebtsPage debts={store.debts} payments={store.debtPayments} accounts={store.accounts} open={open} payment={d=>open("debt-payment",d)} reverse={p=>{store.reverseDebtPayment(p);notify("Pago revertido")}} detail={d=>{setSelectedDebt(d);open("debt-detail")}} removeDebt={id=>confirmDelete("la deuda y su historial",()=>{store.deleteDebt(id);notify("Deuda eliminada junto con su historial")})}/>}
    {section==="vehiculos"&&selected&&<VehiclesPage vehicle={selected} vehicles={store.vehicles} documents={store.documents} insurance={store.insurance} fines={store.fines} incidents={store.incidents} fuel={store.fuelStops} maintenance={store.maintenance} improvements={store.improvements} tires={store.tires} open={open} setSelected={setSelectedVehicle} removeDoc={id=>confirmDelete("el documento",()=>{store.remove(store.setDocuments,id);notify("Documento eliminado")})} removeInsurance={id=>confirmDelete("el seguro",()=>{store.remove(store.setInsurance,id);notify("Seguro eliminado")})} removeFine={id=>confirmDelete("la multa",()=>{store.remove(store.setFines,id);notify("Multa eliminada")})} removeIncident={id=>confirmDelete("el evento",()=>{store.remove(store.setIncidents,id);notify("Evento eliminado")})} removeFuel={id=>confirmDelete("el abastecimiento",()=>{store.remove(store.setFuelStops,id);notify("Abastecimiento eliminado")})} removeMaintenance={id=>confirmDelete("el mantenimiento",()=>{store.remove(store.setMaintenance,id);notify("Mantenimiento eliminado")})} removeImprovement={id=>confirmDelete("la mejora",()=>{store.remove(store.setImprovements,id);notify("Mejora eliminada")})} removeTire={id=>confirmDelete("el neumático",()=>{store.remove(store.setTires,id);notify("Neumático eliminado")})} removeVehicle={id=>confirmDelete("el vehículo y todo su expediente",()=>{store.deleteVehicle(id);setSelectedVehicle(store.vehicles.find(v=>v.id!==id)?.id||"");notify("Vehículo eliminado junto con su expediente")})}/>}
    {section==="vehiculos"&&!selected&&<div className="emptyState"><h2>No hay vehículos registrados</h2><p>Registra tu primer vehículo para comenzar el expediente.</p><Btn onClick={()=>open("vehicle")}>＋ Registrar vehículo</Btn></div>}
    {section==="presupuesto"&&<BudgetPage movements={store.movements} rows={store.budgets} setRows={store.setBudgets} onRemove={id=>confirmDelete("la partida de presupuesto",()=>{store.remove(store.setBudgets,id);notify("Partida eliminada")})}/>} 
    {section==="ahorros"&&<SavingsPage goals={store.goals} goalMovements={store.goalMovements} open={open} remove={id=>confirmDelete("la meta",()=>{store.remove(store.setGoals,id);store.setGoalMovements(p=>p.filter(m=>m.goalId!==id));notify("Meta eliminada junto con su historial")})} reverse={m=>confirmDelete("el movimiento de meta",()=>{store.reverseGoalMovement(m);notify("Movimiento de meta revertido")})}/>}
    {section==="patrimonio"&&<NetWorth vehicles={store.vehicles} cards={store.cards} loans={store.loans} debts={store.debts} accountBalances={store.accountBalances} investments={store.investments} investmentMovements={store.investmentMovements} recurringExpenses={store.recurringExpenses} open={open} removeInvestment={id=>confirmDelete("la inversión y su historial",()=>{store.remove(store.setInvestments,id);store.setInvestmentMovements(p=>p.filter(m=>m.investmentId!==id));notify("Inversión eliminada junto con su historial")})} reverseInvestment={m=>confirmDelete("el movimiento de inversión",()=>{store.reverseInvestmentMovement(m);notify("Movimiento de inversión revertido")})} removeRecurring={id=>confirmDelete("el gasto recurrente",()=>{store.remove(store.setRecurringExpenses,id);notify("Gasto recurrente eliminado")})}/>} 
    {section==="calendario"&&<CalendarPage vehicles={store.vehicles} maintenance={store.maintenance} loans={store.loans} debts={store.debts} cards={store.cards} documents={store.documents} insurance={store.insurance} fines={store.fines} recurringExpenses={store.recurringExpenses} accounts={store.accounts} openSource={openFinancialSource}/>} 
    {section==="alertas"&&<AlertsPage vehicles={store.vehicles} maintenance={store.maintenance} loans={store.loans} debts={store.debts} cards={store.cards} documents={store.documents} insurance={store.insurance} fines={store.fines} recurringExpenses={store.recurringExpenses} accounts={store.accounts} openSource={openFinancialSource}/>}
    {section==="reportes"&&<ReportsPage sessions={store.sessions} vehicles={store.vehicles} cards={store.cards} loans={store.loans} debts={store.debts} fuel={store.fuelStops} maintenance={store.maintenance} accounts={store.accounts} investments={store.investments} goals={store.goals}/>} 
    {section==="configuracion"&&<Settings notify={notify}/>} 
   </div>
  </main>
  <div className="quickbar"><button onClick={()=>open("movement")}>＋<span>Registrar</span></button><button onClick={()=>open("work")}>↗<span>Jornada</span></button><button onClick={()=>open("fuel")}>⛽<span>Combustible</span></button><button onClick={()=>open("card-operation")}>▤<span>Tarjeta</span></button><button onClick={()=>open("debt-payment")}>$<span>Pagar deuda</span></button></div>
  <div className="bottomnav">{[["dashboard","Inicio","⌂"],["trabajo","Trabajo","↗"],["finanzas","Finanzas","◒"],["alertas","Alertas","!"],["more","Más","•••"]].map(([id,l,i])=><button key={id} className={section===id?"sel":""} onClick={()=>id==="more"?setMobile(true):go(id as T.Section)}><b>{i}</b><span>{l}</span></button>)}</div>
  {modal==="account"&&<M.AccountModal data={editing} close={close} save={x=>{store.crud(store.setAccounts,x,"Cuenta");close();notify("Cuenta guardada")}}/>}
  {modal==="transfer"&&<M.TransferModal accounts={store.accounts.filter(a=>a.status==="Activa")} close={close} save={x=>{if(store.saveTransfer(x)){close();notify("Transferencia registrada")}else notify("Saldo insuficiente en la cuenta origen")}}/>}
  {modal==="investment"&&<M.InvestmentModal data={editing} close={close} save={x=>crud(store.setInvestments,x,"Inversión guardada")}/>}
  {modal==="investment-movement"&&editing&&<M.InvestmentMovementModal investment={editing} accounts={store.accounts} close={close} save={x=>{if(store.saveInvestmentMovement(editing,x)){close();notify("Movimiento de inversión registrado")}else notify("Revisa la cuenta, moneda, saldo o monto")}}/>}
  {modal==="recurring"&&<M.RecurringExpenseModal accounts={store.accounts} data={editing} close={close} save={x=>crud(store.setRecurringExpenses,x,"Gasto recurrente guardado")}/>}
  {modal==="movement"&&<M.MovementModal accounts={store.accounts} data={editing} close={close} save={x=>crud(store.setMovements,x,"Movimiento guardado")}/>} 
  {modal==="work"&&<M.WorkModal vehicles={store.vehicles} accounts={store.accounts} data={editing} close={close} save={saveWork}/>} 
  {modal==="bonus"&&<M.BonusModal sessions={store.sessions} data={editing} close={close} save={saveBonus}/>} 
  {modal==="card-operation"&&<M.CardOperationModal cards={store.cards} accounts={store.accounts} data={editing} close={close} save={x=>{store.saveCardOperation(x);close();notify("Operación de tarjeta actualizada")}}/>}
  {modal==="card"&&<M.CardModal data={editing} close={close} save={x=>crud(store.setCards,x,"Tarjeta guardada")}/>} 
  {modal==="loan"&&<M.LoanModal borrowers={store.borrowers} accounts={store.accounts} setBorrowers={store.setBorrowers} data={editing} close={close} save={x=>{store.registerLoan(x);close();notify("Préstamo guardado con cuota recalculada")}}/>} 
  {modal==="debt"&&<M.DebtModal vehicles={store.vehicles} accounts={store.accounts} data={editing} close={close} save={x=>crud(store.setDebts,x,"Deuda guardada")}/>} 
  {modal==="loan-payment"&&selectedLoan&&<M.LoanPaymentModal loan={selectedLoan} close={close} confirm={(loan,a)=>{if(store.registerLoanPayment(loan,a))notify("Cobro registrado");else notify("Revisa el monto del cobro")}}/>}
  {modal==="debt-payment"&&<M.DebtPaymentChooser debts={store.debts} data={editing} close={close} confirm={(d,a)=>{if(store.registerDebtPayment(d,a))notify("Pago registrado");else notify("Revisa el monto del pago")}}/>}
  {modal==="document"&&selected&&<M.DocumentModal vehicle={selected} data={editing} close={close} save={x=>crud(store.setDocuments,x,"Documento guardado")}/>} 
  {modal==="insurance"&&selected&&<M.InsuranceModal vehicle={selected} accounts={store.accounts} data={editing} close={close} save={x=>crud(store.setInsurance,x,"Seguro guardado")}/>} 
  {modal==="fine"&&selected&&<M.FineModal vehicle={selected} accounts={store.accounts} data={editing} close={close} save={x=>crud(store.setFines,x,"Multa guardada")}/>} 
  {modal==="incident"&&selected&&<M.IncidentModal vehicle={selected} accounts={store.accounts} data={editing} close={close} save={x=>crud(store.setIncidents,x,"Evento guardado")}/>} 
  {modal==="fuel"&&<M.FuelModal vehicles={store.vehicles} accounts={store.accounts} data={editing} close={close} save={x=>{store.saveFuel(x);close();notify("Abastecimiento guardado y conectado")}}/>} 
  {modal==="improvement"&&selected&&<M.ImprovementModal vehicle={selected} accounts={store.accounts} data={editing} close={close} save={x=>{store.saveImprovement(x);close();notify("Mejora guardada y conectada")}}/>}
  {modal==="tire"&&selected&&<M.TireModal vehicle={selected} accounts={store.accounts} data={editing} close={close} save={x=>{store.saveTire(x);close();notify("Neumático guardado y conectado")}}/>}
  {modal==="maintenance"&&selected&&<M.MaintenanceModal vehicle={selected} accounts={store.accounts} data={editing} close={close} save={x=>{store.saveMaintenance(x);close();notify("Mantenimiento guardado y conectado")}}/>} 
  {modal==="goal"&&<M.GoalModal data={editing} close={close} save={x=>crud(store.setGoals,x,"Meta guardada")}/>} 
  {modal==="goal-add"&&editing&&<M.GoalContributionModal goal={editing} close={close} save={saveGoalContribution}/>} 
  {modal==="vehicle"&&<M.VehicleModal data={editing} close={close} save={x=>{crud(store.setVehicles,x,"Vehículo guardado");if(!selectedVehicle)setSelectedVehicle(x.id)}}/>}
  {modal==="amortization"&&selectedDebt&&<M.AmortizationModal debt={selectedDebt} close={close}/>} 
  {modal==="loan-detail"&&selectedLoan&&<M.LoanDetail loan={selectedLoan} payments={store.loanPayments.filter(p=>p.loanId===selectedLoan.id)} close={close} reverse={p=>{store.reverseLoanPayment(p);notify("Cobro revertido")}}/>}
  {modal==="debt-detail"&&selectedDebt&&<M.DebtDetail debt={selectedDebt} payments={store.debtPayments.filter(p=>p.debtId===selectedDebt.id)} close={close} reverse={p=>{store.reverseDebtPayment(p);notify("Pago revertido")}}/>}
  {modal==="card-detail"&&editing&&<Modal title={`Detalle · ${editing.bank} · •••• ${editing.last4}`} close={close}><Detail label="Moneda" value={editing.currency}/><Detail label="Producto" value={editing.product}/><Detail label="Línea" value={money(editing.line,editing.currency)}/><Detail label="Utilizada" value={money(editing.used,editing.currency)}/><Detail label="Disponible" value={money(editing.line-editing.used,editing.currency)}/><Detail label="TEA" value={`${editing.tea}%`}/><Detail label="TCEA" value={`${editing.tcea}%`}/><Detail label="Membresía" value={money(editing.membership,editing.currency)}/><Detail label="Desgravamen" value={`${editing.desgravamenPercent}%`}/><Detail label="Cierre" value={editing.closing}/><Detail label="Pago" value={editing.payment}/></Modal>}
  {modal==="document-detail"&&editing&&<Modal title={`Detalle · ${editing.type}`} close={close}><Detail label="Número" value={editing.number||"—"}/><Detail label="Emisor" value={editing.issuer||"—"}/><Detail label="Emisión" value={editing.start||"—"}/><Detail label="Vencimiento" value={editing.end||"Sin vencimiento"}/><Detail label="Costo" value={editing.cost?money(editing.cost):"—"}/><Detail label="Estado" value={editing.status}/><div className="notice"><b>Notas</b><p>{editing.notes||"Sin notas"}</p></div></Modal>}
  {pendingConfirm&&<div className="confirmOverlay" onMouseDown={()=>setPendingConfirm(null)}><div className="confirmModal" onMouseDown={e=>e.stopPropagation()}><div className="confirmIcon">!</div><span className="eyebrow">CONFIRMAR ACCIÓN</span><h3>¿Eliminar {pendingConfirm.label}?</h3><p>Esta acción eliminará el registro de forma permanente en esta demo. Revisa la información antes de continuar.</p><div className="confirmActions"><Btn secondary onClick={()=>setPendingConfirm(null)}>Cancelar</Btn><Btn danger onClick={()=>{const action=pendingConfirm.action;setPendingConfirm(null);action()}}>Eliminar</Btn></div></div></div>}
  {toast&&<div className="toast">✓ {toast}</div>}
 </div>
}
