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

    const monthlyLeaves = requests.leaves.filter(req => {
        const d = new Date(req.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const isLimitExceeded = monthlyLeaves >= 4;

    const [formData, setFormData] = useState({
        type: 'CASUAL',
        startDate: '',
        endDate: '',
        reason: '',
        targetBhId: '',
    });

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
                        <p className="text-sm font-bold text-amber-800">Monthly Leave Limit Reached</p>
                        <p className="text-xs text-amber-600 font-medium">
                            You have already submitted {monthlyLeaves} leave requests this month. This request will be flagged for review.
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
