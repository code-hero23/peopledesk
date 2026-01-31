import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog, closeWorkLog, getTodayLogStatus } from '../../features/employee/employeeSlice';
import { MapPin, Camera, AlertTriangle, Calendar, Clock, CheckCircle } from 'lucide-react';
import SuccessModal from '../SuccessModal';

const AEWorkLogForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { attendance, isLoading, todayLog } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [activeTab, setActiveTab] = useState('opening');

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

    // OPENING HANDLERS
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

        // Convert to FormData to be compatible with backend Multer
        const formData = new FormData();
        formData.append('logStatus', 'OPEN');
        formData.append('process', 'Opening Report');
        formData.append('hours', '0');

        // Map Opening Fields
        formData.append('ae_opening_metrics', JSON.stringify(openingData));

        // Map to Root Fields for Backward Compat / Display
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

    // CLOSING HANDLERS
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

        // Prepare Closing Metrics Object
        const metrics = {
            ...closingData,
            ae_photos: undefined // Files handled separately
        };
        formData.append('ae_closing_metrics', JSON.stringify(metrics));

        // Map to Root Fields (for easier backend access/display consistency)
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

        // Handle Photos
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

    // --- RENDER ---

    if (isLoading) return <div className="p-4 text-center">Loading...</div>;

    if (isTodayClosed) {
        return (
            <div className="bg-green-50 p-8 rounded-lg text-center border border-green-200">
                <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
                <h3 className="text-2xl font-bold text-green-700 mb-2">Day Completed!</h3>
                <p className="text-green-600">You have successfully submitted your daily reports.</p>
                <div className="mt-6 p-4 bg-white rounded border text-left text-sm text-slate-600">
                    <p><strong>Opening:</strong> {todayLog.ae_opening_metrics?.ae_plannedWork || 'Submitted'}</p>
                    <p><strong>Closing:</strong> {todayLog.ae_closing_metrics?.clientName || 'Submitted'}</p>
                </div>
            </div>
        );
    }

    if (isTodayOpen) {
        // --- CLOSING FORM VIEW ---
        return (
            <form onSubmit={handleClosingSubmit} className="space-y-6 text-slate-700 max-h-[80vh] overflow-y-auto pr-2">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center justify-between">
                    <span className="font-bold text-blue-800">Day in Progress</span>
                    <span className="text-xs bg-white px-2 py-1 rounded text-blue-600 border">Checked In</span>
                </div>

                {/* Section 2: Site Details for Closing */}
                <div className="space-y-4">
                    <h4 className="font-bold text-sm uppercase text-slate-500 border-b pb-1">Site / Work Summary</h4>
                    <div>
                        <label className="block text-xs font-bold mb-1">Client Visited / Project</label>
                        <input type="text" name="clientName" required value={closingData.clientName} onChange={handleClosingChange} className="w-full p-2 border rounded-lg" placeholder="e.g. Acme Corp" />
                    </div>
                </div>

                {/* Section 3: Visit Details */}
                <div className="space-y-4 bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                    <h4 className="font-bold text-sm uppercase text-slate-500 border-b pb-1">Visit Details</h4>

                    <div>
                        <label className="block text-xs font-bold mb-2">Visit Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            {visitTypes.map(type => (
                                <label key={type} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1 rounded">
                                    <input
                                        type="checkbox"
                                        checked={closingData.ae_visitType.includes(type)}
                                        onChange={() => handleMultiSelect('ae_visitType', type)}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    {type}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold mb-2">Work Stage</label>
                        <div className="flex flex-wrap gap-2">
                            {workStages.map(stage => (
                                <label key={stage} className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-colors border ${closingData.ae_workStage === stage ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                    <input
                                        type="radio"
                                        name="ae_workStage"
                                        value={stage}
                                        checked={closingData.ae_workStage === stage}
                                        onChange={handleClosingChange}
                                        className="hidden"
                                    />
                                    {stage}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Section 4: Work Done */}
                <div className="space-y-4">
                    <h4 className="font-bold text-sm uppercase text-slate-500 border-b pb-1">Work Done</h4>
                    <div>
                        <label className="block text-xs font-bold mb-2">Tasks Completed</label>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            {tasksList.map(task => (
                                <label key={task} className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={closingData.ae_tasksCompleted.includes(task)}
                                        onChange={() => handleMultiSelect('ae_tasksCompleted', task)}
                                        className="rounded text-green-600 focus:ring-green-500"
                                    />
                                    {task}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold mb-1">Measurements Taken</label>
                            <input type="text" name="ae_measurements" value={closingData.ae_measurements} onChange={handleClosingChange} className="w-full p-2 border rounded-lg" placeholder="Count/Details" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">Items Installed</label>
                            <input type="text" name="ae_itemsInstalled" value={closingData.ae_itemsInstalled} onChange={handleClosingChange} className="w-full p-2 border rounded-lg" placeholder="Count" />
                        </div>
                    </div>
                </div>

                {/* Section 5: Issues */}
                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-sm uppercase text-red-600 flex items-center gap-2">
                            <AlertTriangle size={16} /> Any Issues?
                        </h4>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" name="ae_hasIssues" checked={closingData.ae_hasIssues} onChange={handleClosingChange} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                            <span className="ml-3 text-sm font-medium text-slate-700">{closingData.ae_hasIssues ? 'Yes' : 'No'}</span>
                        </label>
                    </div>

                    {closingData.ae_hasIssues && (
                        <div className="space-y-3 animate-fade-in">
                            <div>
                                <label className="block text-xs font-bold mb-1">Issue Type</label>
                                <select name="ae_issueType" value={closingData.ae_issueType} onChange={handleClosingChange} className="w-full p-2 border rounded-lg bg-white">
                                    <option value="">Select Type</option>
                                    {issueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1">Description</label>
                                <textarea name="ae_issueDescription" value={closingData.ae_issueDescription} onChange={handleClosingChange} rows="2" className="w-full p-2 border rounded-lg" maxLength={200} placeholder="Describe the issue"></textarea>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold mb-1">Issues Raised</label>
                                    <input type="number" name="ae_issuesRaised" value={closingData.ae_issuesRaised} onChange={handleClosingChange} className="w-full p-2 border rounded-lg bg-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1">Issues Resolved</label>
                                    <input type="number" name="ae_issuesResolved" value={closingData.ae_issuesResolved} onChange={handleClosingChange} className="w-full p-2 border rounded-lg bg-white" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Section 7 & 8: Next Action & Client */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <h4 className="font-bold text-sm uppercase text-slate-500 border-b pb-1">Next Action</h4>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" name="ae_nextVisitRequired" checked={closingData.ae_nextVisitRequired} onChange={handleClosingChange} className="rounded" />
                            Next Visit Required?
                        </label>
                        {closingData.ae_nextVisitRequired && (
                            <>
                                <input type="date" name="ae_nextVisitDate" value={closingData.ae_nextVisitDate} onChange={handleClosingChange} className="w-full p-2 border rounded-lg" />
                            </>
                        )}
                    </div>
                    <div className="space-y-3">
                        <h4 className="font-bold text-sm uppercase text-slate-500 border-b pb-1">Client Interaction</h4>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" name="ae_clientMet" checked={closingData.ae_clientMet} onChange={handleClosingChange} className="rounded" />
                            Client Met Today?
                        </label>
                        {closingData.ae_clientMet && (
                            <div className="flex gap-4">
                                {['😊', '😐', '😟'].map(feedback => (
                                    <label key={feedback} className={`flex-1 text-center p-2 rounded-lg border cursor-pointer hover:bg-slate-50 ${closingData.ae_clientFeedback === feedback ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'}`}>
                                        <input type="radio" name="ae_clientFeedback" value={feedback} checked={closingData.ae_clientFeedback === feedback} onChange={handleClosingChange} className="hidden" />
                                        <span className="text-xl">{feedback}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-4 border-t">
                    <button type="submit" disabled={isLoading} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg shadow-xl hover:shadow-2xl transition-all transform active:scale-95">
                        {isLoading ? 'Ending Day...' : 'End Day & Submit Report'}
                    </button>
                </div>

                <SuccessModal isOpen={showSuccess} onClose={() => { setShowSuccess(false); onSuccess(); }} message={modalMessage} />
            </form>
        );
    }

    // --- OPENING FORM VIEW (Default) ---
    return (
        <form onSubmit={handleOpeningSubmit} className="space-y-6 text-slate-700 max-h-[80vh] overflow-y-auto pr-2">
            <div>
                <h3 className="font-bold text-xl text-slate-800">Start Your Day</h3>
                <p className="text-slate-500 text-sm">Please submit your opening report to check in.</p>
            </div>

            {/* Section 1: Basic Info */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="font-bold text-sm uppercase text-slate-500 mb-3 flex items-center gap-2">
                    <CheckCircle size={16} /> Basic Info
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="block text-slate-400 text-xs">AE Name</span>
                        <span className="font-semibold">{user?.name}</span>
                    </div>
                    <div>
                        <span className="block text-slate-400 text-xs">Date</span>
                        <span className="font-semibold">{new Date().toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            {/* Section 2: Location & Plan */}
            <div className="space-y-4">
                <h4 className="font-bold text-sm uppercase text-slate-500 border-b pb-1">Check-in Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold mb-1">Current Location / First Site</label>
                        <div className="flex gap-2">
                            <input type="text" name="ae_siteLocation" value={openingData.ae_siteLocation} onChange={handleOpeningChange} className="w-full p-2 border rounded-lg" placeholder="Address or Area" required />
                            <button type="button" onClick={captureLocation} className="bg-blue-100 text-blue-600 p-2 rounded-lg hover:bg-blue-200" title="Capture GPS">
                                {locationLoading ? <span className="animate-spin">⌛</span> : <MapPin size={20} />}
                            </button>
                        </div>
                        {openingData.ae_gpsCoordinates && <span className="text-xs text-green-600 flex items-center gap-1 mt-1"><CheckCircle size={12} /> GPS Captured</span>}
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1">Site Status (Roughly)</label>
                        <select name="ae_siteStatus" value={openingData.ae_siteStatus} onChange={handleOpeningChange} className="w-full p-2 border rounded-lg bg-white">
                            <option value="">Select Status</option>
                            {siteStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1">Planned Work Today</label>
                    <textarea name="ae_plannedWork" value={openingData.ae_plannedWork} onChange={handleOpeningChange} rows="3" className="w-full p-2 border rounded-lg" placeholder="What do you intend to achieve today?" required></textarea>
                </div>
            </div>

            <div className="pt-4 border-t">
                <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-xl hover:shadow-2xl transition-all transform active:scale-95">
                    {isLoading ? 'Starting Day...' : 'Start Day'}
                </button>
            </div>

            <SuccessModal isOpen={showSuccess} onClose={() => { setShowSuccess(false); }} message={modalMessage} />
        </form>
    );
};

export default AEWorkLogForm;
