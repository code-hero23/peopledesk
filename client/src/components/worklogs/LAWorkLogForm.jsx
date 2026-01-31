import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog, closeWorkLog, getTodayLogStatus, addProjectReport } from '../../features/employee/employeeSlice';
import { getProjects } from '../../features/projects/projectSlice'; // Correct path
import SuccessModal from '../SuccessModal';

const LAWorkLogForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { isLoading, todayLog } = useSelector((state) => state.employee);
    const { projects } = useSelector((state) => state.projects); // Corrected selector
    const [showSuccess, setShowSuccess] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [reportType, setReportType] = useState('daily'); // 'daily', 'project'

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
        projectId: '', // For linking
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

    // Helper for nested state
    const updateMetrics = (setter, key, field, value) => {
        setter(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                [field]: value
            }
        }));
    };

    const handleOpeningSubmit = (e) => {
        e.preventDefault();
        const payload = {
            logStatus: 'OPEN',
            la_opening_metrics: openingData
        };
        dispatch(createWorkLog(payload)).then((res) => {
            if (!res.error) {
                setModalMessage("Opening Report Submitted! Day started.");
                setShowSuccess(true);
            }
        });
    };

    const handleClosingSubmit = (e) => {
        e.preventDefault();
        const payload = {
            la_closing_metrics: closingData
        };
        dispatch(closeWorkLog(payload)).then((res) => {
            if (!res.error) {
                setModalMessage("Closing Report Submitted! Day ended.");
                setShowSuccess(true);
            }
        });
    };

    const handleProjectReportSubmit = (e) => {
        e.preventDefault();

        // Calculate total hours if start/end time present
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
                setActiveTab('dashboard');
                // Reset form
                setProjectReport({
                    date: new Date().toISOString().split('T')[0],
                    projectId: '', clientName: '', site: '', process: '',
                    imageCount: '', startTime: '', endTime: '',
                    completedImages: '', pendingImages: '', remarks: ''
                });
            }
        });
    };

    // Auto-fill client/site when Project selected
    const handleProjectSelect = (e) => {
        const pId = e.target.value;
        const selected = projects.find(p => p.id === parseInt(pId));
        if (selected) {
            setProjectReport(prev => ({
                ...prev,
                projectId: pId,
                clientName: selected.name,
                site: selected.location || ''
                // Add validation/guards
            }));
        } else {
            setProjectReport(prev => ({ ...prev, projectId: pId }));
        }
    };

    // 3. OPENING FORM (Default) / MAIN VIEW
    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="space-y-4">
            {/* Report Type Selector */}
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-sm font-bold text-slate-700">Report Type:</span>
                <select
                    className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                >
                    <option value="daily">Daily Work Report</option>
                    <option value="project">Project Wise Work Report</option>
                </select>
            </div>

            {/* RENDER BASED ON SELECTION */}
            {reportType === 'daily' && (
                <>
                    {/* If Closed */}
                    {isTodayClosed ? (
                        <div className="bg-green-50 p-8 rounded-lg text-center border border-green-200">
                            <h3 className="text-2xl font-bold text-green-700 mb-2">Day Completed!</h3>
                            <p className="text-green-600">Daily reports submitted.</p>
                        </div>
                    ) : isTodayOpen ? (
                        /* Closing Form */
                        <div className="border-t pt-4">
                            <h3 className="font-bold text-slate-700 mb-4">Daily Closing Report</h3>
                            {renderMetricsForm(closingData, setClosingData, handleClosingSubmit, "Close Day", "green")}
                        </div>
                    ) : (
                        /* Opening Form */
                        <>
                            <h3 className="font-bold text-slate-700 border-b pb-2 mb-4">LA Opening Report</h3>
                            {renderMetricsForm(openingData, setOpeningData, handleOpeningSubmit, "Start Day", "blue")}
                        </>
                    )}
                </>
            )}

            {reportType === 'project' && (
                <>
                    {/* Guard: Can only add project report if day is OPEN */}
                    {!isTodayOpen ? (
                        <div className="p-4 bg-yellow-50 text-yellow-800 rounded border border-yellow-200 text-center text-sm">
                            ⚠️ You must submit the <strong>Daily Opening Report</strong> before adding Project Reports.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h3 className="font-bold text-slate-700">Add Project Report</h3>
                            <form onSubmit={handleProjectReportSubmit} className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Project</label>
                                    <select name="projectId" value={projectReport.projectId} onChange={handleProjectSelect} className="input-field">
                                        <option value="">-- Select Project --</option>
                                        {projects && projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                {/* Rest of Project Form */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Process</label>
                                        <input type="text" value={projectReport.process} onChange={(e) => setProjectReport({ ...projectReport, process: e.target.value })} className="input-field" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Image Count</label>
                                        <input type="number" value={projectReport.imageCount} onChange={(e) => setProjectReport({ ...projectReport, imageCount: e.target.value })} className="input-field" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Time</label>
                                        <input type="time" value={projectReport.startTime} onChange={(e) => setProjectReport({ ...projectReport, startTime: e.target.value })} className="input-field" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Time</label>
                                        <input type="time" value={projectReport.endTime} onChange={(e) => setProjectReport({ ...projectReport, endTime: e.target.value })} className="input-field" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Completed Images</label>
                                        <input type="number" value={projectReport.completedImages} onChange={(e) => setProjectReport({ ...projectReport, completedImages: e.target.value })} className="input-field" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pending Images</label>
                                        <input type="number" value={projectReport.pendingImages} onChange={(e) => setProjectReport({ ...projectReport, pendingImages: e.target.value })} className="input-field" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Remarks</label>
                                    <textarea value={projectReport.remarks} onChange={(e) => setProjectReport({ ...projectReport, remarks: e.target.value })} className="input-field" rows="2"></textarea>
                                </div>
                                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg">Add Report</button>
                            </form>

                            {/* List of Today's Reports */}
                            <div className="mt-4 pt-4 border-t">
                                <h4 className="font-bold text-slate-600 text-xs uppercase mb-2">Today's Project Reports</h4>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {todayLog && todayLog.la_project_reports &&
                                        ((typeof todayLog.la_project_reports === 'string' ? JSON.parse(todayLog.la_project_reports) : todayLog.la_project_reports).map((r, idx) => (
                                            <div key={idx} className="bg-white p-2 border rounded text-xs flex justify-between">
                                                <span>{r.clientName} ({r.process})</span>
                                                <span className="text-slate-400">{r.startTime}-{r.endTime}</span>
                                            </div>
                                        )))}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} message={modalMessage} />

            <style>{`
                .input-field {
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    border: 1px solid #e2e8f0;
                    border-radius: 0.5rem;
                    outline: none;
                    transition: all 0.2s;
                    font-size: 0.875rem;
                }
                .input-field:focus {
                    ring: 2px solid #3b82f6;
                    border-color: #3b82f6;
                }
            `}</style>
        </div>
    );

    function renderMetricsForm(data, setData, onSubmit, btnText, color) {
        const update = (key, field, val) => {
            setData(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } }));
        };

        const fields = [
            { key: 'initial2D', label: 'Initial 2D' },
            { key: 'production2D', label: 'Production 2D' },
            { key: 'revised2D', label: 'Revised 2D' },
            { key: 'fresh3D', label: '3D Fresh' },
            { key: 'revised3D', label: 'Revised 3D' },
            { key: 'estimation', label: 'Estimation' },
            { key: 'woe', label: 'W.O.E' },
            { key: 'onlineDiscussion', label: 'Online Discussion' },
            { key: 'showroomDiscussion', label: 'Showroom Discussion' },
            { key: 'signFromEngineer', label: 'Sign from Engineer' },
        ];

        return (
            <form onSubmit={onSubmit} className="space-y-3 max-h-[70vh] overflow-y-auto px-1">
                {fields.map((f) => (
                    <div key={f.key} className="bg-slate-50 p-2 rounded">
                        <div className="font-bold text-xs text-slate-600 mb-1 uppercase">{f.label}</div>
                        <div className="grid grid-cols-3 gap-2">
                            <input
                                type="number"
                                placeholder="Count"
                                value={data[f.key].count}
                                onChange={(e) => update(f.key, 'count', e.target.value)}
                                className="input-field col-span-1"
                            />
                            <input
                                type="text"
                                placeholder="Details"
                                value={data[f.key].details}
                                onChange={(e) => update(f.key, 'details', e.target.value)}
                                className="input-field col-span-2"
                            />
                        </div>
                    </div>
                ))}

                <button type="submit" className={`w-full bg-${color}-600 hover:bg-${color}-700 text-white font-bold py-3 rounded-lg shadow-lg mt-4`}>
                    {btnText}
                </button>
            </form>
        );
    }
};

export default LAWorkLogForm;
