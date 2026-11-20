package com.birrx.app;

import static org.junit.Assert.*;
import org.junit.Test;
import java.time.Instant;
import java.util.TimeZone;

public class InsightScheduleTest {
    private long at(String value) { return Instant.parse(value).toEpochMilli(); }
    @Test public void dailyFiresAtNinePmEatAndAdvancesOnlyAfterNine() {
        assertEquals(at("2026-11-21T18:00:00Z"), InsightSchedule.next(at("2026-11-21T17:59:59Z"), false));
        assertEquals(at("2026-11-22T18:00:00Z"), InsightSchedule.next(at("2026-11-21T18:00:00Z"), false));
    }
    @Test public void weeklyFiresSundayAndKeepsSundayUntilTheDeadline() {
        assertEquals(at("2026-11-22T18:00:00Z"), InsightSchedule.next(at("2026-11-21T10:00:00Z"), true));
        assertEquals(at("2026-11-22T18:00:00Z"), InsightSchedule.next(at("2026-11-22T17:59:59Z"), true));
        assertEquals(at("2026-11-29T18:00:00Z"), InsightSchedule.next(at("2026-11-22T18:00:00Z"), true));
        assertTrue(InsightSchedule.sunday("2026-11-22"));assertFalse(InsightSchedule.sunday("2026-11-23"));
    }
    @Test public void usesEatAcrossMidnightAndDeviceTimezoneChanges() {
        TimeZone previous = TimeZone.getDefault();
        try {
            TimeZone.setDefault(TimeZone.getTimeZone("America/New_York"));
            assertEquals("2026-11-22", InsightSchedule.date(at("2026-11-21T21:00:00Z")));
            assertEquals(at("2027-01-01T18:00:00Z"), InsightSchedule.next(at("2026-12-31T20:00:00Z"), false));
        } finally { TimeZone.setDefault(previous); }
    }
}
