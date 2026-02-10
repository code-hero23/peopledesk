import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getAttendanceStatus, markAttendance, checkoutAttendance, getMyWorkLogs, getMyRequests, reset, pauseAttendance, resumeAttendance } from '../../features/employee/employeeSlice';
import WorkLogForm from '../../components/WorkLogForm';
import LAWorkLogForm from '../../components/worklogs/LAWorkLogForm';
import CREWorkLogForm from '../../components/worklogs/CREWorkLogForm';
import FAWorkLogForm from '../../components/worklogs/FAWorkLogForm';
import AEWorkLogForm from '../../components/worklogs/AEWorkLogForm';
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
import NoticeBoard from '../../components/common/NoticeBoard';
import { motion } from 'framer-motion';

const Overview = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { attendance, workLogs, requests, isLoading, isPaused, activeBreak } = useSelector((state) => state.employee);

    // UI State
    const [activeModal, setActiveModal] = useState(null);
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [showBreakModal, setShowBreakModal] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);

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

    const executeAttendanceAction = (actionName) => {
        const deviceInfo = navigator.userAgent;
        const deviceType = getDeviceType();
        const formData = new FormData();
        formData.append('deviceInfo', `${deviceType.toUpperCase()} | ${deviceInfo}`);

        if (attendance?.status === 'PRESENT' && !attendance.checkoutTime) {
            if (user?.designation === 'AE') {
                setIsCheckingOut(true);
                setShowCheckInModal(true);
            } else {
                dispatch(checkoutAttendance(formData)).then(() => dispatch(getAttendanceStatus()));
            }
        } else {
            if (user?.designation === 'AE') {
                setIsCheckingOut(false);
                setShowCheckInModal(true);
            } else {
                dispatch(markAttendance(formData)).then(() => dispatch(getAttendanceStatus()));
            }
        }
    };

    const handleMarkAttendance = () => {
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
                </div>
            );
        } else if (isLogin) {
            message = (
                <div className="mt-2 text-center">
                    <p className="text-lg font-bold text-emerald-600 mb-4">Before you continue, make sure:</p>
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
            }
        });
    };

    const handleBreakSelect = (breakType) => {
        setShowBreakModal(false);
        const breakLabels = { 'TEA': 'Tea Break', 'LUNCH': 'Lunch Break', 'CLIENT_MEETING': 'Client Meeting', 'BH_MEETING': 'BH Meeting' };
        const label = breakLabels[breakType] || 'Break';

        setConfirmationConfig({
            isOpen: true,
            title: `Confirm ${label}`,
            message: `Are you sure you want to start ${label}?`,
            type: 'info',
            confirmText: `Start ${label}`,
            onConfirm: () => {
                dispatch(pauseAttendance({ breakType })).then((res) => {
                    if (!res.error) dispatch(getAttendanceStatus());
                });
            }
        });
    };

    const handleResume = () => {
        dispatch(resumeAttendance()).then((res) => {
            if (!res.error) dispatch(getAttendanceStatus());
        });
    };

    const closeModal = () => setActiveModal(null);

    const renderWorkLogForm = () => {
        switch (user?.designation) {
            case 'CRE': return <CREWorkLogForm onSuccess={closeModal} />;
            case 'FA': return <FAWorkLogForm onSuccess={closeModal} />;
            case 'AE': return <AEWorkLogForm onSuccess={closeModal} />;
            default:
                if (user?.designation && WORK_LOG_CONFIG[user.designation]) {
                    return <DynamicWorkLogForm role={user.designation} onSuccess={closeModal} />;
                }
                return user?.designation === 'LA' ? <LAWorkLogForm onSuccess={closeModal} /> : <WorkLogForm onSuccess={closeModal} />;
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Modals */}
            {activeModal && (
                <Modal title={
                    activeModal === 'worklog' ? 'Submit Daily Work Log' :
                        activeModal === 'leave' ? 'Request Leave' :
                            activeModal === 'permission' ? 'Request Permission' :
                                activeModal === 'site-visit' ? 'Update Site Visit' :
                                    activeModal === 'showroom-visit' ? 'Cross-Showroom Visit' : 'Create New Project'
                } onClose={closeModal}>
                    {activeModal === 'worklog' && renderWorkLogForm()}
                    {activeModal === 'leave' && <LeaveRequestForm onSuccess={closeModal} />}
                    {activeModal === 'permission' && <PermissionRequestForm onSuccess={closeModal} />}
                    {activeModal === 'site-visit' && <SiteVisitRequestForm onSuccess={closeModal} />}
                    {activeModal === 'showroom-visit' && <ShowroomVisitRequestForm onSuccess={closeModal} />}
                    {activeModal === 'project' && <ProjectCreationForm onSuccess={closeModal} />}
                </Modal>
            )}

            <CheckInPhotoModal isOpen={showCheckInModal} onClose={() => setShowCheckInModal(false)} onSubmit={handlePhotoCheckIn} isLoading={isLoading} isCheckingOut={isCheckingOut} />
            <BreakSelectionModal isOpen={showBreakModal} onClose={() => setShowBreakModal(false)} onSelect={handleBreakSelect} />
            <ConfirmationModal isOpen={confirmationConfig.isOpen} onClose={() => setConfirmationConfig(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmationConfig.onConfirm} title={confirmationConfig.title} message={confirmationConfig.message} type={confirmationConfig.type} confirmText={confirmationConfig.confirmText} />

            {/* Premium Header */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center font-black text-2xl text-white shadow-2xl shadow-blue-500/20">
                            {user?.name?.charAt(0)}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full"></div>
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">
                            Namaste, {user?.name.split(' ')[0]}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-blue-100">
                                {['ADMIN', 'BUSINESS_HEAD', 'HR'].includes(user?.role) ? user?.role.replace('_', ' ') : (user?.designation || 'EMPLOYEE')}
                            </span>
                            <span className="text-slate-400 text-sm font-medium">| {new Date().toLocaleDateString(undefined, { weekday: 'long' })}</span>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl">📅</div>
                    <div className="text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Today's Date</p>
                        <p className="text-sm font-bold text-slate-800">{new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                </div>
            </div>

            {/* Multi-feature Notice Board */}
            <NoticeBoard />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Attendance Hero Card */}
                <motion.div
                    whileHover={{ y: -5 }}
                    className="lg:col-span-1 bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group min-h-[350px] flex flex-col justify-between"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[100px] -z-10 group-hover:bg-blue-600/30 transition-all"></div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-8">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Duty Status</span>
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase ${attendance?.status === 'PRESENT' && !attendance?.checkoutTime ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/20 text-red-400 border border-red-500/20'}`}>
                                <div className={`w-2 h-2 rounded-full ${attendance?.status === 'PRESENT' && !attendance?.checkoutTime ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></div>
                                {attendance?.status === 'PRESENT' && !attendance?.checkoutTime ? 'ON DUTY' : 'OFF DUTY'}
                            </div>
                        </div>

                        <h3 className="text-5xl font-black mb-6 tracking-tighter">
                            {attendance?.status === 'PRESENT' && !attendance?.checkoutTime ? 'Active' : 'Standby'}
                        </h3>

                        {attendance?.status === 'PRESENT' && !attendance?.checkoutTime ? (
                            <div className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-xl px-4 py-3 rounded-2xl border border-white/10">
                                <span className="text-xl">🕒</span>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Started At</p>
                                    <span className="font-black text-white">{new Date(attendance.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                        ) : attendance?.checkoutTime ? (
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <div className="flex-1 bg-white/5 p-3 rounded-2xl border border-white/5">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">IN</p>
                                        <p className="text-sm font-black">{new Date(attendance.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                    <div className="flex-1 bg-white/5 p-3 rounded-2xl border border-white/5">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">OUT</p>
                                        <p className="text-sm font-black">{new Date(attendance.checkoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                                <div className="bg-blue-600/20 border border-blue-500/20 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 text-center">Work Duration</p>
                                    <p className="text-3xl font-black text-center">{Math.abs((new Date(attendance.checkoutTime) - new Date(attendance.date)) / (1000 * 60 * 60)).toFixed(2)} <span className="text-sm font-medium">HRS</span></p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-400 font-medium">Your work session hasn't started yet. Ready to jump in?</p>
                        )}
                    </div>

                    <div className="relative z-10 mt-8">
                        {!attendance ? (
                            <button onClick={handleMarkAttendance} disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-3">
                                <span className="text-2xl">👆</span>
                                <span>{user?.designation === 'AE' ? 'Check In Now' : 'Start Session'}</span>
                            </button>
                        ) : !attendance.checkoutTime ? (
                            <div className="space-y-4">
                                {isPaused ? (
                                    <button onClick={handleResume} disabled={isLoading} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3">
                                        <span className="text-2xl">▶️</span>
                                        <span>Resume Workflow</span>
                                    </button>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setShowBreakModal(true)} disabled={isLoading} className="bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-2xl border border-white/10 transition-all flex items-center justify-center gap-2">
                                            <span>☕</span> Break
                                        </button>
                                        <button onClick={handleMarkAttendance} disabled={isLoading} className="bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20">
                                            <span>👋</span> Exit
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            user?.designation === 'AE' && (
                                <button onClick={handleMarkAttendance} disabled={isLoading} className="w-full bg-blue-600/20 border-2 border-dashed border-blue-500/30 text-blue-400 font-black py-4 rounded-2xl hover:bg-blue-600/30 transition-all active:scale-95">
                                    Start New Session 🔄
                                </button>
                            )
                        )}
                    </div>
                </motion.div>

                {/* Grid Content */}
                <div className="lg:col-span-2 flex flex-col gap-8">
                    <div className="grid grid-cols-2 gap-6">
                        <StatCard title="Daily Reports" value={workLogs.length} icon="📊" color="blue" />
                        <StatCard title="Leaves" value={requests.leaves.filter(l => l.status === 'APPROVED').length} icon="🌴" color="orange" />
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm flex-1">
                        <h4 className="font-black text-slate-800 mb-8 uppercase tracking-widest flex items-center gap-3 text-sm">
                            <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
                            Quick Portal
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                            <ActionButton onClick={() => setActiveModal('worklog')} icon="📝" label="Daily Report" sub="Log tasks" color="blue" />
                            <ActionButton onClick={() => setActiveModal('leave')} icon="🌴" label="Leave" sub="Request off" color="orange" />
                            <ActionButton onClick={() => setActiveModal('permission')} icon="⏲️" label="Early Exit" sub="Request exit" color="purple" />
                            <ActionButton onClick={() => setActiveModal('site-visit')} icon="🏗️" label="Site Visit" sub="Update visit" color="emerald" />
                            <ActionButton onClick={() => setActiveModal('showroom-visit')} icon="🏢" label="Showroom" sub="Cross visit" color="indigo" />
                            {(user?.designation === 'LA' || !user?.designation) && (
                                <ActionButton onClick={() => setActiveModal('project')} icon="🚀" label="New Project" sub="Create work" color="pink" />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ActionButton = ({ onClick, icon, label, sub, color }) => {
    const colors = {
        blue: 'hover:bg-blue-50 hover:border-blue-200 text-blue-600',
        orange: 'hover:bg-orange-50 hover:border-orange-200 text-orange-600',
        purple: 'hover:bg-purple-50 hover:border-purple-200 text-purple-600',
        emerald: 'hover:bg-emerald-50 hover:border-emerald-200 text-emerald-600',
        indigo: 'hover:bg-indigo-50 hover:border-indigo-200 text-indigo-600',
        pink: 'hover:bg-pink-50 hover:border-pink-200 text-pink-600'
    };
    return (
        <button onClick={onClick} className={`flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 border-slate-50 bg-slate-50/50 transition-all active:scale-95 group ${colors[color]}`}>
            <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-3xl mb-4 group-hover:scale-110 group-hover:-rotate-6 transition-all">{icon}</div>
            <span className="font-black text-sm tracking-tight">{label}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{sub}</span>
        </button>
    );
};

export default Overview;
