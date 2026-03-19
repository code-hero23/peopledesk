import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createLeaveRequest, getBusinessHeads, getMyRequests } from '../features/employee/employeeSlice';
import { AlertCircle } from 'lucide-react';
import SuccessModal from './SuccessModal';

const LeaveRequestForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { businessHeads, requests } = useSelector((state) => state.employee);
    const { user } = useSelector((state) => state.auth);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Calculate combined request count for the current month
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const calculateDays = (start, end, type) => {
        if (!start || !end) return 0;
        if (type === 'HALF_DAY') return 0.5;
        // Robust calculation for duration
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate - startDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    const totalExistingDays = requests.leaves
        .filter(req => {
            // Robustly check month/year of the record
            const d = new Date(req.startDate);
            // If the application stores as Date, d.getMonth() is localized.
            // If it's 2/3 and was misparsed as Feb 3rd in DB, this logic reflects that.
            // But for THE FUTURE, it will be correct.
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, req) => sum + calculateDays(req.startDate, req.endDate, req.type), 0);

    const [formData, setFormData] = useState({
        type: 'CASUAL',
        startDate: '',
        endDate: '',
        reason: '',
        targetBhId: user?.reportingBhId || '',
    });

    const newRequestDays = calculateDays(formData.startDate, formData.endDate, formData.type);
    const isLimitExceeded = (totalExistingDays + newRequestDays) > 4;

    useEffect(() => {
        dispatch(getBusinessHeads());
        dispatch(getMyRequests());
    }, [dispatch]);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            await dispatch(createLeaveRequest(formData)).unwrap();
            setShowSuccess(true);
        } catch (error) {
            console.error("Failed to create leave request:", error);
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            {isLimitExceeded && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 flex items-start gap-3 transition-colors">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Monthly Leave Limit Alert</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            Your total leave for this month (including this request) will be {(totalExistingDays + newRequestDays).toFixed(1)} days. This exceeds the 4-day threshold and will be flagged for review.
                        </p>
                    </div>
                </div>
            )}
            {/* BH Selection */}
            <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">Select Business Head</label>
                <select
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm"
                    required
                    value={formData.targetBhId}
                    onChange={(e) => setFormData({ ...formData, targetBhId: e.target.value })}
                >
                    <option value="" className="dark:bg-slate-900 font-bold italic">-- Select Reporting Manager --</option>
                    {businessHeads.map((bh) => (
                        <option key={bh.id} value={bh.id} className="dark:bg-slate-900 font-bold">
                            {bh.name} ({bh.email})
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">Duration</label>
                <select
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                    <option value="CASUAL" className="dark:bg-slate-900 font-bold">Full Day</option>
                    <option value="HALF_DAY" className="dark:bg-slate-900 font-bold">Half Day</option>
                </select>
            </div>
            {formData.type === 'HALF_DAY' ? (
                <div>
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">Date</label>
                    <input
                        type="date"
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm"
                        required
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value, endDate: e.target.value })}
                    />
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">Start Date</label>
                        <input
                            type="date"
                            className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm"
                            required
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">End Date</label>
                        <input
                            type="date"
                            className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm"
                            required
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        />
                    </div>
                </div>
            )}
            <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">Reason</label>
                <textarea
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm"
                    required
                    rows="3"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Why do you need leave?"
                />
            </div>
            <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 transition-colors">
                <button
                    type="button"
                    onClick={onSuccess}
                    className="flex-1 py-3 px-6 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-black uppercase text-xs tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all active:scale-95"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex-1 ${isSubmitting ? 'bg-slate-400 cursor-not-allowed opacity-50' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/20'} text-white font-black uppercase text-xs tracking-widest py-3 px-6 rounded-xl shadow-lg transition-all active:scale-95`}
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
            </div>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => {
                    setShowSuccess(false);
                    if (onSuccess) onSuccess();
                }}
                message="Leave Request Sent!"
                subMessage="Your manager will be notified."
            />
        </form>
    );
};

export default LeaveRequestForm;
