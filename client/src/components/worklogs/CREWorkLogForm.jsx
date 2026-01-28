import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog } from '../../features/employee/employeeSlice';
import SuccessModal from '../SuccessModal';

const CREWorkLogForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { isLoading } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);

    const [formData, setFormData] = useState({
        cre_totalCalls: '',
        cre_callBreakdown: '',
        cre_showroomVisits: '',
        cre_fqSent: '',
        cre_orders: '',
        cre_proposals: '',
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
        <form onSubmit={onSubmit} className="space-y-4">
            <h3 className="font-bold text-slate-700 border-b pb-2 mb-4">CRE Daily Report</h3>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Calls</label>
                    <input type="number" name="cre_totalCalls" value={formData.cre_totalCalls} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Call Breakdown</label>
                    <textarea name="cre_callBreakdown" value={formData.cre_callBreakdown} onChange={handleChange} placeholder="e.g. 9* - 2, 8* - 3..." className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-10 text-sm" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Showroom Visits</label>
                    <input type="number" name="cre_showroomVisits" value={formData.cre_showroomVisits} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">FQ Sent</label>
                    <input type="number" name="cre_fqSent" value={formData.cre_fqSent} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Orders</label>
                    <input type="number" name="cre_orders" value={formData.cre_orders} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Proposals (IQ)</label>
                    <input type="number" name="cre_proposals" value={formData.cre_proposals} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Remarks / Notes</label>
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
                subMessage="Great job!"
            />
        </form>
    );
};

export default CREWorkLogForm;
