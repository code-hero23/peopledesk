import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getAllEmployees, deleteEmployee, updateUserStatus, reset } from '../../features/admin/adminSlice';
import CreateEmployeeModal from '../../components/CreateEmployeeModal';

const ManageEmployees = () => {
    const dispatch = useDispatch();
    const { employees, isLoading, isSuccess, message } = useSelector((state) => state.admin);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    useEffect(() => {
        dispatch(getAllEmployees());
        return () => { dispatch(reset()); };
    }, [dispatch]);

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to permanently delete this employee? This action cannot be undone.')) {
            dispatch(deleteEmployee(id));
        }
    };

    const handleEdit = (employee) => {
        setSelectedEmployee(employee);
        setShowModal(true);
    };

    const handleAdd = () => {
        setSelectedEmployee(null);
        setShowModal(true);
    };

    const handleStatusToggle = (id, currentStatus) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
        if (window.confirm(`Change status to ${newStatus}?`)) {
            dispatch(updateUserStatus({ id, status: newStatus }));
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.designation.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in relative">
            {showModal && (
                <CreateEmployeeModal
                    onClose={() => setShowModal(false)}
                    selectedEmployee={selectedEmployee}
                />
            )}

            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Manage Employees</h2>
                    <p className="text-slate-500">Add, edit, or remove team members.</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-md transition-colors flex items-center gap-2"
                >
                    <span>➕</span> Add New Employee
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <div className="relative w-full max-w-md">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                        <input
                            type="text"
                            placeholder="Search by name, email, or role..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="text-sm text-slate-500 font-medium">
                        Showing {filteredEmployees.length} of {employees.length} employees
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                                <th className="px-6 py-4">Employee Details</th>
                                <th className="px-6 py-4">Designation</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredEmployees.map((emp) => (
                                <tr key={emp.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{emp.name}</div>
                                        <div className="text-sm text-slate-500">{emp.email}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {emp.role === 'ADMIN' ? (
                                            <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded">
                                                ADMINISTRATOR
                                            </span>
                                        ) : emp.role === 'BUSINESS_HEAD' ? (
                                            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                                                BUSINESS HEAD
                                            </span>
                                        ) : emp.role === 'HR' ? (
                                            <span className="inline-block px-2 py-1 bg-pink-100 text-pink-700 text-xs font-bold rounded">
                                                HR MANAGER
                                            </span>
                                        ) : (
                                            <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded">
                                                {emp.designation}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span
                                            className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${emp.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}
                                        >
                                            {emp.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleStatusToggle(emp.id, emp.status)}
                                                className={`p-2 rounded-lg transition-colors ${emp.status === 'ACTIVE'
                                                    ? 'text-orange-500 hover:bg-orange-50 hover:text-orange-600'
                                                    : 'text-green-500 hover:bg-green-50 hover:text-green-600'
                                                    }`}
                                                title={emp.status === 'ACTIVE' ? 'Block Access' : 'Unblock Access'}
                                            >
                                                {emp.status === 'ACTIVE' ? '🚫' : '✅'}
                                            </button>
                                            <button
                                                onClick={() => handleEdit(emp)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleDelete(emp.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete permenantly"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredEmployees.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="text-center py-12 text-slate-400 italic">
                                        No employees found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
};

export default ManageEmployees;
