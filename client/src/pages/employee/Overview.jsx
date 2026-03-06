import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Clock, CheckCircle2, AlertCircle, MapPin, Coffee, Utensils,
    Briefcase, LogOut, ChevronRight, User, TrendingUp, Sparkles, Building2,
    Monitor, MapPinned, Star, ArrowRight, Camera, X, MessageSquare, History, CheckCircle, Info, Send
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
    const [location, setLocation] = useState({ lat: null, lng: null, address: 'Locating...' });

    const fetchLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocation(prev => ({ ...prev, address: 'Geolocation Unsupported' }));
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

                    setLocation({ lat, lng, address: parts.join(', ') || data.display_name || 'Address Found' });
                } catch (err) {
                    console.error("Geocoding error:", err);
                    setLocation({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
                }
            },
            (err) => {
                console.error("Location error:", err);
                setLocation(prev => ({ ...prev, address: 'Location Access Denied' }));
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

        let thresholdMinutes = hasHalfDay ? 840 : 640; // 2:00 PM or 10:40 AM (10 minute buffer for 10:30 AM)

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

    // Worklog Enforcement Effect
    const { todayLog } = useSelector((state) => state.employee);
    useEffect(() => {
        if (isCheckedIn && isRequestsFetched && activeModal === null && hasCheckedLateness) {
            // Force worklog if missing for CRE/AE (Opening report)
            const isSpecializedRole = ['CRE', 'AE', 'AE MANAGER', 'CRE MANAGER'].includes(user?.designation?.toUpperCase());
            if (isSpecializedRole && !todayLog) {
                setIsMandatoryWorkLog(true);
                setActiveModal('worklog');
            }
        }
    }, [isCheckedIn, isRequestsFetched, todayLog, user, activeModal, hasCheckedLateness]);

    // Camera Effect for AE
    useEffect(() => {
        let stream = null;
        if (showCheckInModal && videoRef.current) {
            navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 720 },
                    height: { ideal: 1280 }
                }
            })
                .then(s => {
                    stream = s;
                    if (videoRef.current) {
                        videoRef.current.srcObject = s;
                    }
                })
                .catch(err => {
                    console.error("Camera error:", err);
                    toast.error("Could not access camera. Please check permissions.");
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
                        dispatch(markAttendance(formData)).then((res) => {
                            if (!res.error) {
                                dispatch(getAttendanceStatus());
                                if (isSiteLoginAction) {
                                    setIsMandatorySiteVisit(true);
                                    setVisitInitialData({
                                        date: new Date().toLocaleDateString('en-CA'),
                                        startTime: getHHMM(new Date())
                                    });
                                    setActiveModal('site-visit');
                                } else {
                                    checkLatenessAndRedirect(new Date(), true);
                                }
                            }
                        });
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
        <div className="min-h-screen bg-[#F8FAFC] pb-24 lg:pb-8">
            <div className="max-w-[1600px] mx-auto p-4 lg:p-8 space-y-8">
                {/* Active Break Notification */}
                <AnimatePresence>
                    {activeBreak && (
                        <motion.div
                            initial={{ height: 0, opacity: 0, y: -20 }}
                            animate={{ height: 'auto', opacity: 1, y: 0 }}
                            exit={{ height: 0, opacity: 0, y: -20 }}
                            className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 p-[2px] rounded-[2rem] shadow-lg shadow-amber-200/50 overflow-hidden"
                        >
                            <div className="bg-white/95 backdrop-blur-md px-8 py-4 rounded-[1.9rem] flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                                            <Coffee size={24} className="animate-bounce" />
                                        </div>
                                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black text-slate-800 tracking-tight">Break Session Active</h4>
                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
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
                                    className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm hover:shadow-xl transition-all flex items-center gap-2 group"
                                >
                                    Resume Work <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 lg:p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full uppercase tracking-wider">
                                Employee Dashboard
                            </span>
                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
                            Welcome back, <span className="text-indigo-600">{user?.name}</span>
                        </h1>
                        <p className="text-slate-500 font-medium flex items-center gap-2">
                            <Calendar size={18} className="text-slate-400" />
                            {formatDate(new Date())} • {user?.designation}
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsAttendanceCalendarOpen(true)}
                            className="flex items-center gap-3 px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-indigo-200 transition-all group"
                        >
                            <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                <TrendingUp size={20} />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">View Stats</p>
                                <p className="text-sm font-black text-slate-900">Attendance</p>
                            </div>
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setActiveModal('worklog')}
                            className="flex items-center gap-3 px-6 py-4 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all"
                        >
                            <Sparkles size={20} />
                            <span className="font-bold">Log Tasks</span>
                        </motion.button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-8 space-y-8">
                        <div className="bg-white rounded-[3rem] p-8 lg:p-12 shadow-sm border border-slate-100 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-12">
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <div className="inline-flex py-1 px-1 bg-slate-100 rounded-2xl">
                                            <button
                                                onClick={() => setIsSiteLogin(false)}
                                                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!isSiteLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                Office Login
                                            </button>
                                            <button
                                                onClick={() => setIsSiteLogin(true)}
                                                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isSiteLogin ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                Site Login
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            <h2 className="text-3xl font-black text-slate-900">
                                                {isCheckedIn ? 'Session Active' : (isSessionFinished ? 'Session Completed' : 'Ready to Start?')}
                                            </h2>
                                            <div className="flex flex-col gap-1">
                                                <p className="text-slate-500 font-medium text-lg">
                                                    {isCheckedIn
                                                        ? `Started at ${formatTime(attendance?.date)}`
                                                        : (isSessionFinished
                                                            ? `Completed session at ${formatTime(attendance?.checkoutTime)}`
                                                            : 'Your daily progress begins here. Don\'t forget to sign in!')}
                                                </p>
                                                {(isCheckedIn || isSessionFinished) && (
                                                    <div className="flex items-center gap-6 mt-2 pt-4 border-t border-slate-100">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                                                <Clock size={14} />
                                                            </div>
                                                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Duration:</span>
                                                            <span className="text-sm font-bold text-slate-700 tabular-nums">{sessionDuration}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                                                                <MapPinned size={14} />
                                                            </div>
                                                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Type:</span>
                                                            <span className="text-sm font-bold text-slate-700">{attendance?.deviceInfo?.includes('SITE_LOGIN') ? 'Site' : 'Office'}</span>
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
                                            <div className="flex items-center gap-3 px-8 py-5 bg-slate-100 text-slate-500 rounded-[2rem] font-bold border border-slate-200">
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
                                                className={`px-8 py-5 ${activeBreak ? 'bg-amber-100 text-amber-600 border-2 border-amber-200' : 'bg-white border-2 border-slate-100 text-slate-600'} rounded-[2rem] font-bold flex items-center gap-3 transition-all`}
                                            >
                                                {activeBreak ? <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" /> End {activeBreak.breakType}</span> : <><Coffee size={24} /> Take Break</>}
                                            </motion.button>
                                        )}
                                    </div>
                                </div>
                                <div className="hidden md:flex lg:w-48 lg:h-48 xl:w-64 xl:h-64 rounded-full bg-indigo-50 border-[12px] border-white shadow-xl flex-col items-center justify-center relative">
                                    <Clock size={48} className="text-indigo-500 mb-2" />
                                    <p className="text-2xl font-black text-slate-900 tabular-nums">
                                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            {[
                                { icon: Calendar, title: 'Cycle Stats', label: 'Days Present', value: requests?.stats?.presentDays || 0, color: 'indigo' },
                                { icon: AlertCircle, title: 'Requests', label: 'Pending', value: (requests?.leaves?.filter(l => l.status === 'PENDING').length || 0) + (requests?.permissions?.filter(p => p.status === 'PENDING').length || 0), color: 'rose' },
                                { icon: Star, title: 'Leaves', label: 'Available', value: Math.max(0, 4 - (requests?.leaves?.filter(l => l.status === 'APPROVED').length || 0)), color: 'emerald' }
                            ].map((stat, i) => (
                                <div key={i} className={`bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-${stat.color}-100 transition-all`}>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className={`p-3 bg-${stat.color}-50 text-${stat.color}-600 rounded-2xl`}><stat.icon size={24} /></div>
                                        <h4 className="font-bold text-slate-600">{stat.title}</h4>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-slate-900 tabular-nums">{stat.value}</span>
                                        <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{stat.label}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-4 space-y-8">
                        <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                            <h3 className="text-xl font-bold mb-8 flex items-center gap-3"><Sparkles className="text-indigo-400" size={24} /> Quick Actions</h3>
                            <div className="space-y-4">
                                {[
                                    { icon: Calendar, label: 'Leave Request', sub: 'Casual / Sick', type: 'leave', color: 'rose' },
                                    { icon: Clock, label: 'One-hour Permit', sub: 'Early / Late', type: 'permission', color: 'amber' },
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

                        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                            <h3 className="text-xl font-bold mb-8 flex items-center gap-3 text-slate-900"><History className="text-slate-400" size={24} /> Recent Updates</h3>
                            <div className="space-y-6">
                                {requests?.workLogs?.slice(0, 3).map((log, idx) => (
                                    <div key={idx} className="flex gap-4">
                                        <div className="flex flex-col items-center">
                                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                                            {idx !== 2 && <div className="w-0.5 h-full bg-slate-100" />}
                                        </div>
                                        <div className="flex-1 pb-6">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(log.date)}</p>
                                            <p className="text-sm font-black text-slate-800 line-clamp-1">{log.projectName || 'General Work'}</p>
                                            <p className="text-xs text-slate-500 line-clamp-1">{log.tasks}</p>
                                        </div>
                                    </div>
                                )) || <p className="text-sm text-slate-400 text-center py-4">No recent logs</p>}
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
                            onSuccess={() => { setActiveModal(null); setIsMandatorySiteVisit(false); dispatch(getMyRequests()); }}
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
                                                    setActiveModal(null);
                                                    dispatch(getAttendanceStatus());
                                                });
                                                setConfirmationConfig(prev => ({ ...prev, isOpen: false }));
                                            }
                                        });
                                    }}
                                    className="flex flex-col items-center p-6 bg-slate-50 hover:bg-white hover:shadow-xl transition-all rounded-[2rem] border-2 border-transparent hover:border-indigo-100 group"
                                >
                                    <div className={`p-4 bg-${t.color}-50 text-${t.color}-500 rounded-[1.5rem] mb-4 group-hover:scale-110 transition-transform`}><t.icon size={32} /></div>
                                    <p className="font-black text-slate-800 tracking-tight">{t.title}</p>
                                </button>
                            ))}
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            {/* AE Modal */}
            <AnimatePresence>
                {showCheckInModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => !loading && setShowCheckInModal(false)} />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white w-full max-w-xl rounded-[3rem] overflow-hidden shadow-2xl relative z-10">
                            <div className="p-8 lg:p-10 space-y-8 text-center">
                                <div className="inline-flex p-4 bg-indigo-50 text-indigo-600 rounded-[2rem]"><Camera size={32} /></div>
                                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Smile!</h3>
                                <div className="relative aspect-[3/4] bg-slate-900 rounded-[2.5rem] overflow-hidden">
                                    {!photo ? (
                                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" onLoadedMetadata={() => videoRef.current?.play()} />
                                    ) : (
                                        <div className="relative w-full h-full">
                                            <img src={photo} alt="Verification" className="w-full h-full object-cover scale-x-[-1]" />
                                            <button onClick={() => setPhoto(null)} className="absolute top-6 right-6 p-4 bg-white/90 rounded-2xl shadow-xl"><X size={24} /></button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-4">
                                    {!photo ? (
                                        <button onClick={() => {
                                            const v = videoRef.current;
                                            const c = document.createElement('canvas');
                                            c.width = v.videoWidth; c.height = v.videoHeight;
                                            const ctx = c.getContext('2d');

                                            // Flip horizontally for user-facing camera
                                            ctx.translate(c.width, 0); ctx.scale(-1, 1);
                                            ctx.drawImage(v, 0, 0);

                                            // Reset transform to draw text
                                            ctx.setTransform(1, 0, 0, 1, 0, 0);

                                            // Draw metadata overlay
                                            const overlayHeight = 120;
                                            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                                            ctx.fillRect(0, c.height - overlayHeight, c.width, overlayHeight);

                                            ctx.fillStyle = 'white';
                                            ctx.font = 'bold 32px Inter, sans-serif';

                                            const now = new Date();
                                            const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                                            const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                            const locStr = location.address || 'Location Unavailable';

                                            ctx.fillText(dateStr, 32, c.height - (overlayHeight - 40));
                                            ctx.fillText(`| ${timeStr}`, 250, c.height - (overlayHeight - 40));
                                            ctx.font = '500 22px Inter, sans-serif';

                                            // Word wrap for long addresses
                                            const words = locStr.split(', ');
                                            let line = '📍 ';
                                            let y = c.height - (overlayHeight - 80);
                                            words.forEach((word, i) => {
                                                const testLine = line + word + (i < words.length - 1 ? ', ' : '');
                                                if (ctx.measureText(testLine).width > c.width - 64) {
                                                    ctx.fillText(line, 32, y);
                                                    line = word + (i < words.length - 1 ? ', ' : '');
                                                    y += 28;
                                                } else {
                                                    line = testLine;
                                                }
                                            });
                                            ctx.fillText(line, 32, y);

                                            // Draw coordinates small in corner
                                            if (location.lat) {
                                                ctx.font = '400 14px Inter, sans-serif';
                                                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                                                ctx.fillText(`${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`, c.width - 130, c.height - 15);
                                            }

                                            setPhoto(c.toDataURL('image/jpeg', 0.9));
                                        }} className="flex-1 py-6 bg-slate-900 text-white rounded-[2rem] font-bold">Capture</button>
                                    ) : (
                                        <button onClick={() => {
                                            const formData = new FormData();
                                            const blob = dataURLtoBlob(photo);
                                            if (!blob) {
                                                toast.error("Failed to process photo. Please try again.");
                                                return;
                                            }
                                            // FIXED: Backend expects field name 'photo'
                                            formData.append('photo', blob, 'photo.jpg');
                                            formData.append('deviceInfo', `${getDeviceType().toUpperCase()} | ${isSiteLogin ? 'SITE | ' : ''}${navigator.userAgent}`);
                                            const action = isCheckingOut ? checkoutAttendance(formData) : markAttendance(formData);
                                            dispatch(action).then((res) => {
                                                if (!res.error) {
                                                    dispatch(getAttendanceStatus());
                                                    setPhoto(null); setShowCheckInModal(false);
                                                    if (!isCheckingOut && isSiteLogin) {
                                                        setIsMandatorySiteVisit(true);
                                                        setVisitInitialData({ date: new Date().toLocaleDateString('en-CA'), startTime: getHHMM(new Date()) });
                                                        setActiveModal('site-visit');
                                                    } else if (!isCheckingOut) {
                                                        checkLatenessAndRedirect(new Date(), true);
                                                    }
                                                }
                                            });
                                        }} className="flex-1 py-6 bg-indigo-600 text-white rounded-[2rem] font-bold">Confirm</button>
                                    )}
                                    <button onClick={() => setShowCheckInModal(false)} className="px-10 py-6 bg-slate-100 rounded-[2rem]">Cancel</button>
                                </div>
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

export default Overview;
