import type {State,UnmatchedItem} from './domain';
export function isNonFinancialReview(item:Pick<UnmatchedItem,'category'|'reason'>){
 return ['security','promo','service'].includes(item.category||'')||['otp_security','promotional','service_notice'].includes(item.reason||'');
}
export function cleanSmsReview(state:State):State{
 const unmatched=state.unmatched.filter(item=>!isNonFinancialReview(item));
 return unmatched.length===state.unmatched.length?state:{...state,unmatched};
}
