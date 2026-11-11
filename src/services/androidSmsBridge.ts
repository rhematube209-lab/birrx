import { Capacitor, registerPlugin } from '@capacitor/core';

export interface RawSmsMessage {
  id: string;
  sender: string;
  body: string;
  timestamp: number; // Epoch milliseconds from Android telephony provider
}

export interface ScanBatchResult {
  messages: RawSmsMessage[];
  count: number;
  hasMore: boolean;
}

export interface PermissionCheckResult {
  status: 'granted' | 'denied' | 'prompt' | 'unsupported';
  granted: boolean;
}

interface SmsScannerPluginNative {
  checkSmsPermission(): Promise<PermissionCheckResult>;
  requestSmsPermission(): Promise<PermissionCheckResult>;
  scanInbox(options: {
    sinceTimestamp?: number;
    limit?: number;
    offset?: number;
  }): Promise<ScanBatchResult>;
  addListener(
    eventName: 'smsReceived',
    listenerFunc: (message: { sender: string; body: string; timestamp: number }) => void
  ): Promise<{ remove: () => Promise<void> }>;
  addListener(eventName: 'appResumed', listenerFunc: () => void): Promise<{ remove: () => Promise<void> }>;
}

const SmsScannerNative = registerPlugin<SmsScannerPluginNative>('SmsScanner');

export const isAndroidNative = (): boolean => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
};

export const checkSmsPermission = async (): Promise<PermissionCheckResult> => {
  if (!isAndroidNative()) {
    return { status: 'unsupported', granted: false };
  }
  try {
    return await SmsScannerNative.checkSmsPermission();
  } catch {
    return { status: 'denied', granted: false };
  }
};

export const requestSmsPermission = async (): Promise<PermissionCheckResult> => {
  if (!isAndroidNative()) {
    return { status: 'unsupported', granted: false };
  }
  try {
    return await SmsScannerNative.requestSmsPermission();
  } catch {
    return { status: 'denied', granted: false };
  }
};

export const scanNativeInbox = async (options: {
  sinceTimestamp?: number;
  limit?: number;
  offset?: number;
}): Promise<ScanBatchResult> => {
  if (!isAndroidNative()) {
    return { messages: [], count: 0, hasMore: false };
  }
  return await SmsScannerNative.scanInbox(options);
};

export const subscribeToIncomingSms = (
  callback: (sms: { sender: string; body: string; timestamp: number }) => void
): (() => void) => {
  if (!isAndroidNative()) {
    return () => {};
  }
  let disposed = false;
  let handle: { remove: () => Promise<void> } | null = null;
  SmsScannerNative.addListener('smsReceived', callback).then((h) => {
    if (disposed) void h.remove();
    else handle = h;
  }).catch(() => {});

  return () => {
    disposed = true;
    void handle?.remove();
  };
};

export const subscribeToAppResume = (callback: () => void): (() => void) => {
  if (!isAndroidNative()) return () => {};
  let disposed = false;
  let handle: { remove: () => Promise<void> } | null = null;
  SmsScannerNative.addListener('appResumed', () => callback()).then((h) => {
    if (disposed) void h.remove();
    else handle = h;
  }).catch(() => {});
  return () => {
    disposed = true;
    void handle?.remove();
  };
};

