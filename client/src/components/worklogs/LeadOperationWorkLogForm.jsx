import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog, closeWorkLog } from '../../features/employee/employeeSlice';
import SuccessModal from '../SuccessModal';
import { Plus, Trash2 } from 'lucide-react';

const LeadOperationWorkLogForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { todayLog, isLoading } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);

    const isOpening = !todayLog;
    const isClosing = todayLog && todayLog.logStatus === 'OPEN';
    const isCompleted = todayLog && todayLog.logStatus === 'CLOSED';

    const [rows, setRows] = useState([
        { task: '', status: '' },
        { task: '', status: '' },
        { task: '', status: '' }
    ]);

    const [remarks, setRemarks] = useState('');

    const handleRowChange = (index, field, value) => {
        const newRows = [...rows];
        newRows[index][field] = value;
        setRows(newRows);
    };

    const addRow = () => {
        setRows([...rows, { task: '', status: '' }]);
    };

    const removeRow = (index) => {
        const newRows = rows.filter((_, i) => i !== index);
        setRows(newRows);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const validRows = rows.filter(r => r.task.trim() !== '');

        // Map to standard { description, status } for Admin Table compatibility
        const standardizedRows = validRows.map(r => ({ description: r.task, status: r.status }));

        if (isOpening) {
            const payload = {
                logStatus: 'OPEN',
                process: 'Lead Operation Opening Report',
                customFields: {
                    openingTasks: standardizedRows
                },
                remarks: remarks
            };
            dispatch(createWorkLog(payload)).then((res) => {
                if (!res.error) setShowSuccess(true);
            });
        } else if (isClosing) {
            const existingFields = todayLog.customFields || {};
            const payload = {
                logStatus: 'CLOSED',
                process: 'Lead Operation Daily Reports Completed',
                customFields: {
                    ...existingFields,
                    closingTasks: standardizedRows
                },
                remarks: remarks || todayLog.remarks
            };
            dispatch(closeWorkLog(payload)).then((res) => {
                if (!res.error) setShowSuccess(true);
            });
        }
    };

    if (isCompleted) {
        return (
            <div className="text-center p-8 bg-green-50 rounded-xl border border-green-100">
                <h3 className="text-lg font-black text-green-700 mb-2">Daily Reports Submitted</h3>
                <p className="text-green-600">You have completed both Opening and Closing reports for today.</p>
                <button onClick={onSuccess} className="mt-4 text-green-800 underline font-bold">Close</button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto px-1">
            <div className={`p-4 rounded-lg border mb-4 ${isOpening ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                <h4 className={`font-bold text-sm uppercase ${isOpening ? 'text-blue-800' : 'text-orange-800'}`}>
                    {isOpening ? 'Lead Operation - Opening Report' : 'Lead Operation - Closing Report'}
                </h4>
                <p className="text-xs opacity-75">
                    {isOpening ? 'List the operation tasks planned for today.' : 'Update the status of operations for the day.'}
                </p>
            </div>

            <div className="space-y-3">
                {rows.map((row, index) => (
                    <div key={index} className="flex gap-2 items-start">
                        <span className="mt-2 text-xs font-bold text-slate-400 w-4">{index + 1}.</span>
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Task / Operation Details"
                                value={row.task}
                                onChange={(e) => handleRowChange(index, 'task', e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>
                        <div className="w-1/3">
                            <input
                                type="text"
                                placeholder="Status"
                                value={row.status}
                                onChange={(e) => handleRowChange(index, 'status', e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>
                        {rows.length > 1 && (
                            <button
                                type="button"
                                onClick={() => removeRow(index)}
                                className="mt-1 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={addRow}
                className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 font-bold hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-sm"
            >
                <Plus size={16} /> Add Another Row
            </button>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Remarks</label>
                <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows="2"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Any general notes..."
                ></textarea>
            </div>

            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onSuccess} className="flex-1 py-3 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors">
                    Cancel
                </button>
                <button type="submit" disabled={isLoading} className={`flex-1 text-white font-bold py-3 rounded-lg shadow-lg transition-transform active:scale-95 ${isOpening ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
                    {isLoading ? 'Submitting...' : (isOpening ? 'Submit Opening' : 'Submit Closing')}
                </button>
            </div>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => {
                    setShowSuccess(false);
                    if (onSuccess) onSuccess();
                }}
                message={isOpening ? "Opening Report Submitted" : "Closing Report Submitted"}
                subMessage="Lead Operation entry recorded."
            />
        </form>
    );
};

export default LeadOperationWorkLogForm;
