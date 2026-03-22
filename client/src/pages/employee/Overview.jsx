import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Clock, CheckCircle2, AlertCircle, MapPin, Coffee, Utensils,
    Briefcase, LogOut, ChevronRight, User, TrendingUp, Sparkles, Building2,
    Monitor, MapPinned, Star, ArrowRight, Camera, X, MessageSquare, History, CheckCircle, Info, Send, Trash2, Smartphone, RefreshCw
} from 'lucide-react';
import {
    getAttendanceStatus,
    markAttendance,
    checkoutAttendance,
    pauseAttendance,
    resumeAttendance,
    getMyWorkLogs,
    createWorkLog,
    getMyRequests
} from '../../features/employee/employeeSlice';
import { toast } from 'react-toastify';
import Modal from '../../components/Modal';
import LeaveRequestForm from '../../components/LeaveRequestForm';
import PermissionRequestForm from '../../components/PermissionRequestForm';
import SiteVisitRequestForm from '../../components/SiteVisitRequestForm';
import WorkLogForm from '../../components/WorkLogForm';
import ShowroomVisitRequestForm from '../../components/ShowroomVisitRequestForm';
import { formatDateTime, formatDate, formatTime, getHHMM } from '../../utils/dateUtils';
import AttendanceCalendarModal from '../../components/AttendanceCalendarModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import WorkLogFormSelector from '../../components/worklogs/WorkLogFormSelector';

