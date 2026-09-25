import { useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { toast } from 'react-toastify';
import { getCallLogPlugin } from '../utils/capacitorPlugins';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const isAEUser = (user) => {
    if (!user) return false;
    const r = (user.role || '').toUpperCase();
    const d = (user.designation || '').toUpperCase();
    return (
        r === 'AE_MANAGER' ||
        r === 'AE' ||
        d.includes('AE') ||
        d.includes('AREA EXECUTIVE') ||
        d.includes('ARCHITECT')
    );
};

function getDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export const useAELocationTracker = () => {
    const { user } = useSelector((state) => state.auth);
    const { attendance } = useSelector((state) => state.employee);
    const lastPingRef = useRef(0);
    const lastValidCoordsRef = useRef(null);
    const isPingingRef = useRef(false);
    const lastDepartureNotificationRef = useRef(0);
    const attendanceRef = useRef(attendance);

    useEffect(() => {
        attendanceRef.current = attendance;
    }, [attendance]);

    const getBatteryLevel = async () => {
        try {
            if (Capacitor.isNativePlatform()) {
                const plugin = getCallLogPlugin();
                if (plugin && plugin.getBatteryLevel) {
                    const res = await plugin.getBatteryLevel();
                    if (res && res.batteryLevel >= 0) return res.batteryLevel;
                }
            }
            if (navigator.getBattery) {
                const battery = await navigator.getBattery();
                return Math.round(battery.level * 100);
            }
        } catch (e) {
            // Ignore battery errors
        }
        return null;
    };

    const pingLocation = useCallback(async (customCoords = null, triggerReason = 'periodic') => {
        if (!user || !user.token) return;
        if (!isAEUser(user)) return;
        if (isPingingRef.current) return;

        // Rate limit pings to at most once every 15 seconds unless forced
        const now = Date.now();
        if (triggerReason === 'periodic' && now - lastPingRef.current < 45000) {
            return;
        }

        isPingingRef.current = true;

        const sendPayload = async (rawLat, rawLng, accuracy = null, speed = null) => {
            // Filter out coarse network/cell tower triangulation (error > 150 meters)
            if (accuracy != null && accuracy > 150) {
                console.log(`[AELocationTracker] Discarding low-accuracy GPS fix (±${Math.round(accuracy)}m)`);
                isPingingRef.current = false;
                return;
            }

            let lat = rawLat;
            let lng = rawLng;

            // Stabilize stationary jitter when idle/sitting indoors
            // Only anchor micro-jitter (< 4m) during periodic stationary pings, NEVER on live movement
            if (lastValidCoordsRef.current && triggerReason !== 'live_movement') {
                const dist = getDistanceMeters(
                    lastValidCoordsRef.current.lat,
                    lastValidCoordsRef.current.lng,
                    lat,
                    lng
                );

                if ((speed == null || speed < 0.4) && dist < 4) {
                    lat = lastValidCoordsRef.current.lat;
                    lng = lastValidCoordsRef.current.lng;
                }
            }
            try {
                const battery = await getBatteryLevel();
                await axios.post(
                    `${API_BASE}/location/ping`,
                    {
                        latitude: lat,
                        longitude: lng,
                        accuracy,
                        speed,
                        batteryLevel: battery
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${user.token}`
                        }
                    }
                );
                lastPingRef.current = Date.now();
                lastValidCoordsRef.current = { lat, lng, accuracy: accuracy || 10, time: Date.now() };
                console.log(`[AELocationTracker] Location ping sent (${triggerReason}):`, lat, lng);
            } catch (err) {
                console.warn('[AELocationTracker] Failed to send location ping:', err.message);
            } finally {
                isPingingRef.current = false;
            }
        };

        if (customCoords && customCoords.latitude && customCoords.longitude) {
            await sendPayload(
                customCoords.latitude,
                customCoords.longitude,
                customCoords.accuracy || null,
                customCoords.speed || null
            );
            return;
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    await sendPayload(
                        pos.coords.latitude,
                        pos.coords.longitude,
                        pos.coords.accuracy,
                        pos.coords.speed
                    );
                },
                (err) => {
                    console.warn('[AELocationTracker] Geolocation error:', err.message);
                    isPingingRef.current = false;
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 10000
                }
            );
        } else {
            isPingingRef.current = false;
        }
    }, [user]);

    useEffect(() => {
        if (!user || !user.token || !isAEUser(user)) return;

        // Immediate initial ping
        pingLocation(null, 'initial');

        // Start native Android location worker if on mobile device
        if (Capacitor.isNativePlatform()) {
            try {
                const plugin = getCallLogPlugin();
                if (plugin && plugin.startAELocationWorker) {
                    plugin.startAELocationWorker().catch(() => {});
                }
            } catch (e) {
                console.warn('Native AE location worker init warning:', e);
            }
        }

        // Periodic foreground ping every 60 seconds
        const intervalId = setInterval(() => {
            pingLocation(null, 'periodic');
        }, 60000);

        // 12-15 minute background keep-alive worker to prevent falling into IDLE
        let keepAliveWorker = null;
        try {
            const workerCode = `
                let timer = null;
                self.onmessage = function(e) {
                    if (e.data === 'start') {
                        if (timer) clearInterval(timer);
                        timer = setInterval(function() {
                            self.postMessage('check_keepalive');
                        }, 60000); // Check every minute
                    } else if (e.data === 'stop') {
                        if (timer) clearInterval(timer);
                    }
                };
            `;
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            keepAliveWorker = new Worker(workerUrl);
            keepAliveWorker.onmessage = () => {
                const elapsed = Date.now() - lastPingRef.current;
                // If 12 minutes have elapsed without a ping, forcefully trigger keepalive ping
                if (elapsed >= 12 * 60 * 1000) {
                    console.log('[AELocationTracker] Idle protection: 12 mins elapsed, triggering keep-alive ping');
                    pingLocation(null, 'keepalive_idle_protection');
                }
            };
            keepAliveWorker.postMessage('start');
        } catch (workerErr) {
            console.warn('[AELocationTracker] Web Worker not available, relying on standard timer:', workerErr);
        }

        // Immediate high-accuracy ping when device screen wakes up or app gains focus
        const handleWakeup = () => {
            const elapsed = Date.now() - lastPingRef.current;
            if (document.visibilityState === 'visible') {
                if (elapsed >= 30000) {
                    pingLocation(null, 'screen_wake');
                }
            }
        };
        document.addEventListener('visibilitychange', handleWakeup);
        window.addEventListener('focus', handleWakeup);

        // User activity heartbeat: if user taps or interacts and > 8 mins elapsed, ping
        const handleUserActivity = () => {
            const elapsed = Date.now() - lastPingRef.current;
            if (elapsed >= 8 * 60 * 1000) {
                pingLocation(null, 'user_activity_heartbeat');
            }
        };
        window.addEventListener('pointerdown', handleUserActivity, { passive: true });
        window.addEventListener('keydown', handleUserActivity, { passive: true });

        // High-frequency GPS streaming for moving vehicles (captures live road turns & speed)
        let watchId = null;
        if (navigator.geolocation) {
            try {
                watchId = navigator.geolocation.watchPosition(
                    (pos) => {
                        const coords = pos.coords;
                        const now = Date.now();
                        const elapsed = now - lastPingRef.current;
                        const speed = coords.speed; // instantaneous speed in m/s

                        // 1. Site Departure Reminder: Check if AE has left their active signed-in site (> 250m)
                        const currentAttendance = attendanceRef.current;
                        if (currentAttendance && currentAttendance.siteName && !currentAttendance.checkoutTime && currentAttendance.latitude && currentAttendance.longitude) {
                            const distFromSite = getDistanceMeters(
                                currentAttendance.latitude,
                                currentAttendance.longitude,
                                coords.latitude,
                                coords.longitude
                            );

                            if (distFromSite > 250) {
                                const lastAlert = lastDepartureNotificationRef.current;
                                if (now - lastAlert > 10 * 60 * 1000) { // Alert at most once every 10 minutes
                                    lastDepartureNotificationRef.current = now;
                                    toast.warn(
                                        `📍 You seem to have left "${currentAttendance.siteName}" (${(distFromSite / 1000).toFixed(1)} km away). Don't forget to site sign-out!`,
                                        { autoClose: 10000 }
                                    );
                                }
                            }
                        }

                        // 2. Motion Detection: Real road transit requires speed >= 0.9 m/s (~3.2 km/h)
                        // or displacement >= 8 meters with good GPS accuracy (<= 50m)
                        let distMoved = 0;
                        let derivedSpeed = null;
                        if (lastValidCoordsRef.current) {
                            distMoved = getDistanceMeters(
                                lastValidCoordsRef.current.lat,
                                lastValidCoordsRef.current.lng,
                                coords.latitude,
                                coords.longitude
                            );
                            const timeDeltaSec = (now - (lastValidCoordsRef.current.time || (now - elapsed))) / 1000;
                            if (timeDeltaSec > 0.5) {
                                derivedSpeed = distMoved / timeDeltaSec;
                            }
                        }

                        const effectiveSpeed = (speed != null && speed > 0) ? speed : derivedSpeed;
                        const isMovingSpeed = effectiveSpeed != null && effectiveSpeed >= 0.9;
                        const isRealRelocation = distMoved >= 8 && (coords.accuracy == null || coords.accuracy <= 50);
                        const isMoving = isMovingSpeed || isRealRelocation;

                        // When moving: stream GPS coordinates every 3.5 seconds to capture actual road movement!
                        // When stationary: ping every 30 seconds.
                        const minInterval = isMoving ? 3500 : 30000;

                        if (elapsed >= minInterval && (isMoving || elapsed >= 35000)) {
                            pingLocation({
                                latitude: coords.latitude,
                                longitude: coords.longitude,
                                accuracy: coords.accuracy,
                                speed: effectiveSpeed
                            }, isMoving ? 'live_movement' : 'periodic');
                        }
                    },
                    (err) => console.warn('[AELocationTracker] watchPosition error:', err.message),
                    { enableHighAccuracy: true, maximumAge: 1000, timeout: 8000 }
                );
            } catch (e) {}
        }

        return () => {
            clearInterval(intervalId);
            if (keepAliveWorker) {
                keepAliveWorker.postMessage('stop');
                keepAliveWorker.terminate();
            }
            document.removeEventListener('visibilitychange', handleWakeup);
            window.removeEventListener('focus', handleWakeup);
            window.removeEventListener('pointerdown', handleUserActivity);
            window.removeEventListener('keydown', handleUserActivity);
            if (watchId !== null && navigator.geolocation) {
                try {
                    navigator.geolocation.clearWatch(watchId);
                } catch (e) {}
            }
        };
    }, [user, pingLocation]);

    return { pingLocation };
};
