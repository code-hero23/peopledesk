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
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>
            <div className="flex gap-2">
                <select
                    className="flex-1 px-2 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={hour}
                    onChange={(e) => updateTime('hour', e.target.value)}
                >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                        <option key={h} value={h.toString().padStart(2, '0')}>
                            {h.toString().padStart(2, '0')}
                        </option>
                    ))}
                </select>
                <select
                    className="flex-1 px-2 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={minute}
                    onChange={(e) => updateTime('minute', e.target.value)}
                >
                    {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
                <select
                    className="flex-1 px-2 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={period}
                    onChange={(e) => updateTime('period', e.target.value)}
                >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                </select>
            </div>
        </div>
    );
};

const ShowroomVisitRequestForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { businessHeads } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);

    const [formData, setFormData] = useState({
        date: '',
        startTime: '09:00 AM',
        endTime: '06:00 PM',
        sourceShowroom: '',
        destinationShowroom: '',
        reason: '',
        targetBhId: '',
    });

    useEffect(() => {
        dispatch(getBusinessHeads());
    }, [dispatch]);

    const onSubmit = (e) => {
        e.preventDefault();
        dispatch(createShowroomVisitRequest(formData));
        setShowSuccess(true);
    };

    return (
        <form onSubmit={onSubmit} className="space-y-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Source Showroom</label>
                    <select
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        required
                        value={formData.sourceShowroom}
                        onChange={(e) => setFormData({ ...formData, sourceShowroom: e.target.value })}
                    >
                        <option value="">-- Select Source --</option>
                        <option value="MTRS">MTRS</option>
                        <option value="PORUR">PORUR</option>
                        <option value="OMR">OMR</option>
                        <option value="FACTORY">FACTORY</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Destination Showroom</label>
                    <select
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        required
                        value={formData.destinationShowroom}
                        onChange={(e) => setFormData({ ...formData, destinationShowroom: e.target.value })}
                    >
                        <option value="">-- Select Destination --</option>
                        <option value="MTRS">MTRS</option>
                        <option value="PORUR">PORUR</option>
                        <option value="OMR">OMR</option>
                        <option value="FACTORY">FACTORY</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reason</label>
                <textarea
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                    rows="3"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Reason for showroom visit..."
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
                    Submit Showroom Visit
                </button>
            </div>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => {
                    setShowSuccess(false);
                    if (onSuccess) onSuccess();
                }}
                message="Showroom Visit Sent!"
                subMessage="Your manager will be notified."
            />
        </form>
    );
};

export default ShowroomVisitRequestForm;
