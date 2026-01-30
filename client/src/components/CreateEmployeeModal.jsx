import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { createEmployee, updateEmployee } from '../features/admin/adminSlice';

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
    });

    useEffect(() => {
        if (selectedEmployee) {
            setFormData({
                name: selectedEmployee.name,
                email: selectedEmployee.email,
                designation: selectedEmployee.designation || (isAeManager ? 'AE' : 'LA'),
                password: '', // Don't pre-fill password
            });
        }
    }, [selectedEmployee]);

    const onSubmit = (e) => {
        e.preventDefault();
        if (selectedEmployee) {
            // Update mode
            dispatch(updateEmployee({ id: selectedEmployee.id, ...formData }));
        } else {
            // Create mode
            dispatch(createEmployee(formData));
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
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

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                        <select
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
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

                    {(formData.role === 'EMPLOYEE' || !formData.role) && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Designation</label>
                            <select
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                                value={formData.designation}
                                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                disabled={isAeManager}
                            >
                                {isAeManager ? (
                                    <option value="AE">Application Engineer (AE)</option>
                                ) : (
                                    <>
                                        <option value="LA">Loading Architect (LA)</option>
                                        <option value="CRE">Customer Relationship Executive (CRE)</option>
                                        <option value="FA">Feasibility Architect (FA)</option>
                                        <option value="AE">Application Engineer (AE)</option>
                                        <option value="OFFICE-ADMINISTRATION">Office Administration</option>
                                        <option value="ACCOUNT">Account</option>
                                        <option value="LEAD-OPERATION">Lead Operation</option>
                                        <option value="LEAD-CONVERSION">Lead Conversion</option>
                                        <option value="DIGITAL-MARKETING">Digital Marketing</option>
                                        <option value="VENDOR-MANAGEMENT">Vendor Management</option>
                                        <option value="CUSTOMER-RELATIONSHIP">Customer Relationship</option>
                                        <option value="CLIENT-CARE">Client Care</option>
                                        <option value="ESCALATION">Escalation</option>
                                        <option value="CLIENT-FACILITATOR">Client Facilitator</option>
                                    </>
                                )}
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
