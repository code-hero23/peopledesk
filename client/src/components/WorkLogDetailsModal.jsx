import { X, Printer } from 'lucide-react';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

const WorkLogDetailsModal = ({ isOpen, onClose, log }) => {
    const componentRef = useRef();

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
                    {(WorkLog.la_projectLocation || WorkLog.la_number) && (
                        <div>
                            <h3 className="text-lg font-bold text-blue-600 mb-3 pb-1 border-b">LA Project Report</h3>
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
                                                    <a key={index} href={`http://localhost:5000${photo}`} target="_blank" rel="noopener noreferrer" className="block group relative overflow-hidden rounded-lg aspect-square border border-slate-200">
                                                        <img
                                                            src={`http://localhost:5000${photo}`}
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
    if (data.length === 1 && !data[0].date && !data[0].discussedOn) return null;

    const headers = Object.keys(data[0]).filter(k => k !== 'slNo');

    return (
        <div className="mt-4">
            <h5 className="text-sm font-bold text-slate-700 mb-2">{title}</h5>
            <div className="border rounded-lg overflow-hidden text-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                        <tr>
                            {headers.map(h => <th key={h} className="px-3 py-2">{h}</th>)}
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

export default WorkLogDetailsModal;
