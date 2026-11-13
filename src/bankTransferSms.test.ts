import {expect,it} from 'vitest';
import {fresh,clearDemoData,totals} from './domain';
import {previewSms,commitSms} from './sms';
it('imports a telebirr-to-CBE transfer and fee once without saving account numbers',()=>{
 const body='Dear Example You have transferred ETB 150.00 successfully from your telebirr account 251900000001 to Commercial Bank of Ethiopia account number 1000000000001 on 13/11/2026 12:27:51. Your telebirr transaction number is TESTTB123 and your bank transaction number is FTTEST123. The service fee is ETB 2.61 and 15% VAT on the service fee is ETB 0.39. Your current balance is ETB 4,043.81. Thank you for using telebirr Ethio telecom';
 const initial=clearDemoData(fresh()),first=previewSms([{sender:'127',body}],initial),saved=commitSms(initial,first);
 expect(first[0].status).toBe('Ready');expect(saved.tx.map(t=>t.amt)).toEqual([-15000,-300]);expect(saved.accounts[0].bal).toBe(404381);expect(saved.tx[0].ref).toBe('TESTTB123');expect(saved.tx[0].time).toBe('12:27:51');expect(totals(saved.tx).exp).toBe(15300);expect(previewSms([{sender:'127',body}],saved)[0].status).toBe('Duplicate');expect(JSON.stringify(saved)).not.toContain('1000000000001');
});
