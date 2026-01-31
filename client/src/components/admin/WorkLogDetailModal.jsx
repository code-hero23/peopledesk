import Modal from '../Modal';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';

const WorkLogDetailModal = ({ isOpen, onClose, log }) => {
    const printRef = useRef();

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `WorkLog_${log?.user?.name}_${new Date(log?.date).toLocaleDateString().replace(/\//g, '-')}`,
    });

    if (!isOpen || !log) return null;

    // Helper to safely parse JSON or return object
    const safeParse = (data) => {
        if (!data) return null;
        if (typeof data === 'object') return data;
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error("Parse error", e);
            return null;
        }
    };

    // Parse Metrics
    const aeOpening = safeParse(log.ae_opening_metrics);
    const aeClosing = safeParse(log.ae_closing_metrics);

    // LA Metrics (If implemented fully in previous steps, otherwise fallback to root)
    const laOpening = safeParse(log.la_opening_metrics);
    // const laClosing = safeParse(log.la_closing_metrics); // LA detailed are usually root or arrays

    let customFields = {};
    try {
        if (log.customFields) {
            customFields = typeof log.customFields === 'string' ? JSON.parse(log.customFields) : log.customFields;
        }
    } catch (e) { }

    return (
        <Modal title="Work Log Details" onClose={onClose}>
            <div className="flex justify-end mb-4">
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm font-medium"
                >
                    <Printer size={18} /> Print Report
                </button>
            </div>


            <div ref={printRef} className="p-8 bg-white text-slate-900 print:p-8 print:text-black print:w-[210mm] print:h-auto print:mx-auto">
                <style type="text/css" media="print">
                    {`
                        @page { size: A4; margin: 20mm; }
                        body { -webkit-print-color-adjust: exact; }
                        .print-hidden { display: none !important; }
                        .print-break-inside-avoid { break-inside: avoid; }
                    `}
                </style>

                {/* Header for Print */}
                <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-end print:mb-4">
                    <div>
                        <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-800">Daily Work Report</h1>
                        <p className="text-slate-600 font-semibold mt-1 text-lg">{log.user?.name}</p>
                        <p className="text-slate-500 font-medium">{log.user?.designation || log.user?.role}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-slate-900 font-bold text-lg">{new Date(log.date).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <div className="text-sm text-slate-500 mt-1">
                            {log.startTime && log.endTime ? `${log.startTime} - ${log.endTime}` : ''}
                            {log.hours ? ` (${log.hours} Hrs)` : ''}
                        </div>
                    </div>
                </div>


                {/* General Info */}
                <div className="mb-8 grid grid-cols-2 gap-4 text-sm border-b border-slate-100 pb-4">
                    <div><span className="font-semibold text-slate-500">Log Date:</span> {new Date(log.date).toLocaleDateString()}</div>
                    <div><span className="font-semibold text-slate-500">Overall Timings:</span> {log.startTime || '-'} to {log.endTime || '-'} ({log.hours || 0} hrs)</div>
                </div>

                {/* --- OPENING REPORT SECTION --- */}
                <div className="mb-8 break-inside-avoid">
                    <h3 className="text-md font-bold uppercase text-white bg-slate-800 px-3 py-1 inline-block rounded-sm mb-4">Start of Day (Opening)</h3>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">

                        {/* AE Opening */}
                        {aeOpening && (
                            <>
                                <div className="col-span-2 text-blue-600 font-bold border-b border-blue-50 mb-1 pb-1">AE Plan</div>
                                <div><span className="font-semibold text-slate-600">Site Location:</span> {aeOpening.ae_siteLocation || log.ae_siteLocation || '-'}</div>
                                <div><span className="font-semibold text-slate-600">Site Status:</span> {aeOpening.ae_siteStatus || log.ae_siteStatus || '-'}</div>
                                {aeOpening.ae_gpsCoordinates && <div className="col-span-2 text-xs text-slate-400">GPS: {aeOpening.ae_gpsCoordinates}</div>}
                                <div className="col-span-2"><span className="font-semibold text-slate-600">Planned Work:</span> {aeOpening.ae_plannedWork || log.ae_plannedWork || '-'}</div>
                            </>
                        )}

                        {/* CRE Opening */}
                        {log.cre_opening_metrics && (
                            <>
                                <div className="col-span-2 text-blue-600 font-bold border-b border-blue-50 mb-1 pb-1 mt-2">CRE Start of Day</div>
                                {(() => {
                                    const m = typeof log.cre_opening_metrics === 'string' ? JSON.parse(log.cre_opening_metrics) : log.cre_opening_metrics;
                                    return (
                                        <>
                                            <div><span className="font-semibold text-slate-600">Showroom Visit:</span> {m.showroomVisit || '-'}</div>
                                            <div><span className="font-semibold text-slate-600">Online Discussion:</span> {m.onlineDiscussion || '-'}</div>
                                            <div><span className="font-semibold text-slate-600">FP Received:</span> {m.fpReceived || '-'}</div>
                                            <div><span className="font-semibold text-slate-600">FQ Sent:</span> {m.fqSent || '-'}</div>
                                            <div><span className="font-semibold text-slate-600">Orders:</span> {m.noOfOrder || '-'}</div>
                                            <div><span className="font-semibold text-slate-600">Proposals (IQ):</span> {m.noOfProposalIQ || '-'}</div>
                                            <div className="col-span-2 bg-slate-50 p-2 rounded text-xs">
                                                <span className="font-bold">Call Targets:</span> 7*({m.uptoTodayCalls1?.sevenStar}), 6*({m.uptoTodayCalls1?.sixStar}), 5*({m.uptoTodayCalls1?.fiveStar}) | 4*({m.uptoTodayCalls2?.fourStar}), 3*({m.uptoTodayCalls2?.threeStar}), 2*({m.uptoTodayCalls2?.twoStar})
                                            </div>
                                        </>
                                    );
                                })()}
                            </>
                        )}

                        {/* FA Opening */}
                        {log.fa_opening_metrics && (
                            <>
                                <div className="col-span-2 text-blue-600 font-bold border-b border-blue-50 mb-1 pb-1 mt-2">FA Start of Day</div>
                                {(() => {
                                    const m = typeof log.fa_opening_metrics === 'string' ? JSON.parse(log.fa_opening_metrics) : log.fa_opening_metrics;
                                    return (
                                        <>
                                            <div><span className="font-semibold text-slate-600">Showroom Visit:</span> {m.showroomVisit || '-'}</div>
                                            <div><span className="font-semibold text-slate-600">Online Discussion:</span> {m.onlineDiscussion || '-'}</div>
                                            <div><span className="font-semibold text-slate-600">Quotes Pending:</span> {m.quotationPending || '-'}</div>
                                            <div className="col-span-2 text-xs">
                                                <span className="font-semibold">Call Plan:</span> 9*({m.calls?.nineStar}), 8*({m.calls?.eightStar}), 7*({m.calls?.sevenStar})...
                                            </div>
                                        </>
                                    );
                                })()}
                            </>
                        )}

                        {/* LA Opening */}
                        {log.la_opening_metrics && (
                            <>
                                <div className="col-span-2 text-blue-600 font-bold border-b border-blue-50 mb-1 pb-1 mt-2">LA Start of Day</div>
                                {(() => {
                                    const m = typeof log.la_opening_metrics === 'string' ? JSON.parse(log.la_opening_metrics) : log.la_opening_metrics;
                                    // Helper to show only non-empty
                                    const showIf = (label, obj) => (obj?.count || obj?.details) ? (<div><span className="font-semibold text-slate-600">{label}:</span> {obj.count} {obj.details ? `(${obj.details})` : ''}</div>) : null;

                                    return (
                                        <>
                                            {showIf('Initial 2D', m.initial2D)}
                                            {showIf('Production 2D', m.production2D)}
                                            {showIf('Revised 2D', m.revised2D)}
                                            {showIf('Fresh 3D', m.fresh3D)}
                                            {showIf('Revised 3D', m.revised3D)}
                                            {showIf('Estimation', m.estimation)}
                                        </>
                                    );
                                })()}
                            </>
                        )}

                        {/* General / Project Details (Visible if AE Opening is missing OR if generic fields exist) */}
                        {(!aeOpening && !log.cre_opening_metrics && !log.fa_opening_metrics && !log.la_opening_metrics) || (log.projectName || log.clientName || log.process) ? (
                            <>
                                <div className="col-span-2 text-purple-600 font-bold border-b border-purple-50 mb-1 pb-1 mt-2">General Details</div>

                                {log.projectName && <div><span className="font-semibold text-slate-600">Project:</span> {log.projectName}</div>}
                                {log.clientName && <div><span className="font-semibold text-slate-600">Client:</span> {log.clientName}</div>}

                                {(log.site || log.la_projectLocation || laOpening?.la_projectLocation) && (
                                    <div><span className="font-semibold text-slate-600">Location:</span> {log.site || log.la_projectLocation || laOpening?.la_projectLocation}</div>
                                )}

                                {(log.la_number || laOpening?.la_number) && <div><span className="font-semibold text-slate-600">Project No:</span> {log.la_number || laOpening?.la_number}</div>}

                                {(log.process || log.tasks) && (
                                    <div className="col-span-2 mt-2 bg-slate-50 p-2 rounded">
                                        <span className="font-semibold text-slate-600 block mb-1">Process / Tasks:</span>
                                        {log.process} {log.tasks ? ` - ${log.tasks}` : ''}
                                    </div>
                                )}
                            </>
                        ) : null}
                    </div>
                </div>

                {/* --- CLOSING REPORT SECTION --- */}
                <div className="mb-8 break-inside-avoid">
                    <h3 className="text-md font-bold uppercase text-white bg-green-700 px-3 py-1 inline-block rounded-sm mb-4">End of Day (Closing)</h3>

                    {/* Common Closing Info */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm mb-6">
                        {log.remarks && <div className="col-span-2"><span className="font-semibold text-slate-600">Remarks:</span> {log.remarks}</div>}
                        {log.imageCount > 0 && <div><span className="font-semibold text-slate-600">Images:</span> {log.imageCount} Uploaded</div>}
                    </div>

                    {/* AE Closing */}
                    {aeClosing && (
                        <>
                            <div className="col-span-2 text-green-600 font-bold border-b border-green-50 mb-1 pb-1">AE Execution</div>
                            <div><span className="font-semibold text-slate-600">Visit Type:</span> {(() => {
                                if (aeClosing.ae_visitType) return Array.isArray(aeClosing.ae_visitType) ? aeClosing.ae_visitType.join(', ') : aeClosing.ae_visitType;
                                return '-';
                            })()}</div>
                            <div><span className="font-semibold text-slate-600">Work Stage:</span> {aeClosing.ae_workStage || '-'}</div>
                            {aeClosing.ae_measurements && <div><span className="font-semibold text-slate-600">Measurements:</span> {aeClosing.ae_measurements}</div>}
                            {aeClosing.ae_itemsInstalled && <div><span className="font-semibold text-slate-600">Items Installed:</span> {aeClosing.ae_itemsInstalled}</div>}

                            <div className="col-span-2">
                                <span className="font-semibold text-slate-600">Issues:</span> {aeClosing.ae_hasIssues ? <span className="text-red-500 font-bold">Yes</span> : 'No'}
                                {aeClosing.ae_hasIssues && <p className="text-red-500 text-sm mt-1">{aeClosing.ae_issueDescription}</p>}
                            </div>
                            <div className="col-span-2"><span className="font-semibold text-slate-600">Client Feedback:</span> {aeClosing.ae_clientFeedback || '-'}</div>
                        </>
                    )}

                    {/* CRE Closing */}
                    {log.cre_closing_metrics && (
                        <>
                            <div className="col-span-2 text-green-600 font-bold border-b border-green-50 mb-1 pb-1 mt-2">CRE Start of Day</div>
                            {(() => {
                                const m = typeof log.cre_closing_metrics === 'string' ? JSON.parse(log.cre_closing_metrics) : log.cre_closing_metrics;
                                return (
                                    <>
                                        <div><span className="font-semibold text-slate-600">Floor Plans Rx:</span> {m.floorPlanReceived || '-'}</div>
                                        <div><span className="font-semibold text-slate-600">Showroom Visit:</span> {m.showroomVisit || '-'}</div>
                                        <div><span className="font-semibold text-slate-600">Reviews:</span> {m.reviewCollected || '-'}</div>
                                        <div><span className="font-semibold text-slate-600">Quotes Sent:</span> {m.quotesSent || '-'}</div>
                                        <div><span className="font-semibold text-slate-600">Orders:</span> {m.orderCount || '-'}</div>
                                        <div><span className="font-semibold text-slate-600">Proposals:</span> {m.proposalCount || '-'}</div>
                                        <div className="col-span-2 bg-slate-50 p-2 rounded text-xs">
                                            <span className="font-bold">Execution:</span> 8*({m.eightStar}), 7*({m.sevenStar}), 6*({m.sixStar})
                                        </div>
                                    </>
                                );
                            })()}
                        </>
                    )}

                    {/* FA Closing */}
                    {log.fa_closing_metrics && (
                        <>
                            <div className="col-span-2 text-green-600 font-bold border-b border-green-50 mb-1 pb-1 mt-2">FA End of Day</div>
                            {(() => {
                                const m = typeof log.fa_closing_metrics === 'string' ? JSON.parse(log.fa_closing_metrics) : log.fa_closing_metrics;
                                return (
                                    <>
                                        <div><span className="font-semibold text-slate-600">Showroom Visit:</span> {m.showroomVisit || '-'}</div>
                                        <div><span className="font-semibold text-slate-600">Online Discussion:</span> {m.onlineDiscussion || '-'}</div>
                                        <div><span className="font-semibold text-slate-600">Quotes Pending:</span> {m.quotationPending || '-'}</div>
                                        <div className="col-span-2 text-xs">
                                            <span className="font-semibold">Infurnia Pending:</span> {m.infurniaPending?.count} ( {m.infurniaPending?.text1} )
                                        </div>
                                        <div className="col-span-2 text-xs">
                                            <span className="font-semibold">Call Exec:</span> 9*({m.calls?.nineStar}), 8*({m.calls?.eightStar})...
                                        </div>
                                    </>
                                );
                            })()}
                        </>
                    )}


                    {/* LA Closing */}
                    {log.la_closing_metrics && (
                        <>
                            <div className="col-span-2 text-green-600 font-bold border-b border-green-50 mb-1 pb-1 mt-2">LA End of Day</div>
                            {(() => {
                                const m = typeof log.la_closing_metrics === 'string' ? JSON.parse(log.la_closing_metrics) : log.la_closing_metrics;
                                const showIf = (label, obj) => (obj?.count || obj?.details) ? (<div><span className="font-semibold text-slate-600">{label}:</span> {obj.count} {obj.details ? `(${obj.details})` : ''}</div>) : null;

                                return (
                                    <>
                                        {showIf('Initial 2D', m.initial2D)}
                                        {showIf('Production 2D', m.production2D)}
                                        {showIf('Revised 2D', m.revised2D)}
                                        {showIf('Fresh 3D', m.fresh3D)}
                                        {showIf('Revised 3D', m.revised3D)}
                                        {showIf('Estimation', m.estimation)}
                                        {showIf('WOE', m.woe)}
                                        {showIf('Sign', m.signFromEngineer)}
                                    </>
                                );
                            })()}
                        </>
                    )}

                    {/* LA Project Reports (Array) */}
                    {log.la_project_reports && (
                        <div className="col-span-2 mt-2">
                            <div className="text-green-600 font-bold border-b border-green-50 mb-1 pb-1">Project Reports</div>
                            {(() => {
                                const reports = typeof log.la_project_reports === 'string' ? JSON.parse(log.la_project_reports) : log.la_project_reports;
                                if (Array.isArray(reports) && reports.length > 0) {
                                    return (
                                        <div className="space-y-2">
                                            {reports.map((r, i) => (
                                                <div key={i} className="bg-slate-50 p-2 rounded text-xs border border-slate-100">
                                                    <div className="font-bold text-slate-700">{r.clientName} <span className="font-normal text-slate-500">({r.process})</span></div>
                                                    <div>Time: {r.startTime} - {r.endTime} | Images: {r.completedImages}/{r.imageCount}</div>
                                                    {r.remarks && <div className="italic text-slate-500">"{r.remarks}"</div>}
                                                </div>
                                            ))}
                                        </div>
                                    )
                                }
                                return <div className="text-xs text-slate-400">No specific project reports.</div>
                            })()}
                        </div>
                    )}

                    {/* CRE Closing */}
                    {(log.cre_totalCalls !== null || log.cre_showroomVisits !== null) && (
                        <div className="mb-6">
                            <h4 className="font-bold text-blue-700 mb-2 border-b border-blue-100 pb-1">CRE Activity</h4>
                            <div className="grid grid-cols-4 gap-4 mb-3 text-center">
                                <div className="bg-slate-50 p-2 rounded border">
                                    <div className="text-lg font-bold text-blue-600">{log.cre_totalCalls || 0}</div>
                                    <div className="text-xs uppercase text-slate-500">Calls</div>
                                </div>
                                <div className="bg-slate-50 p-2 rounded border">
                                    <div className="text-lg font-bold text-orange-600">{log.cre_showroomVisits || 0}</div>
                                    <div className="text-xs uppercase text-slate-500">Visits</div>
                                </div>
                                <div className="bg-slate-50 p-2 rounded border">
                                    <div className="text-lg font-bold text-emerald-600">{log.cre_proposals || 0}</div>
                                    <div className="text-xs uppercase text-slate-500">Proposals</div>
                                </div>
                                <div className="bg-slate-50 p-2 rounded border">
                                    <div className="text-lg font-bold text-purple-600">{log.cre_orders || 0}</div>
                                    <div className="text-xs uppercase text-slate-500">Orders</div>
                                </div>
                            </div>
                            {log.cre_callBreakdown && <div className="bg-slate-50 p-2 rounded text-sm italic">"{log.cre_callBreakdown}"</div>}
                        </div>
                    )}

                    {/* FA Closing */}
                    {(log.fa_calls !== null || log.fa_showroomVisits !== null) && (
                        <div className="mb-6">
                            <h4 className="font-bold text-blue-700 mb-2 border-b border-blue-100 pb-1">FA Activity</h4>
                            <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                                <div className="border p-2 rounded">
                                    <div className="text-lg font-bold">{log.fa_calls || 0}</div>
                                    <div className="text-xs text-slate-500">Calls</div>
                                </div>
                                <div className="border p-2 rounded">
                                    <div className="text-lg font-bold">{log.fa_showroomVisits || 0}</div>
                                    <div className="text-xs text-slate-500">Showroom Visits</div>
                                </div>
                                <div className="border p-2 rounded">
                                    <div className="text-lg font-bold">{log.fa_siteVisits || 0}</div>
                                    <div className="text-xs text-slate-500">Site Visits</div>
                                </div>
                            </div>
                            <div className="text-sm space-y-1">
                                {log.fa_designPendingClients && <div><b>Design Pending:</b> {log.fa_designPendingClients}</div>}
                                {log.fa_quotePendingClients && <div><b>Quote Pending:</b> {log.fa_quotePendingClients}</div>}
                            </div>
                        </div>
                    )}

                    {/* LA Arrays & Custom Fields */}
                    {[
                        { label: 'Requirements', data: log.la_requirements, cols: ['description', 'remarks'] },
                        { label: 'Colours Used', data: log.la_colours, cols: ['area', 'colour', 'code'] },
                        { label: 'Online Meetings', data: log.la_onlineMeeting, cols: ['date', 'time', 'client', 'agenda'] },
                        { label: 'Showroom Meetings', data: log.la_showroomMeeting, cols: ['date', 'time', 'client', 'outcome'] },
                        { label: 'Measurements', data: log.la_measurements, cols: ['date', 'site', 'details'] },
                        ...Object.entries(customFields).map(([k, v]) => ({ label: k, data: v, isCustom: true }))
                    ].map((section, idx) => {
                        const rows = section.data;
                        if (!rows || (Array.isArray(rows) && rows.length === 0)) return null;
                        const tableRows = Array.isArray(rows) ? rows : [rows];
                        const columns = section.cols || (tableRows[0] ? Object.keys(tableRows[0]) : []);

                        return (
                            <div key={idx} className="mb-6 break-inside-avoid">
                                <h4 className="font-bold text-slate-700 mb-2 border-l-4 border-blue-500 pl-2 text-sm">{section.label}</h4>
                                <table className="w-full border-collapse border border-slate-300 text-xs">
                                    <thead>
                                        <tr className="bg-slate-100">
                                            {columns.map(col => <th key={col} className="border border-slate-300 px-2 py-1 text-left capitalize">{col.replace(/_/g, ' ')}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tableRows.map((row, rIdx) => (
                                            <tr key={rIdx} className="even:bg-slate-50">
                                                {columns.map((col, cIdx) => (
                                                    <td key={cIdx} className="border border-slate-300 px-2 py-1">
                                                        {typeof row[col] === 'object' ? JSON.stringify(row[col]) : row[col]}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Signature */}
                <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between text-xs text-slate-400">
                    <p>Generated by PeopleDesk</p>
                    <p>Signature: __________________________</p>
                </div>
            </div>
        </Modal>
    );
};

export default WorkLogDetailModal;
