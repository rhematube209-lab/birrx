import {describe,it,expect} from 'vitest';
import {fresh} from '../domain';
import {reminderPlan,milestoneEvents} from './notificationPlan';
describe('notification plans',()=>{
 it('uses EAT, clamps monthly dates and leaves financial data unchanged',()=>{
  const s=fresh();s.prefs.notify_recurring='On';s.bills=[{id:'rent',name:'Private rent name',amt:10000,date:'2027-01-31'}];const original=JSON.stringify(s);
  const reminders=reminderPlan(s,new Date('2027-01-30T05:00:00Z'));
  expect(reminders.some(r=>r.at.toISOString()==='2027-02-28T06:00:00.000Z')).toBe(true);
  expect(reminders.some(r=>r.at.toISOString()==='2027-01-30T06:00:00.000Z')).toBe(true);
  expect(JSON.stringify(s)).toBe(original);expect(JSON.stringify(reminders)).not.toContain('Private rent name');
 });
 it('cancels disabled and completed goal reminders and excludes past reminders',()=>{
  const s=fresh();expect(reminderPlan(s)).toEqual([]);s.prefs.notify_goals='On';s.goals=[{id:'g',name:'Goal',saved:100,target:100}];expect(reminderPlan(s)).toEqual([]);
  s.goals[0].saved=0;const now=new Date('2026-11-12T08:00:00Z');expect(reminderPlan(s,now).every(r=>r.at>now&&r.at.getUTCDay()===1)).toBe(true);
 });
 it('uses actual month and shared spending calculations, excluding confirmed transfers',()=>{
  const s=fresh();s.prefs.notify_plans='On';s.budget=10000;s.period.date='2020-01-01';s.tx=[{...s.tx[0],date:'2026-11-12',amt:-20000,transfer:'own-test'}];
  expect(milestoneEvents(s,new Date('2026-11-12T08:00Z'))).toEqual([]);
  s.tx[0].transfer=undefined;expect(milestoneEvents(s,new Date('2026-11-12T08:00Z')).some(e=>e.key==='budget:2026-11:100')).toBe(true);
 });
});
