import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createPermissionRequest, getBusinessHeads, getMyRequests } from '../features/employee/employeeSlice';
import { AlertCircle } from 'lucide-react';
import SuccessModal from './SuccessModal';
import { parseTimeToMinutes } from '../utils/timeUtils';

const TimePicker = ({ label, value, onChange }) => {
    // Parse the 12h time string (e.g. "09:30 AM") or default
    const [hour, minute, ampm] = value ? value.split(/[:\s]/) : ['09', '00', 'AM'];

    const handleChange = (part, newVal) => {
        let newH = part === 'hour' ? newVal : hour;
        let newM = part === 'minute' ? newVal : minute;
        let newAmpm = part === 'ampm' ? newVal : ampm;
        onChange(`${newH}:${newM} ${newAmpm}`);
    };

    return (
        <div>
            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">{label}</label>
            <div className="flex gap-2">
                <select
                    className="flex-1 px-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm"
                    value={hour}
                    onChange={(e) => handleChange('hour', e.target.value)}
                >
                    {Array.from({ length: 12 }, (_, i) => {
                        const h = (i + 1).toString().padStart(2, '0');
                        return <option key={h} value={h} className="dark:bg-slate-900 font-bold">{h}</option>;
                    })}
                </select>
                <select
                    className="flex-1 px-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm"
                    value={minute}
                    onChange={(e) => handleChange('minute', e.target.value)}
                >
                    {Array.from({ length: 12 }, (_, i) => {
                        const m = (i * 5).toString().padStart(2, '0');
                        return <option key={m} value={m} className="dark:bg-slate-900 font-bold">{m}</option>;
                    })}
                </select>
                <select
                    className="w-24 px-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm"
                    value={ampm}
                    onChange={(e) => handleChange('ampm', e.target.value)}
                >
                    <option value="AM" className="dark:bg-slate-900 font-bold">AM</option>
                    <option value="PM" className="dark:bg-slate-900 font-bold">PM</option>
                </select>
            </div>
        </div>
    );
};

const PermissionRequestForm = ({ onSuccess, initialData, isMandatory }) => {
    const dispatch = useDispatch();
    const { businessHeads, requests } = useSelector((state) => state.employee);
    const { user } = useSelector((state) => state.auth);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Calculate combined request count for the current month
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyPermissions = requests.permissions.filter(req => {
        const d = new Date(req.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const isLimitExceeded = monthlyPermissions >= 4;

    const [formData, setFormData] = useState({
        date: initialData?.date || '',
        startTime: initialData?.startTime || '09:00 AM',
        endTime: initialData?.endTime || '11:00 AM',
        reason: initialData?.reason || '',
        targetBhId: user?.reportingBhId || '',
    });

    useEffect(() => {
        dispatch(getBusinessHeads());
        dispatch(getMyRequests());
    }, [dispatch]);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        const startMinutes = parseTimeToMinutes(formData.startTime);
        const endMinutes = parseTimeToMinutes(formData.endTime);
        const durationMinutes = endMinutes - startMinutes;

        if (durationMinutes > 120) {
            alert("Permissions cannot exceed 2 hours. Please apply for Half Day Leave instead.");
            return;
        }

        if (durationMinutes <= 0) {
            alert("End Time must be after Start Time.");
            return;
        }

        setIsSubmitting(true);
        try {
            await dispatch(createPermissionRequest(formData)).unwrap();
            setShowSuccess(true);
        } catch (error) {
            alert(error || "Failed to submit permission request");
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            {isLimitExceeded && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 flex items-start gap-3 transition-colors">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Monthly Permission Limit Reached</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            You have already submitted {monthlyPermissions} permission requests this month. This request will be flagged for review.
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
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">Date</label>
                <input
                    type="date"
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <TimePicker
                    label="Start Time"
                    value={formData.startTime}
                    onChange={(val) => setFormData({ ...formData, startTime: val })}
                />
                <TimePicker
                    label="End Time"
                    value={formData.endTime}
                    onChange={(val) => setFormData({ ...formData, endTime: val })}
                />
            </div>
            <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">Reason</label>
                <textarea
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm"
                    required
                    rows="2"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Short processing, personal work..."
                />
            </div>
            <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 transition-colors">
                {!isMandatory && (
                    <button
                        type="button"
                        onClick={onSuccess}
                        className="flex-1 py-3 px-6 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-black uppercase text-xs tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all active:scale-95"
                    >
                        Cancel
                    </button>
                )}
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
                message="Permission Sent!"
                subMessage="Waiting for approval."
            />
        </form>
    );
};

export default PermissionRequestForm;
