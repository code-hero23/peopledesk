import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { X, Printer } from 'lucide-react';

const WorkLogDetailsModal = ({ isOpen, onClose, log }) => {
    const componentRef = useRef();

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Work_Log_${log?.user?.name || 'Report'}_${new Date().toISOString().split('T')[0]}`,
    });

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

                <div ref={componentRef} id="printable-area" className="p-6 overflow-y-auto space-y-6 print-only-visible">
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
                    {WorkLog.notes && (
                        <div className="bg-blue-50/50 p-4 rounded-lg break-inside-avoid border border-blue-100">
                            <h4 className="text-xs font-bold text-blue-500 uppercase mb-2">Daily Notes (for Admin & HR)</h4>
                            <p className="text-slate-700 whitespace-pre-wrap">{WorkLog.notes}</p>
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
                    {(WorkLog.fa_opening_metrics || WorkLog.fa_closing_metrics || WorkLog.fa_calls !== null || WorkLog.fa_designPending !== null) && (
                        <div>
                            <h3 className="text-lg font-bold text-blue-600 mb-3 pb-1 border-b">FA Daily Report</h3>

                            {/* New JSON Structure Handling */}
                            {WorkLog.fa_opening_metrics && (
                                <div className="mb-6">
                                    <h4 className="text-md font-bold text-slate-700 mb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span> Opening Targets
                                    </h4>
                                    {renderFAMetrics(typeof WorkLog.fa_opening_metrics === 'string' ? JSON.parse(WorkLog.fa_opening_metrics) : WorkLog.fa_opening_metrics)}
                                </div>
                            )}

                            {WorkLog.fa_closing_metrics && (
                                <div className="mb-6">
                                    <h4 className="text-md font-bold text-slate-700 mb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Closing Achievements
                                    </h4>
                                    {renderFAMetrics(typeof WorkLog.fa_closing_metrics === 'string' ? JSON.parse(WorkLog.fa_closing_metrics) : WorkLog.fa_closing_metrics)}
                                </div>
                            )}

                            {/* Legacy Structure Support */}
                            {(!WorkLog.fa_opening_metrics && !WorkLog.fa_closing_metrics) && (
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                    <DetailItem label="Follow-up Calls" value={WorkLog.fa_calls} />
                                    <DetailItem label="Site Visits" value={WorkLog.fa_siteVisits} />
                                    <DetailItem label="Design Pending" value={WorkLog.fa_designPending} sub={WorkLog.fa_designPendingClients} />
                                    <DetailItem label="Quote Pending" value={WorkLog.fa_quotePending} sub={WorkLog.fa_quotePendingClients} />
                                    <DetailItem label="Initial Quote (RN)" value={WorkLog.fa_initialQuoteRn} />
                                    <DetailItem label="Revised Quote (RN)" value={WorkLog.fa_revisedQuoteRn} />
                                    <DetailItem label="Booking Freezed" value={WorkLog.fa_bookingFreezed} sub={WorkLog.fa_bookingFreezedClients} />
                                </div>
                            )}
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
                                            return reports.map((report, idx) => {
                                                return (
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
                                                );
                                            });
                                        } catch (e) { return <p className="text-red-400 text-xs">Error parsing project logs</p> }
                                    })()}
                                </div>
                            )}
                        </div>
                    )}

                    {/* AE Project Task Logs */}
                    {WorkLog.ae_project_reports && (
                        <div className="mt-6 pt-4 border-t border-slate-100">
                            <h4 className="text-md font-bold text-slate-100 mb-3 bg-blue-600 px-3 py-1 rounded">Project Task Logs</h4>
                            {(() => {
                                try {
                                    const reports = typeof WorkLog.ae_project_reports === 'string' ? JSON.parse(WorkLog.ae_project_reports) : WorkLog.ae_project_reports;
                                    return reports.map((report, idx) => {
                                        const r = typeof report === 'string' ? JSON.parse(report) : report;
                                        return (
                                            <div key={idx} className="bg-blue-50/30 p-4 rounded-xl mb-4 text-sm border border-blue-100/50 break-inside-avoid shadow-sm">
                                                <div className="flex justify-between items-start mb-3 border-b border-blue-100 pb-2">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase text-blue-400 mb-0.5">Project Site Visit #{idx + 1}</p>
                                                        <h5 className="font-black text-slate-800 text-base">{r.clientName || r.projectName}</h5>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-black uppercase">{r.process}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold tracking-tight">({r.startTime} - {r.endTime})</span>
                                                        </div>
                                                    </div>
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${r.status === 'Completed' || r.ae_siteStatus === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                        {r.status || r.ae_siteStatus || 'N/A'}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                    <DetailItem label="Work Stage" value={r.ae_workStage || r.workStage} />
                                                    <DetailItem label="Measurements" value={r.ae_measurements || r.measurements} />
                                                    <DetailItem label="Items Installed" value={r.ae_itemsInstalled || r.itemsInstalled} />
                                                    <div className="col-span-2 md:col-span-1">
                                                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Tasks</span>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {Array.isArray(r.ae_tasksCompleted || r.tasksCompleted) ? (r.ae_tasksCompleted || r.tasksCompleted).map((t, ti) => (
                                                                <span key={ti} className="bg-white border text-[10px] px-1.5 py-0.5 rounded text-slate-600">{t}</span>
                                                            )) : <span className="text-slate-700">{r.ae_tasksCompleted || r.tasksCompleted}</span>}
                                                        </div>
                                                    </div>
                                                </div>

                                                {(r.ae_hasIssues || r.hasIssues) && (
                                                    <div className="bg-red-50 p-3 rounded-lg border border-red-100 mb-3">
                                                        <p className="text-[10px] font-black text-red-400 uppercase mb-1">Alert: Site Issues</p>
                                                        <p className="text-xs font-semibold text-red-700 italic">"{r.ae_issueDescription || r.issueDescription}"</p>
                                                    </div>
                                                )}

                                                {/* Photos for this project */}
                                                {report.ae_photos && report.ae_photos.length > 0 && (
                                                    <div className="mt-3">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Project Photos</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {report.ae_photos.map((photo, pIdx) => (
                                                                <div key={pIdx} className="w-12 h-12 rounded border border-slate-200 overflow-hidden bg-white shadow-sm">
                                                                    <img
                                                                        src={`${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}${photo}`}
                                                                        alt={`Site ${idx + 1} Photo ${pIdx + 1}`}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    });
                                } catch (e) { return <p className="text-red-400 text-xs">Error parsing project logs</p> }
                            })()}
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
                    {!WorkLog.cre_totalCalls && !WorkLog.fa_calls && !WorkLog.la_projectLocation && !WorkLog.ae_project_reports && (
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
        </div>
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

    const headers = Object.keys(data[0]).filter(k =>
        !['slNo', 'id', '_id', 'createdAt', 'updatedAt'].includes(k)
    );

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
        signFromEngineer: 'Sign From Engineer',
        siteVisit: 'Site Visit',
        infurnia: 'Infurnia'
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

const renderFAMetrics = (metrics) => {
    if (!metrics) return null;

    return (
        <div className="space-y-4">
            {/* Call Star Ratings */}
            {metrics.calls && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase mb-2">Call Star Ratings</h5>
                    <div className="flex flex-wrap gap-4 font-mono font-bold text-slate-700">
                        {Object.entries(metrics.calls)
                            .filter(([_, count]) => count && count !== '0')
                            .map(([key, count]) => {
                                const starNum = key.replace('Star', '*');
                                return <span key={key} className="text-xs">{starNum}: <span className="text-blue-600">{count}</span></span>;
                            })}
                        {Object.values(metrics.calls).every(v => !v || v === '0') && <span className="text-[10px] text-slate-300 italic">No calls logged</span>}
                    </div>
                </div>
            )}

            {/* Other Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <DetailItem label="Showroom Visits" value={metrics.showroomVisit} />
                <DetailItem label="Online Discussion" value={metrics.onlineDiscussion} />
                <DetailItem label="Quotation Pending" value={metrics.quotationPending} />
                <DetailItem label="Initial Quote" value={metrics.initialQuote?.count} sub={metrics.initialQuote?.text} />
                <DetailItem label="Revised Quote" value={metrics.revisedQuote?.count} sub={metrics.revisedQuote?.text} />
                <DetailItem label="Infurnia Pending" value={metrics.infurniaPending?.count} sub={`${metrics.infurniaPending?.text1 || ''} ${metrics.infurniaPending?.text2 || ''}`.trim()} />
            </div>
        </div>
    );
};

export default WorkLogDetailsModal;
