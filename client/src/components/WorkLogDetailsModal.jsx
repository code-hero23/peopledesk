import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { X, Printer, Calendar, Clock, MapPin, User, FileText, CheckCircle2, AlertCircle, Info, ExternalLink } from 'lucide-react';
import { formatDate, formatDateTime } from '../utils/dateUtils';

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
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-white/20 dark:border-slate-800 transition-all">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 transition-colors">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Work Log Details</h2>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-500">{user.name} - {formatDate(WorkLog.date || WorkLog.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrint} className="p-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all text-blue-600 dark:text-blue-400" title="Print Report">
                            <Printer size={20} />
                        </button>
                        <button onClick={onClose} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                            <X size={20} className="text-slate-500 dark:text-slate-400" />
                        </button>
                    </div>
                </div>

                <div ref={componentRef} id="printable-area" className="p-6 overflow-y-auto space-y-6 print-only-visible dark:bg-slate-900 transition-colors custom-scrollbar">
                    {/* Header for Print only */}
                    <div className="hidden print:block mb-6 border-b pb-4">
                        <h1 className="text-2xl font-bold text-slate-800">Daily Work Log Report</h1>
                        <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-slate-600">
                            <p><span className="font-bold">Employee:</span> {user.name} ({user.email})</p>
                            <p><span className="font-bold">Date:</span> {formatDate(WorkLog.date || WorkLog.createdAt)}</p>
                            <p><span className="font-bold">Designation:</span> {user.designation || 'N/A'}</p>
                            <p><span className="font-bold">Generated:</span> {formatDateTime(new Date())}</p>
                        </div>
                    </div>

                    {/* Common Fields */}
                    {WorkLog.remarks && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors break-inside-avoid">
                            <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Remarks</h4>
                            <p className="text-slate-700 dark:text-slate-300 font-medium">{WorkLog.remarks}</p>
                        </div>
                    )}
                    {WorkLog.notes && (
                        <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 transition-colors break-inside-avoid shadow-sm shadow-blue-500/5">
                            <h4 className="text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest mb-2">Daily Notes (for Admin & HR)</h4>
                            <p className="text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap">{WorkLog.notes}</p>
                        </div>
                    )}

                    {/* CRE Section */}
                    {(WorkLog.cre_totalCalls !== null || WorkLog.cre_callBreakdown) && (
                        <div>
                            <h3 className="text-lg font-black text-blue-600 dark:text-blue-400 mb-4 pb-2 border-b border-blue-100 dark:border-blue-900/30 transition-colors">CRE Report</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                <DetailItem label="Total Calls" value={WorkLog.cre_totalCalls} />
                                <DetailItem label="Showroom Visits" value={WorkLog.cre_showroomVisits} />
                                <DetailItem label="FQ Sent" value={WorkLog.cre_fqSent} />
                                <DetailItem label="Orders" value={WorkLog.cre_orders} />
                                <DetailItem label="Proposals" value={WorkLog.cre_proposals} />
                            </div>
                            {WorkLog.cre_callBreakdown && (
                                <div className="mt-4">
                                    <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Call Breakdown</h4>
                                    <p className="text-slate-700 dark:text-slate-300 font-medium bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors">{WorkLog.cre_callBreakdown}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* FA Section */}
                    {(WorkLog.fa_opening_metrics || WorkLog.fa_closing_metrics || WorkLog.fa_calls !== null || WorkLog.fa_designPending !== null) && (
                        <div>
                            <h3 className="text-lg font-black text-blue-600 dark:text-blue-400 mb-4 pb-2 border-b border-blue-100 dark:border-blue-900/30 transition-colors">FA Daily Report</h3>

                            {/* New JSON Structure Handling */}
                            {WorkLog.fa_opening_metrics && (
                                <div className="mb-6">
                                    <h4 className="text-md font-black text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2 transition-colors">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Opening Targets
                                    </h4>
                                    {renderFAMetrics(typeof WorkLog.fa_opening_metrics === 'string' ? JSON.parse(WorkLog.fa_opening_metrics) : WorkLog.fa_opening_metrics)}
                                </div>
                            )}

                            {WorkLog.fa_closing_metrics && (
                                <div className="mb-6">
                                    <h4 className="text-md font-black text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2 transition-colors">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Closing Achievements
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
                            <h3 className="text-lg font-black text-blue-600 dark:text-blue-400 mb-4 pb-2 border-b border-blue-100 dark:border-blue-900/30 transition-colors">LA Daily Report</h3>

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
                                    <h4 className="text-md font-black text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2 transition-colors">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Closing Metrics
                                    </h4>
                                    {renderLAMetricsTable(typeof WorkLog.la_closing_metrics === 'string' ? JSON.parse(WorkLog.la_closing_metrics) : WorkLog.la_closing_metrics)}
                                </div>
                            )}

                            {/* Project Report Details */}
                            {(WorkLog.la_projectLocation || WorkLog.la_number) && (
                                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 transition-colors">
                                    <h4 className="text-md font-black text-slate-700 dark:text-slate-200 mb-4 transition-colors">Project Details</h4>
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
                                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 transition-colors">
                                    <h4 className="text-md font-black text-slate-700 dark:text-slate-200 mb-4 transition-colors">Project Task Logs</h4>
                                    {(() => {
                                        try {
                                            const reports = typeof WorkLog.la_project_reports === 'string' ? JSON.parse(WorkLog.la_project_reports) : WorkLog.la_project_reports;
                                            return reports.map((report, idx) => {
                                                return (
                                                    <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl mb-6 text-sm border border-slate-100 dark:border-slate-800 transition-colors shadow-sm">
                                                        <div className="flex justify-between items-start mb-4 border-b border-slate-100 dark:border-slate-800 pb-3 transition-colors">
                                                            <h5 className="font-black text-slate-800 dark:text-white text-base tracking-tight transition-colors">{report.clientName}</h5>
                                                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider transition-colors">{report.process}</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                                            <DetailItem label="Time" value={`${report.startTime} - ${report.endTime}`} />
                                                            <DetailItem label="Images (C/P)" value={`${report.completedImages} / ${report.pendingImages}`} />
                                                            <DetailItem label="Hours" value={report.totalHours} />
                                                            <DetailItem label="Site" value={report.site} />
                                                        </div>
                                                        {report.remarks && <p className="text-slate-600 dark:text-slate-400 italic border-l-4 border-slate-300 dark:border-slate-700 pl-4 mb-4 font-medium transition-colors">{report.remarks}</p>}

                                                        {/* Nested Details */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {report.onlineMeetings && report.onlineMeetings.length > 0 && renderTable("Online Meetings", report.onlineMeetings)}
                                                            {report.showroomMeetings && report.showroomMeetings.length > 0 && renderTable("Showroom Meetings", report.showroomMeetings)}
                                                            {report.measurements && report.measurements.length > 0 && renderTable("Measurements", report.measurements)}

                                                            {/* Requirements List */}
                                                            {report.requirements && report.requirements.length > 0 && (
                                                                <div className="mt-4">
                                                                    <h5 className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-2 transition-colors">Requirements</h5>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {report.requirements.map((req, rI) => (
                                                                            <span key={rI} className="bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400 px-2.5 py-1 rounded-lg border border-pink-100 dark:border-pink-900/30 text-xs font-bold transition-colors">{req}</span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Colours List */}
                                                            {report.colours && report.colours.length > 0 && (
                                                                <div className="mt-4">
                                                                    <h5 className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-2 transition-colors">Colours</h5>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {report.colours.map((col, cI) => (
                                                                            <span key={cI} className="bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 px-2.5 py-1 rounded-lg border border-teal-100 dark:border-teal-900/30 text-xs font-bold transition-colors">{col}</span>
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
                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 transition-colors">
                            <h4 className="text-md font-black text-white mb-4 bg-blue-600 dark:bg-blue-700 px-4 py-2 rounded-xl transition-colors">Project Task Logs</h4>
                            {(() => {
                                try {
                                    const reports = typeof WorkLog.ae_project_reports === 'string' ? JSON.parse(WorkLog.ae_project_reports) : WorkLog.ae_project_reports;
                                    return reports.map((report, idx) => {
                                        const r = typeof report === 'string' ? JSON.parse(report) : report;
                                        return (
                                            <div key={idx} className="bg-blue-50/30 dark:bg-blue-900/10 p-5 rounded-2xl mb-6 text-sm border border-blue-100/50 dark:border-blue-900/30 break-inside-avoid shadow-sm transition-colors">
                                                <div className="flex justify-between items-start mb-4 border-b border-blue-100 dark:border-blue-900/30 pb-3 transition-colors">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase text-blue-400 dark:text-blue-500 mb-0.5">Project Site Visit #{idx + 1}</p>
                                                        <h5 className="font-black text-slate-800 dark:text-white text-base tracking-tight transition-colors">{r.clientName || r.projectName}</h5>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider transition-colors">{r.process}</span>
                                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-tight">({r.startTime} - {r.endTime})</span>
                                                        </div>
                                                    </div>
                                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider transition-colors ${r.status === 'Completed' || r.ae_siteStatus === 'Completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50'}`}>
                                                        {r.status || r.ae_siteStatus || 'N/A'}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                    <DetailItem label="Work Stage" value={r.ae_workStage || r.workStage} />
                                                    <DetailItem label="Measurements" value={r.ae_measurements || r.measurements} />
                                                    <DetailItem label="Items Installed" value={r.ae_itemsInstalled || r.itemsInstalled} />
                                                    <div className="col-span-2 md:col-span-1">
                                                        <span className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">Tasks</span>
                                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                                            {Array.isArray(r.ae_tasksCompleted || r.tasksCompleted) ? (r.ae_tasksCompleted || r.tasksCompleted).map((t, ti) => (
                                                                <span key={ti} className="bg-white dark:bg-slate-800 border dark:border-slate-700 text-[10px] px-2 py-0.5 rounded-lg text-slate-600 dark:text-slate-300 font-bold transition-colors">{t}</span>
                                                            )) : <span className="text-slate-700 dark:text-slate-300 font-medium">{r.ae_tasksCompleted || r.tasksCompleted}</span>}
                                                        </div>
                                                    </div>
                                                </div>

                                                {(r.ae_hasIssues || r.hasIssues) && (
                                                    <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30 mb-4 transition-colors">
                                                        <p className="text-[10px] font-black text-red-500 dark:text-red-400 uppercase tracking-widest mb-1 transition-colors">Alert: Site Issues</p>
                                                        <p className="text-xs font-bold text-red-700 dark:text-red-300 italic transition-colors">"{r.ae_issueDescription || r.issueDescription}"</p>
                                                    </div>
                                                )}

                                                {/* Photos for this project */}
                                                {((report.ae_photos && report.ae_photos.length > 0) || (r.ae_photos && r.ae_photos.length > 0)) && (
                                                    <div className="mt-4">
                                                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 transition-colors">Project Photos</p>
                                                        <div className="flex flex-wrap gap-3">
                                                            {(report.ae_photos || r.ae_photos).map((photo, pIdx) => (
                                                                <div key={pIdx} className="w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 shadow-sm hover:scale-105 transition-all cursor-pointer">
                                                                    <img
                                                                        src={`${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}${photo}`}
                                                                        alt={`Site Photo`}
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

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end transition-colors">
                    <button onClick={onClose} className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-black uppercase text-xs tracking-wider hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95">
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
        <div className="transition-all">
            <span className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{label}</span>
            <span className="block text-slate-800 dark:text-slate-200 font-bold transition-colors">{value || '-'}</span>
            {sub && <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-bold italic mt-1 leading-relaxed">{sub}</span>}
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
        <div className="mt-4">
            <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 transition-colors">{title}</h5>
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden text-xs bg-white dark:bg-slate-900 shadow-sm transition-colors">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-black text-[9px] tracking-wider transition-colors">
                        <tr>
                            {headers.map(h => {
                                // Format header: camelCase to Title Case
                                const label = h.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                return <th key={h} className="px-4 py-3">{label}</th>;
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
                        {data.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                {headers.map(h => <td key={h} className="px-4 py-3 border-r border-slate-100 dark:border-slate-800 last:border-r-0 text-slate-700 dark:text-slate-300 font-bold">{row[h]}</td>)}
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
        <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden text-sm bg-white dark:bg-slate-900 shadow-sm transition-colors">
            <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-wider transition-colors">
                    <tr>
                        <th className="px-4 py-3 w-1/3">Category</th>
                        <th className="px-4 py-3 w-24 text-center">Count</th>
                        <th className="px-4 py-3">Details</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
                    {Object.entries(metrics).map(([key, value]) => (
                        <tr key={key} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-3 font-black text-slate-600 dark:text-slate-400 text-[10px] uppercase tracking-wider transition-colors">{labels[key] || key}</td>
                            <td className="px-4 py-3 text-center font-mono font-black text-slate-800 dark:text-white transition-colors">{value.count || '-'}</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-medium transition-colors">{value.details || '-'}</td>
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
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors">
                    <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Call Star Ratings</h5>
                    <div className="flex flex-wrap gap-4 font-mono font-black text-slate-700 dark:text-slate-300 transition-colors">
                        {Object.entries(metrics.calls)
                            .filter(([_, count]) => count && count !== '0')
                            .map(([key, count]) => {
                                const starNum = key.replace('Star', '*');
                                return <span key={key} className="text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded border dark:border-slate-700 shadow-sm transition-colors">{starNum}: <span className="text-blue-600 dark:text-blue-400 font-bold">{count}</span></span>;
                            })}
                        {Object.values(metrics.calls).every(v => !v || v === '0') && <span className="text-[10px] text-slate-300 dark:text-slate-600 italic">No calls logged</span>}
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
