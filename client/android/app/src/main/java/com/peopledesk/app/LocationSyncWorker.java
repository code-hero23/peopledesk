package com.peopledesk.app;

import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.location.Location;
import android.location.LocationManager;
import android.os.BatteryManager;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Calendar;
import java.util.TimeZone;

public class LocationSyncWorker extends Worker {
    private static final String TAG = "LocationSyncWorker";
    private static final String PREFS_NAME = "CapacitorStorage";

    public LocationSyncWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    public static String readPreference(Context context, String key, String defaultValue) {
        SharedPreferences capPrefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        if (capPrefs.contains(key)) return capPrefs.getString(key, defaultValue);
        if (capPrefs.contains("_CapacitorStorage_" + key)) return capPrefs.getString("_CapacitorStorage_" + key, defaultValue);
        if (capPrefs.contains("CapacitorStorage." + key)) return capPrefs.getString("CapacitorStorage." + key, defaultValue);
        return defaultValue;
    }

    @NonNull
    @Override
    public Result doWork() {
        Log.d(TAG, "Executing 5-minute AE Location background ping...");
        try {
            Context context = getApplicationContext();

            // Work hours window check: 10:00 AM to 10:00 PM IST
            Calendar now = Calendar.getInstance(TimeZone.getTimeZone("Asia/Kolkata"));
            int currentMinutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);
            int startMinutes = 10 * 60;        // 10:00 AM
            int endMinutes = 22 * 60;          // 10:00 PM

            if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
                Log.d(TAG, "Location ping skipped: outside 10:00 AM - 10:00 PM IST window.");
                return Result.success();
            }

            String apiUrl = readPreference(context, "apiUrl", "https://peopledesk.orbixdesigns.com/api");
            String deviceToken = readPreference(context, "call_sync_device_token", null);

            if (deviceToken == null) {
                Log.w(TAG, "Location ping skipped: device is not enrolled/activated.");
                return Result.success();
            }

            // Check location permission
            boolean hasFine = ContextCompat.checkSelfPermission(context, android.Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED;
            boolean hasCoarse = ContextCompat.checkSelfPermission(context, android.Manifest.permission.ACCESS_COARSE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED;

            if (!hasFine && !hasCoarse) {
                Log.w(TAG, "Location ping skipped: location permission not granted.");
                return Result.success();
            }

            LocationManager locationManager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
            Location bestLocation = null;

            if (locationManager != null) {
                try {
                    Location gpsLoc = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                    Location netLoc = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
                    
                    if (gpsLoc != null && netLoc != null) {
                        bestLocation = gpsLoc.getTime() > netLoc.getTime() ? gpsLoc : netLoc;
                    } else {
                        bestLocation = gpsLoc != null ? gpsLoc : netLoc;
                    }
                } catch (SecurityException e) {
                    Log.e(TAG, "SecurityException fetching location", e);
                }
            }

            if (bestLocation == null) {
                Log.w(TAG, "No recent GPS location found on device.");
                return Result.success();
            }

            // Get battery level
            IntentFilter ifilter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
            Intent batteryStatus = context.registerReceiver(null, ifilter);
            int batteryLevel = -1;
            if (batteryStatus != null) {
                int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                batteryLevel = Math.round((level / (float) scale) * 100);
            }

            // Send ping payload
            String fullUrl = apiUrl;
            if (!fullUrl.endsWith("/")) fullUrl += "/";
            fullUrl += "location/ping";

            URL url = new URL(fullUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Authorization", "Device " + deviceToken);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(15000);
            conn.setDoOutput(true);

            JSONObject payload = new JSONObject();
            payload.put("latitude", bestLocation.getLatitude());
            payload.put("longitude", bestLocation.getLongitude());
            payload.put("accuracy", bestLocation.getAccuracy());
            payload.put("speed", bestLocation.getSpeed());
            payload.put("batteryLevel", batteryLevel);

            try (OutputStream os = conn.getOutputStream()) {
                byte[] input = payload.toString().getBytes("utf-8");
                os.write(input, 0, input.length);
            }

            int responseCode = conn.getResponseCode();
            Log.d(TAG, "Location ping sent. Server response: " + responseCode);

            return Result.success();
        } catch (Exception e) {
            Log.e(TAG, "Error performing background location ping", e);
            return Result.retry();
        }
    }
}
