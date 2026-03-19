import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog, closeWorkLog, getTodayLogStatus } from '../features/employee/employeeSlice';
import SuccessModal from './SuccessModal';
import { CheckCircle2, Clock, TrendingUp, CheckSquare } from 'lucide-react';

const WorkLogForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { isLoading, todayLog } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalMessage, setModalMessage] = useState('');

    useEffect(() => {
        dispatch(getTodayLogStatus());
    }, [dispatch]);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        clientName: '',
        site: '',
        process: '',
        imageCount: '',
        startTime: '',
        endTime: '',
        completedImages: '',
        pendingImages: '',
        remarks: '',
        notes: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const calculateTotalTime = () => {
        const startTime = todayLog?.startTime;
        const endTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        if (startTime && endTime) {
            const start = new Date(`1970-01-01T${startTime}`);
            const end = new Date(`1970-01-01T${endTime}`);
            const diff = (end - start) / 1000 / 60 / 60; // hours
            return diff > 0 ? diff.toFixed(2) : '0.00';
        }
        return '0.00';
    };

    const isTodayOpen = todayLog && todayLog.logStatus === 'OPEN';
    const isTodayClosed = todayLog && todayLog.logStatus === 'CLOSED';

    const handleOpeningSubmit = (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);

        const payload = {
            date: formData.date,
            clientName: formData.clientName,
            site: formData.site,
            process: formData.process,
            imageCount: Number(formData.imageCount),
            startTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            logStatus: 'OPEN'
        };

        dispatch(createWorkLog(payload)).then(() => {
            setModalMessage("Opening Report Submitted! Work session started.");
            setShowSuccess(true);
            setIsSubmitting(false);
        }).catch(() => setIsSubmitting(false));
    };

    const handleClosingSubmit = (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);

        const payload = {
            endTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            completedImages: Number(formData.completedImages),
            pendingImages: Number(formData.pendingImages),
            remarks: formData.remarks,
            notes: formData.notes,
            hours: Number(calculateTotalTime())
        };

        dispatch(closeWorkLog(payload)).then(() => {
            setModalMessage("Closing Report Submitted! Work session finalized.");
            setShowSuccess(true);
            setIsSubmitting(false);
        }).catch(() => setIsSubmitting(false));
    };

    if (isTodayClosed) {
        return (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-8 rounded-3xl text-center border border-emerald-100 dark:border-emerald-900/30 transition-colors">
                <CheckCircle2 size={48} className="mx-auto text-emerald-500 dark:text-emerald-400 mb-4" />
                <h3 className="text-2xl font-black text-emerald-800 dark:text-emerald-200 mb-2">Day Completed!</h3>
                <p className="text-emerald-600 dark:text-emerald-400 font-bold">Daily reports submitted successfully.</p>
            </div>
        );
    }

    if (isTodayOpen) {
        return (
            <form onSubmit={handleClosingSubmit} className="space-y-4">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800 transition-colors">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Closing Report</h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">Finalize your daily session</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest ml-1">Session Start</label>
                            <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-700 dark:text-emerald-300 font-black border border-emerald-100 dark:border-emerald-900/30 text-center">
                                {todayLog.startTime}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Duration (Hrs)</label>
                            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-slate-700 dark:text-slate-300 font-mono font-black border border-slate-100 dark:border-slate-800 text-center">
                                {calculateTotalTime()}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Completed</label>
                            <input type="number" name="completedImages" value={formData.completedImages} onChange={handleChange} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all font-bold placeholder:text-slate-300 dark:placeholder:text-slate-700" placeholder="0" />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Pending</label>
                            <input type="number" name="pendingImages" value={formData.pendingImages} onChange={handleChange} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all font-bold placeholder:text-slate-300 dark:placeholder:text-slate-700" placeholder="0" />
                        </div>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Remarks</label>
                    <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="1" className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all font-medium placeholder:text-slate-300 dark:placeholder:text-slate-700" placeholder="Technical issues or feedback..."></textarea>
                </div>
                <div className="space-y-2">
                    <label className="block text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest ml-1">Daily Notes (for Admin & HR)</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows="2" className="w-full px-4 py-2.5 bg-blue-50/20 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all font-medium placeholder:text-blue-300 dark:placeholder:text-blue-700/50" placeholder="Summary of your achievements today..."></textarea>
                </div>
                <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 transition-colors">
                    <button type="button" onClick={onSuccess} className="flex-1 py-3 px-6 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-black uppercase text-xs tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all active:scale-95">
                        Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting || isLoading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-widest py-3 px-6 rounded-xl shadow-lg hover:shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                        {isSubmitting || isLoading ? 'Submitting...' : <><CheckSquare size={18} /> Finish Day</>}
                    </button>
                </div>
                <SuccessModal isOpen={showSuccess} onClose={() => { setShowSuccess(false); if (onSuccess) onSuccess(); }} message={modalMessage} />
            </form>
        );
    }

    // Opening Form
    return (
        <form onSubmit={handleOpeningSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto px-1 scrollbar-hide">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 rounded-3xl text-white shadow-lg sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                        <Clock size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black tracking-tight">Opening Report</h3>
                        <p className="text-white/80 text-xs font-bold uppercase tracking-widest opacity-75">Current Date Reporting</p>
                    </div>
                </div>
            </div>

            {/* NEW UI MATCHING USER IMAGE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Current Date</label>
                    <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 rounded-2xl font-black text-lg border border-slate-100 dark:border-slate-800 text-center">
                        {new Date().toLocaleDateString('en-GB')}
                    </div>
                </div>
                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Session Time</label>
                    <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 rounded-2xl font-black text-lg border border-slate-100 dark:border-slate-800 text-center">
                        {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                <div className="md:col-span-2 mb-2 pb-2 border-b border-slate-50 dark:border-slate-800">
                    <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Deployment Details</h4>
                </div>
                <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Client Name</label>
                    <input type="text" name="clientName" required value={formData.clientName} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-bold dark:text-white" placeholder="e.g. Acme Corp" />
                </div>
                <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Site</label>
                    <input type="text" name="site" required value={formData.site} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-bold dark:text-white" placeholder="e.g. Head Office" />
                </div>
                <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Process</label>
                    <input type="text" name="process" required value={formData.process} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-bold dark:text-white" placeholder="e.g. Design / Review" />
                </div>
                <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Planned Target</label>
                    <input type="number" name="imageCount" value={formData.imageCount} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-bold dark:text-white" placeholder="Optional count" />
                </div>
            </div>
            <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 transition-colors">
                <button type="button" onClick={onSuccess} className="flex-1 py-3 px-6 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-black uppercase text-xs tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all active:scale-95">
                    Cancel
                </button>
                <button type="submit" disabled={isSubmitting || isLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs tracking-widest py-3 px-6 rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                    {isSubmitting || isLoading ? 'Submitting...' : <><TrendingUp size={18} /> Start Session</>}
                </button>
            </div>
            <SuccessModal isOpen={showSuccess} onClose={() => { setShowSuccess(false); if (onSuccess) onSuccess(); }} message={modalMessage} />
        </form>
    );
};

export default WorkLogForm;
