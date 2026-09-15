import { useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Capacitor } from '@capacitor/core';
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

export const useAELocationTracker = () => {
    const { user } = useSelector((state) => state.auth);
    const lastPingRef = useRef(0);
    const isPingingRef = useRef(false);

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

        const sendPayload = async (lat, lng, accuracy = null, speed = null) => {
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

        // Optional watchPosition for moving updates
        let watchId = null;
        if (navigator.geolocation) {
            try {
                watchId = navigator.geolocation.watchPosition(
                    (pos) => {
                        // Ping if moved or if last ping was more than 45s ago
                        const elapsed = Date.now() - lastPingRef.current;
                        if (elapsed >= 45000) {
                            pingLocation({
                                latitude: pos.coords.latitude,
                                longitude: pos.coords.longitude,
                                accuracy: pos.coords.accuracy,
                                speed: pos.coords.speed
                            }, 'movement');
                        }
                    },
                    () => {},
                    { enableHighAccuracy: true, maximumAge: 15000 }
                );
            } catch (e) {}
        }

        return () => {
            clearInterval(intervalId);
            if (watchId !== null && navigator.geolocation) {
                try {
                    navigator.geolocation.clearWatch(watchId);
                } catch (e) {}
            }
        };
    }, [user, pingLocation]);

    return { pingLocation };
};
