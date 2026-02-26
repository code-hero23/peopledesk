import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createEmployee, updateEmployee, getAllEmployees } from '../features/admin/adminSlice';
import { getBusinessHeads } from '../features/employee/employeeSlice';
import { X, Save, AlertCircle, Plus, Trash2 } from 'lucide-react';

const CreateEmployeeModal = ({ onClose, selectedEmployee }) => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const isAeManager = user?.role === 'AE_MANAGER';

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'EMPLOYEE',
        designation: isAeManager ? 'AE' : 'LA',
        reportingBhId: '',
        isGlobalAccess: false,
        allocatedSalary: 0,
        salaryViewEnabled: false,
        salaryDeductions: 0,
        salaryDeductionBreakdown: [],
    });

    const [businessHeads, setBusinessHeads] = useState([]);

    useEffect(() => {
        const fetchBHs = async () => {
            const bhs = await dispatch(getBusinessHeads()).unwrap();
            setBusinessHeads(bhs);
        };
        fetchBHs();
    }, [dispatch]);

    useEffect(() => {
        if (selectedEmployee) {
            const normalizedBreakdown = (selectedEmployee.salaryDeductionBreakdown || []).map(item => ({
                label: item.label || '',
                amount: item.amount || 0,
                isFixed: item.isFixed !== undefined ? item.isFixed : true,
                month: item.month || new Date().getMonth() + 1,
                year: item.year || new Date().getFullYear()
            }));

            setFormData({
                name: selectedEmployee.name,
                email: selectedEmployee.email,
                role: selectedEmployee.role || 'EMPLOYEE',
                designation: selectedEmployee.designation || (isAeManager ? 'AE' : 'LA'),
                password: '', // Don't pre-fill password
                reportingBhId: selectedEmployee.reportingBhId || '',
                isGlobalAccess: selectedEmployee.isGlobalAccess || false,
                allocatedSalary: selectedEmployee.allocatedSalary || 0,
                salaryViewEnabled: selectedEmployee.salaryViewEnabled || false,
                salaryDeductions: selectedEmployee.salaryDeductions || 0,
                salaryDeductionBreakdown: normalizedBreakdown,
            });
        } else if (isAeManager) {
            setFormData((prev) => ({
                ...prev,
                role: 'EMPLOYEE',
                designation: 'AE',
                reportingBhId: user?.id || '',
                isGlobalAccess: false,
                allocatedSalary: 0,
            }));
        }
    }, [selectedEmployee, isAeManager, user?.id]);

    const onSubmit = (e) => {
        e.preventDefault();
        const submissionData = { ...formData };

        // Remove isGlobalAccess if not a BH
        if (submissionData.role !== 'BUSINESS_HEAD') {
            submissionData.isGlobalAccess = false;
        }

        // If AE Manager is creating an AE, ensure they are set as BH
        if (isAeManager && submissionData.designation === 'AE') {
            submissionData.reportingBhId = user?.id;
        }

        if (selectedEmployee) {
            // Update mode
            dispatch(updateEmployee({ id: selectedEmployee.id, ...submissionData }));
        } else {
            // Create mode
            dispatch(createEmployee(submissionData));
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
                    <h3 className="text-lg font-bold text-slate-800">{selectedEmployee ? 'Edit Employee' : 'Add New User'}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-500 text-xl font-bold">&times;</button>
                </div>

                <form onSubmit={onSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            required
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password {selectedEmployee && '(Leave blank to keep current)'}</label>
                        <input
                            type="text"
                            {...(!selectedEmployee && { required: true })}
                            placeholder={selectedEmployee ? 'New password (optional)' : 'Default password...'}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    {(user?.role === 'ADMIN' || user?.role === 'HR' || user?.role === 'BUSINESS_HEAD') && (
                        <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Financial Settings</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Monthly Salary (CTC)</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                                        value={formData.allocatedSalary}
                                        onChange={(e) => setFormData({ ...formData, allocatedSalary: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fixed Deductions</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                                        value={formData.salaryDeductions}
                                        onChange={(e) => setFormData({ ...formData, salaryDeductions: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 mt-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Deduction Breakdown</label>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({
                                            ...formData,
                                            salaryDeductionBreakdown: [
                                                ...formData.salaryDeductionBreakdown,
                                                { label: '', amount: 0, isFixed: true, month: new Date().getMonth() + 1, year: new Date().getFullYear() }
                                            ]
                                        })}
                                        className="text-[10px] font-black text-blue-600 flex items-center gap-1 hover:text-blue-700 transition-colors"
                                    >
                                        <Plus size={10} /> ADD ROW
                                    </button>
                                </div>

                                {formData.salaryDeductionBreakdown?.map((row, idx) => (
                                    <div key={idx} className="space-y-2 p-3 bg-white rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-1 shadow-sm">
                                        <div className="flex gap-2 items-center">
                                            <input
                                                type="text"
                                                placeholder="Reason (e.g. PF, Tax)"
                                                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-400"
                                                value={row.label}
                                                onChange={(e) => {
                                                    const newR = [...formData.salaryDeductionBreakdown];
                                                    newR[idx] = { ...newR[idx], label: e.target.value };
                                                    setFormData({ ...formData, salaryDeductionBreakdown: newR });
                                                }}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Amount"
                                                className="w-24 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono outline-none focus:border-blue-400"
                                                value={row.amount}
                                                onChange={(e) => {
                                                    const newR = [...formData.salaryDeductionBreakdown];
                                                    newR[idx] = { ...newR[idx], amount: e.target.value };
                                                    setFormData({ ...formData, salaryDeductionBreakdown: newR });
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newR = formData.salaryDeductionBreakdown.filter((_, i) => i !== idx);
                                                    setFormData({ ...formData, salaryDeductionBreakdown: newR });
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newR = [...formData.salaryDeductionBreakdown];
                                                        newR[idx] = { ...newR[idx], isFixed: true };
                                                        setFormData({ ...formData, salaryDeductionBreakdown: newR });
                                                    }}
                                                    className={`px-3 py-1 text-[9px] font-black rounded-md transition-all ${row.isFixed ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                >
                                                    FIXED
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newR = [...formData.salaryDeductionBreakdown];
                                                        newR[idx] = { ...newR[idx], isFixed: false };
                                                        setFormData({ ...formData, salaryDeductionBreakdown: newR });
                                                    }}
                                                    className={`px-3 py-1 text-[9px] font-black rounded-md transition-all ${!row.isFixed ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                >
                                                    MONTHLY
                                                </button>
                                            </div>

                                            {!row.isFixed && (
                                                <div className="flex items-center gap-1.5">
                                                    <select
                                                        className="text-[10px] font-bold bg-white border border-slate-200 rounded-md px-2 py-1 outline-none"
                                                        value={row.month}
                                                        onChange={(e) => {
                                                            const newR = [...formData.salaryDeductionBreakdown];
                                                            newR[idx] = { ...newR[idx], month: parseInt(e.target.value) };
                                                            setFormData({ ...formData, salaryDeductionBreakdown: newR });
                                                        }}
                                                    >
                                                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                                                            <option key={i} value={i + 1}>{m}</option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        className="text-[10px] font-bold bg-white border border-slate-200 rounded-md px-2 py-1 outline-none"
                                                        value={row.year}
                                                        onChange={(e) => {
                                                            const newR = [...formData.salaryDeductionBreakdown];
                                                            newR[idx] = { ...newR[idx], year: parseInt(e.target.value) };
                                                            setFormData({ ...formData, salaryDeductionBreakdown: newR });
                                                        }}
                                                    >
                                                        {[2024, 2025, 2026].map(y => (
                                                            <option key={y} value={y}>{y}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">💰</span>
                                    <div>
                                        <p className="text-xs font-bold text-slate-800">Enable Salary Dashboard</p>
                                        <p className="text-[9px] text-slate-500">Employee can view their pay summary</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.salaryViewEnabled}
                                        onChange={(e) => setFormData({ ...formData, salaryViewEnabled: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-sm"></div>
                                </label>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                            <select
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white text-sm"
                                value={formData.role || 'EMPLOYEE'}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                disabled={isAeManager}
                            >
                                <option value="EMPLOYEE">Employee</option>
                                {!isAeManager && (
                                    <>
                                        <option value="BUSINESS_HEAD">Business Head</option>
                                        <option value="HR">HR Manager</option>
                                        <option value="AE_MANAGER">AE Manager</option>
                                        <option value="ADMIN">Administrator</option>
                                    </>
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Designation</label>
                            <select
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white text-sm disabled:bg-slate-50"
                                value={formData.designation}
                                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                disabled={isAeManager || (formData.role !== 'EMPLOYEE' && formData.role !== 'AE_MANAGER')}
                            >
                                {isAeManager ? (
                                    <option value="AE">Application Engineer (AE)</option>
                                ) : (
                                    <>
                                        <option value="LA">Loading Architect (LA)</option>
                                        <option value="CRE">Customer Relationship Executive (CRE)</option>
                                        <option value="FA">Feasibility Architect (FA)</option>
                                        <option value="AE">Application Engineer (AE)</option>
                                        <option value="OFFICE-ADMINISTRATION">Office Admn</option>
                                        <option value="ACCOUNT">Account</option>
                                        <option value="LEAD-OPERATION">Lead Ops</option>
                                        <option value="LEAD-CONVERSION">Lead Conv</option>
                                        <option value="DIGITAL-MARKETING">Digital Mktg</option>
                                        <option value="VENDOR-MANAGEMENT">Vendor Mgmt</option>
                                        <option value="CUSTOMER-RELATIONSHIP">Customer Rel</option>
                                        <option value="CLIENT-CARE">Client Care</option>
                                        <option value="ESCALATION">Escalation</option>
                                        <option value="CLIENT-FACILITATOR">Client Fac.</option>
                                        <option value="N/A">N/A</option>
                                    </>
                                )}
                            </select>
                        </div>
                    </div>

                    {formData.role === 'BUSINESS_HEAD' && (
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 transition-all animate-fade-up">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 shadow-inner">
                                        🌐
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-blue-900 leading-tight">Global View Access</p>
                                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Employee Monitoring</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.isGlobalAccess}
                                        onChange={(e) => setFormData({ ...formData, isGlobalAccess: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-sm"></div>
                                </label>
                            </div>
                        </div>
                    )}

                    {(formData.role === 'EMPLOYEE' || !formData.role) && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Reporting BH</label>
                            <select
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                                value={formData.reportingBhId}
                                onChange={(e) => setFormData({ ...formData, reportingBhId: e.target.value })}
                            >
                                <option value="">Select Business Head</option>
                                {businessHeads.map(bh => (
                                    <option key={bh.id} value={bh.id}>{bh.name} ({bh.email})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-medium hover:bg-slate-50 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                            {selectedEmployee ? 'Save Changes' : 'Create Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateEmployeeModal;
