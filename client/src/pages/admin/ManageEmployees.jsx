import { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { UserPlus, Download } from 'lucide-react';
import { getAllEmployees, deleteEmployee, updateUserStatus, reset } from '../../features/admin/adminSlice';
import CreateEmployeeModal from '../../components/CreateEmployeeModal';

const ManageEmployees = () => {
    const dispatch = useDispatch();
    const { employees, isLoading, isSuccess, message } = useSelector((state) => state.admin);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const fileInputRef = useRef(null);
    const { user } = useSelector((state) => state.auth);

    const handleDownloadExcel = async () => {
        try {
            setExporting(true);
            const token = user.token;
            const config = {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob',
            };

            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const apiUrl = `${baseUrl}/export/employees?search=${encodeURIComponent(searchTerm)}`;

            const response = await axios.get(apiUrl, config);

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `employees_export_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to export employees.");
        } finally {
            setExporting(false);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            const token = user.token;
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
            };
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const response = await axios.post(`${baseUrl}/admin/employees/import`, formData, config);

            alert(response.data.message);
            dispatch(getAllEmployees());
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.message || 'Import failed';
            alert(`Error: ${msg}`);
        } finally {
            setUploading(false);
        }
    };

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
                <div className="flex gap-3">
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept=".xlsx, .xls"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    {user?.role === 'ADMIN' && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => fileInputRef.current.click()}
                                disabled={uploading}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2.5 rounded-lg font-bold shadow-md transition-colors flex items-center gap-2 text-sm"
                            >
                                <span>📂</span> {uploading ? 'Importing...' : 'Import'}
                            </button>
                            <button
                                onClick={handleDownloadExcel}
                                disabled={exporting}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2.5 rounded-lg font-bold shadow-md transition-colors flex items-center gap-2 text-sm"
                            >
                                <Download size={18} /> {exporting ? 'Exporting...' : 'Export'}
                            </button>
                        </div>
                    )}
                    {['ADMIN', 'AE_MANAGER'].includes(user?.role) && (
                        <button
                            onClick={handleAdd}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-md transition-colors flex items-center gap-2"
                        >
                            <span>➕</span> Add New Employee
                        </button>
                    )}
                </div>
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
                                <th className="px-6 py-4">Reporting To</th>
                                <th className="px-6 py-4 text-center">Salary Access</th>
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
                                            <div className="flex flex-col gap-1">
                                                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded w-fit">
                                                    BUSINESS HEAD
                                                </span>
                                                {emp.isGlobalAccess && (
                                                    <span className="inline-block px-2 py-0.5 bg-blue-600 text-white text-[9px] font-black rounded-full w-fit flex items-center gap-1 shadow-sm">
                                                        🌐 GLOBAL VIEW
                                                    </span>
                                                )}
                                            </div>
                                        ) : emp.role === 'HR' ? (
                                            <span className="inline-block px-2 py-1 bg-pink-100 text-pink-700 text-xs font-bold rounded">
                                                HR MANAGER
                                            </span>
                                        ) : emp.role === 'AE_MANAGER' ? (
                                            <span className="inline-block px-2 py-1 bg-teal-100 text-teal-700 text-xs font-bold rounded">
                                                AE MANAGER
                                            </span>
                                        ) : (
                                            <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded">
                                                {emp.designation}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {emp.reportingBh ? (
                                            <div className="text-sm font-medium text-slate-700">{emp.reportingBh.name}</div>
                                        ) : (
                                            <div className="text-xs text-slate-400 italic">Not Assigned</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${emp.salaryViewEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                                {emp.salaryViewEnabled ? 'Dashboard ON' : 'Dashboard OFF'}
                                            </span>
                                            {emp.allocatedSalary > 0 && (
                                                <span className="text-[10px] font-mono font-bold text-slate-500">
                                                    ₹{emp.allocatedSalary.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
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
                                        {user?.role === 'ADMIN' && (
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
                                        )}
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
