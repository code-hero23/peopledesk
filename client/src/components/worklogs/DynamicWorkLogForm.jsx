import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog, closeWorkLog, updateWorkLog, getTodayLogStatus } from '../../features/employee/employeeSlice';
import { WORK_LOG_CONFIG } from '../../config/workLogConfig';
import SuccessModal from '../SuccessModal';
import ConfirmationModal from '../ConfirmationModal';
import { Plus, Trash2, Layers, CheckSquare, List, Clock, TrendingUp, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

const getStatusSelectStyle = (val) => {
    if (!val) return 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200';
    const upper = String(val).toUpperCase();
    if (upper.includes('COMPLETED') || upper === 'YES') {
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 font-bold';
    }
    if (upper.includes('PROGRESS')) {
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 font-bold';
    }
    if (upper.includes('YET') || upper.includes('PENDING') || upper === 'NO') {
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 font-bold';
    }
    if (upper.includes('HOLD') || upper.includes('BLOCKED')) {
        return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700 font-bold';
    }
    return 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200';
};

const getStatusDotClass = (val) => {
    if (!val) return '';
    const upper = String(val).toUpperCase();
    if (upper.includes('COMPLETED') || upper === 'YES') return 'bg-emerald-500 ring-2 ring-emerald-200';
    if (upper.includes('PROGRESS')) return 'bg-blue-500 ring-2 ring-blue-200';
    if (upper.includes('HOLD') || upper.includes('BLOCKED')) return 'bg-rose-500 ring-2 ring-rose-200';
    return 'bg-amber-500 ring-2 ring-amber-200';
};

const DynamicWorkLogForm = ({ onSuccess, role }) => {
    const dispatch = useDispatch();
    const { isLoading, todayLog } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [confirmationConfig, setConfirmationConfig] = useState({
        isOpen: false,
        onConfirm: () => { }
    });

    useEffect(() => {
        dispatch(getTodayLogStatus());
    }, [dispatch]);

    const config = WORK_LOG_CONFIG[role];
    const isTodayOpen = todayLog && todayLog.logStatus === 'OPEN';
    const isTodayClosed = todayLog && todayLog.logStatus === 'CLOSED';

    // Determine which tables to show based on phase
    // If openingTables is explicitly defined, use it, otherwise use main tables for both phases
    const activeTables = isTodayOpen 
        ? (config.closingTables || config.tables || [])
        : (config.openingTables || config.tables || []);

    const [tableData, setTableData] = useState({});
    const [notes, setNotes] = useState('');

    // Reset/Initialize table data whenever role or phase changes
    useEffect(() => {
        const initial = {};
        
        // Try to load existing data from todayLog (Persistence)
        let existingData = todayLog?.customFields || {};
        if (typeof existingData === 'string') {
            try {
                existingData = JSON.parse(existingData);
            } catch (e) {
                existingData = {};
            }
        }

        activeTables.forEach((table, index) => {
            if (existingData[table.label] && Array.isArray(existingData[table.label]) && existingData[table.label].length > 0) {
                if (table.predefinedRows && !table.allowAddRows) {
                    initial[index] = table.predefinedRows.map((pRow, rIdx) => ({
                        ...pRow,
                        ...(existingData[table.label][rIdx] || {}),
                        _id: existingData[table.label][rIdx]?._id || crypto.randomUUID()
                    }));
                } else {
                    initial[index] = existingData[table.label].map((row, rIdx) => ({
                        ...(table.predefinedRows?.[rIdx] || {}),
                        ...row,
                        _id: row._id || crypto.randomUUID()
                    }));
                }
            } else {
                // Otherwise initialize empty rows
                initial[index] = table.predefinedRows
                    ? table.predefinedRows.map(row => ({ ...row, _id: crypto.randomUUID() }))
                    : [{ _id: crypto.randomUUID() }];
            }
        });
        setTableData(initial);
        
        if (todayLog?.notes) {
            setNotes(todayLog.notes);
        }
    }, [role, isTodayOpen, todayLog]);

    if (!config) {
        return <div className="p-4 text-red-500 font-bold bg-red-50 rounded-xl">Configuration not found for role: {role}</div>;
    }

    if (isTodayClosed) {
        return (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-8 rounded-3xl text-center border border-emerald-100 dark:border-emerald-900/30 transition-colors">
                <CheckSquare size={48} className="mx-auto text-emerald-500 dark:text-emerald-400 mb-4" />
                <h3 className="text-2xl font-black text-emerald-800 dark:text-emerald-200 mb-2">Day Completed!</h3>
                <p className="text-emerald-600 dark:text-emerald-400 font-bold">Daily reports submitted successfully.</p>
                <div className="mt-4 text-[10px] text-emerald-400 dark:text-emerald-500 font-bold uppercase tracking-widest">
                    Session: {todayLog?.startTime} - {todayLog?.endTime}
                </div>
                <button onClick={onSuccess} className="mt-6 text-sm font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 underline">Okay, close</button>
            </div>
        );
    }

    const handleRowChange = (tableIndex, rowIndex, fieldName, value) => {
        setTableData(prev => {
            const newTable = [...(prev[tableIndex] || [])];
            newTable[rowIndex] = { ...newTable[rowIndex], [fieldName]: value };
            return { ...prev, [tableIndex]: newTable };
        });
    };

    const addRow = (tableIndex) => {
        setTableData(prev => ({
            ...prev,
            [tableIndex]: [...(prev[tableIndex] || []), { _id: crypto.randomUUID() }]
        }));
    };

    const removeRow = (tableIndex, rowIndex) => {
        const table = activeTables[tableIndex];
        if (table.predefinedRows && !table.allowAddRows) return;
        setTableData(prev => {
            const currentRows = prev[tableIndex] || [];
            const newTable = currentRows.filter((_, i) => i !== rowIndex);
            return { ...prev, [tableIndex]: newTable };
        });
    };

    const getPayloadCustomFields = () => {
        const customFields = {};
        activeTables.forEach((table, index) => {
            const rows = (tableData[index] || []).filter(row => {
                return Object.entries(row).some(([k, v]) => k !== '_id' && String(v || '').trim().length > 0);
            });
            customFields[table.label] = rows;
        });
        return customFields;
    };

    const handleUpdateReport = async () => {
        const customFields = getPayloadCustomFields();
        const totalRows = Object.values(customFields).reduce((acc, rows) => acc + rows.length, 0);
        if (totalRows === 0) {
            toast.error("Please add at least one task entry before saving.");
            return;
        }

        setIsUpdating(true);
        try {
            const payload = {
                customFields,
                notes: notes
            };
            await dispatch(updateWorkLog(payload)).unwrap();
            setModalMessage("Tasks Saved! Your daily work log has been updated.");
            setShowSuccess(true);
        } catch (err) {
            toast.error(err || "Failed to update work log.");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleConfirmSubmit = () => {
        const customFields = getPayloadCustomFields();
        const totalRows = Object.values(customFields).reduce((acc, rows) => acc + rows.length, 0);
        if (totalRows === 0) {
            toast.error("Please enter at least one task entry.");
            return;
        }

        if (isTodayOpen) {
            // CLOSING PHASE
            const payload = {
                customFields,
                notes: notes,
                endTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                logStatus: 'CLOSED'
            };
            dispatch(closeWorkLog(payload)).then((res) => {
                if (!res.error) {
                    setModalMessage("Closing Report Submitted! Successfully recorded.");
                    setShowSuccess(true);
                } else {
                    toast.error(res.payload || "Failed to submit closing report.");
                }
            });
        } else {
            // OPENING PHASE
            const payload = {
                customFields,
                date: new Date().toLocaleDateString('en-CA'),
                startTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                logStatus: 'OPEN'
            };
            dispatch(createWorkLog(payload)).then((res) => {
                if (!res.error) {
                    setModalMessage("Opening Report Submitted! Work session started.");
                    setShowSuccess(true);
                } else {
                    toast.error(res.payload || "Failed to submit opening report.");
                }
            });
        }
    };

    const onSubmit = (e) => {
        e.preventDefault();
        setConfirmationConfig({
            isOpen: true,
            title: isTodayOpen ? "Submit Closing Report" : "Submit Opening Report",
            message: isTodayOpen 
                ? "Are you sure you want to finalize your daily work log and close the session?"
                : "Are you sure you want to start your daily work session?",
            onConfirm: handleConfirmSubmit
        });
    };

    return (
        <motion.form
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={onSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto px-1 pr-2 scrollbar-hide"
        >
            <div className={`bg-gradient-to-r ${isTodayOpen ? 'from-emerald-500 to-teal-500 dark:from-emerald-600 dark:to-teal-600' : 'from-indigo-600 to-violet-600 dark:from-indigo-700 dark:to-violet-700'} p-6 rounded-3xl text-white shadow-lg sticky top-0 z-10 transition-all`}>
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                        {isTodayOpen ? <CheckSquare size={24} /> : <Clock size={24} />}
                    </div>
                    <div>
                        <h3 className="font-black text-2xl tracking-tight">{config.title || (role.replace(/-/g, ' ') + ' Report')}</h3>
                        <p className="text-white/80 text-xs font-bold uppercase tracking-widest opacity-75">
                            {isTodayOpen ? 'Session In Progress — Midday Update / Closing' : 'Current Date Reporting'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Time/Date Selection - NEW UI MATCHING USER IMAGE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{isTodayOpen ? "Session Started At" : "Current Date"}</label>
                    <div className={`px-5 py-4 rounded-2xl font-black text-lg border transition-all ${isTodayOpen ? 'bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-100 dark:border-slate-700'}`}>
                        {isTodayOpen ? (todayLog.startTime || 'Not recorded') : new Date().toLocaleDateString('en-GB')}
                    </div>
                </div>
                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Session Time</label>
                    <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-lg border border-slate-100 dark:border-slate-700 transition-colors">
                        {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>

            {activeTables.map((table, tableIndex) => {
                const canAddRows = table.allowAddRows || !table.predefinedRows;
                const rows = tableData[tableIndex] || [];
                return (
                    <div key={tableIndex} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md dark:hover:border-slate-700 overflow-x-auto">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50 dark:border-slate-800 transition-colors">
                            <div className="flex items-center gap-2">
                                <div className={`p-2 rounded-lg transition-colors ${!isTodayOpen ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'}`}>
                                    <List size={18} />
                                </div>
                                <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">{table.label}</h4>
                            </div>
                            {canAddRows && (
                                <button
                                    type="button"
                                    onClick={() => addRow(tableIndex)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl transition-all border border-indigo-100 dark:border-indigo-800 shadow-sm active:scale-95 cursor-pointer"
                                    title={`Add new row to ${table.label}`}
                                >
                                    <Plus size={14} className="stroke-[3]" />
                                    <span>Add</span>
                                </button>
                            )}
                        </div>

                        {/* Table Header */}
                        <div className="hidden md:flex gap-4 mb-2 px-4 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">
                            {table.fields.map(field => (
                                <div key={field.name} className="flex-1">{field.label}</div>
                            ))}
                            {canAddRows && <div className="w-8"></div>}
                        </div>

                        <div className="space-y-3">
                            {rows.length === 0 && (
                                <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30">
                                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-2">No entries yet</p>
                                    <button
                                        type="button"
                                        onClick={() => addRow(tableIndex)}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl transition-all border border-indigo-100 dark:border-indigo-800 shadow-sm cursor-pointer"
                                    >
                                        <Plus size={14} className="stroke-[3]" /> Add Entry
                                    </button>
                                </div>
                            )}
                            <AnimatePresence>
                                {rows.map((row, rowIndex) => (
                                    <motion.div
                                        key={row._id}
                                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }}
                                        className="flex flex-col md:flex-row gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 group hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-all items-stretch md:items-center"
                                    >
                                        {table.fields.map(field => (
                                            <div key={field.name} className="flex-1">
                                                <label className="md:hidden text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 block">{field.label}</label>
                                                {field.type === 'select' ? (
                                                    <div className="relative">
                                                        <select
                                                            value={row[field.name] || ''}
                                                            onChange={(e) => handleRowChange(tableIndex, rowIndex, field.name, e.target.value)}
                                                            className={`w-full px-3 py-2 text-sm font-semibold border rounded-lg focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 outline-none appearance-none cursor-pointer transition-all ${
                                                                field.name === 'status'
                                                                    ? getStatusSelectStyle(row[field.name])
                                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                                                            }`}
                                                        >
                                                            <option value="" className="bg-white dark:bg-slate-900 text-slate-400">Select...</option>
                                                            {field.options?.map(opt => (
                                                                <option key={opt} value={opt} className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold">{opt}</option>
                                                            ))}
                                                            {row[field.name] && !field.options?.includes(row[field.name]) && (
                                                                <option value={row[field.name]} className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold">{row[field.name]}</option>
                                                            )}
                                                        </select>
                                                        {field.name === 'status' && row[field.name] && (
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                                                                <span className={`w-2 h-2 rounded-full ${getStatusDotClass(row[field.name])}`} />
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <input
                                                        type={field.type}
                                                        value={row[field.name] || ''}
                                                        onChange={(e) => handleRowChange(tableIndex, rowIndex, field.name, e.target.value)}
                                                        placeholder={field.placeholder || field.label}
                                                        disabled={field.disabled}
                                                        className={`w-full px-3 py-2 text-sm font-semibold border rounded-lg outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600
                                                            ${field.disabled
                                                                ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-600'
                                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 focus:border-indigo-300 dark:focus:border-indigo-700 text-slate-700 dark:text-slate-200'}
                                                        `}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                        {canAddRows && (
                                            <button
                                                type="button"
                                                onClick={() => removeRow(tableIndex, rowIndex)}
                                                className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors self-end md:self-auto cursor-pointer"
                                                title="Delete Row"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {canAddRows && (
                            <button
                                type="button"
                                onClick={() => addRow(tableIndex)}
                                className="mt-4 w-full py-3 border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-500 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide cursor-pointer active:scale-[0.99]"
                            >
                                <Plus size={16} /> Add Entry
                            </button>
                        )}
                    </div>
                );
            })}

            {isTodayOpen && (
                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30 space-y-3 transition-colors">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                        <Clock size={18} />
                        <h4 className="text-sm font-black uppercase tracking-widest">Daily Notes (for Admin & HR)</h4>
                    </div>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 p-4 rounded-xl font-medium text-slate-700 dark:text-slate-200 text-sm outline-none border border-blue-200 dark:border-slate-700 focus:ring-2 ring-blue-100 dark:ring-blue-900/40 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 min-h-[100px]"
                        placeholder="Share daily summary, insights, or site updates for Admin and HR..."
                    ></textarea>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky bottom-0 transition-colors">
                <button
                    type="button"
                    onClick={onSuccess}
                    className="py-4 px-6 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors uppercase text-xs tracking-wider cursor-pointer"
                >
                    Cancel
                </button>
                {isTodayOpen ? (
                    <>
                        <button
                            type="button"
                            disabled={isLoading || isUpdating}
                            onClick={handleUpdateReport}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-xl transition-all active:scale-95 flex justify-center items-center gap-2 uppercase text-xs tracking-wider cursor-pointer"
                            title="Save tasks added or modified throughout the day without closing the session"
                        >
                            {isUpdating ? 'Saving...' : <><Save size={18} /> Save & Update Tasks</>}
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || isUpdating}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-xl transition-all active:scale-95 flex justify-center items-center gap-2 uppercase text-xs tracking-wider cursor-pointer"
                            title="Finalize your daily work log and close your work session"
                        >
                            {isLoading ? 'Submitting...' : <><CheckSquare size={18} /> Finish Day</>}
                        </button>
                    </>
                ) : (
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-xl transition-all active:scale-95 flex justify-center items-center gap-2 uppercase text-xs tracking-wider cursor-pointer"
                    >
                        {isLoading ? 'Submitting...' : <><TrendingUp size={18} /> Start Day</>}
                    </button>
                )}
            </div>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => {
                    setShowSuccess(false);
                    if (onSuccess) onSuccess();
                }}
                message={modalMessage}
            />

            <ConfirmationModal
                isOpen={confirmationConfig.isOpen}
                onClose={() => setConfirmationConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmationConfig.onConfirm}
                title={confirmationConfig.title}
                message={confirmationConfig.message}
                type="info"
                confirmText="Submit"
            />
        </motion.form>
    );
};

export default DynamicWorkLogForm;
