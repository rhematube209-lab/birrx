import {createClient} from '@supabase/supabase-js';

const url=import.meta.env.VITE_SUPABASE_URL?.trim();
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
// Only the public project key belongs in a Vite build. Never use an admin key here.
export const authClient=url&&key?createClient(url,key,{
 auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'birrx-auth'}
}):null;

export function authErrorMessage(error:unknown){
 const code=(error as {code?:string})?.code;
 if(code==='invalid_credentials')return 'The email or password is incorrect.';
 if(code==='email_not_confirmed')return 'Verify your email before signing in. You can request another code below.';
 if(code==='otp_expired')return 'That code is invalid or has expired. Request a new code and try again.';
 if(code==='over_email_send_rate_limit'||code==='over_request_rate_limit')return 'Too many attempts. Wait a moment before trying again.';
 if(typeof navigator!=='undefined'&&!navigator.onLine)return 'You’re offline. Connect to the internet to manage your account.';
 return error instanceof Error?error.message:'Unable to complete the request. Please try again.';
}
