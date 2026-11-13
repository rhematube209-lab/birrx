package com.birrx.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.telephony.SmsMessage;

public class SmsBroadcastReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (!"android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) {
            return;
        }

        Bundle bundle = intent.getExtras();
        if (bundle == null) return;

        Object[] pdus = (Object[]) bundle.get("pdus");
        String format = bundle.getString("format");
        if (pdus == null || pdus.length == 0) return;

        StringBuilder fullBody = new StringBuilder();
        String sender = null;
        long timestamp = 0L;

        for (Object pdu : pdus) {
            SmsMessage message;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                message = SmsMessage.createFromPdu((byte[]) pdu, format);
            } else {
                message = SmsMessage.createFromPdu((byte[]) pdu);
            }
            if (message != null) {
                if (sender == null) {
                    sender = message.getDisplayOriginatingAddress();
                    timestamp = message.getTimestampMillis();
                }
                fullBody.append(message.getMessageBody());
            }
        }

        if (sender != null && SmsScannerPlugin.isSupportedSender(sender)) {
            SmsScannerPlugin.onIncomingSms(sender, fullBody.toString(), timestamp);
            if (context.getSharedPreferences("birrx-notifications", 0).getBoolean("transactions", false)
                && fullBody.toString().matches("(?is).*(?:debited with ETB|credited with ETB|debit transaction of ETB|You have (?:received\\s+ETB|transferred ETB|paid ETB|successfully transferred ETB|successfully paid a credit amount|repaid)).*")) {
                android.app.NotificationManager manager = (android.app.NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) return;
                NotificationChannels.ensure(context);
                String bank = sender.equalsIgnoreCase("CBE") ? "CBE" : sender.equalsIgnoreCase("BOA") ? "BOA" : "Telebirr";
                Intent launch = new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP).putExtra("birrxSmsTimestamp", timestamp).putExtra("birrxSmsBank", bank);
                java.util.regex.Matcher reference = java.util.regex.Pattern.compile("(?:Your (?:telebirr )?transaction number is|by transaction number)\\s+([A-Za-z0-9-]+)|https://mbreciept\\.cbe\\.com\\.et/([A-Za-z0-9-]+)|https://cs\\.bankofabyssinia\\.com/slip/\\?trx=([A-Za-z0-9]+)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(fullBody);
                if (reference.find()) for (int i = 1; i <= 3; i++) if (reference.group(i) != null) launch.putExtra("birrxSmsReference", reference.group(i));
                try {
                    android.content.SharedPreferences prefs = context.getSharedPreferences("birrx-notifications", 0);
                    org.json.JSONArray previous = new org.json.JSONArray(prefs.getString("history", "[]"));
                    org.json.JSONArray history = new org.json.JSONArray();
                    java.text.SimpleDateFormat day = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US);
                    day.setTimeZone(java.util.TimeZone.getTimeZone("Africa/Addis_Ababa"));
                    long now = System.currentTimeMillis();
                    for (int n = Math.max(0, previous.length()-499); n < previous.length(); n++) {
                        org.json.JSONObject item = previous.getJSONObject(n);
                        if (day.format(new java.util.Date(item.getLong("at"))).equals(day.format(new java.util.Date(now)))) history.put(item);
                    }
                    org.json.JSONObject item = new org.json.JSONObject();
                    item.put("at", now); item.put("timestamp", timestamp); item.put("bank", bank);
                    item.put("reference", launch.getStringExtra("birrxSmsReference"));
                    history.put(item); prefs.edit().putString("history", history.toString()).apply();
                } catch (org.json.JSONException ignored) { /* Delivery continues if history is unavailable. */ }
                int id = (sender + timestamp).hashCode() & 0x7fffffff;
                android.app.PendingIntent pending = android.app.PendingIntent.getActivity(context, id, launch, android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE);
                manager.notify("birrx-sms", id, new androidx.core.app.NotificationCompat.Builder(context, NotificationChannels.TRANSACTIONS)
                    .setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle("New " + bank + " activity")
                    .setContentText("Tap to sync and categorize your transaction.").setContentIntent(pending)
                    .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH).setDefaults(android.app.Notification.DEFAULT_ALL)
                    .setVisibility(androidx.core.app.NotificationCompat.VISIBILITY_PRIVATE).setAutoCancel(true).build());
            }
        }
    }
}

