// Shared across account cards, activity, fee reports, and account pickers.
export function bankLogo(bank:string){
 const name=bank.split('|')[0].toLowerCase().replace(/[ _-]/g,'');
 return name.startsWith('apollo')?'/banks/apollo.jpg':['cbebir','cbebirr','844'].includes(name)?'/banks/cbe-birr.png':name.startsWith('zemen')?'/banks/zemen.webp':name.startsWith('dashen')?'/banks/dashen.webp':name.startsWith('awash')?'/banks/awash.webp':name.includes('telebirr')||name==='127'?'/banks/telebirr.webp':name==='boa'||name.includes('abyssinia')?'/banks/boa.webp':name==='cbe'||name.includes('commercialbank')?'/banks/cbe.webp':null;
}
