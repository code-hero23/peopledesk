import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog, closeWorkLog, getTodayLogStatus, addProjectReport } from '../../features/employee/employeeSlice';
import { getProjects } from '../../features/projects/projectSlice';
import {
    MapPin, Camera, AlertTriangle, Calendar, Clock, CheckCircle,
    Navigation, Briefcase, Clipboard, HardHat, UserCheck,
    Wrench, AlertOctagon, CornerDownRight, CheckSquare, Plus, ChevronRight
} from 'lucide-react';
import SuccessModal from '../SuccessModal';
import ConfirmationModal from '../ConfirmationModal';
import { motion, AnimatePresence } from 'framer-motion';

const AEWorkLogForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { attendance, isLoading, todayLog } = useSelector((state) => state.employee);
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

    useEffect(() => {
        dispatch(getTodayLogStatus());
        dispatch(getProjects());
    }, [dispatch]);

    // Derived States
    const isTodayClosed = todayLog && todayLog.logStatus === 'CLOSED';
    const isTodayOpen = todayLog && todayLog.logStatus === 'OPEN';

    // --- OPENING FORM STATE ---
    const [openingData, setOpeningData] = useState({
        checkInTime: attendance?.date ? new Date(attendance.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        ae_gpsCoordinates: '',
        ae_siteLocation: '',
        ae_siteStatus: '',
        ae_plannedWork: ''
    });

    const [locationLoading, setLocationLoading] = useState(false);

    // --- PROJECT REPORT STATE (Site Wise) ---
    const [projectReport, setProjectReport] = useState({
        projectId: '',
        clientName: '',
        ae_visitType: [],
        ae_workStage: '',
        ae_tasksCompleted: [],
        ae_measurements: '',
        ae_itemsInstalled: '',
        ae_issuesRaised: '',
        ae_issuesResolved: '',
        ae_hasIssues: false,
        ae_issueType: '',
        ae_issueDescription: '',
        ae_photos: [],
        ae_nextVisitRequired: false,
        ae_nextVisitDate: '',
        ae_clientMet: false,
        ae_clientFeedback: '',
        startTime: '',
        endTime: '',
    });

    // --- CLOSING FORM STATE (Final Summary/Remarks) ---
    const [closingData, setClosingData] = useState({
        remarks: '',
        notes: ''
    });

    const [imagePreviews, setImagePreviews] = useState([]);

    // Options
    const siteStatuses = ['New Site', 'Ongoing', 'Handover', 'Hold'];
    const visitTypes = ['Site Inspection', 'Measurement', 'Installation', 'Rectification', 'Meeting with Client', 'Vendor Coordination'];
    const workStages = ['Design', 'Production', 'Installation', 'Finishing'];
    const tasksList = ['Measurement Taken', 'Material Delivered', 'Installation Started', 'Installation Completed', 'Issue Identified', 'Issue Resolved'];
    const issueTypes = ['Design', 'Material', 'Site', 'Client'];

    // --- HANDLERS ---
    const handleOpeningChange = (e) => {
        const { name, value } = e.target;
        setOpeningData(prev => ({ ...prev, [name]: value }));
    };

    const captureLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }
        setLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setOpeningData(prev => ({
                    ...prev,
                    ae_gpsCoordinates: `${latitude}, ${longitude}`
                }));
                setLocationLoading(false);
            },
            () => {
                alert("Unable to retrieve your location");
                setLocationLoading(false);
            }
        );
    };

    const handleOpeningSubmit = (e) => {
        e.preventDefault();
        setConfirmationConfig({
            isOpen: true,
            title: 'Start Your Day',
            message: 'Are you sure you want to check-in and start your day?',
            onConfirm: () => {
                const payload = {
                    logStatus: 'OPEN',
                    process: 'AE Opening Report',
                    ae_opening_metrics: openingData,
                    ae_siteLocation: openingData.ae_siteLocation || '',
                    ae_gpsCoordinates: openingData.ae_gpsCoordinates || '',
                    ae_siteStatus: openingData.ae_siteStatus || '',
                    ae_plannedWork: openingData.ae_plannedWork || ''
                };

                dispatch(createWorkLog(payload)).then((res) => {
                    if (!res.error) {
                        setModalMessage("Day Started! Opening Report Submitted.");
                        setShowSuccess(true);
                    }
                });
                setConfirmationConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleProjectReportChange = (e) => {
        const { name, value, type, checked } = e.target;
        setProjectReport(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleProjectSelect = (e) => {
        const pId = e.target.value;
        const selected = projects?.find(p => p.id === parseInt(pId));
        if (selected) {
            setProjectReport(prev => ({
                ...prev,
                projectId: pId,
                clientName: selected.name,
                ae_siteLocation: selected.location || ''
            }));
        } else {
            setProjectReport(prev => ({ ...prev, projectId: pId }));
        }
    };

    const handleMultiSelect = (field, value) => {
        setProjectReport(prev => {
            const current = prev[field] || [];
            if (current.includes(value)) {
                return { ...prev, [field]: current.filter(item => item !== value) };
            } else {
                return { ...prev, [field]: [...current, value] };
            }
        });
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setProjectReport(prev => ({
            ...prev,
            ae_photos: files
        }));

        // Generate previews
        const previews = files.map(file => URL.createObjectURL(file));
        setImagePreviews(previews);
    };

    const handleProjectReportSubmit = (e) => {
        e.preventDefault();
        setConfirmationConfig({
            isOpen: true,
            title: 'Add Project Report',
            message: 'Are you sure you want to add this project report to your log?',
            onConfirm: () => {
                const formData = new FormData();
                const metrics = { ...projectReport, ae_photos: undefined };
                formData.append('projectReport', JSON.stringify(metrics));

                if (projectReport.ae_photos && projectReport.ae_photos.length > 0) {
                    projectReport.ae_photos.forEach(file => {
                        formData.append('ae_photos', file);
                    });
                }

                dispatch(addProjectReport(formData)).then((res) => {
                    if (!res.error) {
                        setModalMessage("Project Report Added!");
                        setShowSuccess(true);
                        // Reset project report form
                        setProjectReport({
                            projectId: '', clientName: '', ae_visitType: [], ae_workStage: '',
                            ae_tasksCompleted: [], ae_measurements: '', ae_itemsInstalled: '',
                            ae_issuesRaised: '', ae_issuesResolved: '', ae_hasIssues: false,
                            ae_issueType: '', ae_issueDescription: '', ae_photos: [],
                            ae_nextVisitRequired: false, ae_nextVisitDate: '',
                            ae_clientMet: false, ae_clientFeedback: '',
                            startTime: '', endTime: '',
                        });
                        setImagePreviews([]);
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
            message: 'Are you sure you want to complete your day and submit all site details?',
            onConfirm: () => {
                const payload = {
                    logStatus: 'CLOSED',
                    remarks: closingData.remarks || '',
                    notes: closingData.notes || ''
                };

                dispatch(closeWorkLog(payload)).then((res) => {
                    if (!res.error) {
                        setModalMessage("Day Ended! All Reports Submitted.");
                        setShowSuccess(true);
                    }
                });
                setConfirmationConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading...</div>;

    if (isTodayClosed) {
        return (
            <div className="bg-emerald-50 p-8 rounded-3xl text-center border border-emerald-100">
                <CheckCircle className="mx-auto text-emerald-500 mb-4" size={48} />
                <h3 className="text-2xl font-black text-emerald-800 mb-2">Day Completed!</h3>
                <p className="text-emerald-600 font-bold">You have successfully submitted your daily reports.</p>
            </div>
        );
    }

    // --- UI COMPONENTS ---


    if (isTodayOpen) {
        return (
            <div className="space-y-8">
                {/* Top Card Switcher */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button
                        onClick={() => setReportType('daily')}
                        className={`relative p-6 rounded-[2rem] text-left transition-all duration-300 group overflow-hidden ${reportType === 'daily'
                            ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-2xl shadow-slate-900/30 scale-[1.02] ring-4 ring-slate-900/10'
                            : 'bg-white text-slate-500 border border-slate-100 hover:border-slate-300 hover:shadow-xl hover:scale-[1.01]'
                            }`}
                    >
                        <div className="relative z-10 flex items-start justify-between">
                            <div>
                                <div className={`p-3 rounded-2xl w-fit mb-4 transition-colors ${reportType === 'daily' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'}`}>
                                    <Calendar size={28} strokeWidth={2.5} />
                                </div>
                                <h3 className={`text-xl font-black mb-1 ${reportType === 'daily' ? 'text-white' : 'text-slate-800'}`}>Closing Day</h3>
                                <p className={`text-xs font-bold uppercase tracking-widest ${reportType === 'daily' ? 'text-slate-400' : 'text-slate-400'}`}>Final Summary</p>
                            </div>
                            {reportType === 'daily' && <ChevronRight size={20} className="text-white bg-white/20 rounded-full p-1" />}
                        </div>
                    </button>

                    <button
                        onClick={() => setReportType('project')}
                        className={`relative p-6 rounded-[2rem] text-left transition-all duration-300 group overflow-hidden ${reportType === 'project'
                            ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-2xl shadow-blue-500/30 scale-[1.02] ring-4 ring-blue-500/10'
                            : 'bg-white text-slate-500 border border-slate-100 hover:border-blue-200 hover:shadow-xl hover:scale-[1.01]'
                            }`}
                    >
                        <div className="relative z-10 flex items-start justify-between">
                            <div>
                                <div className={`p-3 rounded-2xl w-fit mb-4 transition-colors ${reportType === 'project' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                                    <Briefcase size={28} strokeWidth={2.5} />
                                </div>
                                <h3 className={`text-xl font-black mb-1 ${reportType === 'project' ? 'text-white' : 'text-slate-800'}`}>Project Wise</h3>
                                <p className={`text-xs font-bold uppercase tracking-widest ${reportType === 'project' ? 'text-blue-200' : 'text-slate-400'}`}>Detailed Task Logs</p>
                            </div>
                            {reportType === 'project' && <ChevronRight size={20} className="text-white bg-white/20 rounded-full p-1" />}
                        </div>
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {reportType === 'daily' ? (
                        <motion.form
                            key="daily" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            onSubmit={handleClosingSubmit} className="space-y-6"
                        >
                            <Card title="Final Remarks" icon={Clipboard} color="slate">
                                <Label text="Daily Summary / Remarks" />
                                <textarea
                                    name="remarks" value={closingData.remarks} onChange={(e) => setClosingData({ ...closingData, remarks: e.target.value })}
                                    rows="4" className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 font-medium text-sm outline-none resize-none focus:ring-2 ring-slate-100"
                                    placeholder="Write any final notes about your day..."
                                />
                                <div className="mt-4">
                                    <Label text="Daily Notes (for Admin & HR)" />
                                    <textarea
                                        name="notes" value={closingData.notes} onChange={(e) => setClosingData({ ...closingData, notes: e.target.value })}
                                        rows="3" className="w-full bg-blue-50/30 p-4 rounded-2xl border border-blue-100 font-medium text-sm outline-none resize-none focus:ring-2 ring-blue-100"
                                        placeholder="Share daily summary or issues with Admin/HR..."
                                    />
                                </div>
                            </Card>
                            <button type="submit" disabled={isLoading} className="w-full bg-slate-900 hover:bg-black text-white font-bold py-5 rounded-2xl shadow-xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-2">
                                {isLoading ? 'Submitting...' : <><CheckSquare size={18} /> Complete Day & Check-Out</>}
                            </button>
                        </motion.form>
                    ) : (
                        <motion.div
                            key="project" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className="space-y-8"
                        >
                            <div className="bg-white p-8 rounded-[2.5rem] border border-blue-100 shadow-xl shadow-blue-200/20">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-4 bg-blue-50 rounded-2xl text-blue-600">
                                        <Briefcase size={28} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Add Project Entry</h2>
                                        <p className="text-blue-400 font-bold text-xs uppercase tracking-widest">Site Visit Report</p>
                                    </div>
                                </div>

                                <form onSubmit={handleProjectReportSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 focus-within:ring-4 ring-blue-500/10 transition-all">
                                            <Label text="Project Selection" />
                                            <select name="projectId" value={projectReport.projectId} onChange={handleProjectSelect} className="w-full bg-transparent font-bold text-slate-700 outline-none text-lg" required>
                                                <option value="">-- Select Project --</option>
                                                {projects?.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200">
                                            <Label text="Site Location (Area)" />
                                            <input type="text" name="ae_siteLocation" value={projectReport.ae_siteLocation || ''} onChange={handleProjectReportChange} className="w-full bg-transparent font-bold text-slate-700 outline-none" placeholder="Enter Area..." />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Card title="Visit Information" icon={Navigation} color="cyan">
                                            <Label text="Visit Type" />
                                            <div className="flex flex-wrap gap-2">
                                                {visitTypes.map(type => (
                                                    <label key={type} className={`cursor-pointer px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border ${projectReport.ae_visitType.includes(type) ? 'bg-cyan-50 border-cyan-200 text-cyan-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                                        <input type="checkbox" checked={projectReport.ae_visitType.includes(type)} onChange={() => handleMultiSelect('ae_visitType', type)} className="hidden" />
                                                        {type}
                                                    </label>
                                                ))}
                                            </div>
                                            <div className="mt-4 grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label text="Work Stage" />
                                                    <select name="ae_workStage" value={projectReport.ae_workStage} onChange={handleProjectReportChange} className="w-full bg-slate-50 p-2.5 rounded-xl text-xs font-bold text-slate-700 outline-none">
                                                        <option value="">Select...</option>
                                                        {workStages.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <Label text="Process (Task)" />
                                                    <input type="text" name="process" value={projectReport.process || ''} onChange={handleProjectReportChange} className="w-full bg-slate-50 p-2.5 rounded-xl text-xs font-bold text-slate-700 outline-none" placeholder="e.g. Survey" />
                                                </div>
                                            </div>
                                        </Card>

                                        <Card title="Timings & Photos" icon={Clock} color="indigo">
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <Label text="Start Time" />
                                                    <input type="time" name="startTime" value={projectReport.startTime} onChange={handleProjectReportChange} className="w-full bg-slate-50 p-2 rounded-lg text-sm font-bold" />
                                                </div>
                                                <div>
                                                    <Label text="End Time" />
                                                    <input type="time" name="endTime" value={projectReport.endTime} onChange={handleProjectReportChange} className="w-full bg-slate-50 p-2 rounded-lg text-sm font-bold" />
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-100 transition-colors relative">
                                                <input type="file" multiple accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                <Camera className="mx-auto text-slate-400 mb-1" size={20} />
                                                <p className="text-[10px] font-black text-slate-500 uppercase">Upload Photos</p>
                                                <p className="text-[9px] text-slate-400">{projectReport.ae_photos?.length || 0} files selected</p>
                                            </div>
                                            {imagePreviews.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {imagePreviews.map((src, i) => (
                                                        <div key={i} className="w-12 h-12 rounded border border-slate-200 overflow-hidden shadow-sm relative group">
                                                            <img src={src} alt="Preview" className="w-full h-full object-cover" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </Card>
                                    </div>

                                    <Card title="Work details" icon={HardHat} color="amber">
                                        <Label text="Tasks Completed" />
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {tasksList.map(task => (
                                                <label key={task} className={`cursor-pointer px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border ${projectReport.ae_tasksCompleted.includes(task) ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                                    <input type="checkbox" checked={projectReport.ae_tasksCompleted.includes(task)} onChange={() => handleMultiSelect('ae_tasksCompleted', task)} className="hidden" />
                                                    {task}
                                                </label>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <Label text="Measurements" />
                                                <input type="text" name="ae_measurements" value={projectReport.ae_measurements} onChange={handleProjectReportChange} className="w-full bg-slate-50 p-2 rounded-lg text-sm font-bold" placeholder="Details..." />
                                            </div>
                                            <div>
                                                <Label text="Items Installed" />
                                                <input type="text" name="ae_itemsInstalled" value={projectReport.ae_itemsInstalled} onChange={handleProjectReportChange} className="w-full bg-slate-50 p-2 rounded-lg text-sm font-bold" placeholder="#" />
                                            </div>
                                            <div>
                                                <Label text="Site Status" />
                                                <select name="ae_siteStatus" value={projectReport.ae_siteStatus} onChange={handleProjectReportChange} className="w-full bg-slate-50 p-2 rounded-xl text-xs font-bold text-slate-700 outline-none">
                                                    <option value="">Select...</option>
                                                    {siteStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </Card>

                                    <div className={`p-5 rounded-2xl border transition-colors ${projectReport.ae_hasIssues ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'}`}>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2 text-red-600 font-black text-sm uppercase">
                                                <AlertOctagon size={18} /> Issues Found?
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" name="ae_hasIssues" checked={projectReport.ae_hasIssues} onChange={handleProjectReportChange} className="sr-only peer" />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                                            </label>
                                        </div>

                                        <AnimatePresence>
                                            {projectReport.ae_hasIssues && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4 space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <Label text="Issue Type" />
                                                            <select name="ae_issueType" value={projectReport.ae_issueType} onChange={handleProjectReportChange} className="w-full bg-white p-2 text-xs font-bold border border-red-200 rounded-lg">
                                                                <option value="">Select Type</option>
                                                                {issueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <Label text="Raised" />
                                                                <input type="number" name="ae_issuesRaised" value={projectReport.ae_issuesRaised} onChange={handleProjectReportChange} className="w-full bg-white p-2 rounded-lg border border-red-200 text-xs font-bold" />
                                                            </div>
                                                            <div>
                                                                <Label text="Resolved" />
                                                                <input type="number" name="ae_issuesResolved" value={projectReport.ae_issuesResolved} onChange={handleProjectReportChange} className="w-full bg-white p-2 rounded-lg border border-red-200 text-xs font-bold" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <textarea name="ae_issueDescription" value={projectReport.ae_issueDescription} onChange={handleProjectReportChange} rows="2" className="w-full bg-white p-3 rounded-xl border border-red-200 text-sm" placeholder="Describe the issue..."></textarea>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Card title="Next Steps" icon={CornerDownRight} color="purple">
                                            <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                                                <input type="checkbox" name="ae_nextVisitRequired" checked={projectReport.ae_nextVisitRequired} onChange={handleProjectReportChange} className="rounded text-purple-600" />
                                                <span className="text-sm font-bold text-slate-700">Next Visit Required?</span>
                                            </label>
                                            {projectReport.ae_nextVisitRequired && (
                                                <input type="date" name="ae_nextVisitDate" value={projectReport.ae_nextVisitDate} onChange={handleProjectReportChange} className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-bold text-xs" />
                                            )}
                                        </Card>

                                        <Card title="Client Feedback" icon={UserCheck} color="pink">
                                            <label className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-50 cursor-pointer mb-2">
                                                <input type="checkbox" name="ae_clientMet" checked={projectReport.ae_clientMet} onChange={handleProjectReportChange} className="rounded text-pink-600" />
                                                <span className="text-sm font-bold text-slate-700">Client Met?</span>
                                            </label>
                                            {projectReport.ae_clientMet && (
                                                <div className="flex gap-2">
                                                    {['😊', '😐', '😟'].map(feedback => (
                                                        <label key={feedback} className={`flex-1 flex justify-center py-2 rounded-xl border cursor-pointer transition-all ${projectReport.ae_clientFeedback === feedback ? 'bg-pink-50 border-pink-300 shadow-sm' : 'border-slate-100 opacity-50 hover:opacity-100'}`}>
                                                            <input type="radio" name="ae_clientFeedback" value={feedback} checked={projectReport.ae_clientFeedback === feedback} onChange={handleProjectReportChange} className="hidden" />
                                                            <span className="text-2xl filter drop-shadow-sm">{feedback}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </Card>
                                    </div>

                                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[2rem] shadow-xl hover:shadow-blue-200 transition-all flex justify-center items-center gap-3">
                                        <Plus className="bg-white/20 rounded-full p-1" size={24} /> <span className="text-lg">Add Site Entry</span>
                                    </button>
                                </form>
                            </div>

                            {/* List of Today's Entries */}
                            <div className="space-y-4">
                                <h4 className="font-black text-slate-400 text-xs uppercase px-4 flex items-center justify-between">
                                    <span>Today's Site Entries</span>
                                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full">{todayLog?.ae_project_reports ? (typeof todayLog.ae_project_reports === 'string' ? JSON.parse(todayLog.ae_project_reports).length : todayLog.ae_project_reports.length) : 0}</span>
                                </h4>
                                {todayLog && todayLog.ae_project_reports &&
                                    (() => {
                                        try {
                                            const reports = typeof todayLog.ae_project_reports === 'string' ? JSON.parse(todayLog.ae_project_reports) : todayLog.ae_project_reports;
                                            return reports.map((report, idx) => {
                                                const r = typeof report === 'string' ? JSON.parse(report) : report;
                                                return (
                                                    <motion.div
                                                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                                        key={idx} className="bg-white p-5 border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition-shadow flex justify-between items-center group cursor-default"
                                                    >
                                                        <div className="flex-1">
                                                            <p className="font-black text-slate-800 text-base mb-1">{r.clientName || 'Unknown Site'}</p>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{r.process}</span>
                                                                <span className="text-[9px] font-black uppercase text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-md">{r.ae_workStage || 'N/A'}</span>
                                                                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1"><Clock size={10} /> {r.startTime} - {r.endTime}</span>
                                                            </div>
                                                            <div className="flex gap-3 mt-2">
                                                                <span className="text-[9px] text-slate-400 font-bold uppercase">Tasks: {(r.ae_tasksCompleted || []).length}</span>
                                                                <span className="text-[9px] text-slate-400 font-bold uppercase text-indigo-500">Photos: {(r.ae_photos || []).length}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`text-[10px] font-black px-3 py-1 rounded-full ${r.status === 'Completed' || r.ae_siteStatus === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                                {r.status || r.ae_siteStatus || 'N/A'}
                                                            </span>
                                                        </div>
                                                    </motion.div>
                                                );
                                            });
                                        } catch (e) { return null; }
                                    })()}

                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <SuccessModal isOpen={showSuccess} onClose={() => { setShowSuccess(false); if (reportType === 'daily') onSuccess(); }} message={modalMessage} />
                <ConfirmationModal
                    isOpen={confirmationConfig.isOpen}
                    onClose={() => setConfirmationConfig(prev => ({ ...prev, isOpen: false }))}
                    onConfirm={confirmationConfig.onConfirm}
                    title={confirmationConfig.title}
                    message={confirmationConfig.message}
                />
            </div>
        );
    }

    // --- OPENING FORM VIEW (Default) ---
    return (
        <motion.form
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={handleOpeningSubmit} className="space-y-6"
        >
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-3xl text-white shadow-lg shadow-blue-200">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-black text-2xl">Start Day</h3>
                        <p className="text-blue-100 text-sm font-medium mt-1">Check-in at your first site location</p>
                    </div>
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                        <MapPin size={24} className="text-white" />
                    </div>
                </div>
            </div>

            <Card title="Location Details" icon={Navigation} color="blue">
                <Label text="Current Location / Site" />
                <div className="flex gap-2 mb-4">
                    <input type="text" name="ae_siteLocation" value={openingData.ae_siteLocation} onChange={handleOpeningChange} className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200 font-bold text-slate-700 outline-none focus:ring-2 ring-blue-100" placeholder="Enter Area..." required />
                    <button type="button" onClick={captureLocation} className="bg-blue-600 text-white p-3 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors">
                        {locationLoading ? <span className="animate-spin text-sm">⌛</span> : <MapPin size={20} />}
                    </button>
                </div>
                {openingData.ae_gpsCoordinates && (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-green-600 bg-green-50 p-2 rounded-lg border border-green-100">
                        <CheckCircle size={12} /> GPS COORDINATES CAPTURED
                    </div>
                )}
                <Label text="Site Status" />
                <select name="ae_siteStatus" value={openingData.ae_siteStatus} onChange={handleOpeningChange} className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 font-semibold text-sm outline-none">
                    <option value="">Select Status</option>
                    {siteStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </Card>

            <Card title="Daily Plan" icon={Clipboard} color="emerald">
                <textarea name="ae_plannedWork" value={openingData.ae_plannedWork} onChange={handleOpeningChange} rows="3" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium text-sm outline-none resize-none" placeholder="What are your goals for today?" required></textarea>
            </Card>

            <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-xl hover:shadow-2xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-2">
                {isLoading ? 'Starting...' : <><CheckCircle size={20} /> Check In & Start Day</>}
            </button>

            <SuccessModal isOpen={showSuccess} onClose={() => { setShowSuccess(false); }} message={modalMessage} />
            <ConfirmationModal
                isOpen={confirmationConfig.isOpen}
                onClose={() => setConfirmationConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmationConfig.onConfirm}
                title={confirmationConfig.title}
                message={confirmationConfig.message}
            />
        </motion.form>
    );
};

export default AEWorkLogForm;

// --- UI COMPONENTS ---
const Label = ({ icon: Icon, text }) => (
    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 mb-1.5">
        {Icon && <Icon size={12} />} {text}
    </span>
);

const Card = ({ title, icon: Icon, children, color = "blue" }) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
        {title && (
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-50">
                <div className={`p-2 rounded-lg bg-${color}-50 text-${color}-600`}>
                    <Icon size={18} />
                </div>
                <h4 className="text-xs font-black text-slate-600 uppercase tracking-widest leading-none mt-1">{title}</h4>
            </div>
        )}
        <div className="space-y-4">{children}</div>
    </div>
);
