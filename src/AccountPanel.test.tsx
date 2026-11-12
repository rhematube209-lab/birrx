// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {AccountPanel} from './AccountPanel';

const mock=vi.hoisted(()=>({
 listener:null as null|((event:string,session:unknown)=>void),
 getSession:vi.fn(),signUp:vi.fn(),signInWithPassword:vi.fn(),verifyOtp:vi.fn(),
 resetPasswordForEmail:vi.fn(),updateUser:vi.fn(),signOut:vi.fn(),resend:vi.fn(),unsubscribe:vi.fn()
}));
vi.mock('./services/auth',()=>({authClient:{auth:{
 ...mock,onAuthStateChange:(listener:(event:string,session:unknown)=>void)=>{mock.listener=listener;return {data:{subscription:{unsubscribe:mock.unsubscribe}}};}
}},authErrorMessage:(error:Error)=>error.message}));
const session={user:{id:'account-123',email:'person@example.com',email_confirmed_at:'2026-11-12T00:00:00Z'}};
beforeEach(()=>{
 vi.clearAllMocks();localStorage.clear();mock.listener=null;
 mock.getSession.mockResolvedValue({data:{session:null},error:null});
 mock.signUp.mockResolvedValue({data:{session:null},error:null});
 for(const fn of [mock.signInWithPassword,mock.verifyOtp,mock.resetPasswordForEmail,mock.updateUser,mock.signOut,mock.resend])fn.mockResolvedValue({error:null});
});
afterEach(cleanup);
async function ready(){render(<AccountPanel/>);await screen.findByRole('heading',{name:'Sign in to BirrX'});return userEvent.setup();}
async function fillEmail(user:ReturnType<typeof userEvent.setup>){await user.type(screen.getByLabelText('Email'),'person@example.com');}
describe('email account flows',()=>{
 it('opens the account immediately when registration returns a session without email confirmation',async()=>{
  mock.signUp.mockImplementation(async()=>{mock.listener?.('SIGNED_IN',session);return {data:{session},error:null};});
  const user=await ready();await user.click(screen.getByRole('button',{name:'Create account'}));
  await user.type(screen.getByLabelText('Name'),'Example');await fillEmail(user);
  await user.type(screen.getByLabelText('Password'),'password123');await user.type(screen.getByLabelText('Confirm password'),'password123');
  await user.click(screen.getByRole('button',{name:'Create account'}));
  await screen.findByRole('heading',{name:'BirrX account'});
  expect(screen.queryByRole('heading',{name:'Verify your email'})).toBeNull();
 });
 it('registers and verifies a code without storing the password or code',async()=>{
  const user=await ready();await user.click(screen.getByRole('button',{name:'Create account'}));
  await user.type(screen.getByLabelText('Name'),'Example Person');await fillEmail(user);
  await user.type(screen.getByLabelText('Password'),'password123');await user.type(screen.getByLabelText('Confirm password'),'password123');
  await user.click(screen.getByRole('button',{name:'Create account'}));
  expect(mock.signUp).toHaveBeenCalledWith({email:'person@example.com',password:'password123',options:{data:{display_name:'Example Person'}}});
  await screen.findByRole('heading',{name:'Verify your email'});
  await user.type(screen.getByLabelText('Email code'),'123456');await user.click(screen.getByRole('button',{name:'Verify email'}));
  expect(mock.verifyOtp).toHaveBeenCalledWith({email:'person@example.com',token:'123456',type:'signup'});
  expect(JSON.stringify(localStorage)).not.toContain('password123');expect(JSON.stringify(localStorage)).not.toContain('123456');
 });
 it('blocks mismatched registration passwords before making a request',async()=>{
  const user=await ready();await user.click(screen.getByRole('button',{name:'Create account'}));
  await user.type(screen.getByLabelText('Name'),'Example');await fillEmail(user);
  await user.type(screen.getByLabelText('Password'),'password123');await user.type(screen.getByLabelText('Confirm password'),'different123');
  await user.click(screen.getByRole('button',{name:'Create account'}));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','The passwords do not match.');expect(mock.signUp).not.toHaveBeenCalled();
 });
 it('shows a failed sign-in and leaves the form usable',async()=>{
  mock.signInWithPassword.mockResolvedValue({error:new Error('Incorrect credentials')});
  const user=await ready();await fillEmail(user);await user.type(screen.getByLabelText('Password'),'wrongpass');
  await user.click(screen.getByRole('button',{name:'Sign in'}));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','Incorrect credentials');
  expect((screen.getByRole('button',{name:'Sign in'}) as HTMLButtonElement).disabled).toBe(false);
 });
 it('verifies recovery before updating the password',async()=>{
  const user=await ready();await user.click(screen.getByRole('button',{name:'Forgot password?'}));await fillEmail(user);
  await user.click(screen.getByRole('button',{name:'Send recovery code'}));
  expect(mock.resetPasswordForEmail).toHaveBeenCalledWith('person@example.com');
  await user.type(await screen.findByLabelText('Email code'),'654321');await user.click(screen.getByRole('button',{name:'Verify recovery code'}));
  expect(mock.verifyOtp).toHaveBeenCalledWith({email:'person@example.com',token:'654321',type:'recovery'});
  await screen.findByRole('heading',{name:'Choose a new password'});
  await user.type(screen.getByLabelText('Password'),'updatedpass123');await user.type(screen.getByLabelText('Confirm password'),'updatedpass123');
  await user.click(screen.getByRole('button',{name:'Save new password'}));expect(mock.updateUser).toHaveBeenCalledWith({password:'updatedpass123'});
 });
 it('restores a session and signs out without clearing device data',async()=>{
  mock.getSession.mockResolvedValue({data:{session},error:null});localStorage.setItem('device-record','keep');
  render(<AccountPanel/>);const user=userEvent.setup();await screen.findByText('person@example.com');
  await user.click(screen.getByRole('button',{name:'Sign out'}));expect(mock.signOut).toHaveBeenCalledWith({scope:'local'});
  await act(async()=>mock.listener?.('SIGNED_OUT',null));
  await screen.findByRole('heading',{name:'Sign in to BirrX'});expect(localStorage.getItem('device-record')).toBe('keep');
 });
 it('shows the authenticated account after a successful sign-in event',async()=>{
  const user=await ready();await fillEmail(user);await user.type(screen.getByLabelText('Password'),'password123');await user.click(screen.getByRole('button',{name:'Sign in'}));
  await act(async()=>mock.listener?.('SIGNED_IN',session));
  await waitFor(()=>expect(screen.getByRole('heading',{name:'BirrX account'})).toBeDefined());expect(screen.getByText('account-123')).toBeDefined();
 });
});
