import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createPermissionRequest, getBusinessHeads, getMyRequests } from '../features/employee/employeeSlice';
import { AlertCircle } from 'lucide-react';
import SuccessModal from './SuccessModal';

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
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>
            <div className="flex gap-2">
                <select
                    className="flex-1 px-2 py-2 border rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500"
                    value={hour}
                    onChange={(e) => handleChange('hour', e.target.value)}
                >
                    {Array.from({ length: 12 }, (_, i) => {
                        const h = (i + 1).toString().padStart(2, '0');
                        return <option key={h} value={h}>{h}</option>;
                    })}
                </select>
                <select
                    className="flex-1 px-2 py-2 border rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500"
                    value={minute}
                    onChange={(e) => handleChange('minute', e.target.value)}
                >
                    {Array.from({ length: 12 }, (_, i) => {
                        const m = (i * 5).toString().padStart(2, '0');
                        return <option key={m} value={m}>{m}</option>;
                    })}
                </select>
                <select
                    className="w-20 px-2 py-2 border rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500"
                    value={ampm}
                    onChange={(e) => handleChange('ampm', e.target.value)}
                >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                </select>
            </div>
        </div>
    );
};

const PermissionRequestForm = ({ onSuccess, initialData, isMandatory }) => {
    const dispatch = useDispatch();
    const { businessHeads, requests } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);

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
        targetBhId: '',
    });

    useEffect(() => {
        dispatch(getBusinessHeads());
        dispatch(getMyRequests());
    }, [dispatch]);

    const parseTime = (timeStr) => {
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        if (hours === '12') hours = '00';
        if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
        return parseInt(hours, 10) * 60 + parseInt(minutes, 10);
    };

    const onSubmit = async (e) => {
        e.preventDefault();

        const startMinutes = parseTime(formData.startTime);
        const endMinutes = parseTime(formData.endTime);
        const durationMinutes = endMinutes - startMinutes;

        if (durationMinutes > 120) {
            alert("Permissions cannot exceed 2 hours. Please apply for Half Day Leave instead.");
            return;
        }

        if (durationMinutes <= 0) {
            alert("End Time must be after Start Time.");
            return;
        }

        try {
            await dispatch(createPermissionRequest(formData)).unwrap();
            setShowSuccess(true);
        } catch (error) {
            alert(error || "Failed to submit permission request");
        }
    };

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            {isLimitExceeded && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-amber-800">Monthly Permission Limit Reached</p>
                        <p className="text-xs text-amber-600 font-medium">
                            You have already submitted {monthlyPermissions} permission requests this month. This request will be flagged for review.
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
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reason</label>
                <textarea
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                    rows="2"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Short processing, personal work..."
                />
            </div>
            <div className="flex gap-3 pt-2">
                {!isMandatory && (
                    <button
                        type="button"
                        onClick={onSuccess}
                        className="flex-1 py-3 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg transition-transform active:scale-95"
                >
                    Submit
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
