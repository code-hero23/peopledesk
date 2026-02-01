import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog, closeWorkLog } from '../../features/employee/employeeSlice';
import SuccessModal from '../SuccessModal';
import { Plus, Trash2 } from 'lucide-react';

const VendorManagementWorkLogForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { todayLog, isLoading } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);

    const isOpening = !todayLog;
    const isClosing = todayLog && todayLog.logStatus === 'OPEN';
    const isCompleted = todayLog && todayLog.logStatus === 'CLOSED';

    const [rows, setRows] = useState([
        { task: '', status: '', remark: '', bhWork: '' },
        { task: '', status: '', remark: '', bhWork: '' },
        { task: '', status: '', remark: '', bhWork: '' }
    ]);

    const [remarks, setRemarks] = useState('');

    const handleRowChange = (index, field, value) => {
        const newRows = [...rows];
        newRows[index][field] = value;
        setRows(newRows);
    };

    const addRow = () => {
        setRows([...rows, { task: '', status: '', remark: '', bhWork: '' }]);
    };

    const removeRow = (index) => {
        const newRows = rows.filter((_, i) => i !== index);
        setRows(newRows);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const validRows = rows.filter(r => r.task.trim() !== '');

        if (isOpening) {
            const payload = {
                logStatus: 'OPEN',
                process: 'Vendor Management Opening Report',
                customFields: {
                    openingTasks: validRows
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
                process: 'Vendor Management Daily Reports Completed',
                customFields: {
                    ...existingFields,
                    closingTasks: validRows
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
                    {isOpening ? 'Vendor Management - Opening Report' : 'Vendor Management - Closing Report'}
                </h4>
                <p className="text-xs opacity-75">
                    {isOpening ? 'List the tasks planned for today.' : 'Update the task status for the day.'}
                </p>
            </div>

            <div className="space-y-3">
                {rows.map((row, index) => (
                    <div key={index} className="flex flex-col md:flex-row gap-2 items-start bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <span className="text-xs font-bold text-slate-400 w-4">{index + 1}.</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 w-full">
                            <div className="flex-1">
                                <label className="block md:hidden text-[10px] font-bold text-slate-400 uppercase">Task</label>
                                <input
                                    type="text"
                                    placeholder="Task"
                                    value={row.task}
                                    onChange={(e) => handleRowChange(index, 'task', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block md:hidden text-[10px] font-bold text-slate-400 uppercase">Status</label>
                                <input
                                    type="text"
                                    placeholder="Status"
                                    value={row.status}
                                    onChange={(e) => handleRowChange(index, 'status', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block md:hidden text-[10px] font-bold text-slate-400 uppercase">Remark</label>
                                <input
                                    type="text"
                                    placeholder="Remark"
                                    value={row.remark}
                                    onChange={(e) => handleRowChange(index, 'remark', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block md:hidden text-[10px] font-bold text-slate-400 uppercase">BH Work</label>
                                <input
                                    type="text"
                                    placeholder="BH Work"
                                    value={row.bhWork}
                                    onChange={(e) => handleRowChange(index, 'bhWork', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                        </div>

                        {rows.length > 1 && (
                            <button
                                type="button"
                                onClick={() => removeRow(index)}
                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors self-center md:self-start"
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
                subMessage="Vendor Management entry recorded."
            />
        </form>
    );
};

export default VendorManagementWorkLogForm;
