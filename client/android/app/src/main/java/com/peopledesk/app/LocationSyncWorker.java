package com.peopledesk.app;

import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.BatteryManager;
import android.os.Bundle;
import android.os.Looper;
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
    private static long lastSuccessfulSyncTime = 0;

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

    public static boolean performSync(Context context) {
        Log.d(TAG, "Executing AE Location background ping...");
        try {
            // Work hours window check strictly: 7:00 AM to 8:00 PM IST
            Calendar now = Calendar.getInstance(TimeZone.getTimeZone("Asia/Kolkata"));
            int currentMinutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);
            int startMinutes = 7 * 60;         // 7:00 AM IST
            int endMinutes = 20 * 60;          // 8:00 PM IST

            if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
                Log.d(TAG, "Location ping skipped: outside 7:00 AM - 8:00 PM IST window.");
                return true;
            }

            // Rate limit to at most once every 60 seconds
            long nowMs = System.currentTimeMillis();
            if (nowMs - lastSuccessfulSyncTime < 60000) {
                return true;
            }

            String apiUrl = readPreference(context, "apiUrl", "https://peopledesk.orbixdesigns.com/api");
            String deviceToken = readPreference(context, "call_sync_device_token", null);
            String authToken = readPreference(context, "auth_token", null);

            // If auth_token not stored directly, extract from user JSON
            if (authToken == null || authToken.trim().isEmpty()) {
                String userJson = readPreference(context, "user", null);
                if (userJson != null && userJson.contains("\"token\":")) {
                    try {
                        JSONObject uObj = new JSONObject(userJson);
                        if (uObj.has("token")) {
                            authToken = uObj.optString("token", null);
                        }
                    } catch (Exception ignored) {}
                }
            }

            if ((deviceToken == null || deviceToken.trim().isEmpty()) && (authToken == null || authToken.trim().isEmpty())) {
                Log.w(TAG, "Location ping skipped: neither Call Sync device nor authenticated user token found.");
                return true;
            }

            // Check location permission
            boolean hasFine = ContextCompat.checkSelfPermission(context, android.Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED;
            boolean hasCoarse = ContextCompat.checkSelfPermission(context, android.Manifest.permission.ACCESS_COARSE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED;

            if (!hasFine && !hasCoarse) {
                Log.w(TAG, "Location ping skipped: location permission not granted.");
                return true;
            }

            LocationManager locationManager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
            Location bestLocation = null;

            if (locationManager != null) {
                try {
                    Location gpsLoc = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                    Location netLoc = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);

                    // Prefer GPS fix whenever accuracy is better or when network is inaccurate (> 150m)
                    if (gpsLoc != null && netLoc != null) {
                        float gpsAcc = gpsLoc.hasAccuracy() ? gpsLoc.getAccuracy() : 500f;
                        float netAcc = netLoc.hasAccuracy() ? netLoc.getAccuracy() : 1000f;

                        if (netAcc > 150f && gpsAcc <= 100f) {
                            bestLocation = gpsLoc;
                        } else if (gpsLoc.getTime() > (nowMs - 5 * 60 * 1000)) {
                            // Recent GPS within 5 mins
                            bestLocation = gpsLoc;
                        } else if (gpsAcc <= netAcc) {
                            bestLocation = gpsLoc;
                        } else {
                            bestLocation = (netAcc <= 150f) ? netLoc : gpsLoc;
                        }
                    } else {
                        bestLocation = (gpsLoc != null) ? gpsLoc : netLoc;
                    }

                    // If cached location is null or stale (> 3 minutes old), attempt a quick single-shot update
                    if (bestLocation == null || (nowMs - bestLocation.getTime() > 3 * 60 * 1000)) {
                        final Object lock = new Object();
                        final Location[] freshLoc = new Location[1];

                        LocationListener listener = new LocationListener() {
                            @Override
                            public void onLocationChanged(@NonNull Location loc) {
                                freshLoc[0] = loc;
                                synchronized (lock) {
                                    lock.notifyAll();
                                }
                            }
                            @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
                            @Override public void onProviderEnabled(@NonNull String provider) {}
                            @Override public void onProviderDisabled(@NonNull String provider) {}
                        };

                        try {
                            Looper looper = Looper.getMainLooper();
                            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                                locationManager.requestSingleUpdate(LocationManager.GPS_PROVIDER, listener, looper);
                            } else if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                                locationManager.requestSingleUpdate(LocationManager.NETWORK_PROVIDER, listener, looper);
                            }

                            synchronized (lock) {
                                lock.wait(4000); // wait up to 4s for high-accuracy fix
                            }
                            locationManager.removeUpdates(listener);

                            if (freshLoc[0] != null) {
                                bestLocation = freshLoc[0];
                            }
                        } catch (Exception e) {
                            Log.w(TAG, "Single location update request fallback:", e);
                        }
                    }
                } catch (SecurityException e) {
                    Log.e(TAG, "SecurityException fetching location", e);
                }
            }

            if (bestLocation == null) {
                Log.w(TAG, "No GPS location found on device.");
                return true;
            }

            // Eliminate idle jumps: discard fixes with accuracy > 200m (cellular tower drift)
            if (bestLocation.hasAccuracy() && bestLocation.getAccuracy() > 200f) {
                Log.w(TAG, "Discarding low-accuracy location fix (±" + bestLocation.getAccuracy() + "m). Preserving anchor.");
                return true;
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
            if (deviceToken != null && !deviceToken.trim().isEmpty()) {
                conn.setRequestProperty("Authorization", "Device " + deviceToken);
            } else {
                conn.setRequestProperty("Authorization", "Bearer " + authToken);
            }
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
            Log.d(TAG, "Location ping sent successfully. Server response: " + responseCode);
            lastSuccessfulSyncTime = System.currentTimeMillis();

            return true;
        } catch (Exception e) {
            Log.e(TAG, "Error performing background location ping", e);
            return false;
        }
    }

    @NonNull
    @Override
    public Result doWork() {
        boolean success = performSync(getApplicationContext());
        return success ? Result.success() : Result.retry();
    }
}
