// @vitest-environment jsdom
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {addInboxNotification,todayNotifications,syncInboxReminders} from './notificationInbox';
beforeEach(()=>{localStorage.clear();vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-13T20:59:00Z'));});afterEach(()=>vi.useRealTimers());
it('clears yesterday at EAT midnight and retains today across reads',()=>{
 addInboxNotification({key:'one',title:'Alert',body:'Review',at:new Date().toISOString(),target:{kind:'review'}});
 expect(todayNotifications()).toHaveLength(1);expect(todayNotifications()).toHaveLength(1);
 vi.setSystemTime(new Date('2026-11-13T21:00:00Z'));expect(todayNotifications()).toEqual([]);
});
it('shows scheduled reminders only when due and removes canceled future reminders',()=>{
 const item={key:'bill',title:'Payment',body:'Due',at:'2026-11-13T20:59:30Z',target:{kind:'bill' as const},scheduled:true};
 syncInboxReminders([item]);expect(todayNotifications()).toEqual([]);syncInboxReminders([]);vi.advanceTimersByTime(31000);expect(todayNotifications()).toEqual([]);
});
