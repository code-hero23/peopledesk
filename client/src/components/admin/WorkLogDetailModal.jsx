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

    // Helper to safely parse customFields
    let customFields = {};
    try {
        if (log.customFields) {
            customFields = typeof log.customFields === 'string'
                ? JSON.parse(log.customFields)
                : log.customFields;
        }
    } catch (e) {
        console.error("Error parsing customFields", e);
    }

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

            <div ref={printRef} className="p-8 bg-white text-slate-900 print:p-0 print:text-black">
                {/* Header for Print */}
                <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold uppercase tracking-wide">Daily Work Report</h1>
                        <p className="text-slate-500 font-medium mt-1">{log.user?.designation || log.user?.role}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-bold">{log.user?.name}</p>
                        <p className="text-slate-500">{new Date(log.date).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>

                {/* General Work Log Info */}
                <div className="mb-6 grid grid-cols-2 gap-4 text-sm border-b border-slate-100 pb-4">
                    <div><span className="font-semibold text-slate-500">Log Date:</span> {new Date(log.date).toLocaleDateString()}</div>
                    <div><span className="font-semibold text-slate-500">Timings:</span> {log.startTime || '-'} to {log.endTime || '-'} ({log.hours || 0} hrs)</div>
                    {log.remarks && <div className="col-span-2"><span className="font-semibold text-slate-500">Remarks:</span> {log.remarks}</div>}
                    {log.imageCount > 0 && <div className="col-span-2"><span className="font-semibold text-slate-500">Images Submitted:</span> {log.imageCount}</div>}
                </div>

                {/* LA / Project Details */}
                {(log.projectName || log.la_number) && (
                    <div className="mb-6">
                        <h3 className="text-sm font-bold uppercase text-slate-600 mb-2 border-b border-slate-200 pb-1">Project Overview</h3>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            {log.projectName && <div><span className="font-semibold">Project Name:</span> {log.projectName}</div>}
                            {log.site && <div><span className="font-semibold">Site:</span> {log.site}</div>}
                            {log.la_number && <div><span className="font-semibold">Project No:</span> {log.la_number}</div>}
                            {log.la_projectLocation && <div><span className="font-semibold">Location:</span> {log.la_projectLocation}</div>}
                            {log.la_projectValue && <div><span className="font-semibold">Value:</span> {log.la_projectValue}</div>}
                            {log.la_siteStatus && <div><span className="font-semibold">Site Status:</span> {log.la_siteStatus}</div>}
                            {log.process && <div className="col-span-2"><span className="font-semibold">Process:</span> {log.process}</div>}
                        </div>
                    </div>
                )}

                {/* AE Details */}
                {(log.ae_siteLocation || log.ae_visitType) && (
                    <div className="mb-6 break-inside-avoid">
                        <h3 className="text-sm font-bold uppercase text-blue-600 mb-2 border-b border-blue-100 pb-1">Site Visit Details (AE)</h3>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-2 gap-4 text-sm">
                            <div><span className="font-bold text-slate-600">Location:</span> {log.ae_siteLocation}</div>
                            <div>
                                <span className="font-bold text-slate-600">Visit Type:</span>
                                <span className="ml-2">
                                    {(Array.isArray(log.ae_visitType) ? log.ae_visitType : [log.ae_visitType]).filter(Boolean).join(', ')}
                                </span>
                            </div>
                            {log.ae_workStage && <div><span className="font-bold text-slate-600">Stage:</span> {log.ae_workStage}</div>}
                            {log.ae_measurements && <div><span className="font-bold text-slate-600">Measurements:</span> {log.ae_measurements}</div>}
                            {log.ae_itemsInstalled && <div><span className="font-bold text-slate-600">Items Installed:</span> {log.ae_itemsInstalled}</div>}
                            {log.ae_issueDescription && <div className="col-span-2"><span className="font-bold text-slate-600">Issues:</span> {log.ae_issueDescription}</div>}
                            {log.ae_clientFeedback && <div className="col-span-2"><span className="font-bold text-slate-600">Feedback:</span> {log.ae_clientFeedback}</div>}
                        </div>
                    </div>
                )}

                {/* CRE Details */}
                {(log.cre_totalCalls !== null || log.cre_showroomVisits !== null) && (
                    <div className="mb-6 break-inside-avoid">
                        <h3 className="text-sm font-bold uppercase text-blue-600 mb-2 border-b border-blue-100 pb-1">CRE Activity Report</h3>
                        <div className="grid grid-cols-4 gap-4 mb-3">
                            <div className="bg-slate-50 p-2 rounded border text-center">
                                <span className="block text-xl font-bold text-blue-600">{log.cre_totalCalls || 0}</span>
                                <span className="text-[10px] uppercase text-slate-500">Calls</span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded border text-center">
                                <span className="block text-xl font-bold text-orange-600">{log.cre_showroomVisits || 0}</span>
                                <span className="text-[10px] uppercase text-slate-500">Visits</span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded border text-center">
                                <span className="block text-xl font-bold text-emerald-600">{log.cre_proposals || 0}</span>
                                <span className="text-[10px] uppercase text-slate-500">Proposals</span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded border text-center">
                                <span className="block text-xl font-bold text-purple-600">{log.cre_orders || 0}</span>
                                <span className="text-[10px] uppercase text-slate-500">Orders</span>
                            </div>
                        </div>
                        {log.cre_callBreakdown && (
                            <div className="bg-slate-50 p-3 rounded border border-slate-200 text-sm">
                                <span className="font-bold block text-slate-600 mb-1">Call Breakdown:</span>
                                {log.cre_callBreakdown}
                            </div>
                        )}
                    </div>
                )}

                {/* FA Details */}
                {(log.fa_calls !== null || log.fa_showroomVisits !== null) && (
                    <div className="mb-6 break-inside-avoid">
                        <h3 className="text-sm font-bold uppercase text-blue-600 mb-2 border-b border-blue-100 pb-1">FA Activity Report</h3>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="border p-2 rounded text-center">
                                <div className="text-lg font-bold">{log.fa_calls || 0}</div>
                                <div className="text-xs text-slate-500">Calls</div>
                            </div>
                            <div className="border p-2 rounded text-center">
                                <div className="text-lg font-bold">{log.fa_showroomVisits || 0}</div>
                                <div className="text-xs text-slate-500">Showroom Visits</div>
                            </div>
                            <div className="border p-2 rounded text-center">
                                <div className="text-lg font-bold">{log.fa_siteVisits || 0}</div>
                                <div className="text-xs text-slate-500">Site Visits</div>
                            </div>
                        </div>
                        <div className="space-y-2 text-sm border-t border-slate-100 pt-2">
                            {log.fa_designPendingClients && <div><span className="font-bold">Design Pending:</span> {log.fa_designPendingClients}</div>}
                            {log.fa_quotePendingClients && <div><span className="font-bold">Quote Pending:</span> {log.fa_quotePendingClients}</div>}
                            {log.fa_bookingFreezedClients && <div><span className="font-bold">Booking Freezed:</span> {log.fa_bookingFreezedClients}</div>}
                        </div>
                    </div>
                )}

                {/* Dynamic Tables (LA & Others) */}
                {[
                    { label: 'Requirements', data: log.la_requirements, cols: ['description', 'remarks'] },
                    { label: 'Colours Used', data: log.la_colours, cols: ['area', 'colour', 'code'] },
                    { label: 'Online Meetings', data: log.la_onlineMeeting, cols: ['date', 'time', 'client', 'agenda'] },
                    { label: 'Showroom Meetings', data: log.la_showroomMeeting, cols: ['date', 'time', 'client', 'outcome'] },
                    { label: 'Measurements', data: log.la_measurements, cols: ['date', 'site', 'details'] },
                    // Support Generic Custom Fields too if they exist and are not one of the above
                    ...Object.entries(customFields).map(([k, v]) => ({ label: k, data: v, isCustom: true }))
                ].map((section, idx) => {
                    const rows = section.data;
                    if (!rows || (Array.isArray(rows) && rows.length === 0)) return null;

                    // Normalize rows for table
                    const tableRows = Array.isArray(rows) ? rows : [rows];
                    const columns = section.cols || (tableRows[0] ? Object.keys(tableRows[0]) : []);

                    return (
                        <div key={idx} className="mb-6 break-inside-avoid">
                            <h3 className="text-sm font-bold uppercase text-slate-700 mb-2 border-l-4 border-blue-500 pl-2">
                                {section.label}
                            </h3>
                            <table className="w-full border-collapse border border-slate-300 text-xs">
                                <thead>
                                    <tr className="bg-slate-100">
                                        {columns.map(col => (
                                            <th key={col} className="border border-slate-300 px-2 py-1 text-left capitalize font-semibold text-slate-700">
                                                {col.replace(/_/g, ' ')}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableRows.map((row, rIdx) => (
                                        <tr key={rIdx} className="even:bg-slate-50">
                                            {columns.map((col, cIdx) => (
                                                <td key={cIdx} className="border border-slate-300 px-2 py-1 text-slate-800">
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
