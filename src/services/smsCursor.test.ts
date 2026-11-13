import {expect,it,vi} from 'vitest';
import {fresh,clearDemoData} from '../domain';
const scan=vi.hoisted(()=>vi.fn());
vi.mock('./androidSmsBridge',()=>({scanNativeInbox:scan}));
import {runInboxScan} from './smsScanner';
it('continues native batches after the last timestamp and ID, including equal timestamps',async()=>{
 const msg=(id:string)=>({id,sender:'CBE',timestamp:1700000000000,body:'Your verification code is 123456'});
 scan.mockResolvedValueOnce({messages:[msg('11'),msg('12')],hasMore:true}).mockResolvedValueOnce({messages:[msg('13')],hasMore:false});
 const result=await runInboxScan(clearDemoData(fresh()));
 expect(result.summary.scannedCount).toBe(3);
 expect(scan.mock.calls[1][0]).toMatchObject({afterTimestamp:1700000000000,afterId:'12',offset:0});
});
