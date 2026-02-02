import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog } from '../../features/employee/employeeSlice';
import { WORK_LOG_CONFIG } from '../../config/workLogConfig';
import SuccessModal from '../SuccessModal';
import ConfirmationModal from '../ConfirmationModal';
import { Plus, Trash2, Layers, CheckSquare, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DynamicWorkLogForm = ({ onSuccess, role }) => {
    const dispatch = useDispatch();
    const { isLoading } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);
    const [confirmationConfig, setConfirmationConfig] = useState({
        isOpen: false,
        onConfirm: () => { }
    });

    const config = WORK_LOG_CONFIG[role];

    const [tableData, setTableData] = useState(() => {
        if (!config) return {};
        const initial = {};
        config.tables.forEach((table, index) => {
            initial[index] = table.predefinedRows ? [...table.predefinedRows] : [{}];
        });
        return initial;
    });

    if (!config) {
        return <div className="p-4 text-red-500 font-bold bg-red-50 rounded-xl">Configuration not found for role: {role}</div>;
    }

    const handleRowChange = (tableIndex, rowIndex, fieldName, value) => {
        setTableData(prev => {
            const newTable = [...prev[tableIndex]];
            newTable[rowIndex] = { ...newTable[rowIndex], [fieldName]: value };
            return { ...prev, [tableIndex]: newTable };
        });
    };

    const addRow = (tableIndex) => {
        setTableData(prev => ({
            ...prev,
            [tableIndex]: [...prev[tableIndex], {}]
        }));
    };

    const removeRow = (tableIndex, rowIndex) => {
        if (config.tables[tableIndex].predefinedRows) return;
        setTableData(prev => {
            if (prev[tableIndex].length <= 1) return prev;
            const newTable = prev[tableIndex].filter((_, i) => i !== rowIndex);
            return { ...prev, [tableIndex]: newTable };
        });
    };

    const handleConfirmSubmit = () => {
        const customFields = {};
        config.tables.forEach((table, index) => {
            customFields[table.label] = tableData[index];
        });

        dispatch(createWorkLog({ customFields })).then(() => {
            setShowSuccess(true);
        });
    };

    const onSubmit = (e) => {
        e.preventDefault();
        setConfirmationConfig({
            isOpen: true,
            onConfirm: handleConfirmSubmit
        });
    };

    return (
        <motion.form
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={onSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto px-1 pr-2"
        >
            <div className="bg-gradient-to-r from-indigo-500 to-violet-500 p-6 rounded-2xl text-white shadow-lg shadow-indigo-200 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                        <Layers size={24} className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-black text-2xl tracking-tight">{config.title}</h3>
                        <p className="text-indigo-100 text-sm font-medium opacity-90">Daily Activity Report</p>
                    </div>
                </div>
            </div>

            {config.tables.map((table, tableIndex) => (
                <div key={tableIndex} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-50">
                        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
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
                                    key={rowIndex}
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
                            className="mt-4 w-full py-3 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-500 font-bold hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide"
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
                    className="flex-1 bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-xl transition-all active:scale-95 flex justify-center items-center gap-2 uppercase text-xs tracking-wider"
                >
                    {isLoading ? 'Submitting...' : <><CheckSquare size={18} /> Submit Report</>}
                </button>
            </div>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => {
                    setShowSuccess(false);
                    if (onSuccess) onSuccess();
                }}
                message="Report Submitted!"
                subMessage="Your work log has been recorded successfully."
            />

            <ConfirmationModal
                isOpen={confirmationConfig.isOpen}
                onClose={() => setConfirmationConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmationConfig.onConfirm}
                title="Submit Work Log"
                message="Are you sure you want to submit your daily report?"
                type="info"
                confirmText="Submit"
            />
        </motion.form>
    );
};

export default DynamicWorkLogForm;
