export const money=(n:number,currency:"PEN"|"USD"="PEN")=>new Intl.NumberFormat("es-PE",{style:"currency",currency,maximumFractionDigits:2}).format(n);
export const num=(n:number)=>new Intl.NumberFormat("es-PE").format(n);
export const pct=(n:number)=>`${n.toFixed(1)}%`;
export const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
export const dateMonthsAgo = (iso:string, months:number) => { const d=new Date(`${iso}T12:00:00`); d.setMonth(d.getMonth()-months); return d.toISOString().slice(0,10); };
export const addDays=(iso:string,days:number)=>{const d=new Date(`${iso}T12:00:00`);d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)};
export const periodRate=(annual:number,f:any)=>{const n=f==="Semanal"?52:f==="Quincenal"?24:f==="Mensual"?12:f==="Trimestral"?4:f==="Semestral"?2:f==="Anual"?1:12;return Math.pow(1+annual,n?1/n:1)-1};
export const paymentFor=(principal:number,rate:number,term:number)=>{if(term<=0)return 0;if(rate===0)return principal/term;return principal*rate/(1-Math.pow(1+rate,-term))};
export const scheduleFor=(principal:number,rate:number,term:number)=>{const pay=paymentFor(principal,rate,term);let bal=principal;return Array.from({length:term},(_,i)=>{const interest=bal*rate;const principalPart=Math.min(bal,pay-interest);bal=Math.max(0,bal-principalPart);return {n:i+1,payment:principalPart+interest,principal:principalPart,interest,balance:bal}})};
