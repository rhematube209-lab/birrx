import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

// Capacitor 8.3.1 exposes swipe/click dismissal but not Android's timeout API.
// Apply this narrow, repeatable patch after install and before native sync.
// The timeout is attached to the built Notification, so it also works for
// scheduled reminders delivered while BirrX is closed. Do not use JS timers.
const path=fileURLToPath(new URL('../node_modules/@capacitor/local-notifications/android/src/main/kotlin/com/capacitorjs/plugins/localnotifications/LocalNotificationManager.kt',import.meta.url));
const source=readFileSync(path,'utf8');
const anchor='.setOngoing(localNotification.ongoing)';
const replacement=anchor+'\n            .setTimeoutAfter(30_000L) // BirrX: expire system alerts after 30 seconds';
if(source.includes(replacement)){
 console.log('BirrX Android notification timeout already applied.');
}else{
 if(source.split(anchor).length!==2)throw Error('Capacitor notification builder changed. Review the BirrX timeout patch before building Android.');
 writeFileSync(path,source.replace(anchor,replacement));
 console.log('Applied BirrX Android notification timeout (30 seconds).');
}
