import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog, closeWorkLog, getTodayLogStatus } from '../../features/employee/employeeSlice';
import {
    MapPin, Camera, AlertTriangle, Calendar, Clock, CheckCircle,
    Navigation, Briefcase, Clipboard, HardHat, UserCheck,
    Wrench, AlertOctagon, CornerDownRight, CheckSquare
} from 'lucide-react';
import SuccessModal from '../SuccessModal';
import { motion, AnimatePresence } from 'framer-motion';

const AEWorkLogForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { attendance, isLoading, todayLog } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);
    const [modalMessage, setModalMessage] = useState('');

    useEffect(() => {
        dispatch(getTodayLogStatus());
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

    // --- CLOSING FORM STATE ---
    const [closingData, setClosingData] = useState({
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
        remarks: ''
    });

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
        const formData = new FormData();
        formData.append('logStatus', 'OPEN');
        formData.append('process', 'Opening Report');
        formData.append('hours', '0');
        formData.append('ae_opening_metrics', JSON.stringify(openingData));
        formData.append('ae_siteLocation', openingData.ae_siteLocation || '');
        formData.append('ae_gpsCoordinates', openingData.ae_gpsCoordinates || '');
        formData.append('ae_siteStatus', openingData.ae_siteStatus || '');
        formData.append('ae_plannedWork', openingData.ae_plannedWork || '');

        dispatch(createWorkLog(formData)).then((res) => {
            if (!res.error) {
                setModalMessage("Day Started! Opening Report Submitted.");
                setShowSuccess(true);
            }
        });
    };

    const handleClosingChange = (e) => {
        const { name, value, type, checked } = e.target;
        setClosingData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleMultiSelect = (field, value) => {
        setClosingData(prev => {
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
        setClosingData(prev => ({
            ...prev,
            ae_photos: files
        }));
    };

    const handleClosingSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('logStatus', 'CLOSED');

        const metrics = { ...closingData, ae_photos: undefined };
        formData.append('ae_closing_metrics', JSON.stringify(metrics));

        formData.append('ae_visitType', JSON.stringify(closingData.ae_visitType));
        formData.append('ae_workStage', closingData.ae_workStage || '');
        formData.append('ae_tasksCompleted', JSON.stringify(closingData.ae_tasksCompleted));
        formData.append('ae_measurements', closingData.ae_measurements || '');
        formData.append('ae_itemsInstalled', closingData.ae_itemsInstalled || '');
        formData.append('ae_issuesRaised', closingData.ae_issuesRaised || '');
        formData.append('ae_issuesResolved', closingData.ae_issuesResolved || '');
        formData.append('ae_hasIssues', closingData.ae_hasIssues);
        formData.append('ae_issueType', closingData.ae_issueType || '');
        formData.append('ae_issueDescription', closingData.ae_issueDescription || '');
        formData.append('ae_nextVisitRequired', closingData.ae_nextVisitRequired);

        if (closingData.ae_nextVisitDate) {
            formData.append('ae_nextVisitDate', closingData.ae_nextVisitDate);
        }

        formData.append('ae_clientMet', closingData.ae_clientMet);
        formData.append('ae_clientFeedback', closingData.ae_clientFeedback || '');
        formData.append('remarks', closingData.remarks || '');
        formData.append('clientName', closingData.clientName || '');

        if (closingData.ae_photos && closingData.ae_photos.length > 0) {
            closingData.ae_photos.forEach(file => {
                formData.append('ae_photos', file);
            });
        }

        dispatch(closeWorkLog(formData)).then((res) => {
            if (!res.error) {
                setModalMessage("Day Ended! Closing Report Submitted.");
                setShowSuccess(true);
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

    if (isTodayOpen) {
        // --- CLOSING FORM ---
        return (
            <motion.form
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                onSubmit={handleClosingSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto px-1"
            >
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-full shadow-sm">
                            <Clock size={20} className="text-blue-600" />
                        </div>
                        <span className="font-bold text-blue-900">Closing Report</span>
                    </div>
                    <span className="text-[10px] font-bold bg-white px-3 py-1 rounded-full text-blue-600 border border-blue-200">ACTIVE</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <Card title="Site & Client Details" icon={MapPin} color="indigo">
                            <Label text="Client / Project Name" />
                            <input type="text" name="clientName" required value={closingData.clientName} onChange={handleClosingChange} className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-100" placeholder="e.g. Acme Corp HQ" />
                        </Card>
                    </div>

                    <Card title="Visit Information" icon={Navigation} color="cyan">
                        <Label text="Visit Type" />
                        <div className="flex flex-wrap gap-2">
                            {visitTypes.map(type => (
                                <label key={type} className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${closingData.ae_visitType.includes(type) ? 'bg-cyan-50 border-cyan-200 text-cyan-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                    <input type="checkbox" checked={closingData.ae_visitType.includes(type)} onChange={() => handleMultiSelect('ae_visitType', type)} className="hidden" />
                                    {type}
                                </label>
                            ))}
                        </div>
                        <div className="mt-4">
                            <Label text="Current Stage" />
                            <select name="ae_workStage" value={closingData.ae_workStage} onChange={handleClosingChange} className="w-full bg-slate-50 p-2.5 rounded-xl text-sm font-semibold text-slate-700 outline-none hover:bg-slate-100">
                                <option value="">Select Stage...</option>
                                {workStages.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </Card>

                    <Card title="Work Summary" icon={HardHat} color="amber">
                        <Label text="Tasks Completed" />
                        <div className="flex flex-wrap gap-2 mb-4">
                            {tasksList.map(task => (
                                <label key={task} className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${closingData.ae_tasksCompleted.includes(task) ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                    <input type="checkbox" checked={closingData.ae_tasksCompleted.includes(task)} onChange={() => handleMultiSelect('ae_tasksCompleted', task)} className="hidden" />
                                    {task}
                                </label>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label text="Measurements" />
                                <input type="text" name="ae_measurements" value={closingData.ae_measurements} onChange={handleClosingChange} className="w-full bg-slate-50 p-2 rounded-lg text-sm font-semibold" placeholder="Details..." />
                            </div>
                            <div>
                                <Label text="Items Installed" />
                                <input type="text" name="ae_itemsInstalled" value={closingData.ae_itemsInstalled} onChange={handleClosingChange} className="w-full bg-slate-50 p-2 rounded-lg text-sm font-semibold" placeholder="#" />
                            </div>
                        </div>
                    </Card>
                </div>

                <div className={`p-5 rounded-2xl border transition-colors ${closingData.ae_hasIssues ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'}`}>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-red-600 font-black text-sm uppercase">
                            <AlertOctagon size={18} /> Issues Found?
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" name="ae_hasIssues" checked={closingData.ae_hasIssues} onChange={handleClosingChange} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                        </label>
                    </div>

                    <AnimatePresence>
                        {closingData.ae_hasIssues && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4 space-y-4">
                                <div>
                                    <Label text="Issue Type" />
                                    <select name="ae_issueType" value={closingData.ae_issueType} onChange={handleClosingChange} className="w-full bg-white p-2.5 rounded-xl text-sm font-semibold border border-red-200">
                                        <option value="">Select Type</option>
                                        {issueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <textarea name="ae_issueDescription" value={closingData.ae_issueDescription} onChange={handleClosingChange} rows="2" className="w-full bg-white p-3 rounded-xl border border-red-200 text-sm" placeholder="Describe the issue..."></textarea>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="number" name="ae_issuesRaised" placeholder="Raised #" value={closingData.ae_issuesRaised} onChange={handleClosingChange} className="bg-white p-2 rounded-lg border border-red-200 text-sm" />
                                    <input type="number" name="ae_issuesResolved" placeholder="Resolved #" value={closingData.ae_issuesResolved} onChange={handleClosingChange} className="bg-white p-2 rounded-lg border border-red-200 text-sm" />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card title="Next Steps" icon={CornerDownRight} color="purple">
                        <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                            <input type="checkbox" name="ae_nextVisitRequired" checked={closingData.ae_nextVisitRequired} onChange={handleClosingChange} className="rounded text-purple-600" />
                            <span className="text-sm font-bold text-slate-700">Next Visit Required?</span>
                        </label>
                        {closingData.ae_nextVisitRequired && (
                            <input type="date" name="ae_nextVisitDate" value={closingData.ae_nextVisitDate} onChange={handleClosingChange} className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-200" />
                        )}
                    </Card>

                    <Card title="Client Feedback" icon={UserCheck} color="pink">
                        <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer mb-2">
                            <input type="checkbox" name="ae_clientMet" checked={closingData.ae_clientMet} onChange={handleClosingChange} className="rounded text-pink-600" />
                            <span className="text-sm font-bold text-slate-700">Client Met?</span>
                        </label>
                        {closingData.ae_clientMet && (
                            <div className="flex gap-2">
                                {['😊', '😐', '😟'].map(feedback => (
                                    <label key={feedback} className={`flex-1 flex justify-center py-2 rounded-xl border cursor-pointer transition-all ${closingData.ae_clientFeedback === feedback ? 'bg-pink-50 border-pink-300 shadow-sm' : 'border-slate-100 opacity-50 hover:opacity-100'}`}>
                                        <input type="radio" name="ae_clientFeedback" value={feedback} checked={closingData.ae_clientFeedback === feedback} onChange={handleClosingChange} className="hidden" />
                                        <span className="text-2xl filter drop-shadow-sm">{feedback}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-100 transition-colors relative">
                    <input type="file" multiple accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <Camera className="mx-auto text-slate-400 mb-2" />
                    <p className="text-xs font-bold text-slate-500 uppercase">Upload Site Photos</p>
                    <p className="text-[10px] text-slate-400">{closingData.ae_photos.length} files selected</p>
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-xl hover:shadow-2xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-2">
                    {isLoading ? 'Submitting...' : <><CheckSquare size={18} /> Complete Day</>}
                </button>

                <SuccessModal isOpen={showSuccess} onClose={() => { setShowSuccess(false); onSuccess(); }} message={modalMessage} />
            </motion.form>
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
        </motion.form>
    );
};

export default AEWorkLogForm;
