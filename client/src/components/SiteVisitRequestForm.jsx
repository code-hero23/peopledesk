import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createSiteVisitRequest, getBusinessHeads } from '../features/employee/employeeSlice';
import SuccessModal from './SuccessModal';

const SiteVisitRequestForm = ({ onSuccess, initialData, isMandatory }) => {
    const dispatch = useDispatch();
    const { businessHeads } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                ...initialData
            }));
        }
    }, [initialData]);

    useEffect(() => {
        dispatch(getBusinessHeads());
    }, [dispatch]);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            await dispatch(createSiteVisitRequest(formData)).unwrap();
            setShowSuccess(true);
        } catch (error) {
            console.error("Failed to create site visit request:", error);
            // Error toast is likely handled in the slice or via a global handler, 
            // but we reset isSubmitting so they can try again if it was a transient error.
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            {isMandatory && (
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50 p-3 rounded-xl mb-2 transition-colors">
                    <p className="text-rose-700 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest text-center">Mandatory Site Visit Log Required</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">Project Name</label>
                    <input
                        type="text"
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm font-bold"
                        required
                        value={formData.projectName}
                        onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                        placeholder="e.g. Villa Project"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">Location</label>
                    <input
                        type="text"
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm font-bold"
                        required
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="e.g. Downtown Site"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">Date</label>
                    <input
                        type="date"
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm font-bold"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">Start Time</label>
                    <input
                        type="time"
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm font-bold"
                        required
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">End Time</label>
                    <input
                        type="time"
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm font-bold"
                        required
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    />
                </div>
            </div>

            <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">Reason</label>
                <textarea
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 dark:text-white transition-all shadow-sm font-bold"
                    required
                    rows="3"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Reason for site visit..."
                />
            </div>

            <div className={`flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 transition-colors`}>
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
                    {isSubmitting ? 'Submitting...' : (isMandatory ? 'Submit Mandatory Report' : 'Update Site Visit')}
                </button>
            </div>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => {
                    setShowSuccess(false);
                    if (onSuccess) onSuccess();
                }}
                message={isMandatory ? "Site Visit Logged!" : "Site Visit Updated!"}
                subMessage="HR will be notified for approval."
            />
        </form>
    );
};

export default SiteVisitRequestForm;
