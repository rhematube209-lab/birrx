// @vitest-environment jsdom
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {AccountDeletion} from './AccountDeletion';
const api=vi.hoisted(()=>({deleteOwnAccount:vi.fn(),finishAccountDeletion:vi.fn(),clearDeviceAccountData:vi.fn()}));
vi.mock('./services/accountDeletion',()=>api);
beforeEach(()=>{vi.clearAllMocks();api.deleteOwnAccount.mockResolvedValue(undefined);api.finishAccountDeletion.mockResolvedValue(undefined);});
afterEach(cleanup);
function submit(){fireEvent.change(screen.getByLabelText('Current password'),{target:{value:'temporary-password'}});fireEvent.change(screen.getByLabelText('Type DELETE to confirm'),{target:{value:'DELETE'}});fireEvent.click(screen.getByRole('checkbox'));fireEvent.submit(screen.getByRole('button',{name:'Permanently delete account'}).closest('form')!);}
it('requires explicit confirmation before calling the server',()=>{
 render(<AccountDeletion email="example@example.test"/>);fireEvent.submit(screen.getByRole('button',{name:'Permanently delete account'}).closest('form')!);
 expect(api.deleteOwnAccount).not.toHaveBeenCalled();expect(screen.getByRole('alert').textContent).toContain('Type DELETE');
});
it('preserves local data when server deletion is not confirmed and clears the password field',async()=>{
 api.deleteOwnAccount.mockRejectedValue(Error('Deletion service unavailable'));const remove=vi.fn();render(<AccountDeletion email="example@example.test" cleanup={remove}/>);submit();
 await screen.findByRole('alert');expect(remove).not.toHaveBeenCalled();expect(api.finishAccountDeletion).not.toHaveBeenCalled();
 await waitFor(()=>expect((screen.getByLabelText('Current password') as HTMLInputElement).value).toBe(''));
});
it('cleans the device and finishes only after server confirmation',async()=>{
 const order:string[]=[];api.deleteOwnAccount.mockImplementation(async()=>{order.push('server');});const remove=vi.fn(async()=>{order.push('device');});api.finishAccountDeletion.mockImplementation(async()=>{order.push('finish');});
 render(<AccountDeletion email="example@example.test" cleanup={remove}/>);submit();await waitFor(()=>expect(order).toEqual(['server','device','finish']));
});
it('explains partial cleanup without falsely reporting all data removed',async()=>{
 render(<AccountDeletion email="example@example.test" cleanup={async()=>{throw Error('Storage blocked');}}/>);submit();
 expect((await screen.findByRole('alert')).textContent).toContain('server account was deleted, but device cleanup could not finish');expect(api.finishAccountDeletion).not.toHaveBeenCalled();
});
