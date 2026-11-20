package com.birrx.app;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;
import java.util.TimeZone;

final class InsightSchedule {
    static final TimeZone EAT = TimeZone.getTimeZone("Africa/Addis_Ababa");
    static long next(long now, boolean weekly) {
        Calendar clock = Calendar.getInstance(EAT);
        clock.setTimeInMillis(now);
        clock.set(Calendar.HOUR_OF_DAY, 21);
        clock.set(Calendar.MINUTE, 0);
        clock.set(Calendar.SECOND, 0);
        clock.set(Calendar.MILLISECOND, 0);
        if (weekly) clock.add(Calendar.DAY_OF_MONTH, (Calendar.SUNDAY - clock.get(Calendar.DAY_OF_WEEK) + 7) % 7);
        if (clock.getTimeInMillis() <= now) clock.add(Calendar.DAY_OF_MONTH, weekly ? 7 : 1);
        return clock.getTimeInMillis();
    }
    static boolean sunday(String date) {
        try {
            SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd", Locale.US); format.setTimeZone(EAT);
            Calendar clock = Calendar.getInstance(EAT); clock.setTime(format.parse(date));
            return clock.get(Calendar.DAY_OF_WEEK) == Calendar.SUNDAY;
        } catch (java.text.ParseException invalid) { return false; }
    }
    static String date(long timestamp) {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        format.setTimeZone(EAT);
        return format.format(new java.util.Date(timestamp));
    }
}
