import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog, closeWorkLog, getTodayLogStatus, addProjectReport } from '../../features/employee/employeeSlice';
import { getProjects } from '../../features/projects/projectSlice';
import SuccessModal from '../SuccessModal';
import ConfirmationModal from '../ConfirmationModal';
import {
    FileText, Box, PenTool, Layout, DollarSign,
    MessageCircle, Users, CheckSquare, Plus, Clock,
    Image as ImageIcon, Briefcase, Calendar, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LAWorkLogForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { isLoading, todayLog } = useSelector((state) => state.employee);
    const { projects } = useSelector((state) => state.projects);
    const [showSuccess, setShowSuccess] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [reportType, setReportType] = useState('daily'); // 'daily', 'project'
    const [confirmationConfig, setConfirmationConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const isTodayClosed = todayLog?.logStatus === 'CLOSED';
    const isTodayOpen = todayLog?.logStatus === 'OPEN';

    useEffect(() => {
        dispatch(getTodayLogStatus());
        dispatch(getProjects());
    }, [dispatch]);

    // Initial State structure for Opening/Closing
    const initialMetrics = {
        initial2D: { count: '', details: '' },
        production2D: { count: '', details: '' },
        revised2D: { count: '', details: '' },
        fresh3D: { count: '', details: '' },
        revised3D: { count: '', details: '' },
        estimation: { count: '', details: '' },
        woe: { count: '', details: '' },
        onlineDiscussion: { count: '', details: '' },
        showroomDiscussion: { count: '', details: '' },
        signFromEngineer: { count: '', details: '' }
    };

    const [openingData, setOpeningData] = useState({ ...initialMetrics });
    const [closingData, setClosingData] = useState({ ...initialMetrics });

    // Project Report State
    const [projectReport, setProjectReport] = useState({
        date: new Date().toISOString().split('T')[0],
        projectId: '',
        clientName: '',
        site: '',
        process: '',
        imageCount: '',
        startTime: '',
        endTime: '',
        completedImages: '',
        pendingImages: '',
        remarks: ''
    });

    const handleOpeningSubmit = (e) => {
        e.preventDefault();
        setConfirmationConfig({
            isOpen: true,
            title: 'Submit Opening Report',
            message: 'Are you sure you want to start your day with these metrics?',
            onConfirm: () => {
                const payload = { logStatus: 'OPEN', la_opening_metrics: openingData };
                dispatch(createWorkLog(payload)).then((res) => {
                    if (!res.error) {
                        setModalMessage("Opening Report Submitted! Day started.");
                        setShowSuccess(true);
                    }
                });
                setConfirmationConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleClosingSubmit = (e) => {
        e.preventDefault();
        setConfirmationConfig({
            isOpen: true,
            title: 'Submit Closing Report',
            message: 'Are you sure you want to end your day and submit these closing metrics?',
            onConfirm: () => {
                const payload = { la_closing_metrics: closingData };
                dispatch(closeWorkLog(payload)).then((res) => {
                    if (!res.error) {
                        setModalMessage("Closing Report Submitted! Day ended.");
                        setShowSuccess(true);
                    }
                });
                setConfirmationConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleProjectReportSubmit = (e) => {
        e.preventDefault();
        setConfirmationConfig({
            isOpen: true,
            title: 'Add Project Task',
            message: 'Confirm adding this task to your daily log?',
            onConfirm: () => {
                let totalHours = 0;
                if (projectReport.startTime && projectReport.endTime) {
                    const start = new Date(`1970-01-01T${projectReport.startTime}`);
                    const end = new Date(`1970-01-01T${projectReport.endTime}`);
                    totalHours = (end - start) / 1000 / 60 / 60;
                }

                const payload = {
                    projectReport: {
                        ...projectReport,
                        totalHours: totalHours > 0 ? totalHours.toFixed(2) : 0
                    }
                };

                dispatch(addProjectReport(payload)).then((res) => {
                    if (!res.error) {
                        setModalMessage("Project Report Added!");
                        setShowSuccess(true);
                        // Reset form
                        setProjectReport({
                            date: new Date().toISOString().split('T')[0],
                            projectId: '', clientName: '', site: '', process: '',
                            imageCount: '', startTime: '', endTime: '',
                            completedImages: '', pendingImages: '', remarks: ''
                        });
                    }
                });
                setConfirmationConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleProjectSelect = (e) => {
        const pId = e.target.value;
        const selected = projects.find(p => p.id === parseInt(pId));
        if (selected) {
            setProjectReport(prev => ({
                ...prev, projectId: pId, clientName: selected.name, site: selected.location || ''
            }));
        } else {
            setProjectReport(prev => ({ ...prev, projectId: pId }));
        }
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading workspace...</div>;

    return (
        <div className="space-y-6">
            {/* Header / Toggle */}
            <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex gap-1">
                <button
                    onClick={() => setReportType('daily')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold text-sm ${reportType === 'daily'
                        ? 'bg-slate-800 text-white shadow-md'
                        : 'text-slate-500 hover:bg-slate-50'
                        }`}
                >
                    <Calendar size={16} /> Daily Report
                </button>
                <button
                    onClick={() => setReportType('project')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold text-sm ${reportType === 'project'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-500 hover:bg-slate-50'
                        }`}
                >
                    <Briefcase size={16} /> Project Tasks
                </button>
            </div>

            <AnimatePresence mode="wait">
                {reportType === 'daily' ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        {isTodayClosed ? (
                            <div className="bg-emerald-50 p-8 rounded-3xl text-center border border-emerald-100">
                                <CheckSquare size={48} className="mx-auto text-emerald-500 mb-4" />
                                <h3 className="text-2xl font-black text-emerald-800 mb-2">Day Completed!</h3>
                                <p className="text-emerald-600 font-medium">All daily reports have been submitted successfully.</p>
                            </div>
                        ) : isTodayOpen ? (
                            <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                                        <CheckSquare size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800">Closing Report</h3>
                                        <p className="text-xs text-slate-500 font-bold uppercase">Submit before checking out</p>
                                    </div>
                                </div>
                                <MetricsForm data={closingData} setData={setClosingData} onSubmit={handleClosingSubmit} type="closing" />
                            </div>
                        ) : (
                            <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm">
                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                                        <Layout size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800">Opening Report</h3>
                                        <p className="text-xs text-slate-500 font-bold uppercase">Start your day by planning tasks</p>
                                    </div>
                                </div>
                                <MetricsForm data={openingData} setData={setOpeningData} onSubmit={handleOpeningSubmit} type="opening" />
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        {!isTodayOpen ? (
                            <div className="p-6 bg-amber-50 text-amber-800 rounded-2xl border border-amber-100 flex items-center gap-4">
                                <Layout size={24} />
                                <span className="font-bold">Please submit the daily OPENING report before adding project tasks.</span>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Form Card */}
                                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full -mr-10 -mt-10 pointer-events-none"></div>

                                    <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                                        <Plus className="bg-blue-600 text-white rounded-lg p-0.5" size={20} /> Add Project Task
                                    </h3>

                                    <form onSubmit={handleProjectReportSubmit} className="space-y-5 relative z-10">
                                        <div className="grid grid-cols-1 gap-5">
                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 focus-within:ring-2 ring-blue-500/20 transition-all">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Project Selection</label>
                                                <select name="projectId" value={projectReport.projectId} onChange={handleProjectSelect} className="w-full bg-transparent font-bold text-slate-700 outline-none">
                                                    <option value="">-- Select Project --</option>
                                                    {projects?.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Process / Task</label>
                                                <input type="text" value={projectReport.process} onChange={(e) => setProjectReport({ ...projectReport, process: e.target.value })} className="w-full bg-transparent font-bold text-slate-700 outline-none" placeholder="e.g. 3D Modeling" />
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Image Reference (#)</label>
                                                <input type="number" value={projectReport.imageCount} onChange={(e) => setProjectReport({ ...projectReport, imageCount: e.target.value })} className="w-full bg-transparent font-bold text-slate-700 outline-none" placeholder="0" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-5">
                                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><Clock size={10} /> Start Time</label>
                                                <input type="time" value={projectReport.startTime} onChange={(e) => setProjectReport({ ...projectReport, startTime: e.target.value })} className="w-full bg-transparent font-bold text-slate-700 outline-none" />
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><Clock size={10} /> End Time</label>
                                                <input type="time" value={projectReport.endTime} onChange={(e) => setProjectReport({ ...projectReport, endTime: e.target.value })} className="w-full bg-transparent font-bold text-slate-700 outline-none" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-5">
                                            <div className="p-3 rounded-xl border border-green-200 bg-green-50/50">
                                                <label className="block text-[9px] font-black text-green-600 uppercase mb-1">Completed</label>
                                                <input type="number" value={projectReport.completedImages} onChange={(e) => setProjectReport({ ...projectReport, completedImages: e.target.value })} className="w-full bg-transparent font-black text-green-800 text-lg outline-none" placeholder="0" />
                                            </div>
                                            <div className="p-3 rounded-xl border border-orange-200 bg-orange-50/50">
                                                <label className="block text-[9px] font-black text-orange-600 uppercase mb-1">Pending</label>
                                                <input type="number" value={projectReport.pendingImages} onChange={(e) => setProjectReport({ ...projectReport, pendingImages: e.target.value })} className="w-full bg-transparent font-black text-orange-800 text-lg outline-none" placeholder="0" />
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Remarks</label>
                                            <textarea value={projectReport.remarks} onChange={(e) => setProjectReport({ ...projectReport, remarks: e.target.value })} className="w-full bg-transparent font-medium text-slate-600 outline-none text-sm resize-none" rows="2" placeholder="Any issues or notes..."></textarea>
                                        </div>

                                        <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg text-white font-bold py-4 rounded-xl transition-all flex justify-center items-center gap-2">
                                            <Plus size={18} /> Add to Daily Log
                                        </button>
                                    </form>
                                </div>

                                {/* List */}
                                <div className="space-y-3">
                                    <h4 className="font-black text-slate-400 text-xs uppercase px-2">Today's Tasks ({todayLog?.la_project_reports ? (typeof todayLog.la_project_reports === 'string' ? JSON.parse(todayLog.la_project_reports).length : todayLog.la_project_reports.length) : 0})</h4>
                                    {todayLog && todayLog.la_project_reports &&
                                        ((typeof todayLog.la_project_reports === 'string' ? JSON.parse(todayLog.la_project_reports) : todayLog.la_project_reports).map((r, idx) => (
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                                key={idx} className="bg-white p-4 border border-slate-100 rounded-2xl shadow-sm flex justify-between items-center"
                                            >
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{r.clientName || 'Unknown Project'}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{r.process}</span>
                                                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1"><Clock size={10} /> {r.startTime}-{r.endTime}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="bg-slate-800 text-white text-xs font-bold px-3 py-1 rounded-full">
                                                        {r.completedImages} / {r.imageCount}
                                                    </span>
                                                </div>
                                            </motion.div>
                                        )))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
            <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} message={modalMessage} />

            <ConfirmationModal
                isOpen={confirmationConfig.isOpen}
                onClose={() => setConfirmationConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmationConfig.onConfirm}
                title={confirmationConfig.title}
                message={confirmationConfig.message}
            />
        </div>
    );
};

// Sub-component for the Metrics Grid
const MetricsForm = ({ data, setData, onSubmit, type }) => {
    const update = (key, field, val) => {
        setData(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } }));
    };

    const isOpening = type === 'opening';
    const btnColor = isOpening ? 'bg-blue-600' : 'bg-emerald-600';

    // Config with Icons
    const fields = [
        { key: 'initial2D', label: 'Initial 2D', icon: PenTool },
        { key: 'production2D', label: 'Production 2D', icon: Layout },
        { key: 'revised2D', label: 'Revised 2D', icon: FileText },
        { key: 'fresh3D', label: 'Fresh 3D', icon: Box },
        { key: 'revised3D', label: 'Revised 3D', icon: Box },
        { key: 'estimation', label: 'Estimation', icon: DollarSign },
        { key: 'woe', label: 'W.O.E', icon: Briefcase },
        { key: 'onlineDiscussion', label: 'Online Disc.', icon: MessageCircle },
        { key: 'showroomDiscussion', label: 'Showroom Disc.', icon: Users },
        { key: 'signFromEngineer', label: 'Sign Engineers', icon: FileText },
    ];

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map((f) => {
                    const Icon = f.icon;
                    return (
                        <div key={f.key} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-blue-200 transition-colors group">
                            <div className="flex items-center gap-2 mb-3">
                                <Icon size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide group-hover:text-slate-700">{f.label}</span>
                            </div>
                            <div className="flex gap-3">
                                <input
                                    type="number"
                                    placeholder="#"
                                    value={data[f.key].count}
                                    onChange={(e) => update(f.key, 'count', e.target.value)}
                                    className="w-16 bg-white p-2 text-center font-bold text-slate-800 rounded-lg text-sm outline-none border border-slate-200 focus:border-blue-400"
                                />
                                <input
                                    type="text"
                                    placeholder="Details..."
                                    value={data[f.key].details}
                                    onChange={(e) => update(f.key, 'details', e.target.value)}
                                    className="flex-1 bg-white p-2 font-medium text-slate-600 rounded-lg text-sm outline-none border border-slate-200 focus:border-blue-400"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            <button type="submit" className={`w-full ${btnColor} hover:opacity-90 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex justify-center items-center gap-2`}>
                <CheckSquare size={20} /> {isOpening ? 'Submit Opening Report' : 'Submit Closing Report'}
            </button>
        </form>
    );
};

export default LAWorkLogForm;
