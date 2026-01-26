import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { createPermissionRequest } from '../features/employee/employeeSlice';

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

const PermissionRequestForm = ({ onSuccess }) => {
    const [formData, setFormData] = useState({
        date: '',
        startTime: '09:00 AM',
        endTime: '06:00 PM',
        reason: '',
    });

    const dispatch = useDispatch();

    const onSubmit = (e) => {
        e.preventDefault();
        dispatch(createPermissionRequest(formData));
        if (onSuccess) onSuccess();
    };

    return (
        <form onSubmit={onSubmit} className="space-y-4">
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
                    Submit
                </button>
            </div>
        </form>
    );
};

export default PermissionRequestForm;
