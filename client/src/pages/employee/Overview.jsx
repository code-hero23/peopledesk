import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getAttendanceStatus, markAttendance, checkoutAttendance, getMyWorkLogs, getMyRequests, reset, pauseAttendance, resumeAttendance } from '../../features/employee/employeeSlice';
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
import { getDeviceType } from '../../utils/deviceUtils';

const Overview = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { attendance, workLogs, requests, isLoading, isPaused, activeBreak } = useSelector((state) => state.employee);

    // UI State
    const [activeModal, setActiveModal] = useState(null); // 'worklog', 'leave', 'permission', 'project'
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [showBreakModal, setShowBreakModal] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [laFormType, setLaFormType] = useState('detailed'); // 'standard' or 'detailed' for LA role
    const [permissionInitialData, setPermissionInitialData] = useState(null);
    const [hasCheckedLateness, setHasCheckedLateness] = useState(false);


    // Confirmation Modal State
    const [confirmationConfig, setConfirmationConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'info'
    });

    useEffect(() => {
        dispatch(getAttendanceStatus());
        dispatch(getMyWorkLogs());
        dispatch(getMyRequests());
        return () => { dispatch(reset()); };
    }, [dispatch]);

    const checkLatenessAndRedirect = (checkInTimeRaw) => {
        console.log('checkLatenessAndRedirect called with:', checkInTimeRaw);
        // Exempt AE (Area Engineers) from this restriction
        if (user?.designation === 'AE') {
            console.log('Exempting AE from redirection');
            return;
        }

        const checkInTime = new Date(checkInTimeRaw);
        const hours = checkInTime.getHours();
        const minutes = checkInTime.getMinutes();
        console.log(`Check-in Time detected: ${hours}:${minutes}`);

        // 10:30 AM = 10 * 60 + 30 = 630 minutes
        if (hours * 60 + minutes > 630) {
            console.log('Lateness detected (> 10:30 AM). Triggering redirection...');
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

            console.log(`Pre-filling Permission: Date=${date}, Start=${startTime}, End=${endTime}`);

            setPermissionInitialData({
                date,
                startTime,
                endTime,
                reason: 'Late Check-In (After 10:30 AM)'
            });
            setActiveModal('permission');
        } else {
            console.log('Not late enough for auto-permission (< 10:30 AM)');
        }
    };

    // Robust Lateness Check
    useEffect(() => {
        if (attendance?.status === 'PRESENT' && !hasCheckedLateness && requests?.permissions) {
            console.log('--- Robust Lateness Check Triggered ---');
            const todayLocal = new Date().toLocaleDateString('en-CA');

            // Check if permission already exists for today
            const hasPermissionForToday = requests.permissions.some(p => {
                const pDate = new Date(p.date).toLocaleDateString('en-CA');
                return pDate === todayLocal;
            });

            if (!hasPermissionForToday) {
                checkLatenessAndRedirect(attendance.date);
            }
            setHasCheckedLateness(true);
        }
    }, [attendance, requests, hasCheckedLateness, user]);

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
                        const checkInTime = res.payload?.date ? new Date(res.payload.date) : new Date();
                        checkLatenessAndRedirect(checkInTime);
                    } else {
                        alert(res.payload || "Check-in failed. You might be already checked in.");
                    }
                });
            }
        }
    };

    const handleMarkAttendance = () => {
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
                    const checkInTime = res.payload?.date ? new Date(res.payload.date) : new Date();
                    checkLatenessAndRedirect(checkInTime);
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

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Modal Layer */}
            {activeModal && (
                <Modal title={
                    activeModal === 'worklog' ? 'Submit Daily Work Log' :
                        activeModal === 'leave' ? 'Request Leave' :
                            activeModal === 'permission' ? 'Request Permission' :
                                activeModal === 'site-visit' ? 'Update Site Visit' :
                                    activeModal === 'showroom-visit' ? 'Cross-Showroom Visit' :
                                        'Create New Project'
                } onClose={closeModal}>
                    {activeModal === 'worklog' && renderWorkLogForm()}
                    {activeModal === 'leave' && <LeaveRequestForm onSuccess={closeModal} />}
                    {activeModal === 'permission' && <PermissionRequestForm onSuccess={closeModal} initialData={permissionInitialData} />}
                    {activeModal === 'site-visit' && <SiteVisitRequestForm onSuccess={closeModal} />}
                    {activeModal === 'showroom-visit' && <ShowroomVisitRequestForm onSuccess={closeModal} />}
                    {activeModal === 'project' && <ProjectCreationForm onSuccess={closeModal} />}
                </Modal>
            )}

            <CheckInPhotoModal
                isOpen={showCheckInModal}
                onClose={() => setShowCheckInModal(false)}
                onSubmit={handlePhotoCheckIn}
                isLoading={isLoading}
                isCheckingOut={isCheckingOut}
            />

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

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                        Hello, {user?.name.split(' ')[0]} 👋
                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full border border-slate-300 capitalize">
                            {['ADMIN', 'BUSINESS_HEAD', 'HR'].includes(user?.role)
                                ? user?.role.replace('_', ' ').toLowerCase()
                                : (user?.designation || 'No Designation')}
                        </span>
                    </h2>
                    <p className="text-slate-500">Ready to make today count?</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 text-sm font-medium text-slate-600 flex items-center gap-2">
                    <span>📅</span>
                    {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* Main Action Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Attendance Card (Hero) */}
                <div className="lg:col-span-1 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-xl flex flex-col justify-between relative overflow-hidden group min-h-[280px]">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">My Status</p>
                            <div className={`w-3 h-3 rounded-full ${attendance?.status === 'PRESENT' && !attendance?.checkoutTime ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'bg-red-400'}`}></div>
                        </div>
                        <h3 className="text-4xl font-bold mb-4 tracking-tight">
                            {attendance?.status === 'PRESENT' && !attendance?.checkoutTime
                                ? (user?.designation === 'AE' ? 'Checked In' : 'Logged In')
                                : 'Not Active'}
                        </h3>
                        {attendance?.status === 'PRESENT' && !attendance?.checkoutTime ? (
                            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10">
                                <span>🕒</span>
                                <span className="font-mono font-medium">In at {new Date(attendance.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        ) : attendance?.checkoutTime ? (
                            <div className="space-y-2 mt-2">
                                <div className="flex flex-col gap-2 text-sm">
                                    <div className="inline-flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                                        <span>🕒</span>
                                        <span className="font-mono text-slate-200">In: {new Date(attendance.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                                        <span>🏁</span>
                                        <span className="font-mono font-bold">Out: {new Date(attendance.checkoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                                <p className="text-slate-400 text-sm mt-1">
                                    Total: <span className="font-bold text-white tracking-wide">{
                                        Math.abs((new Date(attendance.checkoutTime) - new Date(attendance.date)) / (1000 * 60 * 60)).toFixed(2)
                                    } HRS</span>
                                </p>
                            </div>
                        ) : (
                            <p className="text-slate-400 text-sm">You haven't marked your attendance yet.</p>
                        )}
                    </div>

                    {!attendance ? (
                        <button
                            onClick={handleMarkAttendance}
                            disabled={isLoading}
                            className="relative z-10 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 mt-6 group-hover:shadow-blue-500/25"
                        >
                            <span className="text-xl">👆</span>
                            <span>Tap to {user?.designation === 'AE' ? 'Check In' : 'Log In'}</span>
                        </button>
                    ) : !attendance.checkoutTime ? (
                        <div className="flex flex-col gap-4 mt-8 relative z-10">
                            {isPaused ? (
                                <div className="space-y-4 animate-fade-in">
                                    {/* Paused State Card */}
                                    <div className="relative overflow-hidden bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-6 text-center backdrop-blur-md">
                                        {/* Animated Pulse Background */}
                                        <div className="absolute inset-0 bg-yellow-500/5 animate-pulse rounded-2xl"></div>

                                        <p className="text-yellow-200 text-xs font-bold uppercase tracking-[0.2em] mb-3 relative z-10">Currently Paused</p>

                                        <div className="flex flex-col items-center justify-center gap-3 relative z-10">
                                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 mb-1">
                                                {activeBreak?.breakType === 'TEA' && <span className="text-3xl">☕</span>}
                                                {activeBreak?.breakType === 'LUNCH' && <span className="text-3xl">🍽️</span>}
                                                {activeBreak?.breakType === 'CLIENT_MEETING' && <span className="text-3xl">💼</span>}
                                                {activeBreak?.breakType === 'BH_MEETING' && <span className="text-3xl">👥</span>}
                                            </div>
                                            <div className="text-white font-medium text-lg">
                                                {activeBreak?.breakType === 'TEA' && 'Tea Break'}
                                                {activeBreak?.breakType === 'LUNCH' && 'Lunch Break'}
                                                {activeBreak?.breakType === 'CLIENT_MEETING' && 'Client Meeting'}
                                                {activeBreak?.breakType === 'BH_MEETING' && 'BH Meeting'}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleResume}
                                        disabled={isLoading}
                                        className="w-full group bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-emerald-500/40 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                            <span className="text-lg">▶️</span>
                                        </div>
                                        <span className="text-lg">Resume Work</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Pause Button */}
                                    <button
                                        onClick={() => setShowBreakModal(true)}
                                        disabled={isLoading}
                                        className="w-full group bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 hover:border-white/30"
                                    >
                                        <span className="text-xl group-hover:scale-110 transition-transform">☕</span>
                                        <span className="text-lg">Desk Break</span>
                                    </button>

                                    {/* Divider */}
                                    <div className="flex items-center gap-4">
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                                        <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">OR</span>
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                                    </div>

                                    {/* Check Out Button */}
                                    <button
                                        onClick={handleMarkAttendance}
                                        disabled={isLoading}
                                        className="w-full group bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-orange-500/40 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                                    >
                                        <span className="text-xl group-hover:rotate-12 transition-transform">👋</span>
                                        <span className="text-lg">{user?.designation === 'AE' ? 'Check Out' : 'Log Out'}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="relative z-10 mt-6 space-y-4">
                            <div className="text-emerald-300 font-medium flex items-center gap-2 text-sm bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                                <span className="text-lg">✨</span>
                                <span>Session Completed at {new Date(attendance.checkoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            {/* Allow AE to start a NEW session */}
                            {user?.designation === 'AE' && (
                                <button
                                    onClick={handleMarkAttendance}
                                    disabled={isLoading}
                                    className="w-full bg-blue-500/90 hover:bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <span className="text-lg">🔄</span>
                                    <span>Start New Session</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* Decorative Blob */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500 rounded-full blur-[80px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
                </div>

                {/* Quick Actions & Stats */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Stats Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <StatCard title="Total Reports" value={workLogs.length} icon="📝" color="blue" />
                        <StatCard title="Approved Leaves" value={requests.leaves.filter(l => l.status === 'APPROVED').length} icon="🏖️" color="orange" />
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span>⚡</span> Quick Actions
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 h-full">
                            {(

                                <button
                                    onClick={() => setActiveModal('worklog')}
                                    className="flex flex-col items-center justify-center p-3 md:p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all group min-h-[100px] md:h-[120px]"
                                >
                                    <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">📝</div>
                                    <span className="font-bold text-sm">Daily Report</span>
                                    <span className="text-xs text-slate-400 mt-1">{user?.designation || 'General'} Report</span>
                                </button>
                            )}

                            <button
                                onClick={() => setActiveModal('leave')}
                                className="flex flex-col items-center justify-center p-3 md:p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-all group min-h-[100px] md:h-[120px]"
                            >
                                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">🏖️</div>
                                <span className="font-bold text-sm">Request Leave</span>
                            </button>

                            <button
                                onClick={() => {
                                    setPermissionInitialData(null);
                                    setActiveModal('permission');
                                }}
                                className="flex flex-col items-center justify-center p-3 md:p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600 transition-all group min-h-[100px] md:h-[120px]"
                            >
                                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">🕑</div>
                                <span className="font-bold text-sm">Permission</span>
                            </button>

                            {/* Create Project - LA & AE Only */}
                            {['LA', 'FA', 'AE', 'AE MANAGER', 'ADMIN'].includes(user?.designation) && (
                                <button
                                    onClick={() => setActiveModal('project')}
                                    className="flex flex-col items-center justify-center p-3 md:p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-all group min-h-[100px] md:h-[120px]"
                                >
                                    <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">🚀</div>
                                    <span className="font-bold text-sm">Create Project</span>
                                </button>
                            )}

                            <button
                                onClick={() => setActiveModal('site-visit')}
                                className="flex flex-col items-center justify-center p-3 md:p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-all group min-h-[100px] md:h-[120px]"
                            >
                                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">🏗️</div>
                                <span className="font-bold text-sm">Update Site Visit</span>
                            </button>

                            <button
                                onClick={() => setActiveModal('showroom-visit')}
                                className="flex flex-col items-center justify-center p-3 md:p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all group min-h-[100px] md:h-[120px]"
                            >
                                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">🏢</div>
                                <span className="font-bold text-sm">Cross-Showroom Visit</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default Overview;