const Overview = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const { attendance, requests, loading, isRequestsFetched, activeBreak } = useSelector((state) => state.employee);

    // States
    const [activeModal, setActiveModal] = useState(null);
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [photo, setPhoto] = useState(null);
    const [isAutoPermission, setIsAutoPermission] = useState(false);
    const [permissionInitialData, setPermissionInitialData] = useState(null);
    const [hasCheckedLateness, setHasCheckedLateness] = useState(false);
    const [isAttendanceCalendarOpen, setIsAttendanceCalendarOpen] = useState(false);
    const [isSiteLogin, setIsSiteLogin] = useState(false);
    const [isMandatorySiteVisit, setIsMandatorySiteVisit] = useState(false);
    const [visitInitialData, setVisitInitialData] = useState(null);
    const [logoutAlert, setLogoutAlert] = useState(false);
    const [confirmationConfig, setConfirmationConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { }, type: 'info' });
    const [isMandatoryWorkLog, setIsMandatoryWorkLog] = useState(false);
    // Explicitly add an error flag to block capture if needed
    const [location, setLocation] = useState({ lat: null, lng: null, address: 'Locating...', error: null });
    const [cameraState, setCameraState] = useState({ active: false, error: null });
    const [showMandatorySimModal, setShowMandatorySimModal] = useState(false);
    const [availableSims, setAvailableSims] = useState([]);
    const [simLabels, setSimLabels] = useState({});
    const [isDiscoveringSims, setIsDiscoveringSims] = useState(false);
    useEffect(() => {
        if (user?.wfhViewEnabled) {
            navigate('/dashboard/wfh');
        }
    }, [user, navigate]);

    useEffect(() => {
        const deviceType = getDeviceType();
        if (deviceType === 'mobile' || user?.designation === 'AE' || user?.designation === 'AE MANAGER') {
            setIsSiteLogin(true);
        }

    const discoverSims = async () => {
        if (isDiscoveringSims) return;
        setIsDiscoveringSims(true);
        console.log("[Discovery] Starting SIM discovery...");
        try {
            const { Capacitor } = await import('@capacitor/core');
            const CallLogPlugin = Capacitor.Plugins.CallLog;
            if (!CallLogPlugin) return;

            const labels = { ...simLabels };
            const slots = [];

            // 1. Precise Discovery via SubscriptionManager (New method)
            if (CallLogPlugin.getSimInfo) {
                try {
                    const simInfo = await CallLogPlugin.getSimInfo();
                    if (simInfo.sims && simInfo.sims.length > 0) {
                        const sims = simInfo.sims;
                        sims.forEach(sim => {
                            const slot = String(sim.simSlot);
                            const subId = String(sim.simId);
                            
                            let label = sim.simLabel || sim.displayName || `SIM Slot ${slot}`;
                            
                            // DISTINCTION: Append (P) or (S) if labels are identical (e.g. Jio/Jio)
                            const isIdentical = sims.some(s => String(s.simSlot) !== slot && (s.simLabel === sim.simLabel || s.displayName === sim.displayName));
                            if (isIdentical) {
                                label = `${label} (${slot === "1" ? "P" : "S"})`;
                            }
                            
                            labels[slot] = label;
                            slots.push(slot);
                            labels[subId] = label;
                        });
                    }
                } catch (e) {
                    console.log("[Discovery] getSimInfo failed likely due to perms", e);
                }
            }

            // 2. Fallback/Complementary Discovery via Call Logs
            try {
                const result = await CallLogPlugin.getCallLogs();
                if (result.logs && result.logs.length > 0) {
                    result.logs.forEach(log => {
                        const id = String(log.simSlot || log.simId);
                        if (id && log.simLabel && !labels[id]) {
                            labels[id] = log.simLabel;
                        }
                        if (id && !slots.includes(id) && id !== "null") {
                            slots.push(id);
                        }
                    });
                }
            } catch (e) {
                console.log("[Discovery] getCallLogs fallback failed", e);
            }

            if (slots.length > 0) {
                setSimLabels(labels);
                setAvailableSims([...new Set(slots)].sort());
                const { Preferences } = await import('@capacitor/preferences');
                await Preferences.set({ key: 'sim_labels', value: JSON.stringify(labels) });
            } else {
                // If still nothing, default to [1, 2] but keep trying
                setAvailableSims(["1", "2"]);
            }
        } catch (e) {
            console.error("[Discovery] Global failure", e);
        } finally {
            setIsDiscoveringSims(false);
        }
    };

    useEffect(() => {
        const checkSimPreference = async () => {
            if (!['CRE', 'CLIENT-FACILITATOR'].includes(user?.designation)) return;
            
            try {
                const { Capacitor } = await import('@capacitor/core');
                if (!Capacitor.isNativePlatform()) return;

                const { Preferences } = await import('@capacitor/preferences');
                const { value } = await Preferences.get({ key: 'cre_official_sim' });
                
                if (!value || value === "0") {
                    setShowMandatorySimModal(true);
                    discoverSims();
                    // Retry discovery after a delay to give permission time to settle
                    setTimeout(() => discoverSims(), 3000);
                }
            } catch (e) {
                console.error("Error checking SIM preference", e);
            }
        };

        if (user) {
            checkSimPreference();
        }
    }, [user]);

        const performFallbackSync = async () => {
            if (['CRE', 'CLIENT-FACILITATOR'].includes(user?.designation)) {
                try {
                    const { Capacitor } = await import('@capacitor/core');
                    if (!Capacitor.isNativePlatform()) return;

                    const CallLogPlugin = Capacitor.Plugins.CallLog;
                    const { Preferences } = await import('@capacitor/preferences');
                    if (!CallLogPlugin || !Preferences) return;

                    // Retrieve Work SIM Preference
                    const { value: officialSim } = await Preferences.get({ key: 'cre_official_sim' });
                    
                    // NEW: Skip sync if no official SIM is selected
                    if (!officialSim || officialSim === "0") {
                        console.log("Fallback sync skipped: No official SIM selected.");
                        return;
                    }

                    const targetSlot = officialSim;
                    const logsResult = await CallLogPlugin.getCallLogs();
                    if (!logsResult?.logs || logsResult.logs.length === 0) return;

                    // Filter logs client-side
                    const filteredLogs = logsResult.logs.filter(log => {
                        const logSlot = String(log.simSlot || log.simId || "");
                        if (!logSlot || logSlot === "null" || logSlot === "undefined") return true;
                        return logSlot === targetSlot || logSlot.includes(targetSlot);
                    });

                    if (filteredLogs.length === 0) return;

                    const API_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api') + '/worklogs/sync-calls';
                    await fetch(API_URL, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${user.token}`
                        },
                        body: JSON.stringify({
                            logs: filteredLogs,
                            syncDate: new Date().toISOString(),
                            simFilter: targetSlot
                        })
                    });
                    console.log(`Fallback sync (${filteredLogs.length} logs) completed for SIM ${targetSlot}`);
                } catch (e) {
                    console.error("Fallback native sync failed", e);
                }
            }
        };

        checkSimPreference();
        performFallbackSync();
    }, [user]);

    const fetchLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocation(prev => ({ ...prev, address: 'Geolocation Unsupported', error: true }));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude: lat, longitude: lng } = pos.coords;
                try {
                    // Reverse geocode using Nominatim (no key required for low volume)
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
                    const data = await res.json();

                    // Construct a detailed address similar to the user's image
                    const addr = data.address;
                    const parts = [
                        addr.road,
                        addr.suburb || addr.neighbourhood,
                        addr.city_district || addr.county,
                        addr.city || addr.town || addr.village,
                        addr.state_district,
                        addr.state,
                        addr.postcode,
                        addr.country
                    ].filter(Boolean);

                    setLocation({ lat, lng, address: parts.join(', ') || data.display_name || 'Address Found', error: false });
                } catch (err) {
                    console.error("Geocoding error:", err);
                    setLocation({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, error: false });
                }
            },
            (err) => {
                console.error("Location error:", err);
                setLocation(prev => ({ ...prev, address: 'Location Access Denied. Please enable GPS.', error: true }));
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, []);

    // Initial location fetch
    useEffect(() => {
        fetchLocation();
    }, [fetchLocation]);

    // Refs
    const videoRef = useRef(null);
    const logoutTimerRef = useRef(null);

    // Fetch Initial Data
    useEffect(() => {
        dispatch(getAttendanceStatus());
        dispatch(getMyWorkLogs());
        dispatch(getMyRequests());
    }, [dispatch]);

    const isCheckedIn = useMemo(() =>
        attendance?.status === 'PRESENT' && !attendance.checkoutTime,
        [attendance]);

    const isSessionFinished = useMemo(() =>
        attendance?.status === 'PRESENT' && !!attendance.checkoutTime && user?.designation !== 'AE' && user?.designation !== 'AE MANAGER',
        [attendance, user]);

    const [sessionDuration, setSessionDuration] = useState('00:00:00');

    useEffect(() => {
        let interval;
        if (isCheckedIn && attendance?.date) {
            const startTime = new Date(attendance.date).getTime();
            const update = () => {
                const diff = Date.now() - startTime;
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                setSessionDuration(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
            };
            update();
            interval = setInterval(update, 1000);
        } else if (attendance?.checkoutTime && attendance?.date) {
            const diff = new Date(attendance.checkoutTime).getTime() - new Date(attendance.date).getTime();
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setSessionDuration(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        } else {
            setSessionDuration('00:00:00');
        }
        return () => clearInterval(interval);
    }, [isCheckedIn, attendance]);

    // Handle 10 PM Logout Reminders
    const showBrowserNotif = useCallback((title, body) => {
        if (Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/logo.png' });
        }
    }, []);

    useEffect(() => {
        if (isCheckedIn && !logoutAlert) {
            const target = new Date();
            target.setHours(22, 0, 0, 0); // 10:00 PM
            const remaining = target.getTime() - Date.now();

            if (remaining <= 0) {
                setLogoutAlert(true);
                showBrowserNotif('🚨 Please Log Out!', "It's past 10 PM. Don't forget to tap Check Out before leaving.");
            } else {
                logoutTimerRef.current = setTimeout(() => {
                    setLogoutAlert(true);
                    showBrowserNotif('🚨 Please Log Out!', "It's past 10 PM. Don't forget to tap Check Out before leaving.");
                }, remaining);
            }
        }
        return () => { if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current); };
    }, [isCheckedIn, logoutAlert, showBrowserNotif]);

    const checkLatenessAndRedirect = useCallback((checkInTimeRaw, isAuto = false) => {
        if (user?.designation === 'AE' || user?.designation === 'AE MANAGER') return;

        const checkInTime = new Date(checkInTimeRaw);
        const hours = checkInTime.getHours();
        const minutes = checkInTime.getMinutes();
        const totalMinutes = hours * 60 + minutes;

        const todayLocal = checkInTime.toLocaleDateString('en-CA');

        // Check for ANY approved leave for today
        const hasApprovedLeave = requests?.leaves?.some(l => {
            const lStart = new Date(l.startDate).toLocaleDateString('en-CA');
            const lEnd = new Date(l.endDate).toLocaleDateString('en-CA');
            return l.status === 'APPROVED' && todayLocal >= lStart && todayLocal <= lEnd;
        });

        if (hasApprovedLeave) return;

        // Check for ANY half-day leave for today
        const hasHalfDay = requests?.leaves?.some(l => {
            if (l.type !== 'HALF_DAY' || l.status === 'REJECTED') return false;
            const lS = new Date(l.startDate).toLocaleDateString('en-CA');
            const lE = new Date(l.endDate).toLocaleDateString('en-CA');
            return todayLocal >= lS && todayLocal <= lE;
        });

        let thresholdMinutes = hasHalfDay ? 840 : 630; // 2:00 PM or 10:30 AM (Strict 10:30 AM trigger)

        const hasPermission = requests?.permissions?.some(p => {
            const pDate = new Date(p.date).toLocaleDateString('en-CA');
            return pDate === todayLocal && p.status !== 'REJECTED';
        });

        // Deadlock Fix: If permission already exists and this is auto-redirect, skip
        if (isAuto && hasPermission) return;

        // Add 2 hour grace only if they have permission AND it's NOT a mandatory check-in check
        if (hasPermission && !isAuto) {
            thresholdMinutes += 120;
        }

        if (totalMinutes > thresholdMinutes) {
            const date = todayLocal;
            const formatTimeLocal = (dateObj) => {
                let h = dateObj.getHours();
                const m = dateObj.getMinutes().toString().padStart(2, '0');
                const ampm = h >= 12 ? 'PM' : 'AM';
                h = h % 12 || 12;
                return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
            };

            const startTime = formatTimeLocal(checkInTime);
            const endTimeObj = new Date(checkInTime.getTime() + 2 * 60 * 60 * 1000);
            const endTime = formatTimeLocal(endTimeObj);

            const labelTime = hasPermission
                ? (hasHalfDay ? '4:00 PM' : '12:30 PM')
                : (hasHalfDay ? '2:00 PM' : '10:30 AM');

            setPermissionInitialData({
                date,
                startTime,
                endTime,
                reason: `Late Check-In (After ${labelTime})`
            });
            setIsAutoPermission(isAuto);
            setActiveModal('permission');
        }
    }, [user, requests]);

    // Lateness Effect
    useEffect(() => {
        if (isCheckedIn && isRequestsFetched && !hasCheckedLateness && user?.id) {
            const today = new Date().toLocaleDateString('en-CA');
            const attendanceDay = new Date(attendance?.date).toLocaleDateString('en-CA');

            // Only check lateness for today's attendance
            if (attendanceDay === today) {
                if (activeModal !== 'permission') {
                    checkLatenessAndRedirect(attendance?.date || new Date(), true);
                }
                setHasCheckedLateness(true);
            }
        }
    }, [isCheckedIn, isRequestsFetched, hasCheckedLateness, activeModal, attendance, checkLatenessAndRedirect, user?.id]);


    // Camera Effect for AE
    useEffect(() => {
        let stream = null;
        if (showCheckInModal && videoRef.current) {
            setCameraState({ active: false, error: null });
            navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1080 },
                    height: { ideal: 1920 },
                    aspectRatio: { ideal: 0.5625 } // 9:16 portrait
                }
            })
                .then(s => {
                    stream = s;
                    if (videoRef.current) {
                        videoRef.current.srcObject = s;
                        setCameraState({ active: true, error: null });
                    }
                })
                .catch(err => {
                    console.error("Camera error:", err);
                    setCameraState({ active: false, error: 'Camera access denied' });
                    toast.error("Could not access camera. Please allow permissions to check in.");
                });

            // Ensure we have fresh location when modal opens
            fetchLocation();
        }
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [showCheckInModal, fetchLocation]);

    const getDeviceType = () => {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
        if (/Mobile|android|iphone|ipod|blackberry|benq|palm|windows ce|x11/i.test(ua)) return 'mobile';
        return 'desktop';
    };

    const handleMarkAttendance = (isSiteLoginAction = false) => {
        setConfirmationConfig({
            isOpen: true,
            title: isCheckedIn ? 'Confirm Sign-Out' : (isSiteLoginAction ? 'Confirm Site Sign-In' : 'Confirm Office Sign-In'),
            message: isCheckedIn
                ? 'Are you sure you want to finish your session for today?'
                : `Are you ready to start your session via ${isSiteLoginAction ? 'Site' : 'Office'}?`,
            type: isCheckedIn ? 'warning' : 'info',
            onConfirm: () => {
                setIsSiteLogin(isSiteLoginAction);
                const deviceInfo = navigator.userAgent;
                const deviceType = getDeviceType();
                const formData = new FormData();
                formData.append('deviceInfo', `${deviceType.toUpperCase()} | ${isSiteLoginAction ? 'SITE_LOGIN | ' : ''}${deviceInfo}`);

                if (isCheckedIn) {
                    // Check-Out
                    if (user?.designation === 'AE' || user?.designation === 'AE MANAGER') {
                        setIsCheckingOut(true);
                        setShowCheckInModal(true);
                    } else {
                        dispatch(checkoutAttendance(formData)).then(() => dispatch(getAttendanceStatus()));
                    }
                } else {
                    // Check-In
                    if (user?.designation === 'AE' || user?.designation === 'AE MANAGER') {
                        setIsCheckingOut(false);
                        setShowCheckInModal(true);
                    } else {
                        if (isSiteLoginAction) {
                            setIsMandatorySiteVisit(true);
                            setVisitInitialData({
                                date: new Date().toLocaleDateString('en-CA'),
                                startTime: getHHMM(new Date()),
                                isCheckInTrigger: true
                            });
                            setActiveModal('site-visit');
                        } else {
                            dispatch(markAttendance(formData)).then((res) => {
                                if (!res.error) {
                                    dispatch(getAttendanceStatus());
                                    checkLatenessAndRedirect(new Date(), true);
                                }
                            });
                        }
                    }
                }
            }
        });
    };

    const handleNavigateCycle = (direction) => {
        const currentStart = new Date(requests?.cycleData?.startDate);
        if (isNaN(currentStart.getTime())) return;

        let targetDate = new Date(currentStart);
        if (direction === 'PREV') {
            targetDate.setMonth(targetDate.getMonth() - 1);
        } else {
            targetDate.setMonth(targetDate.getMonth() + 1);
        }

        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();

        const newStart = new Date(year, month, 26);
        const newEnd = new Date(year, month + 1, 25);

        dispatch(getMyRequests({
            startDate: getYYYYMMDD(newStart),
            endDate: getYYYYMMDD(newEnd)
        }));
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 pb-24 lg:pb-8 transition-colors duration-500">
            <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-8">
                {/* Active Break Notification */}
                <AnimatePresence>
                    {activeBreak && (
                        <motion.div
                            initial={{ height: 0, opacity: 0, y: -20 }}
                            animate={{ height: 'auto', opacity: 1, y: 0 }}
                            exit={{ height: 0, opacity: 0, y: -20 }}
                            className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 p-[2px] rounded-[2rem] shadow-lg shadow-amber-200/50 dark:shadow-amber-900/20 overflow-hidden"
                        >
                            <div className="bg-white/95 dark:bg-slate-900 backdrop-blur-md px-8 py-4 rounded-[1.9rem] flex items-center justify-between gap-4 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl">
                                            <Coffee size={24} className="animate-bounce" />
                                        </div>
                                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight transition-colors">Break Session Active</h4>
                                        <p className="text-sm font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2 transition-colors">
                                            Currently on {activeBreak.breakType} break since {formatTime(activeBreak.startTime)}
                                        </p>
                                    </div>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        setConfirmationConfig({
                                            isOpen: true,
                                            title: 'End Break',
                                            message: `Are you sure you want to end your ${activeBreak.breakType} break and resume work?`,
                                            type: 'info',
                                            onConfirm: () => {
                                                dispatch(resumeAttendance()).then(() => dispatch(getAttendanceStatus()));
                                                setConfirmationConfig(prev => ({ ...prev, isOpen: false }));
                                            }
                                        });
                                    }}
                                    className="px-8 py-3 bg-slate-900 dark:bg-primary text-white rounded-2xl font-black text-sm hover:shadow-xl transition-all flex items-center gap-2 group"
                                >
                                    Resume Work <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-6 lg:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full uppercase tracking-wider">
                                Employee Dashboard
                            </span>
                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                            Welcome back, <span className="text-indigo-600 dark:text-primary">{user?.name}</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                            <Calendar size={18} className="text-slate-400 dark:text-slate-500" />
                            {formatDate(new Date())} • {user?.designation}
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsAttendanceCalendarOpen(true)}
                            className="flex items-center gap-3 px-6 py-4 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl hover:border-indigo-200 dark:hover:border-indigo-900 transition-all group"
                        >
                            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                <TrendingUp size={20} />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none mb-1">View Stats</p>
                                <p className="text-sm font-black text-slate-900 dark:text-white">Attendance</p>
                            </div>
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setActiveModal('worklog')}
                            className="flex items-center gap-3 px-6 py-4 bg-indigo-600 dark:bg-primary text-white rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-primary/20 hover:bg-indigo-700 dark:hover:opacity-90 transition-all"
                        >
                            <Sparkles size={20} />
                            <span className="font-bold">Work Log</span>
                        </motion.button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-8 space-y-8">
                        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 lg:p-12 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden group transition-colors">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-12">
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        {getDeviceType() === 'desktop' && (
                                            <div className="inline-flex py-1 px-1 bg-slate-100 dark:bg-slate-800 rounded-2xl transition-colors">
                                                <button
                                                    onClick={() => setIsSiteLogin(false)}
                                                    className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!isSiteLogin ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-primary shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                                >
                                                    Office
                                                </button>
                                                <button
                                                    onClick={() => setIsSiteLogin(true)}
                                                    className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isSiteLogin ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                                >
                                                    Site
                                                </button>
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <h2 className="text-3xl font-black text-slate-900 dark:text-white transition-colors">
                                                {isCheckedIn ? 'Session Active' : (isSessionFinished ? 'Session Completed' : 'Ready to Start?')}
                                            </h2>
                                            <div className="flex flex-col gap-1">
                                                <p className="text-slate-500 dark:text-slate-400 font-medium text-lg transition-colors">
                                                    {isCheckedIn
                                                        ? `Started at ${formatTime(attendance?.date)}`
                                                        : (isSessionFinished
                                                            ? `Completed session at ${formatTime(attendance?.checkoutTime)}`
                                                            : 'Your daily progress begins here. Don\'t forget to sign in!')}
                                                </p>
                                                {(isCheckedIn || isSessionFinished) && (
                                                    <div className="flex items-center gap-6 mt-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                                                 <Clock size={14} />
                                                            </div>
                                                            <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Duration:</span>
                                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 tabular-nums">{sessionDuration}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                                                <MapPinned size={14} />
                                                            </div>
                                                            <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Type:</span>
                                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{attendance?.deviceInfo?.includes('SITE_LOGIN') ? 'Site' : 'Office'}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-4">
                                        {!isSessionFinished && (
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => handleMarkAttendance(isSiteLogin)}
                                                className={`px-10 py-5 ${isCheckedIn ? 'bg-rose-500' : (isSiteLogin ? 'bg-emerald-500' : 'bg-indigo-600')} text-white rounded-[2rem] font-bold text-lg flex items-center gap-3 shadow-xl transition-all`}
                                            >
                                                {isCheckedIn ? <LogOut size={24} /> : (isSiteLogin ? <MapPinned size={24} /> : <Monitor size={24} />)}
                                                {isCheckedIn ? 'Finish Session' : (isSiteLogin ? 'Site Sign-In' : 'Office Sign-In')}
                                            </motion.button>
                                        )}

                                        {isSessionFinished && (
                                            <div className="flex items-center gap-3 px-8 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-[2rem] font-bold border border-slate-200 dark:border-slate-700 transition-colors">
                                                <CheckCircle2 size={24} className="text-emerald-500" />
                                                Attendance Blocked for Today
                                            </div>
                                        )}

                                        {isCheckedIn && (
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => {
                                                    if (activeBreak) {
                                                        setConfirmationConfig({
                                                            isOpen: true,
                                                            title: 'End Break',
                                                            message: `Are you sure you want to end your ${activeBreak.breakType} break and resume work?`,
                                                            type: 'info',
                                                            onConfirm: () => {
                                                                dispatch(resumeAttendance()).then(() => dispatch(getAttendanceStatus()));
                                                                setConfirmationConfig(prev => ({ ...prev, isOpen: false }));
                                                            }
                                                        });
                                                    } else {
                                                        setActiveModal('break');
                                                    }
                                                }}
                                                className={`px-8 py-5 ${activeBreak ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-2 border-amber-200 dark:border-amber-900/50' : 'bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300'} rounded-[2rem] font-bold flex items-center gap-3 transition-all`}
                                            >
                                                {activeBreak ? <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" /> End {activeBreak.breakType}</span> : <><Coffee size={24} /> Take Break</>}
                                            </motion.button>
                                        )}
                                    </div>
                                </div>
                                <div className="hidden md:block flex-shrink-0">
                                    <SmartDisplayClock attendance={attendance} isCheckedIn={isCheckedIn} activeBreak={activeBreak} />
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            {[
                                { icon: Calendar, title: 'Cycle Stats', label: 'Days Present', value: requests?.stats?.presentDays || 0, color: 'indigo' },
                                { icon: AlertCircle, title: 'Requests', label: 'Pending', value: (requests?.leaves?.filter(l => l.status === 'PENDING').length || 0) + (requests?.permissions?.filter(p => p.status === 'PENDING').length || 0), color: 'rose' },
                                { icon: Star, title: 'Leaves', label: 'Available', value: Math.max(0, 4 - (requests?.leaves?.filter(l => l.status === 'APPROVED').length || 0)), color: 'emerald' }
                            ].map((stat, i) => (
                                <div key={i} className={`bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:border-${stat.color}-100 dark:hover:border-${stat.color}-900 transition-all`}>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className={`p-3 bg-${stat.color}-50 dark:bg-${stat.color}-900/30 text-${stat.color}-600 dark:text-${stat.color}-400 rounded-2xl`}><stat.icon size={24} /></div>
                                        <h4 className="font-bold text-slate-600 dark:text-slate-400">{stat.title}</h4>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-slate-900 dark:text-white tabular-nums">{stat.value}</span>
                                        <span className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-widest">{stat.label}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-4 space-y-8">
                        <div className="bg-slate-900 dark:bg-slate-900/40 backdrop-blur-md p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden transition-colors border border-white/5">
                            <h3 className="text-xl font-bold mb-8 flex items-center gap-3"><Sparkles className="text-indigo-400 dark:text-primary" size={24} /> Quick Actions</h3>
                            <div className="space-y-4">
                                {[
                                    { icon: Calendar, label: 'Leave Request', sub: 'Casual / Weekoff', type: 'leave', color: 'rose' },
                                    { icon: Clock, label: 'Two-hours Permit', sub: 'Early / Late', type: 'permission', color: 'amber' },
                                    { icon: MapPin, label: 'Site Visit', sub: 'Project Reporting', type: 'site-visit', color: 'emerald' },
                                    { icon: Building2, label: 'Showroom Visit', sub: 'Inter-Branch', type: 'showroom-visit', color: 'indigo' }
                                ].map((act, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setActiveModal(act.type)}
                                        className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 bg-${act.color}-500/20 text-${act.color}-400 rounded-xl`}><act.icon size={22} /></div>
                                            <div className="text-left">
                                                <p className="font-black text-sm">{act.label}</p>
                                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{act.sub}</p>
                                            </div>
                                        </div>
                                        <ChevronRight size={18} className="text-white/20 group-hover:text-white transition-all" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                            <h3 className="text-xl font-bold mb-8 flex items-center gap-3 text-slate-900 dark:text-white"><History className="text-slate-400 dark:text-slate-500" size={24} /> Recent Updates</h3>
                            <div className="space-y-6">
                                {requests?.workLogs?.slice(0, 3).map((log, idx) => (
                                    <div key={idx} className="flex gap-4">
                                        <div className="flex flex-col items-center">
                                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 dark:bg-primary" />
                                            {idx !== 2 && <div className="w-0.5 h-full bg-slate-100 dark:bg-slate-800" />}
                                        </div>
                                        <div className="flex-1 pb-6">
                                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{formatDate(log.date)}</p>
                                            <p className="text-sm font-black text-slate-800 dark:text-slate-200 line-clamp-1">{log.projectName || 'General Work'}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{log.tasks}</p>
                                        </div>
                                    </div>
                                )) || <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No recent logs</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <AttendanceCalendarModal
                isOpen={isAttendanceCalendarOpen}
                onClose={() => setIsAttendanceCalendarOpen(false)}
                cycleData={requests?.cycleData}
                attendanceHistory={requests?.attendanceHistory}
                leaves={requests?.leaves}
                permissions={requests?.permissions}
                onNavigate={handleNavigateCycle}
            />

            <AnimatePresence>
                {activeModal === 'leave' && (
                    <Modal isOpen onClose={() => setActiveModal(null)} title="Request Leave">
                        <LeaveRequestForm onSuccess={() => { setActiveModal(null); dispatch(getMyRequests()); }} />
                    </Modal>
                )}
                {activeModal === 'permission' && (
                    <Modal isOpen onClose={() => !isAutoPermission && setActiveModal(null)} title={isAutoPermission ? "Mandatory Permission" : "Request Permission"}>
                        <PermissionRequestForm
                            isMandatory={isAutoPermission}
                            initialData={permissionInitialData}
                            onSuccess={() => { setActiveModal(null); setIsAutoPermission(false); dispatch(getMyRequests()); }}
                            onCancel={() => !isAutoPermission && setActiveModal(null)}
                        />
                    </Modal>
                )}
                {activeModal === 'site-visit' && (
                    <Modal isOpen onClose={() => !isMandatorySiteVisit && setActiveModal(null)} title={isMandatorySiteVisit ? "Mandatory Reporting" : "Site Visit"}>
                        <SiteVisitRequestForm
                            isMandatory={isMandatorySiteVisit}
                            initialData={visitInitialData}
                            onSuccess={() => {
                                setActiveModal(null);
                                setIsMandatorySiteVisit(false);
                                dispatch(getMyRequests());
                                if (visitInitialData?.isCheckInTrigger) {
                                    const formData = new FormData();
                                    const deviceType = getDeviceType();
                                    formData.append('deviceInfo', `${deviceType.toUpperCase()} | SITE_LOGIN | ${navigator.userAgent}`);
                                    dispatch(markAttendance(formData)).then((res) => {
                                        if (!res.error) {
                                            dispatch(getAttendanceStatus());
                                            checkLatenessAndRedirect(new Date(), true);
                                        }
                                    });
                                }
                            }}
                            onCancel={() => !isMandatorySiteVisit && setActiveModal(null)}
                        />
                    </Modal>
                )}
                {activeModal === 'showroom-visit' && (
                    <Modal isOpen onClose={() => setActiveModal(null)} title="Showroom Visit">
                        <ShowroomVisitRequestForm onSuccess={() => { setActiveModal(null); dispatch(getMyRequests()); }} />
                    </Modal>
                )}
                {activeModal === 'worklog' && (
                    <Modal isOpen onClose={() => !isMandatoryWorkLog && setActiveModal(null)} title={isMandatoryWorkLog ? "Mandatory Work Log" : "Work Log"}>
                        <WorkLogFormSelector
                            designation={user?.designation}
                            onSuccess={() => {
                                setActiveModal(null);
                                setIsMandatoryWorkLog(false);
                                dispatch(getMyWorkLogs());
                            }}
                        />
                    </Modal>
                )}
                {activeModal === 'break' && (
                    <Modal isOpen onClose={() => setActiveModal(null)} title="Take Break">
                        <div className="grid grid-cols-2 gap-4 p-4">
                            {[
                                { id: 'TEA', icon: Coffee, title: 'Tea', color: 'indigo' },
                                { id: 'LUNCH', icon: Utensils, title: 'Lunch', color: 'rose' },
                                { id: 'CLIENT_MEETING', icon: MapPin, title: 'Client', color: 'emerald' },
                                { id: 'BH_MEETING', icon: MessageSquare, title: 'BH', color: 'amber' }
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setConfirmationConfig({
                                            isOpen: true,
                                            title: `Start ${t.title} Break`,
                                            message: `Are you sure you want to take a ${t.title} break now?`,
                                            type: 'info',
                                            onConfirm: () => {
                                                dispatch(pauseAttendance({ breakType: t.id })).then(() => {
                                                    dispatch(getAttendanceStatus());
                                                    setActiveModal(null);
                                                });
                                            }
                                        });
                                    }}
                                    className="flex flex-col items-center gap-3 p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-600 group"
                                >
                                    <div className={`p-4 bg-${t.color}-50 dark:bg-${t.color}-900/30 text-${t.color}-600 dark:text-${t.color}-400 rounded-2xl group-hover:scale-110 transition-transform`}>
                                        <t.icon size={32} />
                                    </div>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{t.title}</span>
                                </button>
                            ))}
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            {/* Mandatory SIM Selection Modal */}
            <AnimatePresence>
                {showMandatorySimModal && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
                        >
                            <div className="p-8 lg:p-10 space-y-8">
                                <div className="space-y-4 text-center">
                                    <div className="inline-flex p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-3xl">
                                        <Smartphone size={40} className="animate-pulse" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Select Official SIM</h2>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                                        To sync your call logs correctly, please identify which SIM is your **Official Work SIM**.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    {isDiscoveringSims ? (
                                        <div className="flex flex-col items-center py-8 space-y-4">
                                            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Identifying SIM Slots...</p>
                                        </div>
                                    ) : (
                                        <>
                                            {(availableSims.length > 0 ? availableSims : ["1", "2"]).map((simId) => (
                                                <motion.button
                                                    key={simId}
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => {
                                                        setConfirmationConfig({
                                                            isOpen: true,
                                                            title: 'Confirm Official SIM',
                                                            message: `Confirm selection of ${simLabels[simId] || `SIM ${simId}`} as your Official Work SIM?\n\nThis will be used for all background syncing.`,
                                                            type: 'info',
                                                            onConfirm: async () => {
                                                                const { Preferences } = await import('@capacitor/preferences');
                                                                await Preferences.set({ key: 'cre_official_sim', value: String(simId) });
                                                                localStorage.setItem('cre_official_sim', String(simId));
                                                                setShowMandatorySimModal(false);
                                                                toast.success(`${simLabels[simId] || `SIM ${simId}`} set as official.`);
                                                                performFallbackSync();
                                                            }
                                                        });
                                                    }}
                                                    className="w-full flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800 transition-all group"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-3 rounded-2xl transition-colors ${simLabels[simId] ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'} dark:bg-slate-700/50`}>
                                                            <Smartphone size={24} />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="font-black text-slate-900 dark:text-white">
                                                                {simLabels[simId] || (isDiscoveringSims ? "Identifying..." : `SIM Slot ${simId}`)}
                                                            </p>
                                                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                                                {simLabels[simId] ? `System Slot ${simId}` : "Waiting for Provider Name"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={20} className="text-slate-300 group-hover:translate-x-1 transition-all" />
                                                </motion.button>
                                            ))}

                                            {/* Manual Scan Button */}
                                            <button 
                                                onClick={discoverSims}
                                                disabled={isDiscoveringSims}
                                                className="w-full mt-4 flex items-center justify-center gap-3 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all group active:scale-95"
                                            >
                                                <RefreshCw size={16} className={`${isDiscoveringSims ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'} text-slate-500`} />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                                                    {isDiscoveringSims ? "Identifying SIMs..." : "Scan for Provider Names"}
                                                </span>
                                            </button>
                                            
                                            {/* Tip for Dual Sims with same labels */}
                                            {availableSims.length > 1 && new Set(availableSims.map(s => simLabels[s])).size === 1 && (
                                                <p className="mt-3 text-[9px] font-bold text-slate-400 text-center uppercase tracking-tighter">
                                                    Same provider for both? Try "Scan" or ensure Phone Permission is ON.
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex gap-3">
                                    <Info size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                    <p className="text-[11px] font-bold text-amber-800 dark:text-amber-200 leading-relaxed uppercase tracking-wide">
                                        You can change this anytime in the Call Reports settings.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* AE Modal */}
            {/* AE Camera Modal - Optimized for Mobile First (Big Experience) */}
            <AnimatePresence>
                {showCheckInModal && (
                    <div className="fixed inset-0 z-[200] flex sm:items-center sm:justify-center">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/95 backdrop-blur-2xl" onClick={() => !loading && setShowCheckInModal(false)} />
                        
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 100 }} 
                            animate={{ scale: 1, opacity: 1, y: 0 }} 
                            exit={{ scale: 0.9, opacity: 0, y: 100 }} 
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white sm:w-full sm:max-w-xl w-full h-full sm:h-auto sm:rounded-[3rem] overflow-hidden shadow-2xl relative z-10 flex flex-col"
                        >
                            {/* Header Section */}
                            <div className="p-6 sm:p-8 flex items-center justify-between border-b border-slate-100 shrink-0 bg-white/80 backdrop-blur-md">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm animate-pulse-subtle"><Camera size={24} /></div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Identity Check</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isCheckingOut ? 'Session End Verification' : 'Session Start Verification'}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowCheckInModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all hover:rotate-90"><X size={20} className="text-slate-400" /></button>
                            </div>

                            {/* Camera Area - Flexible height */}
                            <div className="flex-1 relative bg-slate-900 sm:m-6 sm:rounded-[2rem] overflow-hidden group shadow-inner">
                                {!photo ? (
                                    <>
                                        {/* Blurred Background for immersive feel */}
                                        <video ref={(el) => { if(el) el.srcObject = videoRef.current?.srcObject; }} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-x-[-1]" />
                                        
                                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain scale-x-[-1] relative z-10" onLoadedMetadata={() => videoRef.current?.play()} />
                                        
                                        {/* Focus Ring Animation */}
                                        <motion.div 
                                            initial={{ scale: 1.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: [0, 1, 0] }}
                                            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                                            className="absolute inset-0 m-auto w-32 h-32 border-2 border-indigo-400/50 rounded-full pointer-events-none flex items-center justify-center z-20"
                                        >
                                            <div className="w-2 h-2 bg-indigo-400/50 rounded-full" />
                                        </motion.div>

                                        {/* Camera Grid Overlay */}
                                        <div className="absolute inset-0 pointer-events-none opacity-10 z-20">
                                            <div className="absolute top-1/3 w-full h-px bg-white" />
                                            <div className="absolute top-2/3 w-full h-px bg-white" />
                                            <div className="absolute left-1/3 h-full w-px bg-white" />
                                            <div className="absolute left-2/3 h-full w-px bg-white" />
                                        </div>
                                    </>
                                ) : (
                                    <div className="relative w-full h-full">
                                        {/* Blurred Background for immersive feel */}
                                        <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40" />
                                        
                                        <img src={photo} alt="Verification" className="w-full h-full object-contain relative z-10" />
                                        <motion.button 
                                            initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }}
                                            onClick={() => setPhoto(null)} 
                                            className="absolute top-6 right-6 p-4 bg-white/95 text-rose-500 rounded-2xl shadow-2xl border border-white hover:bg-rose-50 transition-all z-30"
                                        >
                                            <Trash2 size={24} />
                                        </motion.button>
                                    </div>
                                )}
                                
                                {/* Shutter Flash Effect */}
                                <AnimatePresence>
                                    {photo && (
                                        <motion.div 
                                            initial={{ opacity: 1 }} 
                                            animate={{ opacity: 0 }} 
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="absolute inset-0 bg-white z-[50] pointer-events-none"
                                        />
                                    )}
                                </AnimatePresence>

                                {/* Location Overlay (Subtle banner style) */}
                                <div className="absolute top-4 left-4 right-4 pointer-events-none z-10">
                                    <motion.div 
                                        initial={{ y: -20, opacity: 0 }} 
                                        animate={{ y: 0, opacity: 1 }}
                                        className="bg-black/40 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/10 flex items-center gap-3 shadow-2xl"
                                    >
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-none mb-1">Live Location Verified</p>
                                            <p className="text-xs font-bold text-white truncate drop-shadow-sm">{location.address || 'Locating site...'}</p>
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Shutter Button - Floating Overlay */}
                                {!photo && (
                                    <div className="absolute inset-x-0 bottom-10 flex justify-center items-center gap-8 pointer-events-none z-20">
                                        <motion.button
                                            whileTap={{ scale: 0.85 }}
                                            disabled={!cameraState.active || location.error || !location.lat}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const v = videoRef.current;
                                                const c = document.createElement('canvas');
                                                c.width = v.videoWidth; c.height = v.videoHeight;
                                                const ctx = c.getContext('2d');
                                                ctx.translate(c.width, 0); ctx.scale(-1, 1);
                                                ctx.drawImage(v, 0, 0);
                                                ctx.setTransform(1, 0, 0, 1, 0, 0);
                                                
                                                // Metadata Overlay (High definition)
                                                const overlayHeight = Math.max(140, c.height * 0.12);
                                                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                                                ctx.fillRect(0, c.height - overlayHeight, c.width, overlayHeight);
                                                ctx.fillStyle = 'white';
                                                
                                                const fontSizeLarge = Math.round(c.width * 0.04);
                                                const fontSizeSmall = Math.round(c.width * 0.025);
                                                
                                                ctx.font = `bold ${fontSizeLarge}px Inter, sans-serif`;
                                                const now = new Date();
                                                const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                                                const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                                ctx.fillText(`${dateStr} | ${timeStr}`, 40, c.height - (overlayHeight * 0.65));
                                                
                                                ctx.font = `500 ${fontSizeSmall}px Inter, sans-serif`;
                                                ctx.fillText(`📍 ${location.address || 'Location Unavailable'}`, 40, c.height - (overlayHeight * 0.3));
                                                
                                                setPhoto(c.toDataURL('image/jpeg', 0.9));
                                            }}
                                            className={`pointer-events-auto h-24 w-24 rounded-full border-[6px] border-white flex items-center justify-center p-1.5 shadow-2xl transition-all ${(!cameraState.active || location.error || !location.lat) ? 'opacity-50 scale-90 grayscale' : 'hover:scale-110 active:scale-95 bg-white/20'}`}
                                        >
                                            <div className="w-full h-full rounded-full bg-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)] flex items-center justify-center">
                                                <div className="w-16 h-16 rounded-full border-2 border-slate-100" />
                                            </div>
                                        </motion.button>
                                    </div>
                                )}
                            </div>

                            {/* Footer Action Area */}
                            <div className="p-8 sm:p-10 shrink-0 bg-white shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.05)] border-t border-slate-50 relative z-30">
                                {!photo ? (
                                    <div className="flex flex-col gap-5">
                                        <div className="flex items-start gap-4 text-slate-500 font-bold text-xs p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100/50">
                                            <Sparkles size={20} className="text-indigo-400 shrink-0" />
                                            <p className="leading-relaxed">Sleek Photo Capture: Ensure your face is centered and the site background is clearly visible for automatic verification.</p>
                                        </div>
                                        <motion.button 
                                            whileHover={{ y: -2 }}
                                            onClick={() => setShowCheckInModal(false)}
                                            className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] hover:text-rose-500 transition-colors"
                                        >
                                            Cancel & Go Back
                                        </motion.button>
                                    </div>
                                ) : (
                                    <div className="flex gap-4">
                                        <motion.button 
                                            whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                const formData = new FormData();
                                                const blob = dataURLtoBlob(photo);
                                                if (!blob) { toast.error("Processing failed"); return; }
                                                formData.append('photo', blob, 'photo.jpg');
                                                formData.append('deviceInfo', `${getDeviceType().toUpperCase()} | ${isSiteLogin ? 'SITE | ' : ''}${navigator.userAgent}`);
                                                const action = isCheckingOut ? checkoutAttendance(formData) : markAttendance(formData);
                                                dispatch(action).then((res) => {
                                                    if (!res.error) {
                                                        dispatch(getAttendanceStatus());
                                                        setPhoto(null); setShowCheckInModal(false);
                                                        if (!isCheckingOut) checkLatenessAndRedirect(new Date(), true);
                                                    }
                                                });
                                            }} 
                                            className="flex-1 py-6 bg-slate-900 border-b-4 border-slate-700 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3 group"
                                        >
                                            <CheckCircle2 size={20} className="text-emerald-400 group-hover:scale-125 transition-transform" /> Confirm Identity
                                        </motion.button>
                                        <motion.button 
                                            whileHover={{ scale: 1.05 }}
                                            onClick={() => setPhoto(null)} 
                                            className="px-10 py-6 bg-slate-100 text-slate-500 rounded-[2rem] font-bold hover:bg-slate-200 transition-colors flex items-center gap-2"
                                        >
                                            <History size={18} /> Retake
                                        </motion.button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmationModal
                isOpen={confirmationConfig.isOpen}
                onClose={() => setConfirmationConfig({ ...confirmationConfig, isOpen: false })}
                onConfirm={confirmationConfig.onConfirm}
                title={confirmationConfig.title}
                message={confirmationConfig.message}
                type={confirmationConfig.type}
            />
        </div>
    );
};

function dataURLtoBlob(dataurl) {
    if (!dataurl || typeof dataurl !== 'string' || !dataurl.includes(',')) return null;
    try {
        const arr = dataurl.split(',');
        const match = arr[0].match(/:(.*?);/);
        if (!match) return null;
        const mime = match[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    } catch (e) {
        console.error("Error converting dataURL to blob:", e);
        return null;
    }
}

const SmartDisplayClock = ({ attendance, isCheckedIn, activeBreak }) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const calculateProgress = () => {
        if (!isCheckedIn || !attendance?.date) return 0;
        const start = new Date(attendance.date);
        const diff = (currentTime - start) / (1000 * 60 * 60); // hours
        return Math.min((diff / 8) * 100, 100); // Progress towards 8h shift
    };

    const progress = calculateProgress();

    return (
        <div className="relative w-80 h-44 xl:w-96 xl:h-52 rounded-[2.5rem] overflow-hidden shadow-2xl group transition-all duration-700 hover:scale-[1.02]">
            {/* Layered Diagonal Background Concept */}
            <div className="absolute inset-0 bg-[#00607a] transition-colors duration-1000">
                {/* Diagonal Stripes */}
                <div className="absolute inset-0 opacity-80">
                    <div className="absolute top-0 -left-1/4 w-1/2 h-full bg-[#004e63] transform -skew-x-12 transition-all duration-1000" />
                    <div className="absolute top-0 left-1/4 w-1/2 h-full bg-[#00708f] transform -skew-x-12 transition-all duration-1000" />
                    <div className="absolute top-0 left-3/4 w-1/2 h-full bg-[#018ba1] transform -skew-x-12 transition-all duration-1000" />
                </div>
                
                {/* Progress Overlay - Subtle gradient fill from left */}
                {isCheckedIn && !activeBreak && (
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-transparent pointer-events-none z-10"
                    />
                )}
            </div>

            {/* Break Animation Overlay */}
            <AnimatePresence mode="wait">
                {activeBreak ? (
                    <motion.div
                        key="break-animation"
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.5, ease: "anticipate" }}
                        className="absolute inset-0 z-30"
                    >
                        <img 
                            src="/break.gif" 
                            alt="On Break" 
                            className="w-full h-full object-contain bg-slate-950"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="flex items-center gap-2 bg-black/40 backdrop-blur-md self-start px-3 py-1.5 rounded-xl border border-white/10"
                            >
                                <Coffee size={14} className="text-amber-400 animate-pulse" />
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                    RELAXING: {activeBreak.breakType}
                                </span>
                            </motion.div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="clock-content"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative z-20 h-full p-8 flex flex-col justify-between text-white"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <motion.h1 
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="text-6xl xl:text-7xl font-black tracking-tighter drop-shadow-2xl select-none"
                                >
                                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </motion.h1>
                                <p className="text-sm xl:text-base font-bold text-white/80 mt-1 drop-shadow-md">
                                    {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </p>
                            </div>

                            {/* Status Icon/Info */}
                            <div className="flex flex-col items-end">
                                {isCheckedIn ? (
                                    <div className="bg-emerald-500/30 backdrop-blur-md border border-emerald-400/30 p-2 rounded-2xl flex items-center gap-2 group/status">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Active</span>
                                    </div>
                                ) : (
                                    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-2xl flex items-center gap-2">
                                        <Clock size={16} className="text-white/60" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Idle</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-between items-end">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
                                    <MapPinned size={18} className="text-white/80" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/50 leading-none mb-1">Location</p>
                                    <p className="text-xs font-bold">{attendance?.deviceInfo?.includes('SITE_LOGIN') ? 'Site Visit' : 'Main Office'}</p>
                                </div>
                            </div>

                            {/* Temperature/Secondary Stat Placeholder (Visual Polish) */}
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                                <TrendingUp size={14} className="text-emerald-400" />
                                <span className="text-xs font-black tracking-tight">{isCheckedIn ? `${Math.round(progress)}% Done` : '--'}</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Glassmorphism Inner Shadow */}
            <div className="absolute inset-0 pointer-events-none border border-white/10 rounded-[2.5rem] shadow-[inset_0_0_80px_rgba(255,255,255,0.05)]" />
        </div>
    );
};

export default Overview;
