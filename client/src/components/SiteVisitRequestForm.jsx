import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createSiteVisitRequest, getBusinessHeads } from '../features/employee/employeeSlice';
import SuccessModal from './SuccessModal';

const SiteVisitRequestForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { businessHeads } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);

    const { user } = useSelector((state) => state.auth);
    const [formData, setFormData] = useState({
        projectName: '',
        location: '',
        date: '',
        startTime: '',
        endTime: '',
        reason: '',
        targetBhId: user?.reportingBhId || '',
    });

    useEffect(() => {
        dispatch(getBusinessHeads());
    }, [dispatch]);

    const onSubmit = (e) => {
        e.preventDefault();
        dispatch(createSiteVisitRequest(formData));
        setShowSuccess(true);
    };

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            {/* Removed Business Head Selection as per new HR-only approval flow */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project Name</label>
                    <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                        value={formData.projectName}
                        onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                        placeholder="e.g. Villa Project"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Location</label>
                    <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="e.g. Downtown Site"
                    />
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
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Time</label>
                    <input
                        type="time"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Time</label>
                    <input
                        type="time"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reason</label>
                <textarea
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                    rows="3"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Reason for site visit..."
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
                    Update Site Visit
                </button>
            </div>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => {
                    setShowSuccess(false);
                    if (onSuccess) onSuccess();
                }}
                message="Site Visit Updated!"
                subMessage="HR will be notified for approval."
            />
        </form>
    );
};

export default SiteVisitRequestForm;
