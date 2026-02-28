import { useEffect, useState, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getAttendanceStatus, markAttendance, checkoutAttendance, getMyWorkLogs, getMyRequests, reset } from '../features/employee/employeeSlice';
import WorkLogForm from '../components/WorkLogForm';
import LAWorkLogForm from '../components/worklogs/LAWorkLogForm';
import CREWorkLogForm from '../components/worklogs/CREWorkLogForm';
import FAWorkLogForm from '../components/worklogs/FAWorkLogForm';
import AEWorkLogForm from '../components/worklogs/AEWorkLogForm';
import CustomerRelationshipWorkLogForm from '../components/worklogs/CustomerRelationshipWorkLogForm';
import DigitalMarketingWorkLogForm from '../components/worklogs/DigitalMarketingWorkLogForm';
import AccountWorkLogForm from '../components/worklogs/AccountWorkLogForm';
import OfficeAdminWorkLogForm from '../components/worklogs/OfficeAdminWorkLogForm';
import LeadOperationWorkLogForm from '../components/worklogs/LeadOperationWorkLogForm';
import LeadConversionWorkLogForm from '../components/worklogs/LeadConversionWorkLogForm';
import VendorManagementWorkLogForm from '../components/worklogs/VendorManagementWorkLogForm';
import ClientCareWorkLogForm from '../components/worklogs/ClientCareWorkLogForm';
import EscalationWorkLogForm from '../components/worklogs/EscalationWorkLogForm';
import ClientFacilitatorWorkLogForm from '../components/worklogs/ClientFacilitatorWorkLogForm';
import LeaveRequestForm from '../components/LeaveRequestForm';
import PermissionRequestForm from '../components/PermissionRequestForm';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import ProjectCreationForm from '../components/ProjectCreationForm';
import SiteVisitRequestForm from '../components/SiteVisitRequestForm';
import ShowroomVisitRequestForm from '../components/ShowroomVisitRequestForm';
import CheckInPhotoModal from '../components/CheckInPhotoModal';
import { getDeviceType } from '../utils/deviceUtils';
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

