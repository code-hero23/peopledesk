import Modal from './Modal';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';

const WorkLogDetailModal = ({ isOpen, onClose, log }) => {
    const printRef = useRef();

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `WorkLog_${log?.user?.name}_${new Date(log?.date).toLocaleDateString().replace(/\//g, '-')}`,
    });

    if (!log) return null;

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

                {/* Legacy Fields (for old logs) */}
                {log.projectName && (
                    <div className="mb-6">
                        <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Project Details</h3>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <p><span className="font-semibold">Project:</span> {log.projectName}</p>
                            {log.process && <p><span className="font-semibold">Process:</span> {log.process}</p>}
                            {log.site && <p><span className="font-semibold">Site:</span> {log.site}</p>}
                        </div>
                    </div>
                )}

                {/* Custom Fields (Dynamic Tables) */}
                {Object.entries(customFields).map(([tableName, rows]) => (
                    <div key={tableName} className="mb-8 break-inside-avoid">
                        <h3 className="text-sm font-bold uppercase text-blue-600 mb-3 border-l-4 border-blue-600 pl-2">
                            {tableName}
                        </h3>

                        {Array.isArray(rows) && rows.length > 0 ? (
                            <table className="w-full border-collapse border border-slate-300 text-sm">
                                <thead>
                                    <tr className="bg-slate-100">
                                        {Object.keys(rows[0]).map(key => (
                                            <th key={key} className="border border-slate-300 px-3 py-2 text-left capitalize font-semibold text-slate-700">
                                                {key.replace(/_/g, ' ')}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, i) => (
                                        <tr key={i} className="even:bg-slate-50">
                                            {Object.values(row).map((val, j) => (
                                                <td key={j} className="border border-slate-300 px-3 py-2 text-slate-800">
                                                    {val}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-slate-400 italic">No data available.</p>
                        )}
                    </div>
                ))}

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
