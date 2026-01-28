import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getAllEmployees, getPendingRequests, reset } from '../features/admin/adminSlice';
import StatCard from '../components/StatCard';
import { Link, useNavigate } from 'react-router-dom';

import axios from 'axios';

const AdminDashboard = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { employees, pendingRequests } = useSelector((state) => state.admin);
    const { user } = useSelector((state) => state.auth);

    useEffect(() => {
        dispatch(getAllEmployees());
        dispatch(getPendingRequests());
        return () => { dispatch(reset()); };
    }, [dispatch]);

    const onDownload = async (type) => {
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
                responseType: 'blob', // Important: response as blob
            };

            const response = await axios.get(`/api/export/${type}`, config);

            // Create a blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${type}_${new Date().toISOString().split('T')[0]}.csv`); // Filename
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to download export. Please try again.");
        }
    };

    return (
        <div className="space-y-8 relative">
            {/* Create Employee Modal */}


            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Admin Dashboard</h2>
                    <p className="text-slate-500">Overview of system activity.</p>
                </div>
            </div>
            <div className="flex gap-3 flex-wrap">
                <button onClick={() => navigate('/admin/employees')} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-colors flex items-center gap-2">
                    <span>➕</span> Add Employee
                </button>
                {/* Export Buttons - Visible only to HR */}
                {user?.role === 'HR' && (
                    <>
                        <button onClick={() => onDownload('worklogs')} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-colors flex items-center gap-2">
                            <span>📥</span> Export Logs
                        </button>
                        <button onClick={() => onDownload('attendance')} className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-colors flex items-center gap-2">
                            <span>📊</span> Export Attendance
                        </button>
                    </>
                )}
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {user?.role === 'ADMIN' && (
                    <StatCard title="Total Employees" value={employees.length} icon="👥" color="blue" />
                )}

                {/* Admin does not see Pending Requests */}
                {user?.role !== 'ADMIN' && (
                    <StatCard title="Pending Requests" value={pendingRequests.leaves.length + pendingRequests.permissions.length} icon="⏳" color="orange" />
                )}

                {user?.role === 'ADMIN' && (
                    <>
                        <StatCard title="Active Users" value={employees.filter(e => e.status === 'ACTIVE').length} icon="✅" color="green" />
                        <StatCard title="Blocked Users" value={employees.filter(e => e.status === 'BLOCKED').length} icon="🚫" color="purple" />
                    </>
                )}
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {user?.role === 'ADMIN' && (
                    <Link to="/admin/employees" className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all group">
                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">👥 Manage Employees</h3>
                        <p className="text-slate-500 text-sm mt-1">Add, edit, or remove team members.</p>
                    </Link>
                )}

                {user?.role !== 'ADMIN' && (
                    <Link to="/admin/approvals" className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all group">
                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">📝 Manage Approvals</h3>
                        <p className="text-slate-500 text-sm mt-1">Review and action pending leave and permission requests.</p>
                    </Link>
                )}

                <Link to="/admin/worklogs" className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all group">
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">📂 View Work Logs</h3>
                    <p className="text-slate-500 text-sm mt-1">Monitor daily work submissions from all employees.</p>
                </Link>
            </div>


        </div >
    );
};

export default AdminDashboard;
