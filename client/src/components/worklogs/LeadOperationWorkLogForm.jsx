import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog, closeWorkLog } from '../../features/employee/employeeSlice';
import SuccessModal from '../SuccessModal';
import { Plus, Trash2, Settings, Clock, TrendingUp, Activity, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
        // Map to standard { description, status } for Admin Table compatibility if needed, 
        // but preserving original key structure for safety as per original file.
        // Original file mapped: const standardizedRows = validRows.map(r => ({ description: r.task, status: r.status }));
        // I should Keep 'standardizedRows' logic for backend compatibility.

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

    if (isLoading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading workspace...</div>;

    if (isCompleted) {
        return (
            <div className="bg-emerald-50 p-8 rounded-3xl text-center border border-emerald-100">
                <CheckSquare size={48} className="mx-auto text-emerald-500 mb-4" />
                <h3 className="text-2xl font-black text-emerald-800 mb-2">Operations Logged!</h3>
                <p className="text-emerald-600 font-bold">Your daily operation reports are submitted.</p>
                <button onClick={onSuccess} className="mt-6 text-sm font-bold text-emerald-700 hover:text-emerald-800 underline">Okay, close</button>
            </div>
        );
    }

    const themeColor = isOpening ? 'blue' : 'cyan';
    const ThemeIcon = isOpening ? Clock : TrendingUp;
    const title = isOpening ? 'Opening Ops Report' : 'Closing Ops Report';
    const subtitle = isOpening ? 'Plan your operations' : 'Update operation status';

    return (
        <motion.form
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-1"
        >
            {/* Header */}
            <div className={`bg-gradient-to-r from-${themeColor}-500 to-${themeColor}-600 p-6 rounded-2xl text-white shadow-lg shadow-${themeColor}-200`}>
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                        <ThemeIcon size={24} className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-black text-2xl tracking-tight">{title}</h3>
                        <p className={`text-${themeColor}-100 text-sm font-medium opacity-90`}>{subtitle}</p>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-50">
                    <div className={`p-2 rounded-lg bg-${themeColor}-50 text-${themeColor}-600`}>
                        <Settings size={18} />
                    </div>
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Operation Tasks</h4>
                </div>

                <div className="space-y-3">
                    <AnimatePresence>
                        {rows.map((row, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }}
                                className="flex gap-2 items-center group"
                            >
                                <span className="text-[10px] font-bold text-slate-300 w-5 text-right font-mono">{index + 1}</span>
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        placeholder="Operation / Task"
                                        value={row.task}
                                        onChange={(e) => handleRowChange(index, 'task', e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none text-sm font-semibold transition-all placeholder:text-slate-300"
                                    />
                                </div>
                                <div className="w-1/3">
                                    <input
                                        type="text"
                                        placeholder="Status..."
                                        value={row.status}
                                        onChange={(e) => handleRowChange(index, 'status', e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none text-sm font-semibold transition-all placeholder:text-slate-300"
                                    />
                                </div>
                                {rows.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeRow(index)}
                                        className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                <button
                    type="button"
                    onClick={addRow}
                    className={`mt-4 w-full py-3 border-2 border-dashed border-${themeColor}-200 rounded-xl text-${themeColor}-500 font-bold hover:bg-${themeColor}-50 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide`}
                >
                    <Plus size={16} /> Add Task
                </button>
            </div>

            {/* Remarks */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                    <Activity size={16} className="text-slate-400" />
                    <label className="text-xs font-bold text-slate-500 uppercase">General Remarks</label>
                </div>
                <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows="2"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none text-sm font-medium transition-all resize-none placeholder:text-slate-300"
                    placeholder="Any general notes..."
                ></textarea>
            </div>

            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onSuccess} className="flex-1 py-4 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-colors uppercase text-xs tracking-wider">
                    Cancel
                </button>
                <button type="submit" disabled={isLoading} className={`flex-1 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 uppercase text-xs tracking-wider bg-slate-900 hover:bg-black`}>
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
                subMessage="Lead Operation entry recorded successfully."
            />
        </motion.form>
    );
};

export default LeadOperationWorkLogForm;
