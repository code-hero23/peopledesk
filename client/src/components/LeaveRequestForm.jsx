import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createLeaveRequest, getBusinessHeads, getMyRequests } from '../features/employee/employeeSlice';
import { AlertCircle } from 'lucide-react';
import SuccessModal from './SuccessModal';

const LeaveRequestForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { businessHeads, requests } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);

    // Calculate combined request count for the current month
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const calculateDays = (start, end, type) => {
        if (!start || !end) return 0;
        if (type === 'HALF_DAY') return 0.5;
        const diffTime = Math.abs(new Date(end) - new Date(start));
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    const totalExistingDays = requests.leaves
        .filter(req => {
            const d = new Date(req.startDate);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, req) => sum + calculateDays(req.startDate, req.endDate, req.type), 0);

    const [formData, setFormData] = useState({
        type: 'CASUAL',
        startDate: '',
        endDate: '',
        reason: '',
        targetBhId: '',
    });

    const newRequestDays = calculateDays(formData.startDate, formData.endDate, formData.type);
    const isLimitExceeded = (totalExistingDays + newRequestDays) > 4;

    useEffect(() => {
        dispatch(getBusinessHeads());
        dispatch(getMyRequests());
    }, [dispatch]);

    const onSubmit = (e) => {
        e.preventDefault();
        dispatch(createLeaveRequest(formData));
        setShowSuccess(true);
        // Original onSuccess called after modal closes
    };

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            {isLimitExceeded && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-amber-800">Monthly Leave Limit Alert</p>
                        <p className="text-xs text-amber-600 font-medium">
                            Your total leave for this month (including this request) will be {(totalExistingDays + newRequestDays).toFixed(1)} days. This exceeds the 4-day threshold and will be flagged for review.
                        </p>
                    </div>
                </div>
            )}
            {/* BH Selection */}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Business Head</label>
                <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    required
                    value={formData.targetBhId}
                    onChange={(e) => setFormData({ ...formData, targetBhId: e.target.value })}
                >
                    <option value="">-- Select Reporting Manager --</option>
                    {businessHeads.map((bh) => (
                        <option key={bh.id} value={bh.id}>
                            {bh.name} ({bh.email})
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Duration</label>
                <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                    <option value="CASUAL">Full Day</option>
                    <option value="HALF_DAY">Half Day</option>
                </select>
            </div>
            {formData.type === 'HALF_DAY' ? (
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                    <input
                        type="date"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value, endDate: e.target.value })}
                    />
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Date</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        />
                    </div>
                </div>
            )}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reason</label>
                <textarea
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                    rows="3"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Why do you need leave?"
                />
            </div>
            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onSuccess}
                    className="flex-1 py-3 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg transition-transform active:scale-95"
                >
                    Submit Request
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
