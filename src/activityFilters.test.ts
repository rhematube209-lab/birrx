import {describe,it,expect} from 'vitest';
import {fresh} from './domain';
import {amountBound,filterActivity} from './activityFilters';
describe('activity filters',()=>{
 const rows=fresh().tx;const base={account:'All',direction:'All',query:'',category:'All',minimum:'',maximum:''};
 it('matches account, direction, category, text and absolute amount together',()=>{
  const row=rows.find(r=>r.amt<0)!;
  const result=filterActivity(rows,{...base,account:row.bank,direction:'Out',category:row.cat,query:row.ref,minimum:String(Math.abs(row.amt)/100),maximum:String(Math.abs(row.amt)/100)});
  expect(result.map(r=>r.id)).toContain(row.id);expect(result.every(r=>r.amt===row.amt&&r.bank===row.bank)).toBe(true);
 });
 it('parses santim exactly and rejects invalid and inverted ranges',()=>{
  expect(amountBound('12.03')).toBe(1203);expect(amountBound('')).toBeUndefined();expect(amountBound('1.234')).toBeNull();
  expect(filterActivity(rows,{...base,minimum:'10',maximum:'9'})).toEqual([]);expect(filterActivity(rows,{...base,minimum:'bad'})).toEqual([]);
 });
});
