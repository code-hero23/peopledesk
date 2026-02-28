import { useEffect, useState, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getAttendanceStatus, markAttendance, checkoutAttendance, getMyWorkLogs, getMyRequests, reset, pauseAttendance, resumeAttendance, getAttendanceHistory } from '../../features/employee/employeeSlice';
import MonthCycleSelector from '../../components/common/MonthCycleSelector';

import WorkLogForm from '../../components/WorkLogForm'; // Default (LA)
import LAWorkLogForm from '../../components/worklogs/LAWorkLogForm'; // Detailed (LA)
import CREWorkLogForm from '../../components/worklogs/CREWorkLogForm';
import FAWorkLogForm from '../../components/worklogs/FAWorkLogForm';
import AEWorkLogForm from '../../components/worklogs/AEWorkLogForm'; // Added AE Import
import DynamicWorkLogForm from '../../components/worklogs/DynamicWorkLogForm';
import { WORK_LOG_CONFIG } from '../../config/workLogConfig';

import LeaveRequestForm from '../../components/LeaveRequestForm';
import PermissionRequestForm from '../../components/PermissionRequestForm';
import StatCard from '../../components/StatCard';
import Modal from '../../components/Modal';
import BreakSelectionModal from '../../components/BreakSelectionModal';
import ProjectCreationForm from '../../components/ProjectCreationForm';
import SiteVisitRequestForm from '../../components/SiteVisitRequestForm';
import ShowroomVisitRequestForm from '../../components/ShowroomVisitRequestForm';
import CheckInPhotoModal from '../../components/CheckInPhotoModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import AttendanceCalendarModal from '../../components/AttendanceCalendarModal';

import { getDeviceType } from '../../utils/deviceUtils';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Helper: Request browser notification permission ───────────────────────────
const requestNotifPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
    }
};

const showBrowserNotif = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/logo.png' });
    }
};



