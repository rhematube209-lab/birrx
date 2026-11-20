export const DEFAULT_FONT_SIZE=14;
export const MIN_FONT_SIZE=12;
export const MAX_FONT_SIZE=20;
export function fontSize(value?:string){
 const number=Number(value);
 return Number.isFinite(number)&&value?.trim()?Math.min(MAX_FONT_SIZE,Math.max(MIN_FONT_SIZE,Math.round(number))):DEFAULT_FONT_SIZE;
}
export function applyFontSize(value?:string){
 const pixels=fontSize(value);
 document.documentElement.style.fontSize=`${pixels}px`;
 try{localStorage.setItem('birrx-font-size',String(pixels));}catch{/* IndexedDB remains the source of truth. */}
}
