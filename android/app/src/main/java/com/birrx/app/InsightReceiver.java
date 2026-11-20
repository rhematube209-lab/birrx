package com.birrx.app;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import org.json.JSONArray;
import org.json.JSONObject;

public class InsightReceiver extends BroadcastReceiver {
    private static final String DAILY = "com.birrx.app.DAILY_INSIGHT";
    private static final String WEEKLY = "com.birrx.app.WEEKLY_INSIGHT";
    static SharedPreferences prefs(Context context) { return context.getSharedPreferences("birrx-insights", 0); }
    private static int id(boolean weekly) { return weekly ? 71002 : 71001; }
    private static boolean enabled(Context context, boolean weekly) { return prefs(context).getBoolean(weekly ? "weekly" : "daily", false); }

    static void scheduleAll(Context context) { schedule(context, false); schedule(context, true); }
    private static void schedule(Context context, boolean weekly) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        long at = InsightSchedule.next(System.currentTimeMillis(), weekly);
        Intent intent = new Intent(context, InsightReceiver.class).setAction(weekly ? WEEKLY : DAILY).putExtra("date", InsightSchedule.date(at));
        PendingIntent pending = PendingIntent.getBroadcast(context, id(weekly), intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        alarms.cancel(pending);
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (!enabled(context, weekly)) { manager.cancel(id(weekly)); return; }
        // No exact-alarm permission. Android may defer delivery during battery restrictions.
        if (weekly && enabled(context, false)) return; // Sunday insights share the daily wake-up.
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending);
    }

    @Override public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (!DAILY.equals(action) && !WEEKLY.equals(action)) { scheduleAll(context); return; }
        boolean weekly = WEEKLY.equals(action);
        if (!enabled(context, weekly)) return;
        String date = intent.getStringExtra("date");
        if (date == null || !date.matches("\\d{4}-\\d{2}-\\d{2}")) date = InsightSchedule.date(System.currentTimeMillis());
        try {
            deliver(context, weekly, date);
            if (!weekly && InsightSchedule.sunday(date)) deliver(context, true, date);
        } finally { scheduleAll(context); }
    }

    static void recover(Context context) {
        long now = System.currentTimeMillis();
        String date = InsightSchedule.date(now);
        if (!InsightSchedule.date(InsightSchedule.next(now, false)).equals(date)) {
            deliver(context, false, date);
            if (InsightSchedule.sunday(date)) deliver(context, true, date);
        }
        scheduleAll(context);
    }

    private static void deliver(Context context, boolean weekly, String date) {
        if (!enabled(context, weekly) || date.equals(prefs(context).getString(weekly ? "lastWeekly" : "lastDaily", ""))) return;
        if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
            String period = weekly ? "week" : "day";
            String title = weekly ? "Your weekly money insights" : "Today's money insights";
            String body = weekly ? "Review Monday to Sunday's income, spending and net cash flow. Tap to open Reports." : "Review today's income, spending and net cash flow. Tap to open Reports.";
            Intent launch = new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP)
                .putExtra("birrxInsightPeriod", period).putExtra("birrxInsightDate", date);
            PendingIntent tap = PendingIntent.getActivity(context, id(weekly), launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            NotificationChannels.ensure(context);
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            manager.notify(id(weekly), new NotificationCompat.Builder(context, NotificationChannels.REMINDERS)
                .setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle(title).setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body)).setContentIntent(tap)
                .setPriority(NotificationCompat.PRIORITY_HIGH).setDefaults(android.app.Notification.DEFAULT_ALL)
                .setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setOngoing(false).setAutoCancel(true).setTimeoutAfter(30_000L).build());
            remember(context, title, body, period, date);
            prefs(context).edit().putString(weekly ? "lastWeekly" : "lastDaily", date).apply();
    }

    private static void remember(Context context, String title, String body, String period, String date) {
        try {
            long now = System.currentTimeMillis();
            JSONArray previous = new JSONArray(prefs(context).getString("history", "[]")), history = new JSONArray();
            String key = "insight:" + period + ":" + date;
            for (int i = 0; i < previous.length(); i++) {
                JSONObject item = previous.getJSONObject(i);
                if (InsightSchedule.date(item.getLong("at")).equals(InsightSchedule.date(now)) && !key.equals(item.getString("key"))) history.put(item);
            }
            history.put(new JSONObject().put("key", key).put("title", title).put("body", body).put("at", now).put("period", period).put("date", date));
            prefs(context).edit().putString("history", history.toString()).apply();
        } catch (Exception ignored) { /* Delivery still works when history is unavailable. */ }
    }
}
