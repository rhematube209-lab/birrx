// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen,fireEvent} from '@testing-library/react';
import {RecoveryPage} from './RecoveryPage';
const mock=vi.hoisted(()=>({setSession:vi.fn(),updateUser:vi.fn(),signOut:vi.fn()}));
vi.mock('./services/auth',()=>({createRecoveryClient:()=>({auth:mock}),authErrorMessage:(e:Error)=>e.message}));
beforeEach(()=>{vi.clearAllMocks();history.replaceState(null,'','/#access_token=test-access&refresh_token=test-refresh&type=recovery');mock.setSession.mockResolvedValue({error:null});mock.updateUser.mockResolvedValue({error:null});mock.signOut.mockResolvedValue({error:null});});
afterEach(cleanup);
it('consumes recovery credentials, removes them from the URL and saves a new password',async()=>{
 render(<RecoveryPage/>);await screen.findByLabelText('New password');expect(location.hash).toBe('#ResetPassword');
 expect(mock.setSession).toHaveBeenCalledWith({access_token:'test-access',refresh_token:'test-refresh'});
 fireEvent.change(screen.getByLabelText('New password'),{target:{value:'new-password123'}});fireEvent.change(screen.getByLabelText('Confirm password'),{target:{value:'new-password123'}});
 fireEvent.click(screen.getByRole('button',{name:'Save new password'}));await screen.findByRole('heading',{name:'Password updated'});
 expect(mock.updateUser).toHaveBeenCalledWith({password:'new-password123'});expect(mock.signOut).toHaveBeenCalledWith({scope:'local'});
});
it('rejects missing or expired links without allowing a password change',async()=>{
 history.replaceState(null,'','/#error=access_denied&error_code=otp_expired');render(<RecoveryPage/>);await screen.findByRole('alert');expect(mock.setSession).not.toHaveBeenCalled();expect(screen.queryByLabelText('New password')).toBeNull();
});
it('keeps a failed password update on the form so the user can retry',async()=>{
 mock.updateUser.mockResolvedValue({error:Error('Try a stronger password')});render(<RecoveryPage/>);await screen.findByLabelText('New password');
 fireEvent.change(screen.getByLabelText('New password'),{target:{value:'password123'}});fireEvent.change(screen.getByLabelText('Confirm password'),{target:{value:'password123'}});fireEvent.click(screen.getByRole('button',{name:'Save new password'}));
 expect((await screen.findByRole('alert')).textContent).toContain('stronger');expect(mock.signOut).not.toHaveBeenCalled();
});
