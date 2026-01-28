import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog } from '../../features/employee/employeeSlice';
import SuccessModal from '../SuccessModal';

const FAWorkLogForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { isLoading } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);

    const [formData, setFormData] = useState({
        fa_calls: '',
        fa_designPending: '',
        fa_designPendingClients: '',
        fa_quotePending: '',
        fa_quotePendingClients: '',
        fa_initialQuoteRn: '',
        fa_revisedQuoteRn: '',
        fa_showroomVisits: '',
        fa_showroomVisitClients: '',
        fa_onlineDiscussion: '',
        fa_onlineDiscussionClients: '',
        fa_siteVisits: '',
        fa_loadingDiscussion: '',
        fa_bookingFreezed: '',
        fa_bookingFreezedClients: '',
        remarks: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const onSubmit = (e) => {
        e.preventDefault();
        dispatch(createWorkLog({ ...formData })).then(() => {
            setShowSuccess(true);
        });
    };

    return (
        <form onSubmit={onSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
            <h3 className="font-bold text-slate-700 border-b pb-2 mb-4">FA Daily Report</h3>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Follow-up Calls</label>
                    <input type="number" name="fa_calls" value={formData.fa_calls} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Site Visits</label>
                    <input type="number" name="fa_siteVisits" value={formData.fa_siteVisits} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
            </div>

            {/* Design Pending */}
            <div className="bg-slate-50 p-3 rounded-lg">
                <div className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Design Pending</label>
                        <input type="number" name="fa_designPending" value={formData.fa_designPending} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="#" />
                    </div>
                    <div className="col-span-8">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Clients</label>
                        <input type="text" name="fa_designPendingClients" value={formData.fa_designPendingClients} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="Client names..." />
                    </div>
                </div>
            </div>

            {/* Quote Pending */}
            <div className="bg-slate-50 p-3 rounded-lg">
                <div className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quote Pending</label>
                        <input type="number" name="fa_quotePending" value={formData.fa_quotePending} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="#" />
                    </div>
                    <div className="col-span-8">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Clients</label>
                        <input type="text" name="fa_quotePendingClients" value={formData.fa_quotePendingClients} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="Client names..." />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Initial Quote (RN)</label>
                    <input type="number" name="fa_initialQuoteRn" value={formData.fa_initialQuoteRn} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Revised Quote (RN)</label>
                    <input type="number" name="fa_revisedQuoteRn" value={formData.fa_revisedQuoteRn} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
            </div>

            {/* Booking Freezed */}
            <div className="bg-slate-50 p-3 rounded-lg">
                <div className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Booking Freezed</label>
                        <input type="number" name="fa_bookingFreezed" value={formData.fa_bookingFreezed} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="#" />
                    </div>
                    <div className="col-span-8">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Clients</label>
                        <input type="text" name="fa_bookingFreezedClients" value={formData.fa_bookingFreezedClients} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg outline-none" placeholder="Client names..." />
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Remarks</label>
                <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="2" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
            </div>

            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onSuccess} className="flex-1 py-3 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors">
                    Cancel
                </button>
                <button type="submit" disabled={isLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg transition-transform active:scale-95">
                    {isLoading ? 'Submitting...' : 'Submit Report'}
                </button>
                <button type="submit" disabled={isLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg transition-transform active:scale-95">
                    {isLoading ? 'Submitting...' : 'Submit Report'}
                </button>
            </div>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => {
                    setShowSuccess(false);
                    if (onSuccess) onSuccess();
                }}
                message="Work Log Submitted!"
                subMessage="Keep it up!"
            />
        </form>
    );
};

export default FAWorkLogForm;