// ─── Elapsed timer helper ─────────────────────────────────────────────────────
const useElapsedTime = (startIso) => {
    const [elapsed, setElapsed] = useState('');
    useEffect(() => {
        if (!startIso) { setElapsed(''); return; }
        const tick = () => {
            const diffMs = Date.now() - new Date(startIso).getTime();
            const h = Math.floor(diffMs / 3600000);
            const m = Math.floor((diffMs % 3600000) / 60000);
            const s = Math.floor((diffMs % 60000) / 1000);
            setElapsed(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [startIso]);
    return elapsed;
};

// ─── Live clock ───────────────────────────────────────────────────────────────
const useLiveClock = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    return time;
};

const EmployeeDashboard = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { attendance, workLogs, requests, isLoading, isRequestsFetched, activeBreak, isPaused } = useSelector((state) => state.employee);

    // Alerts state
    const [breakAlert, setBreakAlert] = useState(false);   // 30-min break overrun
    const [logoutAlert, setLogoutAlert] = useState(false); // 10PM reminder
    const breakTimerRef = useRef(null);
    const logoutTimerRef = useRef(null);

    // UI state
    const [activeTab, setActiveTab] = useState(user?.designation === 'OFFICE-ADMINISTRATION' ? 'leaves' : 'logs');
    const [activeModal, setActiveModal] = useState(null);
    const [permissionInitialData, setPermissionInitialData] = useState(null);
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [hasCheckedLateness, setHasCheckedLateness] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    const now = useLiveClock();
    const elapsedSinceCheckIn = useElapsedTime(attendance?.status === 'PRESENT' && !attendance?.checkoutTime ? attendance?.date : null);

    // ── Request notif permission on mount ──────────────────────────────────────
    useEffect(() => { requestNotifPermission(); }, []);

    // ── Mobile resize ──────────────────────────────────────────────────────────
    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);

    // ── Fetch data ─────────────────────────────────────────────────────────────
    useEffect(() => {
        dispatch(getAttendanceStatus());
        dispatch(getMyWorkLogs());
        dispatch(getMyRequests());
        return () => { dispatch(reset()); };
    }, [dispatch]);

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

    // ── Lateness check ────────────────────────────────────────────────────────
    const checkLatenessAndRedirect = useCallback((checkInTimeRaw) => {
        const todayLocal = new Date().toLocaleDateString('en-CA');
        const hasPermission = requests?.permissions?.some(p => new Date(p.date).toLocaleDateString('en-CA') === todayLocal);
        if (hasPermission || user?.designation === 'AE') return;

        const checkInTime = new Date(checkInTimeRaw);
        const totalMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
        const hasHalfDay = requests?.leaves?.some(l => {
            if (l.type !== 'HALF_DAY' || l.status === 'REJECTED') return false;
            const lS = new Date(l.startDate).toLocaleDateString('en-CA');
            const lE = new Date(l.endDate).toLocaleDateString('en-CA');
            return todayLocal >= lS && todayLocal <= lE;
        });

        const threshold = hasHalfDay ? 840 : 630;
        const label = hasHalfDay ? '2:00 PM' : '10:30 AM';

        if (totalMinutes > threshold) {
            const date = checkInTime.toLocaleDateString('en-CA');
            const fmt = d => { let h = d.getHours(); const m = d.getMinutes().toString().padStart(2, '0'); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${String(h).padStart(2, '0')}:${m} ${ap}`; };
            setPermissionInitialData({ date, startTime: fmt(checkInTime), endTime: fmt(new Date(checkInTime.getTime() + 7200000)), reason: `Late Check-In (After ${label})` });
            setActiveModal('permission');
        }
    }, [requests, user]);

    useEffect(() => {
        if (attendance?.status === 'PRESENT' && !hasCheckedLateness && isRequestsFetched) {
            checkLatenessAndRedirect(attendance.date);
            setHasCheckedLateness(true);
        }
    }, [attendance, isRequestsFetched, hasCheckedLateness, checkLatenessAndRedirect]);

    // ── Attendance actions ────────────────────────────────────────────────────
    const handleMarkAttendance = () => {
        if (isMobile && user?.designation !== 'AE') { alert('Mobile Check-In is restricted to AE. Please use a Desktop.'); return; }
        if (attendance?.status === 'PRESENT' && !attendance.checkoutTime) {
            if (user?.designation === 'AE') { setIsCheckingOut(true); setShowCheckInModal(true); }
            else {
                const fd = new FormData();
                fd.append('deviceInfo', `${getDeviceType().toUpperCase()} | ${navigator.userAgent}`);
                dispatch(checkoutAttendance(fd)).then(() => dispatch(getAttendanceStatus()));
            }
        } else {
            if (user?.designation === 'AE') { setIsCheckingOut(false); setShowCheckInModal(true); }
            else {
                dispatch(markAttendance()).then(res => {
                    if (!res.error) { dispatch(getAttendanceStatus()); checkLatenessAndRedirect(res.payload?.date ? new Date(res.payload.date) : new Date()); }
                    else alert(res.payload || 'Check-in failed.');
                });
            }
        }
    };

    const handlePhotoCheckIn = (photoFile) => {
        const fd = new FormData();
        fd.append('photo', photoFile);
        dispatch(isCheckingOut ? checkoutAttendance(fd) : markAttendance(fd)).then(res => {
            if (!res.error) { setShowCheckInModal(false); dispatch(getAttendanceStatus()); if (!isCheckingOut) checkLatenessAndRedirect(res.payload?.date ? new Date(res.payload.date) : new Date()); }
        });
    };

    const closeModal = () => { setActiveModal(null); setPermissionInitialData(null); };

    // ── Work log form switcher ────────────────────────────────────────────────
    const renderWorkLogForm = () => {
        switch (user?.designation) {
            case 'CRE': return <CREWorkLogForm onSuccess={closeModal} />;
            case 'FA': return <FAWorkLogForm onSuccess={closeModal} />;
            case 'AE': return <AEWorkLogForm onSuccess={closeModal} />;
            case 'CUSTOMER-RELATIONSHIP': return <CustomerRelationshipWorkLogForm onSuccess={closeModal} />;
            case 'DIGITAL-MARKETING': return <DigitalMarketingWorkLogForm onSuccess={closeModal} />;
            case 'ACCOUNT': return <AccountWorkLogForm onSuccess={closeModal} />;
            case 'OFFICE-ADMINISTRATION': return <OfficeAdminWorkLogForm onSuccess={closeModal} />;
            case 'LEAD-OPERATION': return <LeadOperationWorkLogForm onSuccess={closeModal} />;
            case 'LEAD-CONVERSION': return <LeadConversionWorkLogForm onSuccess={closeModal} />;
            case 'VENDOR-MANAGEMENT': return <VendorManagementWorkLogForm onSuccess={closeModal} />;
            case 'CLIENT-CARE': return <ClientCareWorkLogForm onSuccess={closeModal} />;
            case 'ESCALATION': return <EscalationWorkLogForm onSuccess={closeModal} />;
            case 'CLIENT-FACILITATOR': return <ClientFacilitatorWorkLogForm onSuccess={closeModal} />;
            case 'LA': return <LAWorkLogForm onSuccess={closeModal} />;
            default: return <WorkLogForm onSuccess={closeModal} />;
        }
    };

    // derived
    const isCheckedIn = attendance?.status === 'PRESENT' && !attendance?.checkoutTime;
    const isCheckedOut = !!attendance?.checkoutTime;
    const pendingCount = (requests.leaves.filter(l => l.status === 'PENDING').length) + (requests.permissions.filter(p => p.status === 'PENDING').length);
    const greetHour = now.getHours();
    const greeting = greetHour < 12 ? 'Good Morning' : greetHour < 17 ? 'Good Afternoon' : 'Good Evening';

    const quickActions = [
        user?.designation !== 'OFFICE-ADMINISTRATION' && { id: 'worklog', label: 'Log Work', sub: `${user?.designation || 'General'} Report`, icon: '📝', color: 'from-blue-500 to-indigo-600' },
        { id: 'leave', label: 'Request Leave', sub: 'Full / Half Day', icon: '🏖️', color: 'from-orange-400 to-amber-500' },
        { id: 'permission', label: 'Permission', sub: 'Late / Early exit', icon: '🕑', color: 'from-violet-500 to-purple-600' },
        ['LA', 'AE', 'AE MANAGER', 'ADMIN'].includes(user?.designation) && { id: 'project', label: 'Create Project', sub: 'New assignment', icon: '🚀', color: 'from-emerald-500 to-teal-600' },
        { id: 'site-visit', label: 'Site Visit', sub: 'Update visit log', icon: '🏗️', color: 'from-green-500 to-emerald-600' },
        { id: 'showroom-visit', label: 'Showroom Visit', sub: 'Cross-showroom move', icon: '🏢', color: 'from-indigo-500 to-blue-600' },
    ].filter(Boolean);

    return (
        <div className="space-y-6 pb-20">
            {/* Modals */}
            {activeModal && (
                <Modal title={
                    activeModal === 'worklog' ? 'Submit Daily Work Log' :
                        activeModal === 'leave' ? 'Request Leave' :
                            activeModal === 'permission' ? 'Request Permission' :
                                activeModal === 'site-visit' ? 'Update Site Visit' :
                                    activeModal === 'showroom-visit' ? 'Showroom Visit' : 'Create New Project'
                } onClose={closeModal}>
                    {activeModal === 'worklog' && renderWorkLogForm()}
                    {activeModal === 'leave' && <LeaveRequestForm onSuccess={closeModal} />}
                    {activeModal === 'permission' && <PermissionRequestForm onSuccess={closeModal} initialData={permissionInitialData} />}
                    {activeModal === 'site-visit' && <SiteVisitRequestForm onSuccess={closeModal} />}
                    {activeModal === 'showroom-visit' && <ShowroomVisitRequestForm onSuccess={closeModal} />}
                    {activeModal === 'project' && <ProjectCreationForm onSuccess={closeModal} />}
                </Modal>
            )}

            <CheckInPhotoModal isOpen={showCheckInModal} onClose={() => setShowCheckInModal(false)} onSubmit={handlePhotoCheckIn} isLoading={isLoading} isCheckingOut={isCheckingOut} />

            {/* ── Smart Alert Banners ─────────────────────────────────────── */}
            <AnimatePresence>
                {breakAlert && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        className="bg-amber-500 text-white px-5 py-3 rounded-2xl flex items-center justify-between shadow-lg shadow-amber-200">
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
                        className="bg-red-600 text-white px-5 py-3 rounded-2xl flex items-center justify-between shadow-lg shadow-red-200">
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
                        <h2 className="text-3xl md:text-4xl font-black text-white mb-1 tracking-tight">{user?.name?.split(' ')[0]}</h2>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-xs px-3 py-1 rounded-full font-bold">{user?.designation || '—'}</span>
                            <span className="text-slate-500 text-xs">•</span>
                            <span className="text-slate-400 text-xs">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                        </div>
                    </div>

                    {/* Live clock */}

                </div>
            </motion.div>

            {/* ── Main Grid ──────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Attendance Card ──────────────────────────────────────── */}
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                    className={`lg:col-span-1 rounded-3xl p-7 text-white shadow-xl flex flex-col justify-between relative overflow-hidden min-h-[300px]
                        ${isCheckedOut ? 'bg-gradient-to-br from-emerald-700 to-teal-900'
                            : isCheckedIn ? 'bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900'
                                : 'bg-gradient-to-br from-slate-800 to-slate-900'}`}>
                    <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-white/60 text-xs font-bold uppercase tracking-widest">My Status</p>
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border
                                ${isCheckedOut ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-200'
                                    : isCheckedIn ? 'bg-blue-400/20 border-blue-300/30 text-blue-200'
                                        : 'bg-slate-500/20 border-slate-400/30 text-slate-300'}`}>
                                <div className={`w-2 h-2 rounded-full ${isCheckedOut ? 'bg-emerald-400' : isCheckedIn ? 'bg-blue-300 animate-pulse' : 'bg-slate-400'}`} />
                                {isCheckedOut ? 'Done for Today' : isCheckedIn ? 'Active' : 'Offline'}
                            </div>
                        </div>

                        <h3 className="text-4xl font-black tracking-tight mb-3">
                            {isCheckedOut ? 'Signed Off' : isCheckedIn ? 'Checked In' : 'Not Active'}
                        </h3>

                        {isCheckedIn && (
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2">
                                    <span>🕒</span>
                                    <span className="text-sm font-medium">In at <span className="font-black">{new Date(attendance.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></span>
                                </div>
                                {/* Live elapsed timer */}
                                <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2">
                                    <span>⏱️</span>
                                    <span className="font-mono font-black text-lg tracking-widest">{elapsedSinceCheckIn}</span>
                                    <span className="text-white/50 text-xs">elapsed</span>
                                </div>
                                {/* Break status */}
                                {isPaused && activeBreak && (
                                    <div className="flex items-center gap-2 bg-amber-400/20 border border-amber-400/30 rounded-xl px-4 py-2">
                                        <span>{activeBreak.breakType === 'TEA' ? '🍵' : activeBreak.breakType === 'LUNCH' ? '🍱' : '💼'}</span>
                                        <span className="text-amber-200 text-sm font-bold">{activeBreak.breakType?.replace('_', ' ')} in progress</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {isCheckedOut && (
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2">
                                    <span>🏁</span>
                                    <span className="text-sm font-medium">Out at <span className="font-black">{new Date(attendance.checkoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2">
                                    <span>⚡</span>
                                    <span className="text-sm font-medium">
                                        Total: <span className="font-black">
                                            {Math.abs((new Date(attendance.checkoutTime) - new Date(attendance.date)) / (1000 * 60 * 60)).toFixed(1)} HRS
                                        </span>
                                    </span>
                                </div>
                                <p className="text-emerald-200 text-xs text-center py-1">✨ Great work today!</p>
                            </div>
                        )}

                        {!attendance && <p className="text-white/50 text-sm">You haven't marked your attendance yet.</p>}
                    </div>

                    {/* CTA Button */}
                    <div className="relative z-10 mt-4">
                        {!isCheckedIn && !isCheckedOut ? (
                            <button onClick={handleMarkAttendance} disabled={isLoading}
                                className={`w-full py-4 rounded-2xl font-black text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3
                                    ${isMobile && user?.designation !== 'AE' ? 'bg-white/10 cursor-not-allowed' : 'bg-white text-slate-900 hover:bg-blue-50'}`}>
                                {isMobile && user?.designation !== 'AE' ? <><span>🔒</span> Desktop Only</> : <><span>👆</span> Tap to Check In</>}
                            </button>
                        ) : isCheckedIn ? (
                            <button onClick={handleMarkAttendance} disabled={isLoading}
                                className="w-full py-4 rounded-2xl font-black text-sm bg-white/20 hover:bg-white/30 text-white shadow-lg active:scale-95 flex items-center justify-center gap-3 transition-all border border-white/20">
                                <span>👋</span> Tap to Check Out
                            </button>
                        ) : (
                            <div className="w-full py-3 rounded-2xl text-center text-emerald-200 bg-white/10 text-sm font-bold border border-white/10">
                                ✅ All done for today
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* ── Right Column ─────────────────────────────────────────── */}
                <div className="lg:col-span-2 flex flex-col gap-5">

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-4">
                        <StatCard title="Work Logs" value={workLogs.length} icon="📝" color="blue" />
                        <StatCard title="Approved Leaves" value={requests.leaves.filter(l => l.status === 'APPROVED').length} icon="🏖️" color="orange" />
                        <StatCard title="Pending" value={pendingCount} icon="⏳" color="purple" />
                    </div>

                    {/* Quick Actions */}
                    <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h4 className="font-black text-slate-700 text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span>⚡</span> Quick Actions
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {quickActions.map(action => (
                                <motion.button key={action.id} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
                                    onClick={() => { if (action.id === 'permission') setPermissionInitialData(null); setActiveModal(action.id); }}
                                    className="flex flex-col items-start gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-slate-200 transition-all text-left group">
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
                            {workLogs.length === 0 ? (
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
                            {requests.leaves.length === 0 ? (
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
                            {requests.permissions.length === 0 ? (
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

export default EmployeeDashboard;
