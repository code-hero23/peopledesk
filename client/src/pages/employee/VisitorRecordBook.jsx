import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
    UserCheck, BookOpen, Send, RefreshCw, Search, Filter,
    Calendar, Clock, Building, User, Phone, FileText, CheckCircle,
    XCircle, AlertCircle, Download, MessageSquare, Trash2,
    ChevronLeft, ChevronRight, Sparkles, Check
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
    const { user } = useSelector((state) => state.auth);
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

    const getAuthHeader = () => {
        const token = user?.token || JSON.parse(localStorage.getItem('user') || '{}')?.token;
        return {
            headers: { Authorization: `Bearer ${token}` }
        };
    };

    const [staffList, setStaffList] = useState([]);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [resendingId, setResendingId] = useState(null);

    // Filters & Pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedShowroomFilter, setSelectedShowroomFilter] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Form State
    const getCurrentTime = () => {
        const d = new Date();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const [formData, setFormData] = useState({
        clientName: '',
        phoneNumber: '',
        reasonOfVisit: 'Initial',
        showroom: 'MTRS',
        dateOfVisit: new Date().toISOString().split('T')[0],
        timeOfEntry: getCurrentTime(),
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

    // Filter staff members specifically for FA, LA, and BH roles/designations
    const faList = staffList.filter(st => {
        const des = (st.designation || '').toUpperCase();
        return des === 'FA' || des.includes('FEASIBILITY') || des.includes('FA ');
    });
    const displayFAList = faList.length > 0 ? faList : staffList;

    const laList = staffList.filter(st => {
        const des = (st.designation || '').toUpperCase();
        return des === 'LA' || des.includes('LOADING') || des.includes('LA ');
    });
    const displayLAList = laList.length > 0 ? laList : staffList;

    const bhList = staffList.filter(st => {
        const des = (st.designation || '').toUpperCase();
        const role = (st.role || '').toUpperCase();
        return role === 'BUSINESS_HEAD' || des === 'BH' || des.includes('BUSINESS HEAD') || des.includes('BH ');
    });
    const displayBHList = bhList.length > 0 ? bhList : staffList;

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
                setCurrentPage(1);
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
                toast.success('Visitor Record saved & WhatsApp alerts sent!');
                // Reset Form
                setFormData({
                    clientName: '',
                    phoneNumber: '',
                    reasonOfVisit: 'Initial',
                    showroom: 'MTRS',
                    dateOfVisit: new Date().toISOString().split('T')[0],
                    timeOfEntry: getCurrentTime(),
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
                toast.success('WhatsApp alert resent successfully!');
                fetchVisitorRecords();
            }
        } catch (err) {
            console.error('Error resending WhatsApp:', err);
            toast.error('Failed to resend WhatsApp alert.');
        } finally {
            setResendingId(null);
        }
    };

    const handleDeleteRecord = async (id) => {
        if (!window.confirm('Are you sure you want to delete this visitor record?')) return;

        try {
            const res = await axios.delete(`${baseUrl}/visitors/${id}`, getAuthHeader());
            if (res.data.success) {
                toast.success('Visitor record deleted successfully.');
                fetchVisitorRecords();
            }
        } catch (err) {
            console.error('Error deleting record:', err);
            toast.error(err.response?.data?.error || 'Failed to delete record.');
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

    // Pagination Slicing
    const totalPages = Math.ceil(records.length / itemsPerPage) || 1;
    const indexOfLastRecord = currentPage * itemsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - itemsPerPage;
    const currentRecords = records.slice(indexOfFirstRecord, indexOfLastRecord);

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-3 sm:p-5 lg:p-8 text-slate-800 dark:text-slate-100 transition-colors select-none">
            {/* Header Banner - Optimized for Touch Tablets */}
            <div className="max-w-7xl mx-auto mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md">
                    <div className="flex items-center gap-4">
                        <div className="p-3.5 bg-gradient-to-br from-red-500 to-rose-700 text-white rounded-2xl shadow-lg shadow-red-500/20 flex-shrink-0">
                            <BookOpen className="w-7 h-7 sm:w-8 sm:h-8" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                                    Visitors Record Book
                                </h1>
                                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300">
                                    FRONT DESK
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                Log client arrivals & trigger instant WhatsApp alerts to CRE, FA, LA, & BH.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-center">
                        <button
                            onClick={exportToCSV}
                            className="min-h-[46px] px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-2xl transition-all active:scale-95 flex items-center gap-2 shadow-sm touch-manipulation"
                        >
                            <Download className="w-4 h-4 text-red-600 dark:text-red-400" />
                            Export CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Main 2-Column Responsive Layout */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                
                {/* Left Column: Form to Log Client Visit (Touchscreen Optimized) */}
                <div className="lg:col-span-5">
                    <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md sticky top-6">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                                <UserCheck className="w-5 h-5 text-red-600 dark:text-red-400" />
                                New Visitor Arrival
                            </h2>
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                                Touch Form
                            </span>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-4 sm:space-y-5">
                            
                            {/* Client Name */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                                    Client Name <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <User className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Anand Kumar"
                                        value={formData.clientName}
                                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3.5 min-h-[50px] bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Phone Number */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                                    Phone Number <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Phone className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                                    <input
                                        type="tel"
                                        required
                                        placeholder="e.g. 9876543210"
                                        value={formData.phoneNumber}
                                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3.5 min-h-[50px] bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Showroom Quick Tap Selector Pills */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                                    Showroom Location <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {SHOWROOM_OPTIONS.map((sh) => {
                                        const isSelected = formData.showroom === sh;
                                        return (
                                            <button
                                                type="button"
                                                key={`sh-${sh}`}
                                                onClick={() => setFormData({ ...formData, showroom: sh })}
                                                className={`min-h-[46px] py-2.5 px-3 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 touch-manipulation active:scale-95 ${
                                                    isSelected
                                                        ? 'bg-red-600 text-white shadow-md shadow-red-500/25 ring-2 ring-red-600'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                {isSelected && <Check className="w-4 h-4" />}
                                                {sh}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Reason of Visit */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                                    Reason of Visit <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.reasonOfVisit}
                                    onChange={(e) => setFormData({ ...formData, reasonOfVisit: e.target.value })}
                                    className="w-full px-4 py-3.5 min-h-[50px] bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-base sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                    {REASON_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>
                                            {opt}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Date & Time Entry (2 Columns) */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                                        Date of Visit
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.dateOfVisit}
                                        onChange={(e) => setFormData({ ...formData, dateOfVisit: e.target.value })}
                                        className="w-full px-3 py-3.5 min-h-[50px] bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                                        Time of Entry <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="time"
                                        required
                                        value={formData.timeOfEntry}
                                        onChange={(e) => setFormData({ ...formData, timeOfEntry: e.target.value })}
                                        className="w-full px-3 py-3.5 min-h-[50px] bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                            </div>

                            {/* Team Stakeholders Dropdowns */}
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3.5">
                                <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block">
                                    Notify Team Members
                                </span>

                                {/* CRE Name */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                        CRE (Recorded By)
                                    </label>
                                    <input
                                        type="text"
                                        disabled
                                        value={user?.name || 'Current CRE'}
                                        className="w-full px-4 py-3 min-h-[46px] bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-sm font-semibold text-slate-600 dark:text-slate-400 cursor-not-allowed"
                                    />
                                </div>

                                {/* FA Name */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                        FA (Feasibility Architect)
                                    </label>
                                    <select
                                        value={formData.faId}
                                        onChange={(e) => setFormData({ ...formData, faId: e.target.value })}
                                        className="w-full px-4 py-3 min-h-[46px] bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                                    >
                                        <option value="">Select FA (Feasibility Architect)...</option>
                                        {displayFAList.map((st) => (
                                            <option key={`fa-${st.id}`} value={st.id}>
                                                {st.name} {st.designation ? `(${st.designation})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* LA Name */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                        LA (Loading Architect)
                                    </label>
                                    <select
                                        value={formData.laId}
                                        onChange={(e) => setFormData({ ...formData, laId: e.target.value })}
                                        className="w-full px-4 py-3 min-h-[46px] bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                                    >
                                        <option value="">Select LA (Loading Architect)...</option>
                                        {displayLAList.map((st) => (
                                            <option key={`la-${st.id}`} value={st.id}>
                                                {st.name} {st.designation ? `(${st.designation})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* BH Name */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                        BH (Business Head)
                                    </label>
                                    <select
                                        value={formData.bhId}
                                        onChange={(e) => setFormData({ ...formData, bhId: e.target.value })}
                                        className="w-full px-4 py-3 min-h-[46px] bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                                    >
                                        <option value="">Select BH (Business Head)...</option>
                                        {displayBHList.map((st) => (
                                            <option key={`bh-${st.id}`} value={st.id}>
                                                {st.name} {st.designation ? `(${st.designation})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Big Touch-Screen Submit CTA Button */}
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full min-h-[56px] mt-4 py-3.5 px-6 bg-gradient-to-r from-red-600 via-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 active:scale-[0.98] text-white font-bold text-base rounded-2xl shadow-xl shadow-red-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 touch-manipulation cursor-pointer"
                            >
                                {submitting ? (
                                    <>
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                        <span>Saving & Dispatching WhatsApp...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        <span>SAVE VISIT & SEND WHATSAPP ALERTS</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Column: Search, Filters, & Record History List */}
                <div className="lg:col-span-7">
                    
                    {/* Filters & Search Header Card */}
                    <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
                                <Filter className="w-4 h-4 text-red-600" />
                                Search & Filter Records
                            </h3>

                            {/* Showroom Filter Tap Chips */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                {['ALL', ...SHOWROOM_OPTIONS].map((sh) => (
                                    <button
                                        key={`flt-${sh}`}
                                        type="button"
                                        onClick={() => {
                                            setSelectedShowroomFilter(sh);
                                            fetchVisitorRecords();
                                        }}
                                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all touch-manipulation active:scale-95 ${
                                            selectedShowroomFilter === sh
                                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                        }`}
                                    >
                                        {sh}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Search & Date Filter Bar */}
                        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <div className="sm:col-span-6 relative">
                                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by client name, phone, or reason..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 min-h-[46px] bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                            </div>

                            <div className="sm:col-span-4 grid grid-cols-2 gap-2">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-2.5 py-2.5 min-h-[46px] bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs focus:outline-none"
                                />
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-2.5 py-2.5 min-h-[46px] bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs focus:outline-none"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <button
                                    type="submit"
                                    className="w-full min-h-[46px] py-2.5 px-3 bg-slate-900 hover:bg-slate-800 dark:bg-red-600 dark:hover:bg-red-700 text-white font-bold text-xs sm:text-sm rounded-2xl transition active:scale-95 flex items-center justify-center gap-1.5 touch-manipulation"
                                >
                                    <Search className="w-4 h-4" />
                                    Filter
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Visitor History Record Cards */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md overflow-hidden">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                                <BookOpen className="w-4 h-4 text-red-600" />
                                Client Visit Logs ({records.length})
                            </h3>
                            <button
                                onClick={fetchVisitorRecords}
                                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition flex items-center gap-1.5 text-xs font-bold active:scale-95 touch-manipulation"
                                title="Refresh"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                        </div>

                        {loading ? (
                            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                                <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3 text-red-600" />
                                <p className="font-semibold text-sm">Loading visitor records...</p>
                            </div>
                        ) : records.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                                <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40 text-red-500" />
                                <p className="font-bold text-sm">No visitor records found matching criteria.</p>
                            </div>
                        ) : (
                            <>
                                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {currentRecords.map((r) => (
                                        <div key={r.id} className="p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-black text-slate-900 dark:text-white text-base">
                                                        {r.clientName}
                                                    </span>
                                                    <span className="px-2.5 py-1 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                        📞 {r.phoneNumber}
                                                    </span>
                                                    <span className="px-2.5 py-1 text-xs font-black rounded-xl bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300">
                                                        {r.showroom}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5 text-red-500" />
                                                        {new Date(r.dateOfVisit).toLocaleDateString('en-IN', {
                                                            day: '2-digit', month: 'short', year: 'numeric'
                                                        })}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3.5 h-3.5 text-red-500" />
                                                        {r.timeOfEntry}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mb-3">
                                                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200 inline-block">
                                                    📌 Reason: {r.reasonOfVisit}
                                                </span>
                                            </div>

                                            {/* Assigned Team Grid */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-xs">
                                                <div>
                                                    <span className="text-slate-400 block text-[10px] uppercase font-black">CRE</span>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">{r.cre?.name || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 block text-[10px] uppercase font-black">FA</span>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">{r.fa?.name || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 block text-[10px] uppercase font-black">LA</span>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">{r.la?.name || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 block text-[10px] uppercase font-black">BH</span>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">{r.bh?.name || 'N/A'}</span>
                                                </div>
                                            </div>

                                            {r.notes && (
                                                <p className="text-xs text-slate-500 dark:text-slate-400 italic mb-3">
                                                    Note: "{r.notes}"
                                                </p>
                                            )}

                                            {/* Action Bar (WhatsApp & Admin Delete) */}
                                            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
                                                <div className="flex items-center gap-1.5">
                                                    {r.whatsappSent ? (
                                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                            <CheckCircle className="w-4 h-4" />
                                                            WhatsApp Dispatched
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                                                            <XCircle className="w-4 h-4" />
                                                            WhatsApp Pending
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleResendWhatsApp(r.id)}
                                                        disabled={resendingId === r.id}
                                                        className="min-h-[40px] px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl transition active:scale-95 flex items-center gap-1.5 touch-manipulation"
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
                                                        {resendingId === r.id ? 'Resending...' : 'Resend WhatsApp'}
                                                    </button>

                                                    {user?.role === 'ADMIN' && (
                                                        <button
                                                            onClick={() => handleDeleteRecord(r.id)}
                                                            className="min-h-[40px] px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl transition active:scale-95 flex items-center gap-1.5 touch-manipulation"
                                                            title="Delete Record (Admin Only)"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Touchscreen-Friendly Pagination Controls */}
                                {records.length > 0 && (
                                    <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        <div>
                                            Showing <span className="font-black text-slate-900 dark:text-white">{indexOfFirstRecord + 1}</span> to <span className="font-black text-slate-900 dark:text-white">{Math.min(indexOfLastRecord, records.length)}</span> of <span className="font-black text-slate-900 dark:text-white">{records.length}</span> records
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                                disabled={currentPage === 1}
                                                className="w-11 h-11 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition active:scale-95 flex items-center justify-center touch-manipulation"
                                                title="Previous Page"
                                            >
                                                <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                                            </button>
                                            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                                                Page {currentPage} of {totalPages}
                                            </span>
                                            <button
                                                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                                                disabled={currentPage === totalPages}
                                                className="w-11 h-11 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition active:scale-95 flex items-center justify-center touch-manipulation"
                                                title="Next Page"
                                            >
                                                <ChevronRight className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VisitorRecordBook;
