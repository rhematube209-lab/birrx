// @vitest-environment jsdom
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
const api=vi.hoisted(()=>({getStatus:vi.fn(),setEnabled:vi.fn(),lockNow:vi.fn()}));
vi.mock('./services/deviceLock',()=>({deviceLock:api}));
vi.mock('./services/androidSmsBridge',()=>({isAndroidNative:()=>true}));
import {DeviceLockSettings} from './DeviceLockSettings';
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('keeps the lock preference unchanged when device authentication is canceled',async()=>{
 api.getStatus.mockResolvedValue({enabled:false,locked:false,available:true});api.setEnabled.mockRejectedValue(Error('Authentication canceled.'));
 const changed=vi.fn();render(<DeviceLockSettings changed={changed} close={vi.fn()}/>);
 await waitFor(()=>expect((screen.getByRole('button',{name:/Enable app lock/}) as HTMLButtonElement).disabled).toBe(false));
 fireEvent.click(screen.getByRole('button',{name:/Enable app lock/}));await screen.findByText('Authentication canceled.');expect(changed).not.toHaveBeenCalled();
});
it('updates the preference only after Android confirms successful authentication',async()=>{
 api.getStatus.mockResolvedValue({enabled:false,locked:false,available:true});api.setEnabled.mockResolvedValue({enabled:true,locked:false,available:true});
 const changed=vi.fn();render(<DeviceLockSettings changed={changed} close={vi.fn()}/>);
 await waitFor(()=>expect((screen.getByRole('button',{name:/Enable app lock/}) as HTMLButtonElement).disabled).toBe(false));
 fireEvent.click(screen.getByRole('button',{name:/Enable app lock/}));await waitFor(()=>expect(changed).toHaveBeenCalledWith(true));expect(screen.getByRole('button',{name:/Disable app lock/})).toBeDefined();
});
