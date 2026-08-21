import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
    UserCheck, BookOpen, Send, RefreshCw, Search, Filter,
    Calendar, Clock, Building, User, Phone, FileText, CheckCircle,
    XCircle, AlertCircle, Download, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const REASON_OPTIONS = [
    'Initial',
    'Design discussion - 1st',
    'Design discussion - 2nd',
    'Design discussion - 3rd',
    'Loading - 2D',
    'Loading - 3D',
    'Loading - Wall to Wall',
    'Meeting with BH or RN Sir'
];

const SHOWROOM_OPTIONS = ['MTRS', 'OMR', 'PORUR', 'COIMBATORE'];

const VisitorRecordBook = () => {
    const { user, token } = useSelector((state) => state.auth);
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

    const getAuthHeader = () => ({
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` }
    });

    const [staffList, setStaffList] = useState([]);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [resendingId, setResendingId] = useState(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedShowroomFilter, setSelectedShowroomFilter] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        clientName: '',
        phoneNumber: '',
        reasonOfVisit: 'Initial',
        showroom: 'MTRS',
        dateOfVisit: new Date().toISOString().split('T')[0],
        timeOfEntry: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        faId: '',
        laId: '',
        bhId: '',
        notes: ''
    });

    useEffect(() => {
        fetchStaffList();
        fetchVisitorRecords();
    }, []);

    const fetchStaffList = async () => {
        try {
            const res = await axios.get(`${baseUrl}/visitors/staff`, getAuthHeader());
            if (res.data.success) {
                setStaffList(res.data.users || []);
            }
        } catch (err) {
            console.error('Error fetching staff list:', err);
        }
    };

    const fetchVisitorRecords = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (selectedShowroomFilter && selectedShowroomFilter !== 'ALL') {
                queryParams.append('showroom', selectedShowroomFilter);
            }
            if (startDate) queryParams.append('startDate', startDate);
            if (endDate) queryParams.append('endDate', endDate);
            if (searchTerm) queryParams.append('search', searchTerm);

            const res = await axios.get(`${baseUrl}/visitors?${queryParams.toString()}`, getAuthHeader());
            if (res.data.success) {
                setRecords(res.data.records || []);
            }
        } catch (err) {
            console.error('Error fetching visitor records:', err);
            toast.error('Failed to load visitor records.');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterSubmit = (e) => {
        e.preventDefault();
        fetchVisitorRecords();
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        if (!formData.clientName.trim()) {
            return toast.error('Please enter client name.');
        }
        if (!formData.phoneNumber.trim()) {
            return toast.error('Please enter client phone number.');
        }

        setSubmitting(true);
        try {
            const res = await axios.post(`${baseUrl}/visitors`, formData, getAuthHeader());
            if (res.data.success) {
                toast.success('Visitor Record Saved & WhatsApp notifications enqueued!');
                // Reset Form
                setFormData({
                    clientName: '',
                    phoneNumber: '',
                    reasonOfVisit: 'Initial',
                    showroom: 'MTRS',
                    dateOfVisit: new Date().toISOString().split('T')[0],
                    timeOfEntry: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    faId: '',
                    laId: '',
                    bhId: '',
                    notes: ''
                });
                fetchVisitorRecords();
            }
        } catch (err) {
            console.error('Error submitting visitor record:', err);
            toast.error(err.response?.data?.error || 'Failed to save visitor record.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleResendWhatsApp = async (id) => {
        setResendingId(id);
        try {
            const res = await axios.post(`${baseUrl}/visitors/${id}/resend-whatsapp`, {}, getAuthHeader());
            if (res.data.success) {
                toast.success('WhatsApp alert resent!');
                fetchVisitorRecords();
            }
        } catch (err) {
            console.error('Error resending WhatsApp:', err);
            toast.error('Failed to resend WhatsApp alert.');
        } finally {
            setResendingId(null);
        }
    };

    const exportToCSV = () => {
        if (records.length === 0) return toast.info('No data to export.');
        
        const headers = ['ID,Client Name,Phone Number,Reason,Showroom,Date of Visit,Time of Entry,CRE,FA,LA,BH,WhatsApp Sent\n'];
        const rows = records.map(r => [
            r.id,
            `"${r.clientName}"`,
            `"${r.phoneNumber}"`,
            `"${r.reasonOfVisit}"`,
            `"${r.showroom}"`,
            `"${new Date(r.dateOfVisit).toLocaleDateString('en-IN')}"`,
            `"${r.timeOfEntry}"`,
            `"${r.cre?.name || ''}"`,
            `"${r.fa?.name || ''}"`,
            `"${r.la?.name || ''}"`,
            `"${r.bh?.name || ''}"`,
            r.whatsappSent ? 'Yes' : 'No'
        ].join(','));

        const blob = new Blob([headers + rows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Visitor_Records_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 lg:p-8 text-slate-800 dark:text-slate-100 transition-colors">
            {/* Header Banner */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl">
                            <BookOpen className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Visitors Record Book
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Record client visits & dispatch automated WhatsApp notifications to CRE, FA, LA, and BH.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                            CRE Workspace
                        </span>
                        <button
                            onClick={exportToCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl transition"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Form to Enter Client Visit */}
                <div className="lg:col-span-5">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm sticky top-6">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-red-600" />
                            New Client Visit Entry
                        </h2>

                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            {/* Client Name */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                    Client Name *
                                </label>
                                <div className="relative">
                                    <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Rahul Sharma"
                                        value={formData.clientName}
                                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                            </div>

                            {/* Phone Number */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                    Phone Number *
                                </label>
                                <div className="relative">
                                    <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                    <input
                                        type="tel"
                                        required
                                        placeholder="e.g. 9876543210"
                                        value={formData.phoneNumber}
                                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                            </div>

                            {/* Reason of Visit */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                    Reason of Visit *
                                </label>
                                <select
                                    value={formData.reasonOfVisit}
                                    onChange={(e) => setFormData({ ...formData, reasonOfVisit: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                    {REASON_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>
                                            {opt}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Showroom & Date */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                        Showroom *
                                    </label>
                                    <div className="relative">
                                        <Building className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                        <select
                                            value={formData.showroom}
                                            onChange={(e) => setFormData({ ...formData, showroom: e.target.value })}
                                            className="w-full pl-9 pr-2 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                        >
                                            {SHOWROOM_OPTIONS.map((s) => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                        Date of Visit
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.dateOfVisit}
                                        onChange={(e) => setFormData({ ...formData, dateOfVisit: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                            </div>

                            {/* Time of Entry */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                    Time of Entry
                                </label>
                                <div className="relative">
                                    <Clock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="e.g. 10:30 AM"
                                        value={formData.timeOfEntry}
                                        onChange={(e) => setFormData({ ...formData, timeOfEntry: e.target.value })}
                                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                            </div>

                            {/* Stakeholders Section */}
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                                    Assigned Team Members
                                </span>

                                {/* CRE Name */}
                                <div>
                                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                                        CRE Name (Recorded By)
                                    </label>
                                    <input
                                        type="text"
                                        disabled
                                        value={user?.name || 'Current CRE'}
                                        className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                                    />
                                </div>

                                {/* FA Name */}
                                <div>
                                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                                        FA (Feasibility Architect)
                                    </label>
                                    <select
                                        value={formData.faId}
                                        onChange={(e) => setFormData({ ...formData, faId: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    >
                                        <option value="">Select FA Architect...</option>
                                        {staffList.map((st) => (
                                            <option key={`fa-${st.id}`} value={st.id}>
                                                {st.name} {st.designation ? `(${st.designation})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* LA Name */}
                                <div>
                                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                                        LA (Loading Architect)
                                    </label>
                                    <select
                                        value={formData.laId}
                                        onChange={(e) => setFormData({ ...formData, laId: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    >
                                        <option value="">Select Loading Architect...</option>
                                        {staffList.map((st) => (
                                            <option key={`la-${st.id}`} value={st.id}>
                                                {st.name} {st.designation ? `(${st.designation})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* BH Name */}
                                <div>
                                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                                        BH (Business Head)
                                    </label>
                                    <select
                                        value={formData.bhId}
                                        onChange={(e) => setFormData({ ...formData, bhId: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    >
                                        <option value="">Select Business Head...</option>
                                        {staffList.map((st) => (
                                            <option key={`bh-${st.id}`} value={st.id}>
                                                {st.name} {st.role === 'BUSINESS_HEAD' ? '(BH)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                                    Notes / Special Instructions
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Add any specific client requirement or meeting note..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                            >
                                {submitting ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Saving & Dispatching WhatsApp...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Save Record & Notify Team
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Column: Visit History & Search */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Filters bar */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="relative col-span-1 sm:col-span-3">
                                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search client name, phone number, or reason..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>

                            <div>
                                <select
                                    value={selectedShowroomFilter}
                                    onChange={(e) => setSelectedShowroomFilter(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                    <option value="ALL">All Showrooms</option>
                                    {SHOWROOM_OPTIONS.map((s) => (
                                        <option key={`f-${s}`} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>

                            <button
                                type="submit"
                                className="py-2 px-4 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-medium text-sm rounded-xl transition flex items-center justify-center gap-2"
                            >
                                <Filter className="w-4 h-4" />
                                Filter Logs
                            </button>
                        </form>
                    </div>

                    {/* Records List */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                                <BookOpen className="w-4 h-4 text-red-600" />
                                Client Visit History ({records.length})
                            </h3>
                            <button
                                onClick={fetchVisitorRecords}
                                className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
                                title="Refresh"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {loading ? (
                            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-red-600" />
                                Loading visitor records...
                            </div>
                        ) : records.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                No visitor records found matching criteria.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-200 dark:divide-slate-800">
                                {records.map((r) => (
                                    <div key={r.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-900 dark:text-white text-base">
                                                    {r.clientName}
                                                </span>
                                                <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                    📞 {r.phoneNumber}
                                                </span>
                                                <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400">
                                                    {r.showroom}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {new Date(r.dateOfVisit).toLocaleDateString('en-IN', {
                                                        day: '2-digit', month: 'short', year: 'numeric'
                                                    })}
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {r.timeOfEntry}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mb-2">
                                            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200 inline-block">
                                                📌 Reason: {r.reasonOfVisit}
                                            </span>
                                        </div>

                                        {/* Assigned Team Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs">
                                            <div>
                                                <span className="text-slate-400 block text-[10px] uppercase font-semibold">CRE</span>
                                                <span className="font-medium text-slate-700 dark:text-slate-200">{r.cre?.name || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px] uppercase font-semibold">FA</span>
                                                <span className="font-medium text-slate-700 dark:text-slate-200">{r.fa?.name || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px] uppercase font-semibold">LA</span>
                                                <span className="font-medium text-slate-700 dark:text-slate-200">{r.la?.name || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px] uppercase font-semibold">BH</span>
                                                <span className="font-medium text-slate-700 dark:text-slate-200">{r.bh?.name || 'N/A'}</span>
                                            </div>
                                        </div>

                                        {r.notes && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 italic mb-3">
                                                Note: "{r.notes}"
                                            </p>
                                        )}

                                        {/* WhatsApp Status & Resend */}
                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60">
                                            <div className="flex items-center gap-1.5">
                                                {r.whatsappSent ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                        WhatsApp Alerts Dispatched
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                                        <XCircle className="w-3.5 h-3.5" />
                                                        WhatsApp Pending / Missing Credentials
                                                    </span>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => handleResendWhatsApp(r.id)}
                                                disabled={resendingId === r.id}
                                                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                                            >
                                                <MessageSquare className="w-3.5 h-3.5" />
                                                {resendingId === r.id ? 'Resending...' : 'Resend WhatsApp'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VisitorRecordBook;
