import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog, closeWorkLog, getTodayLogStatus } from '../../features/employee/employeeSlice';
import { WORK_LOG_CONFIG } from '../../config/workLogConfig';
import SuccessModal from '../SuccessModal';
import ConfirmationModal from '../ConfirmationModal';
import { Plus, Trash2, Layers, CheckSquare, List, Clock, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DynamicWorkLogForm = ({ onSuccess, role }) => {
    const dispatch = useDispatch();
    const { isLoading, todayLog } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
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

    // Decide which tables to use based on phase
    const getActiveTables = () => {
        if (!config) return [];
        if (!isTodayOpen) {
            // Opening Phase
            return config.openingTables || [
                {
                    label: "Opening Plan",
                    fields: [
                        { name: "plan", label: "Plan for Today", type: "text" },
                        { name: "target", label: "Targets/Goals", type: "text" }
                    ]
                }
            ];
        } else {
            // Closing Phase
            return config.closingTables || config.tables || [];
        }
    };

    const activeTables = getActiveTables();

    const [tableData, setTableData] = useState({});

    // Reset table data whenever the phase or role changes
    useEffect(() => {
        if (!activeTables.length) return;
        const initial = {};
        activeTables.forEach((table, index) => {
            initial[index] = table.predefinedRows
                ? table.predefinedRows.map(row => ({ ...row, _id: crypto.randomUUID() }))
                : [{ _id: crypto.randomUUID() }];
        });
        setTableData(initial);
    }, [isTodayOpen, role]);

    if (!config) {
        return <div className="p-4 text-red-500 font-bold bg-red-50 rounded-xl">Configuration not found for role: {role}</div>;
    }

    if (isTodayClosed) {
        return (
            <div className="bg-emerald-50 p-8 rounded-3xl text-center border border-emerald-100">
                <CheckSquare size={48} className="mx-auto text-emerald-500 mb-4" />
                <h3 className="text-2xl font-black text-emerald-800 mb-2">Day Completed!</h3>
                <p className="text-emerald-600 font-bold">Daily reports submitted successfully.</p>
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
        if (activeTables[tableIndex].predefinedRows) return;
        setTableData(prev => {
            if (prev[tableIndex].length <= 1) return prev;
            const newTable = prev[tableIndex].filter((_, i) => i !== rowIndex);
            return { ...prev, [tableIndex]: newTable };
        });
    };

    const handleConfirmSubmit = () => {
        const customFields = {};
        activeTables.forEach((table, index) => {
            customFields[table.label] = tableData[index];
        });

        if (!isTodayOpen) {
            // Opening Submit
            dispatch(createWorkLog({ customFields, logStatus: 'OPEN' })).then(() => {
                setModalMessage("Opening Report Submitted! Day started.");
                setShowSuccess(true);
            });
        } else {
            // Closing Submit
            dispatch(closeWorkLog({ customFields })).then(() => {
                setModalMessage("Closing Report Submitted! Day ended.");
                setShowSuccess(true);
            });
        }
    };

    const onSubmit = (e) => {
        e.preventDefault();
        setConfirmationConfig({
            isOpen: true,
            title: !isTodayOpen ? "Start Day" : "End Day",
            message: !isTodayOpen ? "Submit opening plan and start your day?" : "Submit final closing report and end your day?",
            onConfirm: handleConfirmSubmit
        });
    };

    return (
        <motion.form
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={onSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto px-1 pr-2"
        >
            <div className={`bg-gradient-to-r ${!isTodayOpen ? 'from-indigo-500 to-violet-500' : 'from-emerald-500 to-teal-500'} p-6 rounded-2xl text-white shadow-lg sticky top-0 z-10`}>
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                        {!isTodayOpen ? <Clock size={24} /> : <TrendingUp size={24} />}
                    </div>
                    <div>
                        <h3 className="font-black text-2xl tracking-tight">{config.title}</h3>
                        <p className="text-white/80 text-sm font-medium opacity-90">
                            {!isTodayOpen ? "Opening Report (Target/Plan)" : "Closing Report (Achievements)"}
                        </p>
                    </div>
                </div>
            </div>

            {activeTables.map((table, tableIndex) => (
                <div key={tableIndex} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-50">
                        <div className={`p-2 rounded-lg ${!isTodayOpen ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            <List size={18} />
                        </div>
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">{table.label}</h4>
                    </div>

                    {/* Table Header */}
                    <div className="hidden md:flex gap-4 mb-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        {table.fields.map(field => (
                            <div key={field.name} className="flex-1">{field.label}</div>
                        ))}
                        {!table.predefinedRows && <div className="w-10"></div>}
                    </div>

                    <div className="space-y-3">
                        <AnimatePresence>
                            {tableData[tableIndex]?.map((row, rowIndex) => (
                                <motion.div
                                    key={row._id}
                                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }}
                                    className="flex flex-col md:flex-row gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 group hover:bg-white hover:border-indigo-100 transition-all"
                                >
                                    {table.fields.map(field => (
                                        <div key={field.name} className="flex-1">
                                            <label className="md:hidden text-[10px] font-bold text-slate-400 uppercase mb-1 block">{field.label}</label>
                                            {field.type === 'select' ? (
                                                <div className="relative">
                                                    <select
                                                        value={row[field.name] || ''}
                                                        onChange={(e) => handleRowChange(tableIndex, rowIndex, field.name, e.target.value)}
                                                        className="w-full px-3 py-2 text-sm font-semibold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none bg-white appearance-none cursor-pointer hover:bg-slate-50 transition-all"
                                                    >
                                                        <option value="">Select...</option>
                                                        {field.options?.map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ) : (
                                                <input
                                                    type={field.type}
                                                    value={row[field.name] || ''}
                                                    onChange={(e) => handleRowChange(tableIndex, rowIndex, field.name, e.target.value)}
                                                    placeholder={field.label}
                                                    disabled={field.disabled}
                                                    className={`w-full px-3 py-2 text-sm font-semibold border rounded-lg outline-none transition-all placeholder:text-slate-300
                                                        ${field.disabled
                                                            ? 'bg-slate-100 border-slate-200 text-slate-500'
                                                            : 'bg-white border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300'}
                                                    `}
                                                />
                                            )}
                                        </div>
                                    ))}
                                    {!table.predefinedRows && (
                                        <button
                                            type="button"
                                            onClick={() => removeRow(tableIndex, rowIndex)}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors self-end md:self-auto"
                                            title="Delete Row"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {!table.predefinedRows && (
                        <button
                            type="button"
                            onClick={() => addRow(tableIndex)}
                            className={`mt-4 w-full py-3 border-2 border-dashed ${!isTodayOpen ? 'border-indigo-200 text-indigo-500' : 'border-emerald-200 text-emerald-500'} rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide`}
                        >
                            <Plus size={16} /> Add Entry
                        </button>
                    )}
                </div>
            ))}

            <div className="flex gap-3 pt-4 border-t border-slate-100 bg-white sticky bottom-0">
                <button
                    type="button"
                    onClick={onSuccess}
                    className="flex-1 py-4 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-colors uppercase text-xs tracking-wider"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className={`flex-1 ${!isTodayOpen ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white font-bold py-4 rounded-xl shadow-xl transition-all active:scale-95 flex justify-center items-center gap-2 uppercase text-xs tracking-wider`}
                >
                    {isLoading ? 'Submitting...' : <><CheckSquare size={18} /> {!isTodayOpen ? 'Submit Opening' : 'Submit Closing'}</>}
                </button>
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