const Overview = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { attendance, workLogs, requests, isLoading, isPaused, activeBreak, isRequestsFetched, attendanceHistory } = useSelector((state) => state.employee);

    // Alerts state
    const [breakAlert, setBreakAlert] = useState(false);   // 30-min break overrun
    const [logoutAlert, setLogoutAlert] = useState(false); // 10PM reminder
    const breakTimerRef = useRef(null);
    const logoutTimerRef = useRef(null);

    // UI State
    const [activeTab, setActiveTab] = useState(user?.designation === 'OFFICE-ADMINISTRATION' ? 'leaves' : 'logs');
    const [activeModal, setActiveModal] = useState(null); // 'worklog', 'leave', 'permission', 'project'
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [showBreakModal, setShowBreakModal] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [permissionInitialData, setPermissionInitialData] = useState(null);
    const [isAutoPermission, setIsAutoPermission] = useState(false);
    const [hasCheckedLateness, setHasCheckedLateness] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showCalendarModal, setShowCalendarModal] = useState(false);
    const [selectedCycle, setSelectedCycle] = useState(null);



    // Confirmation Modal State
    const [confirmationConfig, setConfirmationConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'info'
    });

    // ── Request notif permission on mount ──────────────────────────────────────
    useEffect(() => { requestNotifPermission(); }, []);

    // ── Mobile resize ──────────────────────────────────────────────────────────
    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);

    useEffect(() => {
        dispatch(getAttendanceStatus());
        // Initial getMyWorkLogs and getMyRequests handled by MonthCycleSelector
        return () => { dispatch(reset()); };
    }, [dispatch]);

    const handleCycleChange = (range) => {
        const params = {
            startDate: range.startDate,
            endDate: range.endDate
        };
        setSelectedCycle(range);
        dispatch(getMyWorkLogs(params));
        dispatch(getMyRequests(params));
        dispatch(getAttendanceHistory(params));
    };

    // ── Break overrun alert: 30 min after break starts (TEA / LUNCH only) ─────
    useEffect(() => {
        if (breakTimerRef.current) clearTimeout(breakTimerRef.current);
        setBreakAlert(false);

        if (isPaused && activeBreak && ['TEA', 'LUNCH'].includes(activeBreak.breakType) && activeBreak.startTime) {
            const breakStart = new Date(activeBreak.startTime).getTime();
            const elapsed = Date.now() - breakStart;
            const remaining = 30 * 60 * 1000 - elapsed; // 30 minutes

            if (remaining <= 0) {
                setBreakAlert(true);
                showBrowserNotif('⏰ Break Overrun!', `Your ${activeBreak.breakType.toLowerCase()} break has exceeded 30 minutes. Please resume work.`);
            } else {
                breakTimerRef.current = setTimeout(() => {
                    setBreakAlert(true);
                    showBrowserNotif('⏰ Break Overrun!', `Your ${activeBreak.breakType.toLowerCase()} break has exceeded 30 minutes. Please resume work.`);
                }, remaining);
            }
        }
        return () => { if (breakTimerRef.current) clearTimeout(breakTimerRef.current); };
    }, [isPaused, activeBreak]);

    // ── Logout Reminder at 10 PM ──────────────────────────────────────────────
    useEffect(() => {
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
        setLogoutAlert(false);

        if (attendance?.status === 'PRESENT' && !attendance?.checkoutTime) {
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
    }, [attendance]);

    const checkLatenessAndRedirect = (checkInTimeRaw, isAuto = false) => {
        // Exempt AE (Area Engineers) from this restriction
        if (user?.designation === 'AE') return;

        const checkInTime = new Date(checkInTimeRaw);
        const hours = checkInTime.getHours();
        const minutes = checkInTime.getMinutes();

        // 10:30 AM = 10 * 60 + 30 = 630 minutes
        if (hours * 60 + minutes > 630) {
            // Check if user already has a valid permission or approved leave for this time
            const todayLocal = checkInTime.toLocaleDateString('en-CA');

            // 1. Check for ANY permission (Pending/Approved) for today
            const hasExistingPermission = requests?.permissions?.some(p => {
                const pDate = new Date(p.date).toLocaleDateString('en-CA');
                return pDate === todayLocal;
            });

            // 2. Check for ANY approved leave for today
            const hasApprovedLeave = requests?.leaves?.some(l => {
                const lStart = new Date(l.startDate).toLocaleDateString('en-CA');
                const lEnd = new Date(l.endDate).toLocaleDateString('en-CA');
                return l.status === 'APPROVED' && todayLocal >= lStart && todayLocal <= lEnd;
            });

            if (hasExistingPermission || hasApprovedLeave) {
                console.log('Skipping mandatory permission: Existing request or approved leave found for today.');
                return;
            }

            // Use local date (YYYY-MM-DD format for input[type="date"])
            const date = checkInTime.toLocaleDateString('en-CA');

            const formatTime = (dateObj) => {
                let h = dateObj.getHours();
                const m = dateObj.getMinutes().toString().padStart(2, '0');
                const ampm = h >= 12 ? 'PM' : 'AM';
                h = h % 12;
                h = h ? h : 12; // the hour '0' should be '12'
                return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
            };

            const startTime = formatTime(checkInTime);

            const endTimeObj = new Date(checkInTime.getTime() + 2 * 60 * 60 * 1000);
            const endTime = formatTime(endTimeObj);

            setPermissionInitialData({
                date,
                startTime,
                endTime,
                reason: 'Late Check-In (After 10:30 AM)'
            });
            setIsAutoPermission(isAuto);
            setActiveModal('permission');
        }
    };

    // Robust Lateness Check
    useEffect(() => {
        if (attendance?.status === 'PRESENT' && isRequestsFetched && activeModal !== 'permission' && user?.designation !== 'AE' && !hasCheckedLateness) {
            checkLatenessAndRedirect(attendance.date, true);
            setHasCheckedLateness(true);
        }
    }, [attendance, isRequestsFetched, activeModal, user, hasCheckedLateness]);

    const executeAttendanceAction = (actionName) => {
        const deviceInfo = navigator.userAgent;
        const deviceType = getDeviceType();
        const formData = new FormData();
        formData.append('deviceInfo', `${deviceType.toUpperCase()} | ${deviceInfo}`);

        if (attendance?.status === 'PRESENT' && !attendance.checkoutTime) {
            // Check-Out Logic
            if (user?.designation === 'AE') {
                setIsCheckingOut(true);
                setShowCheckInModal(true);
            } else {
                dispatch(checkoutAttendance(formData)).then(() => dispatch(getAttendanceStatus()));
            }
        } else {
            // Check-In Logic
            if (user?.designation === 'AE') {
                setIsCheckingOut(false);
                setShowCheckInModal(true);
            } else {
                dispatch(markAttendance(formData)).then((res) => {
                    if (!res.error) {
                        dispatch(getAttendanceStatus());
                        // Auto-redirect if late
                        const checkInDate = res.payload?.date ? new Date(res.payload.date) : new Date();
                        checkLatenessAndRedirect(checkInDate, true);
                    } else {
                        alert(res.payload || "Check-in failed. You might be already checked in.");
                    }
                });
            }
        }
    };

    const handleMarkAttendance = () => {
        if (isMobile && user?.designation !== 'AE') {
            alert('Mobile Check-In is restricted to AE. Please use a Desktop.');
            return;
        }

        // Determine action name for confirmation
        let actionName = 'Log In';
        if (attendance?.status === 'PRESENT' && !attendance.checkoutTime) {
            actionName = user?.designation === 'AE' ? 'Check Out' : 'Log Out';
        } else {
            actionName = user?.designation === 'AE' ? 'Check In' : 'Log In';
        }

        const isLogin = ['Log In', 'Check In'].includes(actionName);
        const isAE = user?.designation === 'AE';

        let message;
        if (isAE && isLogin) {
            message = (
                <div className="mt-2 text-left">
                    <p className="text-slate-600 font-bold mb-4">Before you continue, please confirm:</p>
                    <ul className="space-y-3 text-slate-700 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <li className="flex items-start gap-3">
                            <span className="text-emerald-500 font-bold">✔</span>
                            <span>You are present at the project site</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-emerald-500 font-bold">✔</span>
                            <span>Your work session is starting now</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-emerald-500 font-bold">✔</span>
                            <span>You are ready to begin your assigned site tasks</span>
                        </li>
                    </ul>
                    <p className="text-xs text-slate-400 mt-4 italic">
                        By clicking Start, you confirm that you are officially starting your site work.
                    </p>
                </div>
            );
        } else if (isLogin) {
            message = (
                <div className="mt-2 text-center">
                    <p className="text-lg font-bold text-emerald-600 mb-4">
                        Before you continue, make sure:
                    </p>
                    <ul className="space-y-3 text-slate-600 text-base text-left inline-block mx-auto px-4 bg-slate-50 py-3 rounded-xl border border-slate-100">
                        <li className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                                <span className="font-bold text-sm">✓</span>
                            </div>
                            <span className="font-medium">You are using a Desktop / Laptop</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                                <span className="font-bold text-sm">✓</span>
                            </div>
                            <span className="font-medium">Your work session is starting now</span>
                        </li>
                    </ul>
                </div>
            );
        } else {
            message = `Are you sure you want to ${actionName}? This will record your ${actionName.toLowerCase()} time.`;
        }

        setConfirmationConfig({
            isOpen: true,
            title: isAE && isLogin ? 'Start Work Confirmation' : (isLogin ? 'Start Work Confirmation' : `Confirm ${actionName}`),
            message: message,
            type: isLogin ? 'info' : 'warning',
            confirmText: isAE && isLogin ? 'Start Work' : `Yes, ${actionName}`,
            onConfirm: () => executeAttendanceAction(actionName)
        });
    };

    const handlePhotoCheckIn = (photoFile) => {
        const formData = new FormData();
        formData.append('photo', photoFile);
        formData.append('deviceInfo', `${getDeviceType().toUpperCase()} | ${navigator.userAgent}`);

        const action = isCheckingOut ? checkoutAttendance(formData) : markAttendance(formData);

        dispatch(action).then((res) => {
            if (!res.error) {
                setShowCheckInModal(false);
                dispatch(getAttendanceStatus());
                // Auto-redirect if late and it was a check-in
                if (!isCheckingOut) {
                    const checkInDate = res.payload?.date ? new Date(res.payload.date) : new Date();
                    checkLatenessAndRedirect(checkInDate, true);
                }
            } else {
                alert(res.payload || "Action failed.");
            }
        });
    };

    const handleBreakSelect = (breakType) => {
        // Close break modal first
        setShowBreakModal(false);

        const breakLabels = {
            'TEA': 'Tea Break',
            'LUNCH': 'Lunch Break',
            'CLIENT_MEETING': 'Client Meeting',
            'BH_MEETING': 'BH Meeting'
        };

        const label = breakLabels[breakType] || 'Break';

        setConfirmationConfig({
            isOpen: true,
            title: `Confirm ${label}`,
            message: `Are you sure you want to start ${label}?`,
            type: 'info',
            confirmText: `Start ${label}`,
            onConfirm: () => {
                dispatch(pauseAttendance({ breakType })).then((res) => {
                    if (!res.error) {
                        dispatch(getAttendanceStatus());
                    }
                });
            }
        });
    };

    const handleResume = () => {
        dispatch(resumeAttendance()).then((res) => {
            if (!res.error) {
                dispatch(getAttendanceStatus());
            }
        });
    };

    const closeModal = () => {
        setActiveModal(null);
        setPermissionInitialData(null);
        setIsAutoPermission(false);
    };

    const renderWorkLogForm = () => {
        switch (user?.designation) {
            case 'CRE':
                return <CREWorkLogForm onSuccess={closeModal} />;
            case 'FA':
                return <FAWorkLogForm onSuccess={closeModal} />;
            case 'AE': // Added AE Case
                return <AEWorkLogForm onSuccess={closeModal} />;

            default:
                // Check for new roles in config
                if (user?.designation && WORK_LOG_CONFIG[user.designation]) {
                    return <DynamicWorkLogForm role={user.designation} onSuccess={closeModal} />;
                }

                // Fallback for LA or legacy
                if (user?.designation === 'LA' || !user?.designation) {
                    if (user?.designation === 'LA') {
                        return <LAWorkLogForm onSuccess={closeModal} />;
                    }
                    return <WorkLogForm onSuccess={closeModal} />;
                }
                return <WorkLogForm onSuccess={closeModal} />;
        }
    };

    // derived
    const isCheckedIn = attendance?.status === 'PRESENT' && !attendance?.checkoutTime;
    const isCheckedOut = !!attendance?.checkoutTime;
    const pendingCount = (requests?.leaves?.filter(l => l.status === 'PENDING').length || 0) + (requests?.permissions?.filter(p => p.status === 'PENDING').length || 0);
    const greetHour = new Date().getHours();
    const greeting = greetHour < 12 ? 'Good Morning' : greetHour < 17 ? 'Good Afternoon' : 'Good Evening';

    const quickActions = [
        user?.designation !== 'OFFICE-ADMINISTRATION' && { id: 'worklog', label: 'Log Work', sub: `${user?.designation || 'General'} Report`, icon: '📝', color: 'from-blue-500 to-indigo-600' },
        { id: 'leave', label: 'Request Leave', sub: 'Full / Half Day', icon: '🏖️', color: 'from-orange-400 to-amber-500' },
        { id: 'permission', label: 'Permission', sub: 'Late / Early exit', icon: '🕑', color: 'from-violet-500 to-purple-600' },
        ['LA', 'FA', 'AE', 'AE MANAGER', 'ADMIN'].includes(user?.designation) && { id: 'project', label: 'Create Project', sub: 'New assignment', icon: '🚀', color: 'from-emerald-500 to-teal-600' },
        { id: 'site-visit', label: 'Site Visit', sub: 'Update visit log', icon: '🏗️', color: 'from-green-500 to-emerald-600' },
        { id: 'showroom-visit', label: 'Showroom Visit', sub: 'Cross-showroom move', icon: '🏢', color: 'from-indigo-500 to-blue-600' },
    ].filter(Boolean);

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Modals */}
            {activeModal && (
                <Modal title={
                    activeModal === 'worklog' ? 'Submit Daily Work Log' :
                        activeModal === 'leave' ? 'Request Leave' :
                            activeModal === 'permission' ? (isAutoPermission ? 'Mandatory Permission Request' : 'Request Permission') :
                                activeModal === 'site-visit' ? 'Update Site Visit' :
                                    activeModal === 'showroom-visit' ? 'Showroom Visit' : 'Create New Project'
                } onClose={closeModal}
                    showClose={!isAutoPermission}
                    closeOnClickOutside={!isAutoPermission}>
                    {activeModal === 'worklog' && renderWorkLogForm()}
                    {activeModal === 'leave' && <LeaveRequestForm onSuccess={closeModal} />}
                    {activeModal === 'permission' && <PermissionRequestForm onSuccess={closeModal} initialData={permissionInitialData} isMandatory={isAutoPermission} />}
                    {activeModal === 'site-visit' && <SiteVisitRequestForm onSuccess={closeModal} />}
                    {activeModal === 'showroom-visit' && <ShowroomVisitRequestForm onSuccess={closeModal} />}
                    {activeModal === 'project' && <ProjectCreationForm onSuccess={closeModal} />}
                </Modal>
            )}

            <CheckInPhotoModal isOpen={showCheckInModal} onClose={() => setShowCheckInModal(false)} onSubmit={handlePhotoCheckIn} isLoading={isLoading} isCheckingOut={isCheckingOut} />

            <BreakSelectionModal
                isOpen={showBreakModal}
                onClose={() => setShowBreakModal(false)}
                onSelect={handleBreakSelect}
            />

            <ConfirmationModal
                isOpen={confirmationConfig.isOpen}
                onClose={() => setConfirmationConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmationConfig.onConfirm}
                title={confirmationConfig.title}
                message={confirmationConfig.message}
                type={confirmationConfig.type}
                confirmText={confirmationConfig.confirmText}
            />

            <AttendanceCalendarModal
                isOpen={showCalendarModal}
                onClose={() => setShowCalendarModal(false)}
                cycleData={selectedCycle}
                attendanceHistory={attendanceHistory}
                leaves={requests?.leaves}
                permissions={requests?.permissions}
            />

            {/* ── Smart Alert Banners ─────────────────────────────────────── */}
            <AnimatePresence>
                {breakAlert && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        className="bg-amber-500 text-white px-5 py-3 rounded-2xl flex items-center justify-between shadow-lg shadow-amber-200 mb-4">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl animate-bounce">⏰</span>
                            <div>
                                <p className="font-black text-sm">Break Overrun — 30 minutes exceeded!</p>
                                <p className="text-amber-100 text-xs">Your {activeBreak?.breakType?.toLowerCase() || ''} break is past 30 minutes. Please resume work.</p>
                            </div>
                        </div>
                        <button onClick={() => setBreakAlert(false)} className="text-amber-100 hover:text-white ml-4 text-lg font-bold">✕</button>
                    </motion.div>
                )}
                {logoutAlert && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        className="bg-red-600 text-white px-5 py-3 rounded-2xl flex items-center justify-between shadow-lg shadow-red-200 mb-4">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl animate-pulse">🚨</span>
                            <div>
                                <p className="font-black text-sm">It's past 10 PM — Don't forget to Check Out!</p>
                                <p className="text-red-100 text-xs">Please tap the Check Out button before leaving for the day.</p>
                            </div>
                        </div>
                        <button onClick={() => setLogoutAlert(false)} className="text-red-100 hover:text-white ml-4 text-lg font-bold">✕</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Hero Header ────────────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-7 shadow-2xl">
                <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-5">
                    <div>
                        <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-1">{greeting} 👋</p>
                        <h2 className="text-3xl md:text-4xl font-black text-white mb-1 tracking-tight">
                            {user?.name?.split(' ')[0]}
                        </h2>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-xs px-3 py-1 rounded-full font-bold">{user?.designation || '—'}</span>
                            <span className="text-slate-500 text-xs">•</span>
                            <span className="text-slate-400 text-xs">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                        </div>
                    </div>


                    {/* Month Selector on the right corner */}
                    <div className="shrink-0 scale-90 sm:scale-100 origin-right">
                        <MonthCycleSelector onCycleChange={handleCycleChange} onCardClick={() => setShowCalendarModal(true)} />
                    </div>
                </div>
            </motion.div>

            {/* ── Main Grid ──────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Attendance Card (My Status) ──────────────────────── */}
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                    className={`lg:col-span-1 rounded-[2.5rem] p-8 text-white shadow-2xl flex flex-col justify-between relative overflow-hidden min-h-[340px] border border-white/10
                        ${isCheckedOut ? 'bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 shadow-emerald-200/50'
                            : isCheckedIn ? 'bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 shadow-indigo-200/50'
                                : 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 shadow-slate-200/50'}`}>

                    {/* Glassmorphic decorative elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

                    <div className="relative z-10 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em]">Live Status</span>
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border 
                                ${isCheckedOut ? 'bg-white/10 border-white/20 text-white'
                                    : isCheckedIn ? 'bg-emerald-400 text-emerald-950 border-emerald-300'
                                        : 'bg-white/10 border-white/20 text-white/70'}`}>
                                <motion.div
                                    animate={isCheckedIn && !isPaused ? { scale: [1, 1.3, 1], opacity: [1, 0.5, 1] } : {}}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className={`w-2 h-2 rounded-full ${isCheckedOut ? 'bg-white' : isCheckedIn ? (isPaused ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-white/40'}`}
                                />
                                {isCheckedOut ? 'Shift Ended' : isCheckedIn ? (isPaused ? 'On Break' : 'Work Session Active') : 'System Idle'}
                            </div>
                        </div>

                        <div className="mb-auto">
                            <h3 className="text-4xl font-black tracking-tight mb-4 leading-tight">
                                {isCheckedOut ? 'Shift Ended' : isCheckedIn ? 'Logged In' : 'Sign In To Start'}
                            </h3>

                            <div className="space-y-3">
                                {isCheckedIn && (
                                    <>
                                        <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 group hover:bg-white/10 transition-colors">
                                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl shadow-inner">🕒</div>
                                            <div>
                                                <p className="text-white/50 text-[10px] font-black uppercase tracking-widest">Entry Time</p>
                                                <p className="text-lg font-black">{new Date(attendance.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>

                                        {isPaused && activeBreak && (
                                            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                                                className="flex items-center gap-3 bg-amber-400/20 backdrop-blur-sm border border-amber-400/30 rounded-2xl p-4">
                                                <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center text-xl shadow-inner">
                                                    {activeBreak.breakType === 'TEA' ? '�' : activeBreak.breakType === 'LUNCH' ? '🍱' : '�'}
                                                </div>
                                                <div>
                                                    <p className="text-amber-200/70 text-[10px] font-black uppercase tracking-widest">Ongoing Break</p>
                                                    <p className="text-amber-100 font-black">{activeBreak.breakType?.split('_').join(' ')}</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </>
                                )}

                                {isCheckedOut && (
                                    <>
                                        <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl shadow-inner">🏁</div>
                                            <div>
                                                <p className="text-white/50 text-[10px] font-black uppercase tracking-widest">Exit Time</p>
                                                <p className="text-lg font-black">{new Date(attendance.checkoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 bg-emerald-400/10 backdrop-blur-sm border border-emerald-400/20 rounded-2xl p-4">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-400/20 flex items-center justify-center text-xl shadow-inner text-emerald-300">⚡</div>
                                            <div>
                                                <p className="text-emerald-200/70 text-[10px] font-black uppercase tracking-widest">Total Duration</p>
                                                <p className="text-emerald-50 font-black tracking-tight">
                                                    {Math.abs((new Date(attendance.checkoutTime) - new Date(attendance.date)) / (1000 * 60 * 60)).toFixed(1)} <span className="text-xs">HRS</span>
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {!attendance && !isCheckedIn && !isCheckedOut && (
                                    <p className="text-white/40 text-xs font-bold bg-black/5 rounded-xl p-4 border border-white/5 italic">
                                        ✨ Your today's work journey starts here.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* CTA Button Actions */}
                        <div className="mt-8">
                            {!isCheckedIn && !isCheckedOut ? (
                                <motion.button
                                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    onClick={handleMarkAttendance} disabled={isLoading}
                                    className={`w-full py-5 rounded-2xl font-black text-sm shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)] transition-all flex items-center justify-center gap-3
                                        ${isMobile && user?.designation !== 'AE' ? 'bg-white/10 cursor-not-allowed text-slate-300' : 'bg-white text-slate-900 hover:shadow-white/20'}`}>
                                    {isMobile && user?.designation !== 'AE' ? <><span>🔒</span> Desktop Only</> : <><span>👆</span> TAP TO SIGN IN</>}
                                </motion.button>
                            ) : isCheckedIn ? (
                                <div className="flex flex-col gap-3">
                                    {isPaused ? (
                                        <motion.button
                                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                            onClick={handleResume} disabled={isLoading}
                                            className="w-full py-4 rounded-2xl font-black text-sm bg-amber-500 hover:bg-amber-400 text-white shadow-lg flex items-center justify-center gap-3 shadow-amber-900/40">
                                            <span>▶️</span> RESUME WORK
                                        </motion.button>
                                    ) : (
                                        <motion.button
                                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                            onClick={() => setShowBreakModal(true)} disabled={isLoading}
                                            className="w-full py-4 rounded-2xl font-black text-sm bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center justify-center gap-3 shadow-xl">
                                            <span>☕</span> TAKE A BREAK
                                        </motion.button>
                                    )}
                                    <div className="flex items-center gap-4 py-1">
                                        <div className="h-[1px] flex-1 bg-white/10"></div>
                                        <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.3em]">OR</span>
                                        <div className="h-[1px] flex-1 bg-white/10"></div>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                        onClick={handleMarkAttendance} disabled={isLoading}
                                        className="w-full py-4 rounded-2xl font-black text-sm bg-black/20 hover:bg-black/40 text-white border border-white/5 flex items-center justify-center gap-3 shadow-lg">
                                        <span>👋</span> CHECK OUT
                                    </motion.button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="w-full py-4 rounded-2xl text-center text-emerald-100 bg-white/10 text-[10px] font-black uppercase tracking-[0.2em] border border-white/10">
                                        ✓ Cycle Progress Saved
                                    </div>
                                    {user?.designation === 'AE' && (
                                        <motion.button
                                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                            onClick={handleMarkAttendance} disabled={isLoading}
                                            className="w-full bg-white text-emerald-900 font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2"
                                        >
                                            🔄 START NEW SESSION
                                        </motion.button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* ── Right Column ─────────────────────────────────────────── */}
                <div className="lg:col-span-2 flex flex-col gap-5">

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-4">
                        <StatCard title="Work Logs" value={workLogs?.length || 0} icon="📝" color="blue" />
                        <StatCard title="Approved Leaves" value={requests?.leaves?.filter(l => l.status === 'APPROVED').length || 0} icon="🏖️" color="orange" />
                        <StatCard title="Pending" value={pendingCount} icon="⏳" color="purple" />
                    </div>

                    {/* Quick Actions */}
                    <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
                        <h4 className="font-black text-slate-700 text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span>⚡</span> Quick Actions
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
                            {quickActions.map(action => (
                                <motion.button key={action.id} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
                                    onClick={() => { if (action.id === 'permission') setPermissionInitialData(null); setActiveModal(action.id); }}
                                    className="flex flex-col items-start gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-slate-200 transition-all text-left group min-h-[110px]">
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform`}>
                                        {action.icon}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm leading-tight">{action.label}</p>
                                        <p className="text-slate-400 text-[11px] mt-0.5">{action.sub}</p>
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </div>

                </div>
            </div>

            {/* ── Recent Activity Tabs ────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="border-b border-slate-100 flex overflow-x-auto">
                    {(['logs', 'leaves', 'permissions']).filter(t => !(t === 'logs' && user?.designation === 'OFFICE-ADMINISTRATION'))
                        .map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-colors capitalize border-b-2 ${activeTab === tab ? 'text-blue-600 border-blue-500 bg-blue-50/40' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>
                                {tab === 'logs' ? '📋 Work Logs' : tab === 'leaves' ? '🏖️ Leaves' : '🕑 Permissions'}
                            </button>
                        ))}
                </div>

                <div className="p-6">
                    {/* Work Logs Tab */}
                    {activeTab === 'logs' && (
                        <div className="space-y-3">
                            {!workLogs || workLogs.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <p className="text-5xl mb-3">📭</p>
                                    <p className="font-medium">No work logs yet</p>
                                    <p className="text-xs mt-1">Tap "Log Work" above to submit your first report</p>
                                </div>
                            ) : workLogs.map(log => (
                                <div key={log.id} className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                                    <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm">
                                        <span className="text-slate-400 text-[10px] font-normal">{new Date(log.date).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</span>
                                        <span className="text-slate-800 text-sm leading-none">{new Date(log.date).getDate()}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-2">
                                            <h4 className="font-bold text-slate-800 truncate text-sm">{log.clientName || log.projectName || 'Work Log'}</h4>
                                            {log.hours && <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex-shrink-0">{log.hours}h</span>}
                                        </div>
                                        <p className="text-slate-500 text-xs mt-0.5 truncate">{log.process || log.tasks || log.cre_callBreakdown || 'Detailed Report'}</p>
                                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                            {log.imageCount && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">📸 {log.imageCount} imgs</span>}
                                            {log.cre_totalCalls && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">📞 {log.cre_totalCalls} calls</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Leaves Tab */}
                    {activeTab === 'leaves' && (
                        <div className="space-y-2">
                            {!requests?.leaves || requests.leaves.length === 0 ? (
                                <p className="text-center text-slate-400 italic py-10">No leave requests found.</p>
                            ) : requests.leaves.map(req => (
                                <div key={req.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-lg">🏖️</div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{new Date(req.startDate).toLocaleDateString()} — {new Date(req.endDate).toLocaleDateString()}</p>
                                            <p className="text-xs text-slate-400">{req.type} · "{req.reason}"</p>
                                        </div>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-black flex-shrink-0 ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : req.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{req.status}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Permissions Tab */}
                    {activeTab === 'permissions' && (
                        <div className="space-y-2">
                            {!requests?.permissions || requests.permissions.length === 0 ? (
                                <p className="text-center text-slate-400 italic py-10">No permission requests found.</p>
                            ) : requests.permissions.map(req => (
                                <div key={req.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center text-lg">🕑</div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{new Date(req.date).toLocaleDateString()} · {req.startTime} – {req.endTime}</p>
                                            <p className="text-xs text-slate-400">"{req.reason}"</p>
                                        </div>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-black flex-shrink-0 ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : req.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{req.status}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default Overview;
