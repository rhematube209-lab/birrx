import {sha256} from '@noble/hashes/sha2.js';
export function smsFingerprint(body:string){return Array.from(sha256(new TextEncoder().encode(body.normalize('NFKC').replace(/\s+/g,' ').trim())),b=>b.toString(16).padStart(2,'0')).join('');}
