import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog } from '../../features/employee/employeeSlice';
import { MapPin, Camera, AlertTriangle, Calendar, Clock, CheckCircle } from 'lucide-react';
import SuccessModal from '../SuccessModal';

const AEWorkLogForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { attendance, isLoading } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);

    // Initial State
    const [formData, setFormData] = useState({
        // Basic
        date: new Date().toISOString().split('T')[0],
        checkInTime: attendance?.date ? new Date(attendance.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        checkOutTime: attendance?.checkoutTime ? new Date(attendance.checkoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Still Working',

        // Site
        clientName: '',
        ae_gpsCoordinates: '',
        ae_siteLocation: '',
        ae_siteStatus: '',

        // Visit Details
        ae_visitType: [], // Multi
        ae_workStage: '',

        // Work Done
        ae_tasksCompleted: [], // Multi
        ae_measurements: '',
        ae_itemsInstalled: '',
        ae_issuesRaised: '',
        ae_issuesResolved: '',

        // Issues
        ae_hasIssues: false,
        ae_issueType: '',
        ae_issueDescription: '',

        // Proof
        ae_photos: [], // Array of filenames

        // Next Action
        ae_nextVisitRequired: false,
        ae_nextVisitDate: '',
        ae_plannedWork: '',

        // Client
        ae_clientMet: false,
        ae_clientFeedback: '',
    });

    const [locationLoading, setLocationLoading] = useState(false);

    // Options
    const siteStatuses = ['New Site', 'Ongoing', 'Handover', 'Hold'];
    const visitTypes = ['Site Inspection', 'Measurement', 'Installation', 'Rectification', 'Meeting with Client', 'Vendor Coordination'];
    const workStages = ['Design', 'Production', 'Installation', 'Finishing'];
    const tasksList = ['Measurement Taken', 'Material Delivered', 'Installation Started', 'Installation Completed', 'Issue Identified', 'Issue Resolved'];
    const issueTypes = ['Design', 'Material', 'Site', 'Client'];

    // Handlers
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleMultiSelect = (field, value) => {
        setFormData(prev => {
            const current = prev[field] || [];
            if (current.includes(value)) {
                return { ...prev, [field]: current.filter(item => item !== value) };
            } else {
                return { ...prev, [field]: [...current, value] };
            }
        });
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
                setFormData(prev => ({
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

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setFormData(prev => ({
            ...prev,
            ae_photos: files // Store actual File objects
        }));
    };

    const calculateHours = () => {
        if (attendance?.date) {
            const start = new Date(attendance.date);
            const end = attendance.checkoutTime ? new Date(attendance.checkoutTime) : new Date();
            const diff = (end - start) / 1000 / 60 / 60;
            return diff.toFixed(2);
        }
        return '0.00';
    };

    const onSubmit = (e) => {
        e.preventDefault();

        const data = new FormData();

        // Append basic fields
        Object.keys(formData).forEach(key => {
            // Arrays and File objects handled separately
            if (key !== 'ae_photos' && key !== 'ae_visitType' && key !== 'ae_tasksCompleted') {
                data.append(key, formData[key]);
            }
        });

        // Computed / Mapped fields
        data.append('hours', calculateHours());
        data.append('projectName', formData.ae_siteLocation || '');
        data.append('site', formData.ae_siteLocation || '');
        data.append('process', formData.ae_workStage || 'Site Visit');
        data.append('tasks', formData.ae_tasksCompleted.join(', '));

        // Append Arrays (as individual fields or JSON string depending on backend expectation)
        // Multer handles 'field[]' or repeated fields nicely, but simplest for backend JSON parsing 
        // might be to send them as JSON strings if the controller expects JSON strings:
        // However, our controller seems to expect them coming in req.body which handles both.
        // Let's stick to appending them individually to match array notation if needed, 
        // OR better yet, let's look at how we implemented the controller.
        // Controller expects: ae_visitType, ae_tasksCompleted as fields.
        // If we send them as repeated fields, multer might put them in req.body as array.
        formData.ae_visitType.forEach(item => data.append('ae_visitType[]', item));
        formData.ae_tasksCompleted.forEach(item => data.append('ae_tasksCompleted[]', item));

        // Append Photos
        formData.ae_photos.forEach(file => {
            data.append('ae_photos', file);
        });

        dispatch(createWorkLog(data)).then(() => {
            setShowSuccess(true);
        });
    };

    return (
        <form onSubmit={onSubmit} className="space-y-6 text-slate-700 max-h-[80vh] overflow-y-auto pr-2">

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
                        <span className="font-semibold">{formData.date}</span>
                    </div>
                    <div>
                        <span className="block text-slate-400 text-xs">Check-in</span>
                        <span className="font-semibold">{formData.checkInTime}</span>
                    </div>
                    <div>
                        <span className="block text-slate-400 text-xs">Total Hours</span>
                        <span className="font-semibold text-blue-600">{calculateHours()} hrs</span>
                    </div>
                </div>
            </div>

            {/* Section 2: Site Details */}
            <div className="space-y-4">
                <h4 className="font-bold text-sm uppercase text-slate-500 border-b pb-1">Site / Project Details</h4>
                <div>
                    <label className="block text-xs font-bold mb-1">Client / Project Name</label>
                    <input type="text" name="clientName" required value={formData.clientName} onChange={handleChange} className="w-full p-2 border rounded-lg" placeholder="Enter Client Name" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold mb-1">Location</label>
                        <div className="flex gap-2">
                            <input type="text" name="ae_siteLocation" value={formData.ae_siteLocation} onChange={handleChange} className="w-full p-2 border rounded-lg" placeholder="Site Area" />
                            <button type="button" onClick={captureLocation} className="bg-blue-100 text-blue-600 p-2 rounded-lg hover:bg-blue-200" title="Capture GPS">
                                {locationLoading ? <span className="animate-spin">⌛</span> : <MapPin size={20} />}
                            </button>
                        </div>
                        {formData.ae_gpsCoordinates && <span className="text-xs text-green-600">GPS: {formData.ae_gpsCoordinates}</span>}
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1">Site Status</label>
                        <select name="ae_siteStatus" value={formData.ae_siteStatus} onChange={handleChange} className="w-full p-2 border rounded-lg bg-white">
                            <option value="">Select Status</option>
                            {siteStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
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
                                    checked={formData.ae_visitType.includes(type)}
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
                            <label key={stage} className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-colors border ${formData.ae_workStage === stage ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                <input
                                    type="radio"
                                    name="ae_workStage"
                                    value={stage}
                                    checked={formData.ae_workStage === stage}
                                    onChange={handleChange}
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
                                    checked={formData.ae_tasksCompleted.includes(task)}
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
                        <input type="text" name="ae_measurements" value={formData.ae_measurements} onChange={handleChange} className="w-full p-2 border rounded-lg" placeholder="Count/Details" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1">Items Installed</label>
                        <input type="text" name="ae_itemsInstalled" value={formData.ae_itemsInstalled} onChange={handleChange} className="w-full p-2 border rounded-lg" placeholder="Count" />
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
                        <input type="checkbox" name="ae_hasIssues" checked={formData.ae_hasIssues} onChange={handleChange} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                        <span className="ml-3 text-sm font-medium text-slate-700">{formData.ae_hasIssues ? 'Yes' : 'No'}</span>
                    </label>
                </div>

                {formData.ae_hasIssues && (
                    <div className="space-y-3 animate-fade-in">
                        <div>
                            <label className="block text-xs font-bold mb-1">Issue Type</label>
                            <select name="ae_issueType" value={formData.ae_issueType} onChange={handleChange} className="w-full p-2 border rounded-lg bg-white">
                                <option value="">Select Type</option>
                                {issueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1">Description</label>
                            <textarea name="ae_issueDescription" value={formData.ae_issueDescription} onChange={handleChange} rows="2" className="w-full p-2 border rounded-lg" maxLength={200} placeholder="Describe the issue (max 200 chars)"></textarea>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold mb-1">Issues Raised</label>
                                <input type="number" name="ae_issuesRaised" value={formData.ae_issuesRaised} onChange={handleChange} className="w-full p-2 border rounded-lg bg-white" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1">Issues Resolved</label>
                                <input type="number" name="ae_issuesResolved" value={formData.ae_issuesResolved} onChange={handleChange} className="w-full p-2 border rounded-lg bg-white" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Section 6: Proof */}
            <div className="space-y-2">
                <h4 className="font-bold text-sm uppercase text-slate-500 border-b pb-1">Proof of Work</h4>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                    <input type="file" multiple accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <Camera className="mx-auto text-slate-400 mb-2" size={32} />
                    <p className="text-sm font-medium text-slate-600">Click to Upload Site Photos</p>
                    <p className="text-xs text-slate-400">Up to 5 photos (GPS auto-tagged)</p>
                    {formData.ae_photos.length > 0 && (
                        <div className="mt-4 text-xs text-left bg-white p-2 rounded border">
                            <strong>Selected:</strong>
                            <ul className="list-disc pl-4 mt-1">
                                {formData.ae_photos.map((file, i) => <li key={i}>{file.name}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Section 7 & 8: Next Action & Client */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                    <h4 className="font-bold text-sm uppercase text-slate-500 border-b pb-1">Next Action</h4>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" name="ae_nextVisitRequired" checked={formData.ae_nextVisitRequired} onChange={handleChange} className="rounded" />
                        Next Visit Required?
                    </label>
                    {formData.ae_nextVisitRequired && (
                        <>
                            <input type="date" name="ae_nextVisitDate" value={formData.ae_nextVisitDate} onChange={handleChange} className="w-full p-2 border rounded-lg" />
                            <input type="text" name="ae_plannedWork" value={formData.ae_plannedWork} onChange={handleChange} className="w-full p-2 border rounded-lg" placeholder="Planned Work" />
                        </>
                    )}
                </div>
                <div className="space-y-3">
                    <h4 className="font-bold text-sm uppercase text-slate-500 border-b pb-1">Client Interaction</h4>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" name="ae_clientMet" checked={formData.ae_clientMet} onChange={handleChange} className="rounded" />
                        Client Met Today?
                    </label>
                    {formData.ae_clientMet && (
                        <div className="flex gap-4">
                            {['😊 Positive', '😐 Neutral', '😟 Negative'].map(feedback => (
                                <label key={feedback} className={`flex-1 text-center p-2 rounded-lg border cursor-pointer hover:bg-slate-50 ${formData.ae_clientFeedback === feedback ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'}`}>
                                    <input type="radio" name="ae_clientFeedback" value={feedback} checked={formData.ae_clientFeedback === feedback} onChange={handleChange} className="hidden" />
                                    <span className="text-sm">{feedback}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={onSuccess} className="flex-1 py-3 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors">
                    Cancel
                </button>
                <button type="submit" disabled={isLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-xl hover:shadow-2xl transition-all transform active:scale-95">
                    {isLoading ? 'Submitting...' : 'Submit Deployment Log'}
                </button>
            </div>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => {
                    setShowSuccess(false);
                    if (onSuccess) onSuccess();
                }}
                message="Work Log Submitted!"
                subMessage="Great work today."
            />
        </form>
    );
};

export default AEWorkLogForm;
