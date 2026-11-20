import {beforeEach,it,expect,vi} from 'vitest';
import {fresh} from '../domain';
const api=vi.hoisted(()=>({checkPermissions:vi.fn(),getPending:vi.fn(),cancel:vi.fn(),createChannel:vi.fn(),schedule:vi.fn(),setNotificationEnabled:vi.fn(),configureInsights:vi.fn(),getInsightHistory:vi.fn()}));
vi.mock('@capacitor/local-notifications',()=>({LocalNotifications:api}));
vi.mock('@capacitor/core',()=>({registerPlugin:()=>api}));
vi.mock('./androidSmsBridge',()=>({isAndroidNative:()=>true}));
beforeEach(()=>{vi.resetModules();vi.clearAllMocks();api.checkPermissions.mockResolvedValue({display:'granted'});api.getPending.mockResolvedValue({notifications:[]});api.schedule.mockResolvedValue({});api.configureInsights.mockResolvedValue({});api.getInsightHistory.mockResolvedValue({items:[]});});
it('cancels only managed reminders when disabled, preserving unrelated notifications',async()=>{
 api.getPending.mockResolvedValue({notifications:[{id:10001},{id:9999}]});const {syncNotifications}=await import('./notifications');
 await syncNotifications(fresh(),vi.fn(),vi.fn());expect(api.cancel).toHaveBeenCalledWith({notifications:[{id:10001}]});expect(api.schedule).not.toHaveBeenCalled();
});
it('posts a goal milestone once, schedules private reminders without exact-alarm requests, and routes to that goal',async()=>{
 const s=fresh();s.prefs.notify_goals='On';s.goals=[{id:'goal',name:'Private goal',saved:50,target:100}];const events=vi.fn(),error=vi.fn();const {syncNotifications}=await import('./notifications');
 await syncNotifications(s,events,error);await syncNotifications(s,events,error);
 expect(error).not.toHaveBeenCalled();expect(events).toHaveBeenCalledTimes(1);
 const messages=api.schedule.mock.calls.flatMap(c=>c[0].notifications);
 expect(messages.filter(n=>n.title==='Goal milestone reached')).toHaveLength(1);
 expect(messages.find(n=>n.title==='Goal milestone reached').extra).toEqual({kind:'goal',id:'goal'});
 expect(messages.every(n=>n.isExactNotification===false&&n.ongoing===false&&n.autoCancel===true)).toBe(true);expect(JSON.stringify(messages)).not.toContain('Private goal');
});
it('does not post when permission is denied',async()=>{
 api.checkPermissions.mockResolvedValue({display:'denied'});const s=fresh();s.prefs.notify_plans='On';const {syncNotifications}=await import('./notifications');await syncNotifications(s,vi.fn(),vi.fn());expect(api.schedule).not.toHaveBeenCalled();
});
it('sends distinct test messages and routes for each notification type',async()=>{
 const {testNotification}=await import('./notifications');
 for(const kind of ['transactions','plans','goals','recurring'] as const)await testNotification(kind);
 const messages=api.schedule.mock.calls.map(c=>c[0].notifications[0]);
 expect(messages.map(n=>n.title)).toEqual(['Test: New transaction','Test: Budget','Test: Goal milestone','Test: Payment reminder']);
 expect(messages.map(n=>n.extra)).toEqual([{kind:'transaction'},{kind:'plan',id:'Plan'},{kind:'plan',id:'Goals'},{kind:'bill'}]);
});
it('describes the direction and account of a new transaction without exposing its amount',async()=>{
 const s=fresh();s.hidden=true;s.prefs.notify_transactions='On';const tx={...s.tx[0],bank:'CBE',amt:-123456};
 const {notifyNewTransactions}=await import('./notifications');await notifyNewTransactions(s,[tx]);
 const message=api.schedule.mock.calls[0][0].notifications[0];
 expect(message.title).toContain('Outgoing transaction');expect(message.body).toBe('Tap to categorize');expect(JSON.stringify(message)).not.toContain('123456');expect(message.extra).toEqual({kind:'transaction',id:tx.id});
});

it('formats the amount and recipient and respects hidden amounts',async()=>{
 const {transactionAlertTitle}=await import('./notifications');const tx={...fresh().tx[0],amt:-39000,person:'Example Recipient'};
 expect(transactionAlertTitle(tx,false)).toBe('-390 ETB · to Example Recipient');expect(transactionAlertTitle(tx,true)).not.toContain('390');
});

it('configures recurring native insights separately and opens daily/weekly reports from test alerts',async()=>{
 const s=fresh();s.prefs.notify_dailyInsights='Off';
 const {syncInsightNotifications,testNotification}=await import('./notifications');
 await syncInsightNotifications(s);expect(api.configureInsights).toHaveBeenCalledWith({daily:false,weekly:true});
 api.checkPermissions.mockResolvedValue({display:'denied'});await syncInsightNotifications(s);expect(api.configureInsights).toHaveBeenLastCalledWith({daily:false,weekly:false});
 await testNotification('dailyInsights');await testNotification('weeklyInsights');
 const alerts=api.schedule.mock.calls.map(c=>c[0].notifications[0]);
 expect(alerts[0].extra).toMatchObject({kind:'report',period:'day'});expect(alerts[1].extra).toMatchObject({kind:'report',period:'week'});
 expect(alerts.every(n=>/^\d{4}-\d{2}-\d{2}$/.test(n.extra.date))).toBe(true);
});
