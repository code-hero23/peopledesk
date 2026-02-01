import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog } from '../../features/employee/employeeSlice';
import SuccessModal from '../SuccessModal';

const DigitalMarketingWorkLogForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { isLoading } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);

    const [formData, setFormData] = useState({
        work: '',
        workGivenBy: '',
        hoursSpent: '',
        status: 'In Progress',
        fileLink: '',
        remarks: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const onSubmit = (e) => {
        e.preventDefault();

        const payload = {
            logStatus: 'CLOSED',
            process: `DM Task: ${formData.work} (${formData.status})`, // Summary
            hours: parseFloat(formData.hoursSpent) || 0, // Utilize the standard hours field
            customFields: {
                "Work Description": formData.work,
                "Work Given By": formData.workGivenBy,
                "Hours Spent": formData.hoursSpent,
                "Status": formData.status,
                "File Link": formData.fileLink
            },
            remarks: formData.remarks
        };

        dispatch(createWorkLog(payload)).then((res) => {
            if (!res.error) {
                setFormData({
                    work: '', workGivenBy: '', hoursSpent: '',
                    status: 'In Progress', fileLink: '', remarks: ''
                });
                setShowSuccess(true);
            }
        });
    };

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 mb-4">
                <h4 className="font-bold text-purple-800 text-sm">Digital Marketing Daily Log</h4>
                <p className="text-xs text-purple-600">Track your daily tasks and content creation.</p>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Work Description</label>
                <textarea
                    name="work"
                    required
                    value={formData.work}
                    onChange={handleChange}
                    rows="2"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="Describe the task..."
                ></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Work Given By</label>
                    <input
                        type="text"
                        name="workGivenBy"
                        required
                        value={formData.workGivenBy}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        placeholder="Name of logic/person"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hours Spent</label>
                    <input
                        type="number"
                        step="0.1"
                        name="hoursSpent"
                        required
                        value={formData.hoursSpent}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        placeholder="e.g. 2.5"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                    <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                    >
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Pending Review">Pending Review</option>
                        <option value="On Hold">On Hold</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">File Link (Drive/Canva)</label>
                    <input
                        type="url"
                        name="fileLink"
                        value={formData.fileLink}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        placeholder="https://..."
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Remarks</label>
                <textarea
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleChange}
                    rows="2"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="Any blockers or notes..."
                ></textarea>
            </div>

            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onSuccess} className="flex-1 py-3 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors">
                    Cancel
                </button>
                <button type="submit" disabled={isLoading} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg shadow-lg transition-transform active:scale-95">
                    {isLoading ? 'Submitting...' : 'Submit Log'}
                </button>
            </div>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => {
                    setShowSuccess(false);
                    if (onSuccess) onSuccess();
                }}
                message="Work Log Submitted"
                subMessage="Digital Marketing entry recorded."
            />
        </form>
    );
};

export default DigitalMarketingWorkLogForm;
