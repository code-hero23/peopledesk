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
            <div className="bg-emerald-50 p-8 rounded-3xl text-center border border-emerald-100">
                <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
                <h3 className="text-2xl font-black text-emerald-800 mb-2">Day Completed!</h3>
                <p className="text-emerald-600 font-bold">Daily reports submitted successfully.</p>
            </div>
        );
    }

    if (isTodayOpen) {
        return (
            <form onSubmit={handleClosingSubmit} className="space-y-4">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800">Closing Report</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase">Finalize your daily session</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-bold text-emerald-600 uppercase mb-1">Session Start</label>
                            <div className="px-3 py-2 bg-emerald-50 rounded-lg text-emerald-700 font-bold border border-emerald-100">
                                {todayLog.startTime}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Duration (Hrs)</label>
                            <div className="px-3 py-2 bg-slate-50 rounded-lg text-slate-700 font-mono font-bold border border-slate-100">
                                {calculateTotalTime()}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Completed</label>
                            <input type="number" name="completedImages" value={formData.completedImages} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pending</label>
                            <input type="number" name="pendingImages" value={formData.pendingImages} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0" />
                        </div>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Remarks</label>
                    <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="1" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Technical issues or feedback..."></textarea>
                </div>
                <div>
                    <label className="block text-xs font-bold text-blue-500 uppercase mb-1">Daily Notes (for Admin & HR)</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows="2" className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50/20" placeholder="Summary of your achievements today..."></textarea>
                </div>
                <div className="flex gap-3">
                    <button type="button" onClick={onSuccess} className="flex-1 py-3 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors uppercase text-xs">
                        Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting || isLoading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                        {isSubmitting || isLoading ? 'Submitting...' : <><CheckSquare size={18} /> Finish Day</>}
                    </button>
                </div>
                <SuccessModal isOpen={showSuccess} onClose={() => { setShowSuccess(false); if (onSuccess) onSuccess(); }} message={modalMessage} />
            </form>
        );
    }

    // Opening Form
    return (
        <form onSubmit={handleOpeningSubmit} className="space-y-4">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                    <Clock size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-800">Opening Report</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase">Start your work session</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                    <input type="date" name="date" required value={formData.date} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client Name</label>
                    <input type="text" name="clientName" required value={formData.clientName} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Acme Corp" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Site</label>
                    <input type="text" name="site" required value={formData.site} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Head Office" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Process</label>
                    <input type="text" name="process" required value={formData.process} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Design / Review" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Planned Target (Count)</label>
                    <input type="number" name="imageCount" value={formData.imageCount} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Optional" />
                </div>
            </div>
            <div className="flex gap-3">
                <button type="button" onClick={onSuccess} className="flex-1 py-3 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors uppercase text-xs">
                    Cancel
                </button>
                <button type="submit" disabled={isSubmitting || isLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                    {isSubmitting || isLoading ? 'Submitting...' : <><TrendingUp size={18} /> Start Session</>}
                </button>
            </div>
            <SuccessModal isOpen={showSuccess} onClose={() => { setShowSuccess(false); if (onSuccess) onSuccess(); }} message={modalMessage} />
        </form>
    );
};

export default WorkLogForm;
