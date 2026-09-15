"use client";
import React from "react";
import { money } from "@/lib/format";

export type ChartPoint={label:string;value:number;secondary?:number};

export function TrendBars({data,title,mode="default"}:{data:ChartPoint[];title?:string;mode?:"default"|"finance"}){
 const max=Math.max(...data.flatMap(x=>[Math.abs(x.value),Math.abs(x.secondary??0)]),1);
 if(mode==="finance") return <div className="financeComparison">
  <div className="financeComparisonIntro"><div><b>Cómo leerlo</b><span>Cada fila representa un mes. Compara cuánto ingresó, cuánto gastaste y qué quedó neto.</span></div><div className="financeChartHint"><span><i className="legendLine primary"/>Ingresos</span><span><i className="legendLine secondary"/>Gastos</span></div></div>
  <div className="financeComparisonHeader"><span>Mes</span><span>Ingresos</span><span>Gastos</span><span>Neto</span></div>
  <div className="financeComparisonRows">{data.length?data.map((x,i)=>{const income=Math.abs(x.value),expense=Math.abs(x.secondary??0),net=income-expense;return <div className="financeComparisonRow" key={`${x.label}-${i}`}>
    <div className="financeComparisonLabel"><b>{x.label}</b></div>
    <div className="financeComparisonMetric"><div className="financeMetricHead"><span>Ingresos</span><strong>{money(income)}</strong></div><div className="financeBarTrack"><i className="financeBarIncome" style={{width:`${income?Math.max(4,income/max*100):0}%`}}/></div></div>
    <div className="financeComparisonMetric"><div className="financeMetricHead"><span>Gastos</span><strong>{money(expense)}</strong></div><div className="financeBarTrack"><i className="financeBarExpense" style={{width:`${expense?Math.max(4,expense/max*100):0}%`}}/></div></div>
    <div className={`financeNet ${net>=0?"positive":"negative"}`}><span>Neto</span><b>{money(net)}</b></div>
  </div>}) : <div className="chartEmpty">Aún no hay movimientos para comparar.</div>}</div>
  {data.length>0&&<div className="financeComparisonFoot">Las barras usan la misma escala para que puedas detectar rápidamente los meses con mayor gasto y mejor resultado.</div>}
 </div>;
 const hasSecondary=data.some(x=>typeof x.secondary==="number");
 return <div className={`chartWrap ${hasSecondary?"hasComparison":""}`}>
  <div className="chartMeta"><div>{title&&<div className="chartTitle">{title}</div>}<span>{hasSecondary?"Comparación de ingresos y gastos":"Resumen del periodo"}</span></div></div>
  {hasSecondary&&<div className="chartLegend"><span><i className="legendLine primary"/>Ingresos</span><span><i className="legendLine secondary"/>Gastos</span></div>}
  <div className={`bars ${hasSecondary?"barsCompare":""}`} aria-label={title||"Gráfico de barras"}>
   {data.map((x,i)=>{const primary=Math.max(5,Math.abs(x.value)/max*100);const secondary=typeof x.secondary==="number"?Math.max(5,Math.abs(x.secondary)/max*100):0;return <div className="barCol" key={`${x.label}-${i}`}>
    <div className="barPair">
     <div className="barValue primaryValue">{money(x.value)}</div><div className="barTrack"><i className="barPrimary" style={{height:`${primary}%`}}/></div>
     {hasSecondary&&<><div className="barValue secondaryValue">{money(x.secondary??0)}</div><div className="barTrack secondaryTrack"><i className="barSecondary" style={{height:`${secondary}%`}}/></div></>}
    </div><small>{x.label}</small>
   </div>})}
  </div>
 </div>
}
export function MetricBars({data}:{data:ChartPoint[]}){
 const max=Math.max(...data.map(x=>x.value),1);
 return <div className="metricBars">{data.length?data.map((x,i)=><div className="metricBar" key={`${x.label}-${i}`}><div><span>{x.label}</span><b>{money(x.value)}</b></div><div className="metricTrack"><i style={{width:`${Math.min(100,x.value/max*100)}%`}}/></div></div>):<div className="chartEmpty">Aún no hay gastos categorizados.</div>}</div>
}

export function DonutChart({items,total}:{items:ChartPoint[];total:number}){
 const ranked=items.filter(x=>x.value>0).sort((a,b)=>b.value-a.value);
 const top=ranked.slice(0,6); const used=top.reduce((a,x)=>a+x.value,0); const rest=Math.max(0,total-used);
 const safe=rest>0?([...top,{label:"Otros",value:rest}] as ChartPoint[]):top; let cursor=0;
 const stops=safe.map((x,i)=>{const start=cursor;cursor+=x.value;return `${`hsl(${210+i*42} 75% ${48+i*2}%)`} ${start/Math.max(total,1)*100}% ${cursor/Math.max(total,1)*100}%`}).join(",");
 return <div className="donutLayout"><div className="donut" style={{background:`conic-gradient(${stops||"var(--surface-3) 0 100%"})`}}><div><strong>{money(total)}</strong><span>Total</span></div></div><div className="donutLegend">{safe.map((x,i)=><div key={`${x.label}-${i}`}><span className="legendDot" style={{background:`hsl(${210+i*42} 75% ${48+i*2}%)`}}/><span>{x.label}</span><b>{Math.round(x.value/Math.max(total,1)*100)}%</b></div>)}</div></div>
}

export function Sparkline({values}:{values:number[]}){
 const max=Math.max(...values,1), min=Math.min(...values,0), range=Math.max(max-min,1);
 const points=values.map((v,i)=>`${(i/Math.max(values.length-1,1))*100},${92-((v-min)/range)*72}`).join(" ");
 return <svg className="sparkline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
