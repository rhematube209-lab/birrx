import {Minus,Plus,Type,RotateCcw,Check} from 'lucide-react';
import {DEFAULT_FONT_SIZE,MIN_FONT_SIZE,MAX_FONT_SIZE,fontSize} from './fontSize';

export function FontSizeSettings({value,onChange,close,lang='English'}:{value?:string;onChange:(value:string)=>void;close:()=>void;lang?:string}){
 const isAm = lang === 'Amharic';
 const size=fontSize(value);
 const change=(pixels:number)=>onChange(String(fontSize(String(pixels))));
 const presets:[number,string][]=[[12,isAm?'አነስተኛ (Compact)':'Compact'],[14,isAm?'መደበኛ (Default)':'Default'],[17,isAm?'ትልቅ (Large)':'Large'],[20,isAm?'በጣም ትልቅ (Extra large)':'Extra large']];
 return <section className="font-settings" aria-labelledby="font-size-title">
  <span className="font-setting-icon" aria-hidden="true"><Type size={26}/></span>
  <h2 id="font-size-title">{isAm?'የጽሑፍ መጠን':'Text size'}</h2>
  <p>{isAm?'BirrXን ለማንበብ አመቺ የሆነ መጠን ይምረጡ። ርዕሶች፣ መለያዎች እና መጠኖች አብረው ይስተካከላሉ።':'Choose a comfortable size for reading BirrX. Headings, labels and amounts adjust together.'}</p>
  <div className="font-size-value"><span>{isAm?'ዋና ጽሑፍ':'Body text'}</span><output htmlFor="font-size-control" aria-live="polite"><strong>{size}</strong> px</output></div>
  <div className="font-size-controls">
   <button type="button" aria-label="Decrease text size" disabled={size===MIN_FONT_SIZE} onClick={()=>change(size-1)}><Minus size={19}/></button>
   <label className="sr-only" htmlFor="font-size-control">Text size in pixels</label>
   <input id="font-size-control" type="range" min={MIN_FONT_SIZE} max={MAX_FONT_SIZE} step={1} value={size} aria-valuetext={`${size} pixels`} onChange={e=>change(Number(e.target.value))}/>
   <button type="button" aria-label="Increase text size" disabled={size===MAX_FONT_SIZE} onClick={()=>change(size+1)}><Plus size={19}/></button>
  </div>
  <div className="font-size-presets" aria-label="Text size presets">{presets.map(([pixels,label])=><button type="button" key={pixels} aria-pressed={size===pixels} className={size===pixels?'selected':''} onClick={()=>change(Number(pixels))}>{label}</button>)}</div>
  <div className="font-size-preview" aria-label="Live text preview"><small>{isAm?'የቅድመ እይታ':'LIVE PREVIEW'}</small><h3>{isAm?'ለሚፈልጉት ነገር ቦታ ይስጡ':'Make room for what matters'}</h3><p>{isAm?'በጀቶችዎ፣ ግቦችዎ እና የዕለት ተዕለት ወጪዎችዎ በሚመችዎ መጠን።':'Your budgets, goals and everyday spending, at a size that feels right.'}</p><span className="font-preview-label">{isAm?'BirrX · ግልጽ እና ምቹ':'BirrX · Clear and comfortable'}</span></div>
  <small className="font-size-saved"><Check size={14} aria-hidden="true"/> {isAm?'ለውጦች በዚህ መሣሪያ ላይ በራስ-ሰር ይቀመጣሉ።':'Changes save automatically on this device.'}</small>
  <div className="actions"><button type="button" disabled={size===DEFAULT_FONT_SIZE} onClick={()=>change(DEFAULT_FONT_SIZE)}><RotateCcw size={16}/> {isAm?'ዳግም አስጀምር':'Reset'}</button><button type="button" className="primary" onClick={close}>{isAm?'ተጠናቋል':'Done'}</button></div>
 </section>;
}
