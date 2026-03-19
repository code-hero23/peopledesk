import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createShowroomVisitRequest, getBusinessHeads } from '../features/employee/employeeSlice';
import SuccessModal from './SuccessModal';

const TimeSelector = ({ label, value, onChange }) => {
    // Parse value "HH:MM AM/PM" -> { hour, minute, period }
    const parseTime = (timeStr) => {
        if (!timeStr) return { hour: '12', minute: '00', period: 'AM' };
        const [time, period] = timeStr.split(' ');
        const [hour, minute] = time.split(':');
        return { hour, minute, period };
    };

    const { hour, minute, period } = parseTime(value);

    const updateTime = (field, newVal) => {
        let newHour = field === 'hour' ? newVal : hour;
        let newMinute = field === 'minute' ? newVal : minute;
        let newPeriod = field === 'period' ? newVal : period;
        onChange(`${newHour}:${newMinute} ${newPeriod}`);
    };

    return (
        <div>
            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">{label}</label>
            <div className="flex gap-2">
                <select
                    className="flex-1 px-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm"
                    value={hour}
                    onChange={(e) => updateTime('hour', e.target.value)}
                >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                        <option key={h} value={h.toString().padStart(2, '0')} className="dark:bg-slate-900 font-bold">
                            {h.toString().padStart(2, '0')}
                        </option>
                    ))}
                </select>
                <select
                    className="flex-1 px-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm"
                    value={minute}
                    onChange={(e) => updateTime('minute', e.target.value)}
                >
                    {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                        <option key={m} value={m} className="dark:bg-slate-900 font-bold">{m}</option>
                    ))}
                </select>
                <select
                    className="flex-1 px-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm"
                    value={period}
                    onChange={(e) => updateTime('period', e.target.value)}
                >
                    <option value="AM" className="dark:bg-slate-900 font-bold">AM</option>
                    <option value="PM" className="dark:bg-slate-900 font-bold">PM</option>
                </select>
            </div>
        </div>
    );
};

const ShowroomVisitRequestForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { businessHeads } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { user } = useSelector((state) => state.auth);
    const [formData, setFormData] = useState({
        date: '',
        startTime: '09:00 AM',
        endTime: '06:00 PM',
        sourceShowroom: '',
        destinationShowroom: '',
        reason: '',
        targetBhId: user?.reportingBhId || '',
    });

    useEffect(() => {
        dispatch(getBusinessHeads());
    }, [dispatch]);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            await dispatch(createShowroomVisitRequest(formData)).unwrap();
            setShowSuccess(true);
        } catch (error) {
            console.error("Failed to create showroom visit request:", error);
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            {/* Removed Business Head Selection as per new HR-only approval flow */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">Source Showroom</label>
                    <select
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm"
                        required
                        value={formData.sourceShowroom}
                        onChange={(e) => setFormData({ ...formData, sourceShowroom: e.target.value })}
                    >
                        <option value="" className="dark:bg-slate-900 font-bold italic">-- Select Source --</option>
                        <option value="MTRS" className="dark:bg-slate-900 font-bold">MTRS</option>
                        <option value="PORUR" className="dark:bg-slate-900 font-bold">PORUR</option>
                        <option value="OMR" className="dark:bg-slate-900 font-bold">OMR</option>
                        <option value="FACTORY" className="dark:bg-slate-900 font-bold">FACTORY</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">Destination Showroom</label>
                    <select
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm"
                        required
                        value={formData.destinationShowroom}
                        onChange={(e) => setFormData({ ...formData, destinationShowroom: e.target.value })}
                    >
                        <option value="" className="dark:bg-slate-900 font-bold italic">-- Select Destination --</option>
                        <option value="MTRS" className="dark:bg-slate-900 font-bold">MTRS</option>
                        <option value="PORUR" className="dark:bg-slate-900 font-bold">PORUR</option>
                        <option value="OMR" className="dark:bg-slate-900 font-bold">OMR</option>
                        <option value="FACTORY" className="dark:bg-slate-900 font-bold">FACTORY</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                <TimeSelector
                    label="Start Time"
                    value={formData.startTime}
                    onChange={(val) => setFormData({ ...formData, startTime: val })}
                />

                <TimeSelector
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
                    rows="3"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Reason for showroom visit..."
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
                    {isSubmitting ? 'Submitting...' : 'Submit Visit'}
                </button>
            </div>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => {
                    setShowSuccess(false);
                    if (onSuccess) onSuccess();
                }}
                message="Showroom Visit Sent!"
                subMessage="HR will be notified for approval."
            />
        </form>
    );
};

export default ShowroomVisitRequestForm;
