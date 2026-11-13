package com.birrx.app;

import android.Manifest;
import android.content.ContentResolver;
import android.database.Cursor;
import android.net.Uri;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.getcapacitor.PermissionState;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

@CapacitorPlugin(
    name = "SmsScanner",
    permissions = {
        @Permission(
            alias = "sms",
            strings = { Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS }
        )
    }
)
public class SmsScannerPlugin extends Plugin {

    private static final Set<String> SUPPORTED_SENDERS = new HashSet<>(Arrays.asList(
        "CBE", "BOA", "127", "994", "251994", "810", "TELEBIRR",
        "AWASH", "AWASHBANK", "DASHEN", "DASHENBANK", "COOP", "COOPBANK",
        "HIBRET", "NIB", "WEGAGEN", "ZEMEN", "CBEBIRR", "844", "AMHARA", "SIINQEE"
    ));

    private static SmsScannerPlugin instance;

    @PluginMethod
    public void setNotificationEnabled(PluginCall call) {
        getContext().getSharedPreferences("birrx-notifications", 0).edit().putBoolean("transactions", call.getBoolean("enabled", false)).apply();
        call.resolve();
    }

    @PluginMethod
    public void getNotificationHistory(PluginCall call) {
        JSObject result = new JSObject();
        try {
            result.put("items", new JSArray(getContext().getSharedPreferences("birrx-notifications", 0).getString("history", "[]")));
            call.resolve(result);
        } catch (Exception e) { call.reject("Unable to read notification history", e); }
    }

    @PluginMethod
    public void consumeNotificationAction(PluginCall call) {
        JSObject result = new JSObject();
        android.content.Intent intent = getActivity().getIntent();
        if (intent != null && intent.hasExtra("birrxSmsTimestamp")) {
            result.put("timestamp", intent.getLongExtra("birrxSmsTimestamp", 0));
            result.put("bank", intent.getStringExtra("birrxSmsBank"));
            result.put("reference", intent.getStringExtra("birrxSmsReference"));
            intent.removeExtra("birrxSmsTimestamp");
        }
        call.resolve(result);
    }

    @Override
    public void load() {
        super.load();
        NotificationChannels.ensure(getContext());
        instance = this;
    }

    @Override
    protected void handleOnDestroy() {
        if (instance == this) instance = null;
        super.handleOnDestroy();
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        notifyListeners("appResumed", new JSObject());
    }

    public static boolean isSupportedSender(String sender) {
        if (sender == null) return false;
        String normalized = sender.trim().replace("+", "").replaceAll("\\s+", "").toUpperCase();
        return SUPPORTED_SENDERS.contains(normalized);
    }

    public static void onIncomingSms(String sender, String body, long timestamp) {
        if (instance != null) {
            JSObject data = new JSObject();
            data.put("sender", sender);
            data.put("body", body);
            data.put("timestamp", timestamp);
            instance.notifyListeners("smsReceived", data);
        }
    }

    @PluginMethod
    public void checkSmsPermission(PluginCall call) {
        JSObject ret = new JSObject();
        PermissionState state = getPermissionState("sms");
        ret.put("status", state.toString().toLowerCase());
        ret.put("granted", state == PermissionState.GRANTED);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestSmsPermission(PluginCall call) {
        if (getPermissionState("sms") == PermissionState.GRANTED) {
            JSObject ret = new JSObject();
            ret.put("status", "granted");
            ret.put("granted", true);
            call.resolve(ret);
        } else {
            requestPermissionForAlias("sms", call, "smsCallback");
        }
    }

    @PermissionCallback
    private void smsCallback(PluginCall call) {
        PermissionState state = getPermissionState("sms");
        JSObject ret = new JSObject();
        ret.put("status", state.toString().toLowerCase());
        ret.put("granted", state == PermissionState.GRANTED);
        call.resolve(ret);
    }

    @PluginMethod
    public void scanInbox(PluginCall call) {
        if (getPermissionState("sms") != PermissionState.GRANTED) {
            call.reject("READ_SMS permission is not granted", "PERMISSION_DENIED");
            return;
        }

        Long sinceTimestamp = call.getLong("sinceTimestamp", 0L);
        Integer limit = call.getInt("limit", 100);
        Integer offset = call.getInt("offset", 0);

        ContentResolver resolver = getContext().getContentResolver();
        Uri inboxUri = Uri.parse("content://sms/inbox");
        String[] projection = new String[] { "_id", "address", "body", "date" };

        String selection = null;
        String[] selectionArgs = null;
        if (sinceTimestamp != null && sinceTimestamp > 0) {
            selection = "date > ?";
            selectionArgs = new String[] { String.valueOf(sinceTimestamp) };
        }

        Long afterTimestamp = call.getLong("afterTimestamp");
        String afterId = call.getString("afterId");
        if (afterTimestamp != null && afterId != null) {
            if (!afterId.matches("[0-9]+")) { call.reject("Invalid inbox cursor"); return; }
            selection = "date > ? AND (date > ? OR (date = ? AND _id > ?))";
            selectionArgs = new String[] {String.valueOf(sinceTimestamp == null ? 0L : sinceTimestamp), String.valueOf(afterTimestamp), String.valueOf(afterTimestamp), afterId};
            offset = 0;
        }

        String sortOrder = "date ASC, _id ASC";

        JSArray messages = new JSArray();
        int matched = 0;
        int skipped = 0;
        boolean hasMore = false;

        try (Cursor cursor = resolver.query(inboxUri, projection, selection, selectionArgs, sortOrder)) {
            if (cursor != null) {
                int idCol = cursor.getColumnIndex("_id");
                int addrCol = cursor.getColumnIndex("address");
                int bodyCol = cursor.getColumnIndex("body");
                int dateCol = cursor.getColumnIndex("date");

                while (cursor.moveToNext()) {
                    String address = addrCol != -1 ? cursor.getString(addrCol) : null;
                    if (address == null || !isSupportedSender(address)) {
                        continue;
                    }

                    if (skipped < offset) {
                        skipped++;
                        continue;
                    }

                    if (matched >= limit) {
                        hasMore = true;
                        break;
                    }

                    String id = idCol != -1 ? cursor.getString(idCol) : "";
                    String body = bodyCol != -1 ? cursor.getString(bodyCol) : "";
                    long timestamp = dateCol != -1 ? cursor.getLong(dateCol) : 0L;

                    JSObject msg = new JSObject();
                    msg.put("id", id);
                    msg.put("sender", address);
                    msg.put("body", body);
                    msg.put("timestamp", timestamp);

                    messages.put(msg);
                    matched++;
                }
            }

            JSObject result = new JSObject();
            result.put("messages", messages);
            result.put("count", matched);
            result.put("hasMore", hasMore);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Error scanning SMS inbox: " + e.getMessage(), e);
        }
    }
}

