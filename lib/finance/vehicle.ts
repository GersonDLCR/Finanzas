export function energyCostPerKm(cost:number, kilometers:number){ return kilometers>0 ? cost/kilometers : 0; }
export function vehicleEquity(currentValue:number, debt:number){ return currentValue-debt; }
export function firstDueDateOrKm(nextDate:Date,nextKm:number,currentKm:number,intervalKm:number){
  return {date:nextDate, km: currentKm+intervalKm, trigger: intervalKm>0 ? 'km_or_date' : 'date'} as const;
}
