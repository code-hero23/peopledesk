import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getAttendanceStatus, markAttendance, checkoutAttendance, getMyWorkLogs, getMyRequests, reset } from '../features/employee/employeeSlice';
import WorkLogForm from '../components/WorkLogForm'; // Default (LA)
import LAWorkLogForm from '../components/worklogs/LAWorkLogForm'; // Detailed (LA)
import CREWorkLogForm from '../components/worklogs/CREWorkLogForm';
import FAWorkLogForm from '../components/worklogs/FAWorkLogForm';
import AEWorkLogForm from '../components/worklogs/AEWorkLogForm';
import LeaveRequestForm from '../components/LeaveRequestForm';
import PermissionRequestForm from '../components/PermissionRequestForm';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import ProjectCreationForm from '../components/ProjectCreationForm';
import SiteVisitRequestForm from '../components/SiteVisitRequestForm';
import ShowroomVisitRequestForm from '../components/ShowroomVisitRequestForm';

import CheckInPhotoModal from '../components/CheckInPhotoModal';

const EmployeeDashboard = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { attendance, workLogs, requests, isLoading } = useSelector((state) => state.employee);

    // DEBUG LOG
    useEffect(() => {
        console.log('Current User State:', user);
        console.log('Designation Check:', user?.designation === 'AE' ? 'IS AE' : 'NOT AE');
    }, [user]);

    // UI State
    const [activeTab, setActiveTab] = useState(user?.designation === 'OFFICE-ADMINISTRATION' ? 'leaves' : 'logs');
    const [activeModal, setActiveModal] = useState(null); // 'worklog', 'leave', 'permission', 'project'
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false); // Track if current action is check-out
    const [laFormType, setLaFormType] = useState('detailed'); // 'standard' or 'detailed' for LA role

    useEffect(() => {
        dispatch(getAttendanceStatus());
        dispatch(getMyWorkLogs());
        dispatch(getMyRequests());
        return () => { dispatch(reset()); };
    }, [dispatch]);

    // Mobile Detection
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleMarkAttendance = () => {
        // RESTRICTION: Lock Check-In for Non-AE on Mobile
        if (isMobile && user?.designation !== 'AE') {
            alert("Mobile Check-In is restricted to Area Engineers (AE). Please use a Desktop to check in.");
            return;
        }

        console.log('handleMarkAttendance Called');
        console.log('User Designation:', user?.designation);
        console.log('Attendance State:', attendance);

        if (attendance?.status === 'PRESENT' && !attendance.checkoutTime) {
            console.log('Condition: Checking OUT');
            // Check-Out Logic
            if (user?.designation === 'AE') {
                console.log('Action: Opening Photo Modal for Checkout');
                setIsCheckingOut(true);
                setShowCheckInModal(true);
            } else {
                console.log('Action: Standard Checkout (No Photo)');
                dispatch(checkoutAttendance()).then(() => dispatch(getAttendanceStatus()));
            }
        } else {
            console.log('Condition: Checking IN');
            // Check-In Logic
            if (user?.designation === 'AE') {
                console.log('Action: Opening Photo Modal for Check-In');
                setIsCheckingOut(false);
                setShowCheckInModal(true);
            } else {
                console.log('Action: Standard Check-In (No Photo)');
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
            case 'AE':
                return <AEWorkLogForm onSuccess={closeModal} />;
            case 'LA':
            default:
                if (user?.designation === 'LA') {
                    return <LAWorkLogForm onSuccess={closeModal} />;
                }
                // Fallback for others
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
                                    activeModal === 'showroom-visit' ? 'Showroom Visit' :
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
            <div className="bg-red-600 text-white p-4 rounded-xl mb-4 font-bold text-center border-4 border-yellow-400">
                ⚠️ VERSION DEBUG: CODE IS UPDATED ⚠️
            </div>

            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                        Hello, {user?.name.split(' ')[0]} 👋
                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full border border-slate-300">
                            {user?.designation || 'No Designation'}
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
                            <div className={`w-3 h-3 rounded-full ${attendance?.status === 'PRESENT' ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'bg-red-400'}`}></div>
                        </div>
                        <h3 className="text-4xl font-bold mb-4 tracking-tight">
                            {attendance?.status === 'PRESENT' ? 'Checked In' : 'Not Active'}
                        </h3>
                        {attendance?.status === 'PRESENT' ? (
                            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10">
                                <span>🕒</span>
                                <span className="font-mono font-medium">In at {new Date(attendance.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        ) : attendance?.checkoutTime ? (
                            <div className="space-y-2 mt-2">
                                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10">
                                    <span>🏁</span>
                                    <span className="font-mono font-medium">Out at {new Date(attendance.checkoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-slate-400 text-sm">
                                    Total Hours: <span className="font-bold text-white tracking-wide">{
                                        Math.abs((new Date(attendance.checkoutTime) - new Date(attendance.date)) / (1000 * 60 * 60)).toFixed(2)
                                    } HRS</span>
                                </p>
                            </div>
                        ) : (
                            <p className="text-slate-400 text-sm">You haven't marked your attendance yet.</p>
                        )}
                    </div>

                    {!attendance || attendance.status !== 'PRESENT' ? (
                        <button
                            onClick={handleMarkAttendance}
                            disabled={isLoading}
                            className={`relative z-10 w-full font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 mt-6 
                                ${isMobile && user?.designation !== 'AE' ? 'bg-slate-600 cursor-not-allowed opacity-80' : 'bg-blue-500 hover:bg-blue-600 group-hover:shadow-blue-500/25'}
                            `}
                        >
                            <span className="text-xl">{isMobile && user?.designation !== 'AE' ? '🔒' : '👆'}</span>
                            <span>{isMobile && user?.designation !== 'AE' ? 'Desktop Only' : 'Tap to Check In'}</span>
                        </button>
                    ) : !attendance.checkoutTime ? (
                        <button
                            onClick={handleMarkAttendance}
                            disabled={isLoading}
                            className="relative z-10 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 mt-6 group-hover:shadow-orange-500/25"
                        >
                            <span className="text-xl">👋</span>
                            <span>Tap to Check Out (Photo)</span>
                        </button>
                    ) : (
                        <div className="relative z-10 mt-6">
                            <p className="text-emerald-300 font-medium flex items-center gap-2 text-sm bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                                <span className="text-lg">✨</span> You are all set for today!
                            </p>
                            <p className="text-slate-400 text-xs mt-2 pl-2">
                                Checked out at {new Date(attendance.checkoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
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
                            <span>⚡</span> Quick Actions (New)
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 h-full">
                            {user?.designation !== 'OFFICE-ADMINISTRATION' && (
                                <button
                                    onClick={() => setActiveModal('worklog')}
                                    className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all group h-[120px]"
                                >
                                    <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">📝</div>
                                    <span className="font-bold text-sm">Log Work</span>
                                    <span className="text-xs text-slate-400 mt-1">{user?.designation || 'General'} Report</span>
                                </button>
                            )}

                            <button
                                onClick={() => setActiveModal('leave')}
                                className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-all group h-[120px]"
                            >
                                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">🏖️</div>
                                <span className="font-bold text-sm">Request Leave</span>
                            </button>

                            <button
                                onClick={() => setActiveModal('permission')}
                                className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600 transition-all group h-[120px]"
                            >
                                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">🕑</div>
                                <span className="font-bold text-sm">Permission</span>
                            </button>

                            {(user?.designation === 'LA' || !user?.designation) && (
                                <button
                                    onClick={() => setActiveModal('project')}
                                    className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-all group h-[120px]"
                                >
                                    <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">🚀</div>
                                    <span className="font-bold text-sm">Create Project</span>
                                </button>
                            )}

                            <button
                                onClick={() => setActiveModal('site-visit')}
                                className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-all group h-[120px]"
                            >
                                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">🏗️</div>
                                <span className="font-bold text-sm">Update Site Visit</span>
                            </button>

                            <button
                                onClick={() => setActiveModal('showroom-visit')}
                                className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all group h-[120px]"
                            >
                                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">🏢</div>
                                <span className="font-bold text-sm">Showroom Visit</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent History Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
                <div className="border-b border-slate-100 flex overflow-x-auto scroller-none">
                    {['logs', 'leaves', 'permissions']
                        .filter(tab => !(tab === 'logs' && user?.designation === 'OFFICE-ADMINISTRATION'))
                        .map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-4 text-sm font-bold transition-colors whitespace-nowrap capitalize ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {tab === 'logs' ? 'Recent Work Logs' : tab === 'leaves' ? 'Leave History' : 'Permissions'}
                            </button>
                        ))}
                </div>

                <div className="p-6">
                    {activeTab === 'logs' && (
                        <div className="space-y-4">
                            {workLogs.length === 0 ? (
                                <div className="text-center py-10 text-slate-400">
                                    <p className="text-4xl mb-2">📭</p>
                                    <p>No activity logs yet.</p>
                                </div>
                            ) : (
                                workLogs.map((log) => (
                                    <div key={log.id} className="flex gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors">
                                        <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 text-blue-600 flex flex-col items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                                            <span className="text-slate-400 font-normal leading-none mb-0.5">{new Date(log.date).getDate()}</span>
                                            <span className="leading-none">{new Date(log.date).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-slate-800 truncate">{log.clientName || log.projectName || 'Work Log'}</h4>
                                                <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded">{log.hours ? `${log.hours}h` : 'N/A'}</span>
                                            </div>
                                            <p className="text-slate-600 text-sm mt-1 truncate">{log.process || log.tasks || log.cre_callBreakdown || 'Detailed Report'}</p>

                                            {/* Optional details pills */}
                                            <div className="flex gap-2 mt-2">
                                                {log.imageCount && (
                                                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">📸 {log.imageCount} imgs</span>
                                                )}
                                                {log.cre_totalCalls && (
                                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">📞 {log.cre_totalCalls} calls</span>
                                                )}
                                                {log.fa_calls && (
                                                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">📞 {log.fa_calls} follow-ups</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'leaves' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-slate-400 font-medium border-b border-slate-100">
                                    <tr>
                                        <th className="pb-3 pl-2">Dates</th>
                                        <th className="pb-3">Type</th>
                                        <th className="pb-3">Reason</th>
                                        <th className="pb-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {requests.leaves.map(req => (
                                        <tr key={req.id}>
                                            <td className="py-3 pl-2 font-medium text-slate-700">
                                                {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                                            </td>
                                            <td className="py-3">{req.type}</td>
                                            <td className="py-3 text-slate-500 italic">"{req.reason}"</td>
                                            <td className="py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                    req.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                                    }`}>{req.status}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {requests.leaves.length === 0 && <p className="text-slate-400 italic mt-4 text-center">No leave requests found.</p>}
                        </div>
                    )}

                    {activeTab === 'permissions' && (
                        <div className="space-y-4">
                            {requests.permissions.map(req => (
                                <div key={req.id} className="p-4 rounded-lg border border-slate-100 flex justify-between items-center bg-white hover:bg-slate-50 transition-colors">
                                    <div>
                                        <p className="font-bold text-slate-800">{new Date(req.date).toLocaleDateString()}</p>
                                        <p className="text-sm text-slate-500">{req.startTime} - {req.endTime}</p>
                                        <p className="text-xs text-slate-400 mt-1">"{req.reason}"</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                        req.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                        }`}>{req.status}</span>
                                </div>
                            ))}
                            {requests.permissions.length === 0 && <p className="text-slate-400 italic text-center">No permission requests found.</p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmployeeDashboard;
