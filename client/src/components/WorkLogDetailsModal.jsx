import { X, Printer } from 'lucide-react';


const WorkLogDetailsModal = ({ isOpen, onClose, log }) => {


    // We can use a library or a simple window.print approach. 
    // Since we don't want to install new deps if possible, let's use a simple distinct print window approach 
    // or just style the current modal for print media.
    // simpler: distinct print window.

    const handlePrint = () => {
        const printContent = document.getElementById('printable-area');
        const windowUrl = 'about:blank';
        const uniqueName = new Date();
        const windowName = 'Print' + uniqueName.getTime();
        const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');

        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Work Log Report - ${log?.user?.name || ''}</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <style>
                            body { font-family: sans-serif; padding: 20px; }
                            @media print {
                                .no-print { display: none; }
                            }
                        </style>
                    </head>
                    <body>
                        ${printContent.innerHTML}
                        <script>
                            setTimeout(() => {
                                window.print();
                                window.close();
                            }, 500);
                        </script>
                    </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    if (!isOpen || !log) return null;

    const user = log.user || {};
    const WorkLog = log.workLog || log; // Handle generic log vs daily report structure

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in no-print-overlay">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Work Log Details</h2>
                        <p className="text-sm text-slate-500">{user.name} - {new Date(WorkLog.date || WorkLog.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrint} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-blue-600" title="Print Report">
                            <Printer size={20} />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>
                </div>

                <div id="printable-area" className="p-6 overflow-y-auto space-y-6">
                    {/* Header for Print only */}
                    <div className="hidden print:block mb-6 border-b pb-4">
                        <h1 className="text-2xl font-bold text-slate-800">Daily Work Log Report</h1>
                        <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-slate-600">
                            <p><span className="font-bold">Employee:</span> {user.name} ({user.email})</p>
                            <p><span className="font-bold">Date:</span> {new Date(WorkLog.date || WorkLog.createdAt).toLocaleDateString()}</p>
                            <p><span className="font-bold">Designation:</span> {user.designation || 'N/A'}</p>
                            <p><span className="font-bold">Generated:</span> {new Date().toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Common Fields */}
                    {WorkLog.remarks && (
                        <div className="bg-slate-50 p-4 rounded-lg break-inside-avoid">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Remarks</h4>
                            <p className="text-slate-700">{WorkLog.remarks}</p>
                        </div>
                    )}


                    {/* CRE Section */}
                    {(WorkLog.cre_totalCalls !== null || WorkLog.cre_callBreakdown) && (
                        <div>
                            <h3 className="text-lg font-bold text-blue-600 mb-3 pb-1 border-b">CRE Report</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                <DetailItem label="Total Calls" value={WorkLog.cre_totalCalls} />
                                <DetailItem label="Showroom Visits" value={WorkLog.cre_showroomVisits} />
                                <DetailItem label="FQ Sent" value={WorkLog.cre_fqSent} />
                                <DetailItem label="Orders" value={WorkLog.cre_orders} />
                                <DetailItem label="Proposals" value={WorkLog.cre_proposals} />
                            </div>
                            {WorkLog.cre_callBreakdown && (
                                <div className="mt-4">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">Call Breakdown</h4>
                                    <p className="text-slate-700 bg-slate-50 p-2 rounded">{WorkLog.cre_callBreakdown}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* FA Section */}
                    {(WorkLog.fa_calls !== null || WorkLog.fa_designPending !== null) && (
                        <div>
                            <h3 className="text-lg font-bold text-blue-600 mb-3 pb-1 border-b">FA Report</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                <DetailItem label="Follow-up Calls" value={WorkLog.fa_calls} />
                                <DetailItem label="Site Visits" value={WorkLog.fa_siteVisits} />
                                <DetailItem label="Design Pending" value={WorkLog.fa_designPending} sub={WorkLog.fa_designPendingClients} />
                                <DetailItem label="Quote Pending" value={WorkLog.fa_quotePending} sub={WorkLog.fa_quotePendingClients} />
                                <DetailItem label="Initial Quote (RN)" value={WorkLog.fa_initialQuoteRn} />
                                <DetailItem label="Revised Quote (RN)" value={WorkLog.fa_revisedQuoteRn} />
                                <DetailItem label="Booking Freezed" value={WorkLog.fa_bookingFreezed} sub={WorkLog.fa_bookingFreezedClients} />
                            </div>
                        </div>
                    )}

                    {/* LA Section */}
                    {(WorkLog.la_projectLocation || WorkLog.la_number || WorkLog.la_opening_metrics || WorkLog.la_closing_metrics) && (
                        <div>
                            <h3 className="text-lg font-bold text-blue-600 mb-3 pb-1 border-b">LA Daily Report</h3>

                            {/* Opening Metrics */}
                            {WorkLog.la_opening_metrics && (
                                <div className="mb-6">
                                    <h4 className="text-md font-bold text-slate-700 mb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span> Opening Metrics
                                    </h4>
                                    {renderLAMetricsTable(typeof WorkLog.la_opening_metrics === 'string' ? JSON.parse(WorkLog.la_opening_metrics) : WorkLog.la_opening_metrics)}
                                </div>
                            )}

                            {/* Closing Metrics */}
                            {WorkLog.la_closing_metrics && (
                                <div className="mb-6">
                                    <h4 className="text-md font-bold text-slate-700 mb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Closing Metrics
                                    </h4>
                                    {renderLAMetricsTable(typeof WorkLog.la_closing_metrics === 'string' ? JSON.parse(WorkLog.la_closing_metrics) : WorkLog.la_closing_metrics)}
                                </div>
                            )}

                            {/* Project Report Details */}
                            {(WorkLog.la_projectLocation || WorkLog.la_number) && (
                                <div className="mt-6 pt-4 border-t border-slate-100">
                                    <h4 className="text-md font-bold text-slate-700 mb-3">Project Details</h4>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                                        <DetailItem label="Project Location" value={WorkLog.la_projectLocation} />
                                        <DetailItem label="Number" value={WorkLog.la_number} />
                                        <DetailItem label="Mail ID" value={WorkLog.la_mailId} />
                                        <DetailItem label="Project Value" value={WorkLog.la_projectValue} />
                                        <DetailItem label="Site Status" value={WorkLog.la_siteStatus} />
                                        <DetailItem label="Special Note" value={WorkLog.la_specialNote} />
                                    </div>

                                    {/* Tables */}
                                    {renderTable("Online Meetings", WorkLog.la_onlineMeeting)}
                                    {renderTable("Showroom Meetings", WorkLog.la_showroomMeeting)}
                                    {renderTable("Measurements", WorkLog.la_measurements)}
                                </div>
                            )}

                            {/* Project Wise Tasks Log (New JSON Structure) */}
                            {WorkLog.la_project_reports && (
                                <div className="mt-6 pt-4 border-t border-slate-100">
                                    <h4 className="text-md font-bold text-slate-700 mb-3">Project Task Logs</h4>
                                    {(() => {
                                        try {
                                            const reports = typeof WorkLog.la_project_reports === 'string' ? JSON.parse(WorkLog.la_project_reports) : WorkLog.la_project_reports;
                                            return reports.map((report, idx) => (
                                                <div key={idx} className="bg-slate-50 p-4 rounded-xl mb-4 text-sm border border-slate-100">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h5 className="font-bold text-slate-800">{report.clientName}</h5>
                                                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded font-bold">{report.process}</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                                        <DetailItem label="Time" value={`${report.startTime} - ${report.endTime}`} />
                                                        <DetailItem label="Images (C/P)" value={`${report.completedImages} / ${report.pendingImages}`} />
                                                        <DetailItem label="Hours" value={report.totalHours} />
                                                        <DetailItem label="Site" value={report.site} />
                                                    </div>
                                                    {report.remarks && <p className="text-slate-600 italic border-l-2 border-slate-300 pl-2 mb-3">{report.remarks}</p>}

                                                    {report.remarks && <p className="text-slate-600 italic border-l-2 border-slate-300 pl-2 mb-3">{report.remarks}</p>}

                                                    {/* Nested Details */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {report.onlineMeetings && report.onlineMeetings.length > 0 && renderTable("Online Meetings", report.onlineMeetings)}
                                                        {report.showroomMeetings && report.showroomMeetings.length > 0 && renderTable("Showroom Meetings", report.showroomMeetings)}
                                                        {report.measurements && report.measurements.length > 0 && renderTable("Measurements", report.measurements)}

                                                        {/* Requirements List */}
                                                        {report.requirements && report.requirements.length > 0 && (
                                                            <div className="mt-3">
                                                                <h5 className="text-xs font-bold text-slate-500 uppercase mb-1">Requirements</h5>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {report.requirements.map((req, rI) => (
                                                                        <span key={rI} className="bg-pink-50 text-pink-700 px-2 py-1 rounded border border-pink-100 text-xs">{req}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Colours List */}
                                                        {report.colours && report.colours.length > 0 && (
                                                            <div className="mt-3">
                                                                <h5 className="text-xs font-bold text-slate-500 uppercase mb-1">Colours</h5>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {report.colours.map((col, cI) => (
                                                                        <span key={cI} className="bg-teal-50 text-teal-700 px-2 py-1 rounded border border-teal-100 text-xs">{col}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ));
                                        } catch (e) { return <p className="text-red-400 text-xs">Error parsing project logs</p> }
                                    })()}
                                </div>
                            )}
                        </div>
                    )}

                    {/* AE Section */}
                    {(WorkLog.ae_siteLocation || WorkLog.ae_siteStatus) && (
                        <div>
                            <h3 className="text-lg font-bold text-blue-600 mb-3 pb-1 border-b">AE Report</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                <DetailItem label="Site Location" value={WorkLog.ae_siteLocation} />
                                <DetailItem label="GPS Coordinates" value={WorkLog.ae_gpsCoordinates} />
                                <DetailItem label="Site Status" value={WorkLog.ae_siteStatus} />
                                <DetailItem label="Work Stage" value={WorkLog.ae_workStage} />
                                <DetailItem label="Client Met?" value={WorkLog.ae_clientMet ? 'Yes' : 'No'} />
                                <DetailItem label="Client Feedback" value={WorkLog.ae_clientFeedback} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Visit Type</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {renderJsonList(WorkLog.ae_visitType)}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Tasks Completed</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {renderJsonList(WorkLog.ae_tasksCompleted)}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 bg-slate-50 p-4 rounded-lg">
                                <DetailItem label="Measurements" value={WorkLog.ae_measurements} />
                                <DetailItem label="Items Installed" value={WorkLog.ae_itemsInstalled} />
                                <DetailItem label="Issues Raised" value={WorkLog.ae_issuesRaised} />
                                <DetailItem label="Issues Resolved" value={WorkLog.ae_issuesResolved} />
                            </div>

                            {WorkLog.ae_hasIssues && (
                                <div className="bg-red-50 p-4 rounded-lg border border-red-100 mb-6 break-inside-avoid">
                                    <h5 className="font-bold text-red-700 mb-2 flex items-center gap-2">⚠️ Issue Reported</h5>
                                    <div className="grid grid-cols-2 gap-4">
                                        <DetailItem label="Type" value={WorkLog.ae_issueType} />
                                        <div>
                                            <span className="block text-xs font-bold text-slate-400 uppercase">Description</span>
                                            <p className="text-slate-800">{WorkLog.ae_issueDescription}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {WorkLog.ae_nextVisitRequired && (
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
                                    <h5 className="font-bold text-blue-700 mb-2">📅 Next Visit Plan</h5>
                                    <div className="grid grid-cols-2 gap-4">
                                        <DetailItem label="Date" value={WorkLog.ae_nextVisitDate ? new Date(WorkLog.ae_nextVisitDate).toLocaleDateString() : '-'} />
                                        <DetailItem label="Planned Work" value={WorkLog.ae_plannedWork} />
                                    </div>
                                </div>
                            )}

                            {/* Photos */}
                            {WorkLog.ae_photos && (
                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 mb-3">Site Photos</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {(() => {
                                            try {
                                                const photos = typeof WorkLog.ae_photos === 'string' ? JSON.parse(WorkLog.ae_photos) : WorkLog.ae_photos;
                                                return Array.isArray(photos) ? photos.map((photo, index) => (
                                                    <a key={index} href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${photo}`} target="_blank" rel="noopener noreferrer" className="block group relative overflow-hidden rounded-lg aspect-square border border-slate-200">
                                                        <img
                                                            src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${photo}`}
                                                            alt={`Site Photo ${index + 1}`}
                                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                        />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                            <span className="bg-white/90 px-3 py-1 rounded text-xs font-bold shadow-sm">View</span>
                                                        </div>
                                                    </a>
                                                )) : <p className="text-sm text-slate-500">Invalid photo data</p>;
                                            } catch (e) {
                                                return <p className="text-sm text-slate-500">Error loading photos</p>;
                                            }
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Dynamic / Custom Fields (e.g. Office Admin, Client Facilitator) */}
                    {WorkLog.customFields && (
                        <div className="space-y-6">
                            {Object.entries(typeof WorkLog.customFields === 'string' ? JSON.parse(WorkLog.customFields) : WorkLog.customFields).map(([tableName, rows], idx) => (
                                <div key={idx}>
                                    {renderTable(tableName, rows)}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Fallback for regular logs */}
                    {!WorkLog.cre_totalCalls && !WorkLog.fa_calls && !WorkLog.la_projectLocation && (
                        <div className="grid grid-cols-2 gap-4">
                            <DetailItem label="Client Name" value={WorkLog.clientName} />
                            <DetailItem label="Site" value={WorkLog.site} />
                            <DetailItem label="Task/Process" value={WorkLog.process || WorkLog.tasks} />
                            <DetailItem label="Timings" value={`${WorkLog.startTime || ''} - ${WorkLog.endTime || ''}`} />
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 font-medium hover:bg-slate-50 transition-colors">
                        Close
                    </button>
                </div>
            </div>
        </div >
    );
};

const DetailItem = ({ label, value, sub }) => {
    if (!value && value !== 0 && !sub) return null;
    return (
        <div>
            <span className="block text-xs font-bold text-slate-400 uppercase">{label}</span>
            <span className="block text-slate-800 font-medium">{value || '-'}</span>
            {sub && <span className="block text-xs text-slate-500 italic mt-1">{sub}</span>}
        </div>
    );

};

const renderTable = (title, data) => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    // Check if it's just a default empty row
    if (data.length === 1 && !data[0].date && !data[0].discussedOn && !data[0].aeName && !data[0].discussion) return null;

    const headers = Object.keys(data[0]).filter(k => k !== 'slNo');

    return (
        <div className="mt-3">
            <h5 className="text-xs font-bold text-slate-500 uppercase mb-1">{title}</h5>
            <div className="border rounded-lg overflow-hidden text-xs bg-white">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase">
                        <tr>
                            {headers.map(h => {
                                // Format header: camelCase to Title Case
                                const label = h.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                return <th key={h} className="px-3 py-2">{label}</th>;
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((row, i) => (
                            <tr key={i}>
                                {headers.map(h => <td key={h} className="px-3 py-2 border-r border-slate-100 last:border-r-0">{row[h]}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const renderLAMetricsTable = (metrics) => {
    if (!metrics) return null;

    // Mapping keys to labels (matching LAWorkLogForm)
    const labels = {
        initial2D: 'Initial 2D',
        production2D: 'Production 2D',
        revised2D: 'Revised 2D',
        fresh3D: 'Fresh 3D',
        revised3D: 'Revised 3D',
        estimation: 'Estimation',
        woe: 'W.O.E',
        onlineDiscussion: 'Online Discussion',
        showroomDiscussion: 'Showroom Discussion',
        signFromEngineer: 'Sign From Engineer'
    };

    return (
        <div className="border rounded-lg overflow-hidden text-sm bg-white">
            <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                        <th className="px-4 py-2 w-1/3">Category</th>
                        <th className="px-4 py-2 w-24 text-center">Count</th>
                        <th className="px-4 py-2">Details</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {Object.entries(metrics).map(([key, value]) => (
                        <tr key={key}>
                            <td className="px-4 py-2 font-bold text-slate-600 text-xs uppercase">{labels[key] || key}</td>
                            <td className="px-4 py-2 text-center font-mono font-bold">{value.count || '-'}</td>
                            <td className="px-4 py-2 text-slate-600">{value.details || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const renderJsonList = (data) => {
    if (!data) return null;
    try {
        const list = typeof data === 'string' ? JSON.parse(data) : data;
        if (!Array.isArray(list)) return null;
        return list.map((item, i) => (
            <span key={i} className="bg-slate-100 px-2 py-1 rounded border text-xs text-slate-600">{item}</span>
        ));
    } catch (e) {
        return null;
    }
};

export default WorkLogDetailsModal;
