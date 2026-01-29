import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog } from '../../features/employee/employeeSlice';
import { WORK_LOG_CONFIG } from '../../config/workLogConfig';
import SuccessModal from '../SuccessModal';
import { Plus, Trash2 } from 'lucide-react';

const DynamicWorkLogForm = ({ onSuccess, role }) => {
    const dispatch = useDispatch();
    const { isLoading } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);

    // Get config for the role or return null
    const config = WORK_LOG_CONFIG[role];

    // Initialize state: object with keys being table indices or labels
    // Example: { "0": [{...row1}, {...row2}], "1": [...] }
    const [tableData, setTableData] = useState(() => {
        if (!config) return {};
        const initial = {};
        config.tables.forEach((table, index) => {
            initial[index] = [{}]; // Start with one empty row
        });
        return initial;
    });

    if (!config) {
        return <div className="p-4 text-red-500">Configuration not found for role: {role}</div>;
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
        setTableData(prev => {
            if (prev[tableIndex].length <= 1) return prev; // Don't delete last row
            const newTable = prev[tableIndex].filter((_, i) => i !== rowIndex);
            return { ...prev, [tableIndex]: newTable };
        });
    };

    const onSubmit = (e) => {
        e.preventDefault();

        // Package data for backend
        // Structure: { customFields: { "Table Label": [rows...] } }
        const customFields = {};
        config.tables.forEach((table, index) => {
            customFields[table.label] = tableData[index];
        });

        dispatch(createWorkLog({ customFields })).then(() => {
            setShowSuccess(true);
        });
    };

    return (
        <form onSubmit={onSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto px-1 pr-2">
            <div className="border-b pb-2 mb-4 sticky top-0 bg-white z-10">
                <h3 className="font-bold text-slate-800 text-lg">{config.title}</h3>
                <p className="text-slate-400 text-xs mt-1">Fill in the daily reporting details below.</p>
            </div>

            {config.tables.map((table, tableIndex) => (
                <div key={tableIndex} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 block"></span>
                        {table.label}
                    </h4>

                    {/* Table Header - Hide on small screens if needed, mostly for structure */}
                    <div className="hidden md:flex gap-4 mb-2 px-2 text-xs font-bold text-slate-400 uppercase">
                        {table.fields.map(field => (
                            <div key={field.name} className="flex-1">{field.label}</div>
                        ))}
                        <div className="w-8"></div>
                    </div>

                    <div className="space-y-3">
                        {tableData[tableIndex]?.map((row, rowIndex) => (
                            <div key={rowIndex} className="flex flex-col md:flex-row gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm group hover:border-blue-300 transition-colors">
                                {table.fields.map(field => (
                                    <div key={field.name} className="flex-1">
                                        <label className="md:hidden text-xs font-bold text-slate-400 mb-1 block">{field.label}</label>
                                        {field.type === 'select' ? (
                                            <select
                                                value={row[field.name] || ''}
                                                onChange={(e) => handleRowChange(tableIndex, rowIndex, field.name, e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white transition-all"
                                            >
                                                <option value="">Select...</option>
                                                {field.options?.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type={field.type}
                                                value={row[field.name] || ''}
                                                onChange={(e) => handleRowChange(tableIndex, rowIndex, field.name, e.target.value)}
                                                placeholder={field.label}
                                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white transition-all"
                                            />
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => removeRow(tableIndex, rowIndex)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors self-end md:self-auto"
                                    title="Delete Row"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => addRow(tableIndex)}
                        className="mt-3 text-sm text-blue-600 font-bold hover:text-blue-800 flex items-center gap-1 py-2 px-3 hover:bg-blue-50 rounded-lg transition-colors w-full md:w-auto justify-center md:justify-start border border-dashed border-blue-200 hover:border-blue-400"
                    >
                        <Plus size={16} /> Add Row
                    </button>
                </div>
            ))}

            <div className="pt-4 border-t border-slate-100 flex gap-4 sticky bottom-0 bg-white pb-2">
                <button
                    type="button"
                    onClick={onSuccess} // Actually closes modal
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex justify-center items-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            Submitting...
                        </>
                    ) : (
                        <>
                            <span>Submit Report</span>
                            <span className="text-xl">🚀</span>
                        </>
                    )}
                </button>
            </div>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => {
                    setShowSuccess(false);
                    if (onSuccess) onSuccess();
                }}
                message="Work Log Submitted!"
                subMessage="Your report has been saved successfully."
            />
        </form>
    );
};

export default DynamicWorkLogForm;
