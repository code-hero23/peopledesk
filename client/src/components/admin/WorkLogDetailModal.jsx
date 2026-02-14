import Modal from '../Modal';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';

const WorkLogDetailModal = ({ isOpen, onClose, log }) => {
    const componentRef = useRef();

    const handlePrint = useReactToPrint({
        content: null, // Ensure content is null to avoid conflict
        contentRef: componentRef, // Use contentRef for older versions
        documentTitle: `Work_Log_${log?.user?.name || 'Report'}_${new Date().toISOString().split('T')[0]}`,
    });

    if (!isOpen || !log) return null;

    const safelyParseJson = (data) => {
        if (!data) return null;
        if (typeof data === 'object') return data;
        try { return JSON.parse(data); } catch (e) { return null; }
    };

    const customFields = safelyParseJson(log.customFields);
    const aeOpening = safelyParseJson(log.ae_opening_metrics);
    const aeClosing = safelyParseJson(log.ae_closing_metrics);
    const creOpening = safelyParseJson(log.cre_opening_metrics);
    const creClosing = safelyParseJson(log.cre_closing_metrics);
    const faOpening = safelyParseJson(log.fa_opening_metrics);
    const faClosing = safelyParseJson(log.fa_closing_metrics);
    const laOpening = safelyParseJson(log.la_opening_metrics);
    const laClosing = safelyParseJson(log.la_closing_metrics);
    const laReports = safelyParseJson(log.la_project_reports);
    const faReports = safelyParseJson(log.fa_project_reports);
    const aeReports = safelyParseJson(log.ae_project_reports);

    // Common styling for metric cards
    const DataGrid = ({ items }) => (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {items.filter(i => i.value !== null && i.value !== undefined && i.value !== '').map((item, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 p-2 rounded">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{item.label}</p>
                    <p className="text-sm font-bold text-slate-800">{item.value}</p>
                </div>
            ))}
        </div>
    );

    const renderFAStars = (calls) => {
        if (!calls) return null;
        const starOrder = ['nine', 'eight', 'seven', 'six', 'five', 'four', 'three', 'two', 'one'];
        return starOrder.filter(s => calls[`${s}Star`]).map(s => (
            <span key={s}>{s.charAt(0).toUpperCase() + s.slice(1)} ★: <span className="text-blue-600">{calls[`${s}Star`]}</span></span>
        ));
    };

    const SectionHeader = ({ title, colorClass }) => (
        <div className={`mt-8 mb-4 flex items-center gap-3`}>
            <div className={`h-6 w-1 ${colorClass}`}></div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{title}</h3>
        </div>
    );

    return (
        <Modal title="Work Log Details" onClose={onClose}>
            <div className="flex justify-end mb-4">
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-black text-white px-4 py-2 rounded-lg transition-all shadow-md font-bold text-sm"
                >
                    <Printer size={18} /> PRINT REPORT
                </button>
            </div>

            <div ref={componentRef} id="printable-area" className="p-8 bg-white text-slate-900 border border-slate-100 rounded-xl print-only-visible">
                <style type="text/css" media="print">
                    {`
                        @page { size: A4; margin: 15mm; }
                        body { -webkit-print-color-adjust: exact; font-family: sans-serif; }
                        .print-no-break { break-inside: avoid; }
                    `}
                </style>

                {/* Report Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">DAILY WORK REPORT</h1>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded tracking-widest uppercase">
                                {log.user?.designation || log.user?.role}
                            </span>
                            <span className="text-slate-400 text-xs font-bold">|</span>
                            <span className="text-slate-800 font-black text-lg">{log.user?.name}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-black text-slate-900">{new Date(log.date).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p className="text-sm font-bold text-blue-600 mt-1 uppercase tracking-widest">
                            {log.startTime && log.endTime ? `${log.startTime} - ${log.endTime}` : 'Timeline Not Recorded'}
                        </p>
                    </div>
                </div>

                {/* 1. START OF DAY (OPENING) SECTION */}
                <div className="print-no-break">
                    <SectionHeader title="START OF DAY (OPENING)" colorClass="bg-blue-600" />

                    {/* CRE Opening Table */}
                    {(creOpening || log.cre_totalCalls || log.cre_showroomVisits) && (
                        <div className="mb-6">
                            <h4 className="text-[11px] font-black text-blue-600 mb-2 uppercase">METRICS SUMMARY</h4>
                            <DataGrid items={[
                                { label: 'Showroom Visit', value: creOpening?.showroomVisit || log.cre_showroomVisits },
                                { label: 'Online Discussion', value: creOpening?.onlineDiscussion },
                                { label: 'FP Received', value: creOpening?.fpReceived },
                                { label: 'FQ Sent', value: creOpening?.fqSent || log.cre_fqSent },
                                { label: 'No. of Orders', value: creOpening?.noOfOrder || log.cre_orders },
                                { label: 'No. of Proposal (IQ)', value: creOpening?.noOfProposalIQ || log.cre_proposals },
                            ]} />

                            {creOpening && (
                                <div className="mt-4 grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-3 rounded border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Call Plan (Target 1)</p>
                                        <div className="flex justify-between font-black text-slate-800">
                                            <span>7*: <span className="text-blue-600">{creOpening.uptoTodayCalls1?.sevenStar || 0}</span></span>
                                            <span>6*: <span className="text-blue-600">{creOpening.uptoTodayCalls1?.sixStar || 0}</span></span>
                                            <span>5*: <span className="text-blue-600">{creOpening.uptoTodayCalls1?.fiveStar || 0}</span></span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Call Plan (Target 2)</p>
                                        <div className="flex justify-between font-black text-slate-800">
                                            <span>4*: <span className="text-blue-600">{creOpening.uptoTodayCalls2?.fourStar || 0}</span></span>
                                            <span>3*: <span className="text-blue-600">{creOpening.uptoTodayCalls2?.threeStar || 0}</span></span>
                                            <span>2*: <span className="text-blue-600">{creOpening.uptoTodayCalls2?.twoStar || 0}</span></span>
                                        </div>
                                    </div>
                                    {/* Additional Opening Metric */}
                                    {creOpening?.siteMsmtDiscFixed && (
                                        <div className="col-span-2 bg-slate-50 p-2 rounded border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Site Msmt/Disc Fixed</p>
                                            <p className="text-sm font-bold text-slate-800">{creOpening.siteMsmtDiscFixed}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {log.cre_callBreakdown && (
                                <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-100 text-[10px] italic text-slate-600">
                                    <b>Call Breakdown:</b> {log.cre_callBreakdown}
                                </div>
                            )}
                        </div>
                    )}

                    {/* FA Opening */}
                    {(faOpening || log.fa_calls || log.fa_showroomVisits) && (
                        <div className="mb-6">
                            <DataGrid items={[
                                { label: 'Showroom Visit', value: faOpening?.showroomVisit || log.fa_showroomVisits },
                                { label: 'Online Discussion', value: faOpening?.onlineDiscussion || log.fa_onlineDiscussion },
                                { label: 'Quotation Pending', value: faOpening?.quotationPending || log.fa_quotePending },
                                { label: 'Initial Quote', value: faOpening?.initialQuote?.count },
                                { label: 'Revised Quote', value: faOpening?.revisedQuote?.count },
                            ]} />

                            {faOpening?.calls && (
                                <div className="mt-4 p-3 bg-slate-50 rounded border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Target Call Ratings</p>
                                    <div className="flex flex-wrap gap-x-6 gap-y-2 font-black text-[11px] text-slate-800">
                                        {renderFAStars(faOpening.calls)}
                                    </div>
                                </div>
                            )}

                            {faOpening?.infurniaPending && (
                                <div className="mt-3 bg-slate-50 p-3 rounded border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Infurnia Targets</p>
                                    <div className="flex justify-between items-center font-bold">
                                        <span className="text-sm text-blue-600">Count: {faOpening.infurniaPending.count || 0}</span>
                                        <span className="text-[10px] text-slate-500 italic">({faOpening.infurniaPending.text1})</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* AE Opening */}
                    {(aeOpening || log.ae_siteLocation || log.ae_plannedWork) && (
                        <div className="mb-6 space-y-4">
                            <DataGrid items={[
                                { label: 'Site Location', value: aeOpening?.ae_siteLocation || log.ae_siteLocation },
                                { label: 'Site Status', value: aeOpening?.ae_siteStatus || log.ae_siteStatus },
                                { label: 'GPS', value: aeOpening?.ae_gpsCoordinates || log.ae_gpsCoordinates },
                            ]} />
                            <div className="bg-blue-50/50 p-4 border border-blue-100 rounded-lg">
                                <p className="text-[10px] font-black text-blue-400 uppercase mb-1">Planned Work for Today</p>
                                <p className="text-sm font-bold text-slate-800 leading-relaxed italic">"{aeOpening?.ae_plannedWork || log.ae_plannedWork || 'No specific tasks provided'}"</p>
                            </div>
                        </div>
                    )}

                    {/* LA Opening */}
                    {laOpening && (
                        <div className="mb-6">
                            <h4 className="text-[10px] font-black text-blue-600 mb-3 uppercase tracking-tighter">Requested Documents / Plan</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {[
                                    { label: 'Initial 2D', data: laOpening.initial2D },
                                    { label: 'Production 2D', data: laOpening.production2D },
                                    { label: 'Revised 2D', data: laOpening.revised2D },
                                    { label: 'Fresh 3D', data: laOpening.fresh3D },
                                    { label: 'Revised 3D', data: laOpening.revised3D },
                                    { label: 'Estimation', data: laOpening.estimation },
                                    { label: 'WOE', data: laOpening.woe },
                                    { label: 'Online Discussion', data: laOpening.onlineDiscussion },
                                    { label: 'Showroom Discussion', data: laOpening.showroomDiscussion },
                                    { label: 'Sign Engineers', data: laOpening.signFromEngineer },
                                    { label: 'Site Visit', data: laOpening.siteVisit },
                                    { label: 'Infurnia', data: laOpening.infurnia },
                                ].filter(x => x && (x.data?.count > 0 || x.data?.details)).map((item, i) => (
                                    <div key={i} className="bg-slate-50 p-2 rounded border border-slate-200">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[9px] font-black text-slate-400 uppercase">{item.label}</span>
                                            <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 rounded">{item.data.count}</span>
                                        </div>
                                        {item.data.details && <p className="text-[10px] text-slate-600 font-bold break-words whitespace-pre-wrap">{item.data.details}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Generic / Root Details for LA (Fallback) */}
                    {(log.projectName || log.clientName || log.la_number) && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                            <div className="grid grid-cols-2 gap-y-3">
                                <div className="col-span-2 md:col-span-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase">Project / Client Name</p>
                                    <p className="text-sm font-black text-slate-800">{log.projectName || log.clientName || 'N/A'}</p>
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase">Project Number</p>
                                    <p className="text-sm font-black text-slate-800">{log.la_number || 'N/A'}</p>
                                </div>
                                {log.site && (
                                    <div className="col-span-2">
                                        <p className="text-[9px] font-black text-slate-400 uppercase">Site Address</p>
                                        <p className="text-sm font-bold text-slate-700">{log.site}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* CUSTOM FIELDS / ROLE SPECIFIC METRICS */}
                {customFields && (
                    <div className="print-no-break border-t border-slate-100 mt-8 pt-4">
                        <SectionHeader title="ROLE SPECIFIC METRICS" colorClass="bg-purple-600" />

                        {/* Render Simple Key-Values */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                            {Object.entries(customFields)
                                .filter(([_, value]) => typeof value !== 'object' || value === null)
                                .map(([key, value]) => (
                                    <div key={key} className="bg-slate-50 p-3 rounded border border-slate-200">
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{key}</p>
                                        <p className="text-sm font-bold text-slate-800">{value || '-'}</p>
                                    </div>
                                ))}
                        </div>

                        {/* Render List/Table Data (e.g. Account Rows) */}
                        {Object.entries(customFields)
                            .filter(([_, value]) => Array.isArray(value))
                            .map(([key, list]) => (
                                <div key={key} className="mb-6">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase mb-2">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        <table className="w-full text-xs">
                                            <thead className="bg-slate-50 border-b border-slate-200">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-bold text-slate-600 w-12">No.</th>
                                                    {list.length > 0 && Object.keys(list[0]).filter(k => !['_id', 'id', 'createdAt', 'updatedAt'].includes(k)).map((headerKey) => (
                                                        <th key={headerKey} className="px-3 py-2 text-left font-bold text-slate-600 capitalize">
                                                            {headerKey}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {list.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                        <td className="px-3 py-2 text-slate-400 font-bold">{idx + 1}</td>
                                                        {Object.keys(item).filter(k => !['_id', 'id', 'createdAt', 'updatedAt'].includes(k)).map((key) => (
                                                            <td key={key} className="px-3 py-2 font-medium text-slate-800">
                                                                {item[key]}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}

                {/* GENERIC / GENERAL WORK METRICS (For New Roles) */}
                {(!aeOpening && !creOpening && !faOpening && !laOpening && log.process && !customFields) && (
                    <div className="print-no-break border-t border-slate-100 mt-8 pt-4">
                        <SectionHeader title="GENERAL WORK METRICS" colorClass="bg-slate-600" />

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Hours</p>
                                <p className="text-xl font-black text-slate-800">{log.hours || 0} <span className="text-sm text-slate-500 font-bold">hrs</span></p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Images Submitted</p>
                                <p className="text-xl font-black text-slate-800">{log.imageCount || 0}</p>
                                <div className="flex gap-2 text-[9px] font-bold mt-1">
                                    <span className="text-green-600">Considered: {log.completedImages || 0}</span>
                                    <span className="text-orange-600">Pending: {log.pendingImages || 0}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Process / Task Description</p>
                                    <p className="text-sm font-bold text-slate-800 leading-relaxed italic">"{log.process || log.tasks || 'No description provided'}"</p>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Client Name</p>
                                        <p className="text-sm font-black text-slate-800">{log.clientName || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Site / Location</p>
                                        <p className="text-sm font-bold text-slate-700">{log.site || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="print-no-break border-t border-slate-100 mt-8 pt-4">
                    <SectionHeader title="END OF DAY (EXECUTION)" colorClass="bg-emerald-600" />

                    {/* CRE Closing */}
                    {(creClosing || log.cre_floorPlanReceived || log.cre_reviewCollected) && (
                        <div className="mb-6">
                            <DataGrid items={[
                                { label: 'Floor Plans Rx', value: creClosing?.floorPlanReceived || log.cre_floorPlanReceived },
                                { label: 'Showroom Visit', value: creClosing?.showroomVisit || log.cre_showroomVisits },
                                { label: 'Online Discussion', value: creClosing?.onlineDiscussion },
                                { label: 'Review Collection', value: creClosing?.reviewCollected || log.cre_reviewCollected },
                                { label: 'Quotation Sent', value: creClosing?.quotesSent || log.cre_quotesSent },
                                { label: 'First Quote Sent', value: creClosing?.firstQuotationSent },
                                { label: 'No. of Orders', value: creClosing?.orderCount || log.cre_orderCount },
                                { label: 'No. of Proposals', value: creClosing?.proposalCount || log.cre_proposalCount },
                                { label: 'Site Msmt/Disc', value: creClosing?.siteMsmtDisc },
                                { label: 'Calls (Upto Today)', value: creClosing?.uptoTodayCalls || creClosing?.uptoTodayCalls_A },
                                { label: 'WhatsApp Sent', value: creClosing?.whatsappSent },
                            ]} />
                            {creClosing && (
                                <div className="mt-4 bg-emerald-50/50 p-3 rounded border border-emerald-100">
                                    <p className="text-[9px] font-black text-emerald-600 uppercase mb-2">Work Execution Quality (Star Ratings)</p>
                                    <div className="flex flex-wrap gap-4 font-black text-slate-800">
                                        <span>8*: <span className="text-emerald-700">{creClosing.eightStar || 0}</span></span>
                                        <span>7*: <span className="text-emerald-700">{creClosing.sevenStar || 0}</span></span>
                                        <span>6*: <span className="text-emerald-700">{creClosing.sixStar || 0}</span></span>
                                        <span>5*: <span className="text-emerald-700">{creClosing.fiveStar || 0}</span></span>
                                        <span>4*: <span className="text-emerald-700">{creClosing.fourStar || 0}</span></span>
                                        <span>3*: <span className="text-emerald-700">{creClosing.threeStar || 0}</span></span>
                                        <span>2*: <span className="text-emerald-700">{creClosing.twoStar || 0}</span></span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* FA Closing */}
                    {(faClosing || log.fa_calls || log.fa_infurniaPending) && (
                        <div className="mb-6">
                            <DataGrid items={[
                                { label: 'Showroom Visit', value: faClosing?.showroomVisit || log.fa_showroomVisits },
                                { label: 'Online Discussion', value: faClosing?.onlineDiscussion || log.fa_onlineDiscussion },
                                { label: 'Quotation Pending', value: faClosing?.quotationPending || log.fa_quotePending },
                                { label: 'Initial Quote', value: faClosing?.initialQuote?.count },
                                { label: 'Revised Quote', value: faClosing?.revisedQuote?.count },
                            ]} />

                            {faClosing?.calls && (
                                <div className="mt-4 bg-slate-50 p-3 rounded border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Execution Star Ratings</p>
                                    <div className="flex flex-wrap gap-x-6 gap-y-2 font-black text-[11px] text-slate-800">
                                        {renderFAStars(faClosing.calls)}
                                    </div>
                                </div>
                            )}

                            {faClosing?.infurniaPending && (
                                <div className="mt-3 bg-slate-50 p-3 rounded border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Infurnia Achievements</p>
                                    <div className="flex justify-between items-center font-bold">
                                        <span className="text-sm text-emerald-600">Count: {faClosing.infurniaPending.count || 0}</span>
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-500 italic">({faClosing.infurniaPending.text1})</p>
                                            <p className="text-[10px] text-slate-500 italic">({faClosing.infurniaPending.text2})</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* AE Closing */}
                    {(aeClosing || log.ae_visitType || log.ae_workStage) && (
                        <div className="mb-6 space-y-4">
                            <DataGrid items={[
                                { label: 'Visit Type', value: Array.isArray(aeClosing?.ae_visitType || log.ae_visitType) ? (aeClosing?.ae_visitType || log.ae_visitType).join(', ') : (aeClosing?.ae_visitType || log.ae_visitType) },
                                { label: 'Work Stage', value: aeClosing?.ae_workStage || log.ae_workStage },
                                { label: 'Measurements', value: aeClosing?.ae_measurements || log.ae_measurements },
                                { label: 'Installed Items', value: aeClosing?.ae_itemsInstalled || log.ae_itemsInstalled },
                                { label: 'Feedback', value: aeClosing?.ae_clientFeedback || log.ae_clientFeedback },
                            ]} />

                            <div className={`p-4 rounded-xl border ${(aeClosing?.ae_hasIssues || log.ae_hasIssues) ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                                <p className="text-[10px] font-black uppercase mb-1 flex items-center gap-2">
                                    ISSUES & RESOLUTIONS {(aeClosing?.ae_hasIssues || log.ae_hasIssues) && <span className="bg-red-500 text-white px-1.5 rounded-full text-[8px] animate-pulse">ALERT</span>}
                                </p>
                                <p className="text-sm font-bold text-slate-800 leading-relaxed italic">
                                    {(aeClosing?.ae_hasIssues || log.ae_hasIssues) ? (aeClosing?.ae_issueDescription || log.ae_issueDescription) : 'No site issues reported today.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* LA & FA Project Reports Grid (NEW ADDITION) */}
                    {((laReports && Array.isArray(laReports) && laReports.length > 0) || (faReports && Array.isArray(faReports) && faReports.length > 0)) && (
                        <div className="mb-8 print-no-break">
                            <SectionHeader title="PROJECT WISE REPORTS (DETAILED)" colorClass="bg-indigo-600" />
                            <div className="space-y-6">
                                {[...(laReports || []), ...(faReports || [])].map((report, i) => {
                                    const r = typeof report === 'string' ? JSON.parse(report) : report;
                                    return (
                                        <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm break-inside-avoid">
                                            {/* Header */}
                                            <div className="flex flex-wrap md:flex-nowrap border-b border-slate-100 bg-indigo-50/30">
                                                <div className="w-full md:w-1/3 p-4 border-b md:border-b-0 md:border-r border-slate-100">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Client Name</p>
                                                    <p className="text-sm font-black text-slate-800">{r.clientName || 'N/A'}</p>
                                                </div>
                                                <div className="w-1/2 md:w-1/3 p-4 border-r border-slate-100">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Site Location</p>
                                                    <p className="text-sm font-bold text-slate-700">{r.site || 'N/A'}</p>
                                                </div>
                                                <div className="w-1/2 md:w-1/3 p-4">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Timeline</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded">
                                                            {r.startTime || '--:--'} - {r.endTime || '--:--'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Body */}
                                            <div className="p-4 space-y-4">
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Process / Description</p>
                                                    <p className="text-sm font-medium text-slate-800 leading-relaxed italic">"{r.process || 'No description provided'}"</p>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase">Image Count</p>
                                                        <p className="text-[11px] font-bold text-slate-800">{r.imageCount || '-'}</p>
                                                    </div>
                                                </div>

                                                {/* Dynamic Section Grids */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Measurements */}
                                                    {r.measurements && r.measurements.length > 0 && (
                                                        <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                                                            <p className="text-[9px] font-black text-emerald-600 uppercase mb-2">Measurements</p>
                                                            <ul className="list-disc list-inside text-[10px] font-bold text-slate-700 space-y-1">
                                                                {r.measurements.map((m, idx) => <li key={idx}>{m.details}</li>)}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {/* Requirements */}
                                                    {r.requirements && r.requirements.length > 0 && (
                                                        <div className="bg-orange-50/50 p-3 rounded-lg border border-orange-100">
                                                            <p className="text-[9px] font-black text-orange-600 uppercase mb-2">Requirements</p>
                                                            <ul className="list-disc list-inside text-[10px] font-bold text-slate-700 space-y-1">
                                                                {r.requirements.map((m, idx) => <li key={idx}>{m.details}</li>)}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {/* Online Meetings */}
                                                    {r.onlineMeeting && r.onlineMeeting.length > 0 && (
                                                        <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                                            <p className="text-[9px] font-black text-blue-600 uppercase mb-2">Online Meetings</p>
                                                            <ul className="list-disc list-inside text-[10px] font-bold text-slate-700 space-y-1">
                                                                {r.onlineMeeting.map((m, idx) => <li key={idx}>{m.details}</li>)}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {/* Showroom Meetings */}
                                                    {r.showroomMeeting && r.showroomMeeting.length > 0 && (
                                                        <div className="bg-purple-50/50 p-3 rounded-lg border border-purple-100">
                                                            <p className="text-[9px] font-black text-purple-600 uppercase mb-2">Showroom Meetings</p>
                                                            <ul className="list-disc list-inside text-[10px] font-bold text-slate-700 space-y-1">
                                                                {r.showroomMeeting.map((m, idx) => <li key={idx}>{m.details}</li>)}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {/* Colours */}
                                                    {r.colours && r.colours.length > 0 && (
                                                        <div className="bg-pink-50/50 p-3 rounded-lg border border-pink-100">
                                                            <p className="text-[9px] font-black text-pink-600 uppercase mb-2">Colours / Selection</p>
                                                            <ul className="list-disc list-inside text-[10px] font-bold text-slate-700 space-y-1">
                                                                {r.colours.map((m, idx) => <li key={idx}>{m.details}</li>)}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* AE Project Reports Grid */}
                    {aeReports && Array.isArray(aeReports) && aeReports.length > 0 && (
                        <div className="mb-8">
                            <h4 className="text-[10px] font-black text-blue-600 uppercase mb-3">Site Visit Reports (Project Wise)</h4>
                            <div className="space-y-4">
                                {aeReports.map((report, i) => {
                                    const r = typeof report === 'string' ? JSON.parse(report) : report;
                                    return (
                                        <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm break-inside-avoid">
                                            <div className="flex flex-wrap md:flex-nowrap border-b border-slate-100 bg-blue-50/30">
                                                <div className="w-full md:w-1/3 p-4 border-b md:border-b-0 md:border-r border-slate-100">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Client / Project</p>
                                                    <p className="text-sm font-black text-slate-800">{r.clientName || r.projectName}</p>
                                                </div>
                                                <div className="w-1/2 md:w-1/3 p-4 border-r border-slate-100">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Process / Visit Type</p>
                                                    <p className="text-sm font-bold text-slate-700">{r.process} {r.ae_visitType ? `(${Array.isArray(r.ae_visitType) ? r.ae_visitType.join(', ') : r.ae_visitType})` : ''}</p>
                                                </div>
                                                <div className="w-1/2 md:w-1/3 p-4">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Status / Timeline</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${r.status === 'Completed' || r.ae_siteStatus === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                            {r.status || r.ae_siteStatus || 'N/A'}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-bold">({r.startTime} - {r.endTime})</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1 text-xs">Work Details</p>
                                                    <div className="space-y-2">
                                                        <div>
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Stage:</span>
                                                            <span className="ml-2 text-xs font-bold text-slate-800">{r.ae_workStage || r.workStage || r.stage || 'N/A'}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Tasks:</span>
                                                            <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                                                {Array.isArray(r.ae_tasksCompleted || r.tasksCompleted) ? (r.ae_tasksCompleted || r.tasksCompleted).join(', ') : (r.ae_tasksCompleted || r.tasksCompleted || 'N/A')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                                            <p className="text-[8px] font-black text-slate-400 uppercase">Measurements</p>
                                                            <p className="text-[11px] font-bold text-slate-800">{r.ae_measurements || r.measurements || '-'}</p>
                                                        </div>
                                                        <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                                            <p className="text-[8px] font-black text-slate-400 uppercase">Items Installed</p>
                                                            <p className="text-[11px] font-bold text-slate-800">{r.ae_itemsInstalled || r.itemsInstalled || '-'}</p>
                                                        </div>
                                                    </div>
                                                    {(r.ae_hasIssues || r.hasIssues) && (
                                                        <div className="bg-red-50 p-2 rounded border border-red-100">
                                                            <p className="text-[8px] font-black text-red-400 uppercase">Issues Reported</p>
                                                            <p className="text-[11px] font-semibold text-red-700 italic">"{r.ae_issueDescription || r.issueDescription}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                                {r.ae_photos && (Array.isArray(r.ae_photos) ? r.ae_photos : []).length > 0 && (
                                                    <div className="col-span-1 md:col-span-2 mt-2">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Captured Photos ({r.ae_photos.length})</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {r.ae_photos.map((photo, pIdx) => (
                                                                <div key={pIdx} className="w-16 h-16 rounded border border-slate-200 overflow-hidden bg-slate-100 shadow-sm">
                                                                    <img
                                                                        src={photo.startsWith('http') ? photo : `${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}${photo}`}
                                                                        alt={`Site ${i + 1} Photo ${pIdx + 1}`}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Final Remarks */}
                    {log.remarks && (
                        <div className="mt-6 p-4 bg-slate-50 rounded-xl border-l-4 border-slate-800">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Final Remarks / Coordinator Notes</p>
                            <p className="text-sm font-bold text-slate-700 italic">"{log.remarks}"</p>
                        </div>
                    )}
                    {log.notes && (
                        <div className="mt-4 p-4 bg-blue-50/50 rounded-xl border-l-4 border-blue-600">
                            <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Daily Notes (for Admin & HR)</p>
                            <p className="text-sm font-bold text-slate-700 whitespace-pre-wrap">{log.notes}</p>
                        </div>
                    )}
                </div>

                {/* Footer Signature Area */}
                <div className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-end">
                    <div className="text-left">
                        <p className="text-[10px] font-black text-slate-400 tracking-tighter">GENERATED BY PEOPLEDESK ARCHIVE</p>
                        <p className="text-[8px] text-slate-300">Timestamp: {new Date().toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <div className="w-48 h-px bg-slate-300 mb-2"></div>
                        <p className="text-[10px] font-black text-slate-700 uppercase">Authorized Signature</p>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default WorkLogDetailModal;
