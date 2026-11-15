import {expect,it,vi,afterEach} from 'vitest';
import {authErrorMessage} from './auth';
afterEach(()=>vi.unstubAllGlobals());
it('asks users to enable Wi-Fi or mobile data when offline',()=>{vi.stubGlobal('navigator',{onLine:false});expect(authErrorMessage(new Error('Failed to fetch'))).toBe('No internet connection. Turn on Wi-Fi or mobile data, then try again.');});
it('replaces generic failed-fetch errors with connection guidance',()=>{vi.stubGlobal('navigator',{onLine:true});expect(authErrorMessage(new TypeError('Failed to fetch'))).toContain('Wi-Fi or mobile data');});
it('retains actionable authentication errors',()=>{expect(authErrorMessage({code:'invalid_credentials'})).toBe('The email or password is incorrect.');});
