import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog } from '../features/employee/employeeSlice';
import SuccessModal from './SuccessModal';

const WorkLogForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { isLoading } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);

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
        remarks: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const calculateTotalTime = () => {
        if (formData.startTime && formData.endTime) {
            // Simple calculation, can be improved
            const start = new Date(`1970-01-01T${formData.startTime}`);
            const end = new Date(`1970-01-01T${formData.endTime}`);
            const diff = (end - start) / 1000 / 60 / 60; // hours
            return diff > 0 ? diff.toFixed(2) : '0.00';
        }
        return '0.00';
    };

    const onSubmit = (e) => {
        e.preventDefault();
        const payload = {
            ...formData,
            imageCount: Number(formData.imageCount),
            completedImages: Number(formData.completedImages),
            pendingImages: Number(formData.pendingImages),
            hours: Number(calculateTotalTime())
        };
        dispatch(createWorkLog(payload)).then(() => {
            // Reset or show success?
            setFormData({
                date: new Date().toISOString().split('T')[0],
                clientName: '',
                site: '',
                process: '',
                imageCount: '',
                startTime: '',
                endTime: '',
                completedImages: '',
                pendingImages: '',
                remarks: ''
            });
            setShowSuccess(true);
        });
    };

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                    <input type="date" name="date" required value={formData.date} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client Name</label>
                    <input type="text" name="clientName" required value={formData.clientName} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Acme Corp" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Site</label>
                    <input type="text" name="site" required value={formData.site} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Site A" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Process</label>
                    <input type="text" name="process" required value={formData.process} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Editing" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Image Count</label>
                    <input type="number" name="imageCount" value={formData.imageCount} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Time</label>
                        <input type="time" name="startTime" required value={formData.startTime} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Time</label>
                        <input type="time" name="endTime" required value={formData.endTime} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Time (Hrs)</label>
                    <div className="px-3 py-2 bg-slate-100 rounded-lg text-slate-700 font-mono font-bold">
                        {calculateTotalTime()}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Completed</label>
                        <input type="number" name="completedImages" value={formData.completedImages} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pending</label>
                        <input type="number" name="pendingImages" value={formData.pendingImages} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Remarks</label>
                <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="2" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Any issues or notes..."></textarea>
            </div>
            <div className="flex gap-3">
                <button type="button" onClick={onSuccess} className="flex-1 py-3 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors">
                    Cancel
                </button>
                <button type="submit" disabled={isLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg transition-transform active:scale-95">
                    {isLoading ? 'Submitting...' : 'Submit Log'}
                </button>
            </div>
            <SuccessModal
                isOpen={showSuccess}
                onClose={() => {
                    setShowSuccess(false);
                    if (onSuccess) onSuccess();
                }}
                message="Work Log Submitted!"
                subMessage="Successfully recorded."
            />
        </form>
    );
};

export default WorkLogForm;
