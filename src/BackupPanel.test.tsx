// @vitest-environment jsdom
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {cleanup,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {fresh} from './domain';
import {BackupPanel} from './BackupPanel';
const mocks=vi.hoisted(()=>({readBackup:vi.fn(),createBackup:vi.fn(),downloadBackup:vi.fn(),restorePoint:vi.fn()}));
vi.mock('./backup',()=>({...mocks,MAX_BACKUP_BYTES:10*1024*1024}));
vi.mock('./storage',()=>({restorePoint:mocks.restorePoint}));
beforeEach(()=>{vi.resetAllMocks();mocks.restorePoint.mockResolvedValue(undefined);mocks.readBackup.mockResolvedValue({state:fresh(),createdAt:'2026-11-13T00:00:00Z'});mocks.createBackup.mockResolvedValue('backup');mocks.downloadBackup.mockResolvedValue(undefined);});
afterEach(cleanup);
const file=()=>{const f=new File(['{}'],'birrx.json',{type:'application/json'});Object.defineProperty(f,'text',{value:async()=>'{}'});return f;};
it('requires preview and explicit confirmation before replacing records',async()=>{
 const restore=vi.fn().mockResolvedValue(undefined),user=userEvent.setup();render(<BackupPanel state={fresh()} restore={restore}/>);
 await user.upload(screen.getByLabelText('Choose backup'),file());await screen.findByText('Restore preview');
 const button=screen.getByRole('button',{name:'Restore backup'}) as HTMLButtonElement;expect(button.disabled).toBe(true);expect(restore).not.toHaveBeenCalled();
 await user.click(screen.getByRole('checkbox'));await user.click(button);await screen.findByText('Backup restored and saved. Undo is available below.');expect(restore).toHaveBeenCalledTimes(1);
});
it('rejects a damaged file without offering restore or changing records',async()=>{
 mocks.readBackup.mockRejectedValue(new Error('Backup integrity check failed.'));
 const restore=vi.fn(),user=userEvent.setup();render(<BackupPanel state={fresh()} restore={restore}/>);
 await user.upload(screen.getByLabelText('Choose backup'),file());await screen.findByText('Backup integrity check failed.');expect(screen.queryByText('Restore preview')).toBeNull();expect(restore).not.toHaveBeenCalled();
});
it('cancels a preview without replacing data and exports the current workspace',async()=>{
 const state=fresh(),restore=vi.fn(),user=userEvent.setup();render(<BackupPanel state={state} restore={restore}/>);
 await user.upload(screen.getByLabelText('Choose backup'),file());await screen.findByText('Restore preview');await user.click(screen.getByRole('button',{name:'Cancel'}));expect(restore).not.toHaveBeenCalled();
 await user.click(screen.getByRole('button',{name:'Export backup'}));await waitFor(()=>expect(mocks.downloadBackup).toHaveBeenCalledWith('backup'));expect(mocks.createBackup).toHaveBeenCalledWith(state);
});
it('keeps the preview and reports a failed restore so the user can retry',async()=>{
 const restore=vi.fn().mockRejectedValue(new Error('Storage unavailable')),user=userEvent.setup();render(<BackupPanel state={fresh()} restore={restore}/>);
 await user.upload(screen.getByLabelText('Choose backup'),file());await screen.findByText('Restore preview');await user.click(screen.getByRole('checkbox'));await user.click(screen.getByRole('button',{name:'Restore backup'}));await screen.findByText('Storage unavailable');expect(screen.getByText('Restore preview')).toBeDefined();
});
