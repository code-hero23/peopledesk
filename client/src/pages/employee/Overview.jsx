import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getAttendanceStatus, markAttendance, checkoutAttendance, getMyWorkLogs, getMyRequests, reset } from '../../features/employee/employeeSlice';
import WorkLogForm from '../../components/WorkLogForm'; // Default (LA)
import LAWorkLogForm from '../../components/worklogs/LAWorkLogForm'; // Detailed (LA)
import CREWorkLogForm from '../../components/worklogs/CREWorkLogForm';
import FAWorkLogForm from '../../components/worklogs/FAWorkLogForm';
import DynamicWorkLogForm from '../../components/worklogs/DynamicWorkLogForm';
import { WORK_LOG_CONFIG } from '../../config/workLogConfig';
import LeaveRequestForm from '../../components/LeaveRequestForm';
import PermissionRequestForm from '../../components/PermissionRequestForm';
import StatCard from '../../components/StatCard';
import Modal from '../../components/Modal';
import ProjectCreationForm from '../../components/ProjectCreationForm';
import SiteVisitRequestForm from '../../components/SiteVisitRequestForm';
import ShowroomVisitRequestForm from '../../components/ShowroomVisitRequestForm';

import CheckInPhotoModal from '../../components/CheckInPhotoModal';

const Overview = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { attendance, workLogs, requests, isLoading } = useSelector((state) => state.employee);

    // UI State
    const [activeModal, setActiveModal] = useState(null); // 'worklog', 'leave', 'permission', 'project'
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [laFormType, setLaFormType] = useState('detailed'); // 'standard' or 'detailed' for LA role


    useEffect(() => {
        dispatch(getAttendanceStatus());
        dispatch(getMyWorkLogs());
        dispatch(getMyRequests());
        return () => { dispatch(reset()); };
    }, [dispatch]);

    const handleMarkAttendance = () => {
        // Determine action name for confirmation
        let actionName = 'Log In';
        if (attendance?.status === 'PRESENT' && !attendance.checkoutTime) {
            actionName = user?.designation === 'AE' ? 'Check Out' : 'Log Out';
        } else {
            actionName = user?.designation === 'AE' ? 'Check In' : 'Log In';
        }

        if (!window.confirm(`Are you sure you want to ${actionName}?`)) {
            return;
        }

        if (attendance?.status === 'PRESENT' && !attendance.checkoutTime) {
            // Check-Out Logic
            if (user?.designation === 'AE') {
                setIsCheckingOut(true);
                setShowCheckInModal(true);
            } else {
                dispatch(checkoutAttendance()).then(() => dispatch(getAttendanceStatus()));
            }
        } else {
            // Check-In Logic
            if (user?.designation === 'AE') {
                setIsCheckingOut(false);
                setShowCheckInModal(true);
            } else {
                dispatch(markAttendance()).then(() => dispatch(getAttendanceStatus()));
            }
        }
    };

    const handlePhotoCheckIn = (photoFile) => {
        const formData = new FormData();
        formData.append('photo', photoFile);

        const action = isCheckingOut ? checkoutAttendance(formData) : markAttendance(formData);

        dispatch(action).then((res) => {
            if (!res.error) {
                setShowCheckInModal(false);
                dispatch(getAttendanceStatus());
            }
        });
    };

    const closeModal = () => setActiveModal(null);

    const renderWorkLogForm = () => {
        switch (user?.designation) {
            case 'CRE':
                return <CREWorkLogForm onSuccess={closeModal} />;
            case 'FA':
                return <FAWorkLogForm onSuccess={closeModal} />;

            default:
                // Check for new roles in config
                if (user?.designation && WORK_LOG_CONFIG[user.designation]) {
                    return <DynamicWorkLogForm role={user.designation} onSuccess={closeModal} />;
                }

                // Fallback for LA or legacy
                if (user?.designation === 'LA' || !user?.designation) {
                    return (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <span className="text-sm font-bold text-slate-700">Report Type:</span>
                                <select
                                    className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
                                    value={laFormType}
                                    onChange={(e) => setLaFormType(e.target.value)}
                                >
                                    <option value="detailed">Project Wise Work Report</option>
                                    <option value="standard">Daily Work Report</option>
                                </select>
                            </div>
                            {laFormType === 'detailed' ? (
                                <LAWorkLogForm onSuccess={closeModal} />
                            ) : (
                                <WorkLogForm onSuccess={closeModal} />
                            )}
                        </div>
                    );
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
                    {activeModal === 'permission' && <PermissionRequestForm onSuccess={closeModal} />}
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
                        <button
                            onClick={handleMarkAttendance}
                            disabled={isLoading}
                            className="relative z-10 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 mt-6 group-hover:shadow-orange-500/25"
                        >
                            <span className="text-xl">👋</span>
                            <span>Tap to {user?.designation === 'AE' ? 'Check Out' : 'Log Out'}</span>
                        </button>
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
                        <StatCard title="Total Logs" value={workLogs.length} icon="📝" color="blue" />
                        <StatCard title="Approved Leaves" value={requests.leaves.filter(l => l.status === 'APPROVED').length} icon="🏖️" color="orange" />
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span>⚡</span> Quick Actions
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 h-full">
                            {user?.designation !== 'OFFICE-ADMINISTRATION' && (
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
                                onClick={() => setActiveModal('permission')}
                                className="flex flex-col items-center justify-center p-3 md:p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600 transition-all group min-h-[100px] md:h-[120px]"
                            >
                                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">🕑</div>
                                <span className="font-bold text-sm">Permission</span>
                            </button>

                            {(user?.designation === 'LA' || !user?.designation) && (
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
        </div>
    );
};

export default Overview;
