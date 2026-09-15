export function save<T>(key:string,value:T){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
export function load<T>(key:string,fallback:T):T{try{const value=localStorage.getItem(key);return value?JSON.parse(value):fallback}catch{return fallback}}
export function clearDemoData(){try{Object.keys(localStorage).filter(k=>k.startsWith("f360-")).forEach(k=>localStorage.removeItem(k))}catch{}}
