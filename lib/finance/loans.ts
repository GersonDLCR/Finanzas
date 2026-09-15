export function monthlyPayment(principal:number, annualRate:number, months:number){
  if(months<=0) return 0;
  const r=annualRate/12;
  if(r===0) return principal/months;
  return principal*(r*Math.pow(1+r,months))/(Math.pow(1+r,months)-1);
}
export function monthsToPay(principal:number, annualRate:number, payment:number){
  if(principal<=0) return 0;
  const r=annualRate/12;
  if(payment<=principal*r) return Infinity;
  if(r===0) return Math.ceil(principal/payment);
  return Math.ceil(Math.log(payment/(payment-principal*r))/Math.log(1+r));
}
