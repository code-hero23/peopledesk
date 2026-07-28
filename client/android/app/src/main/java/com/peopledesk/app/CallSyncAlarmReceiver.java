package com.peopledesk.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.work.Constraints;
import androidx.work.Data;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;
import java.util.Calendar;
import java.util.TimeZone;

public class CallSyncAlarmReceiver extends BroadcastReceiver {
    public static final String ACTION_START = "com.peopledesk.app.CALL_SYNC_START";
    public static final String ACTION_TICK = "com.peopledesk.app.CALL_SYNC_TICK";
    public static final String ACTION_FINAL = "com.peopledesk.app.CALL_SYNC_FINAL";
    private static final int REQUEST_START = 1001;
    private static final int REQUEST_TICK = 1002;
    private static final int REQUEST_FINAL = 1003;
    private static final int WINDOW_END_MINUTES = 19 * 60;

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || "android.intent.action.MY_PACKAGE_REPLACED".equals(action)) {
            schedule(context);
            return;
        }

        boolean forceSync = ACTION_START.equals(action) || ACTION_TICK.equals(action) || ACTION_FINAL.equals(action);
        Data input = new Data.Builder().putBoolean("forceSync", forceSync).build();
        OneTimeWorkRequest request = new OneTimeWorkRequest.Builder(CallLogSyncWorker.class)
            .setInputData(input)
            .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build();
        WorkManager.getInstance(context).enqueue(request);

        if (ACTION_START.equals(action) || ACTION_TICK.equals(action)) {
            scheduleNextWindowTick(context);
        }
        schedule(context);
    }

    public static void schedule(Context context) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        setAlarm(context, alarms, ACTION_START, 10, 30, REQUEST_START);
        setAlarm(context, alarms, ACTION_FINAL, 19, 0, REQUEST_FINAL);
        scheduleNextWindowTick(context);
    }

    private static void setAlarm(Context context, AlarmManager alarms, String action, int hour, int minute, int requestCode) {
        Calendar when = Calendar.getInstance(TimeZone.getTimeZone("Asia/Kolkata"));
        when.set(Calendar.HOUR_OF_DAY, hour);
        when.set(Calendar.MINUTE, minute);
        when.set(Calendar.SECOND, 0);
        when.set(Calendar.MILLISECOND, 0);
        if (when.getTimeInMillis() <= System.currentTimeMillis()) when.add(Calendar.DATE, 1);
        Intent intent = new Intent(context, CallSyncAlarmReceiver.class).setAction(action);
        PendingIntent pending = PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (alarms.canScheduleExactAlarms()) {
                alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when.getTimeInMillis(), pending);
            } else {
                alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when.getTimeInMillis(), pending);
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when.getTimeInMillis(), pending);
        } else {
            alarms.set(AlarmManager.RTC_WAKEUP, when.getTimeInMillis(), pending);
        }
    }

    private static void scheduleNextWindowTick(Context context) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;

        Calendar now = Calendar.getInstance(TimeZone.getTimeZone("Asia/Kolkata"));
        int minutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);
        if (minutes < (10 * 60 + 30) || minutes >= WINDOW_END_MINUTES) {
            cancelAlarm(context, REQUEST_TICK, ACTION_TICK);
            return;
        }

        Calendar next = (Calendar) now.clone();
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);
        next.add(Calendar.MINUTE, 30);

        int nextMinutes = next.get(Calendar.HOUR_OF_DAY) * 60 + next.get(Calendar.MINUTE);
        if (nextMinutes > WINDOW_END_MINUTES) {
            next.set(Calendar.HOUR_OF_DAY, 19);
            next.set(Calendar.MINUTE, 0);
        }

        Intent intent = new Intent(context, CallSyncAlarmReceiver.class).setAction(ACTION_TICK);
        PendingIntent pending = PendingIntent.getBroadcast(context, REQUEST_TICK, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (alarms.canScheduleExactAlarms()) {
                alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(), pending);
            } else {
                alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(), pending);
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(), pending);
        } else {
            alarms.set(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(), pending);
        }
    }

    private static void cancelAlarm(Context context, int requestCode, String action) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        Intent intent = new Intent(context, CallSyncAlarmReceiver.class).setAction(action);
        PendingIntent pending = PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        alarms.cancel(pending);
        pending.cancel();
    }
}
