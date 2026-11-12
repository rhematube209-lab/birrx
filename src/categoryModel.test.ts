import 'fake-indexeddb/auto';
import {describe,it,expect} from 'vitest';
import {fresh,totals} from './domain';
import {categoryCatalog,saveCategory,deleteCategory,toggleCategory,toggleFavorite,selectableCategories} from './categoryModel';
import {createBackup,readBackup} from './backup';
import {persist,load} from './storage';
const custom={name:'Medical',direction:'out' as const,icon:'heart',color:'#4383e4',hidden:false};
describe('category management',()=>{
 it('stars and unstars categories, sorts favorites first and reveals hidden starred categories',()=>{
  const original=fresh(),food=categoryCatalog(original).find(c=>c.name==='Food')!;
  const s=toggleFavorite(toggleCategory(original,food.id),food.id);
  expect(categoryCatalog(s).find(c=>c.id===food.id)).toMatchObject({favorite:true,hidden:false});expect(selectableCategories(s,-1)[0].name).toBe('Food');expect(totals(s.tx)).toEqual(totals(original.tx));
  expect(categoryCatalog(toggleFavorite(s,food.id)).find(c=>c.id===food.id)?.favorite).toBe(false);
 });
 it('keeps favorites when editing and across persistence and backup restore',async()=>{
  let s=saveCategory(fresh(),custom);const category=categoryCatalog(s).find(c=>c.name==='Medical')!;s=toggleFavorite(s,category.id);s=saveCategory(s,{...category,name:'Health'});
  expect(categoryCatalog(s).find(c=>c.name==='Health')?.favorite).toBe(true);
  const name='favorites-'+crypto.randomUUID();await persist(s,name);expect(categoryCatalog(await load(name)).find(c=>c.name==='Health')?.favorite).toBe(true);
  expect(categoryCatalog((await readBackup(await createBackup(s))).state).find(c=>c.name==='Health')?.favorite).toBe(true);
 });
 it('includes every reference category and its parent grouping',()=>{
  const categories=categoryCatalog(fresh());for(const name of ['Internal Transfer','Loan','Owed','Repayment','Airtime & packages','Bills','Charity','Coffee','Eating out','Education','Events','Family','Food delivery','Friends','Groceries','Lottery'])expect(categories.some(c=>c.name===name)).toBe(true);
  expect(categories.find(c=>c.name==='Coffee')?.parent).toBe(categories.find(c=>c.name==='Food')?.id);
 });
 it('keeps legacy labels, hides from new selections and preserves current selections and totals',()=>{
  const s=fresh();s.tx[0].cat='Legacy custom';expect(categoryCatalog(s).some(c=>c.name==='Legacy custom')).toBe(true);
  const food=categoryCatalog(s).find(c=>c.name==='Food')!;const next=toggleCategory(s,food.id);
  expect(selectableCategories(next,-1).some(c=>c.name==='Food')).toBe(false);expect(selectableCategories(next,-1,'Food').some(c=>c.name==='Food')).toBe(true);expect(totals(next.tx)).toEqual(totals(s.tx));
 });
 it('filters selectable categories by direction without converting transaction amounts',()=>{
  const s=saveCategory(fresh(),custom);expect(selectableCategories(s,100).some(c=>c.name==='Medical')).toBe(false);expect(selectableCategories(s,-100).some(c=>c.name==='Medical')).toBe(true);expect(selectableCategories(s,-100,'food').some(c=>c.name==='food')).toBe(true);
 });
 it('renames custom labels across transactions, rules and monthly spending limits',()=>{
  let s=saveCategory(fresh(),custom);const record=categoryCatalog(s).find(c=>c.name==='Medical')!;s.tx[0].cat='Medical';s.rules={'cbe|doctor':'Medical'};s.limits={Medical:100};s.categoryLimits={'2026-11':{Medical:200}};
  const next=saveCategory(s,{...record,name:'Health'});expect(next.tx[0].cat).toBe('Health');expect(next.rules['cbe|doctor']).toBe('Health');expect(next.limits.Health).toBe(100);expect(next.categoryLimits?.['2026-11'].Health).toBe(200);expect(totals(next.tx)).toEqual(totals(s.tx));
 });
 it('deletes a custom category by moving references to Other without deleting transactions',()=>{
  const s=saveCategory(fresh(),custom);s.tx[0].cat='Medical';s.rules={doctor:'Medical'};const next=deleteCategory(s,categoryCatalog(s).find(c=>c.name==='Medical')!.id);expect(next.tx.length).toBe(s.tx.length);expect(next.tx[0].cat).toBe('Other');expect(next.rules.doctor).toBe('Other');expect(categoryCatalog(next).some(c=>c.name==='Medical')).toBe(false);
 });
 it('rejects duplicate names and protects built-in names, deletion and fallback visibility',()=>{
  const s=fresh();expect(()=>saveCategory(s,{...custom,name:' food '})).toThrow('already exists');const other=categoryCatalog(s).find(c=>c.name==='Other')!;
  expect(()=>saveCategory(s,{...other,name:'Rename'})).toThrow('Built-in');expect(()=>deleteCategory(s,other.id)).toThrow('custom');expect(categoryCatalog(toggleCategory(s,other.id)).find(c=>c.id===other.id)?.hidden).toBe(false);
 });
 it('persists custom categories and includes them in backup round-trips',async()=>{
  const s=saveCategory(fresh(),custom),name='categories-'+crypto.randomUUID();await persist(s,name);expect((await load(name)).categoryDefinitions).toEqual(s.categoryDefinitions);expect((await readBackup(await createBackup(s))).state.categoryDefinitions).toEqual(s.categoryDefinitions);
 });
});
