import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog, closeWorkLog } from '../../features/employee/employeeSlice';
import SuccessModal from '../SuccessModal';

const ClientFacilitatorWorkLogForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { todayLog, isLoading } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);

    const isOpening = !todayLog;
    const isCompleted = todayLog && todayLog.logStatus === 'CLOSED';

    // Initial State for Fixed Fields
    const [formData, setFormData] = useState({
        onlineLeads: '',
        ashwinLeads: '',
        fpReceived: '',
        positives: '',
        feedbackDone: '',
        groupFollowUp: '',
        followUpCalls: '',
        calls9Star: '',
        calls8Star: '',
        calls7Star: '',
        calls6Star: '',
        quotesSent: '',
        revisedQuotesSent: '',
        noOfOrders: ''
    });

    const [remarks, setRemarks] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Flatten data for Admin Modal (Key-Value Display)
        // We prefix keys to distinguish Opening vs Closing in the single JSON object if needed, 
        // OR we just overwrite/merge. 
        // For distinct Opening/Closing view in Admin, we should probably stick to the pattern 
        // of "openingMetrics" object and "closingMetrics" object if we want them grouped.
        // However, the previous "Dynamic Rows" used `openingTasks` array. 
        // Here we have a flat object.
        // Let's wrap them in `openingMetrics` and `closingMetrics` objects so the Admin Modal 
        // can iterate them nicely if we tweak it, OR just dump them as flat keys with "Opening" prefix.
        // CURRENT ADMIN MODAL behavior:
        // 1. Iterates `customFields` entries.
        // 2. If value is NOT object/null, displays as Simple Key-Value Card.
        // 3. If value IS Array, displays as Table.
        // 4. It does NOT recursively go into Objects.

        // SO: To display these nicely without changing Admin Modal, we should prefix them OR flat them?
        // If we put them in an object `openingStart`, the modal won't show them (it filters out objects).
        // WE MUST FLATTEN THEM for the current Admin Modal to show them as cards.
        // e.g. "Opening Online Leads": "5"

        const prefix = isOpening ? "Opening" : "Closing";
        const customFieldsPayload = {};

        // Map descriptive labels
        const labelMap = {
            onlineLeads: 'Online Leads',
            ashwinLeads: 'Ashwin Leads',
            fpReceived: 'FP Received',
            positives: 'Positives',
            feedbackDone: 'Feedback Done',
            groupFollowUp: 'Group Follow Up',
            followUpCalls: 'Follow Up Calls',
            calls9Star: '9 Star Calls (Upto Today)',
            calls8Star: '8 Star Calls (Upto Today)',
            calls7Star: '7 Star Calls (Upto Today)',
            calls6Star: '6 Star Calls (Upto Today)',
            quotesSent: 'Quotes Sent',
            revisedQuotesSent: 'Revised Quotes Sent',
            noOfOrders: 'No of Orders'
        };

        Object.keys(formData).forEach(key => {
            if (formData[key]) {
                customFieldsPayload[`${prefix} - ${labelMap[key]}`] = formData[key];
            }
        });

        if (isOpening) {
            const payload = {
                logStatus: 'OPEN',
                process: 'Client Facilitator Opening Report',
                customFields: customFieldsPayload,
                remarks: remarks
            };
            dispatch(createWorkLog(payload)).then((res) => {
                if (!res.error) setShowSuccess(true);
            });
        } else {
            const existingFields = todayLog.customFields || {};
            const payload = {
                logStatus: 'CLOSED',
                process: 'Client Facilitator Daily Reports Completed',
                customFields: {
                    ...existingFields,
                    ...customFieldsPayload
                },
                remarks: remarks || todayLog.remarks
            };
            dispatch(closeWorkLog(payload)).then((res) => {
                if (!res.error) setShowSuccess(true);
            });
        }
    };

    if (isCompleted) {
        return (
            <div className="text-center p-8 bg-green-50 rounded-xl border border-green-100">
                <h3 className="text-lg font-black text-green-700 mb-2">Daily Reports Submitted</h3>
                <p className="text-green-600">You have completed both Opening and Closing reports for today.</p>
                <button onClick={onSuccess} className="mt-4 text-green-800 underline font-bold">Close</button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto px-1">
            <div className={`p-4 rounded-lg border mb-4 ${isOpening ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                <h4 className={`font-bold text-sm uppercase ${isOpening ? 'text-blue-800' : 'text-orange-800'}`}>
                    {isOpening ? 'Client Facilitator - Opening Report' : 'Client Facilitator - Closing Report'}
                </h4>
                <p className="text-xs opacity-75">
                    {isOpening ? 'Enter the planned numbers/targets for today.' : 'Enter the actual numbers achieved today.'}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Standard Fields */}
                <InputField label="No of Online Leads" name="onlineLeads" value={formData.onlineLeads} onChange={handleChange} />
                <InputField label="Ashwin Leads" name="ashwinLeads" value={formData.ashwinLeads} onChange={handleChange} />
                <InputField label="No of FP Received" name="fpReceived" value={formData.fpReceived} onChange={handleChange} />
                <InputField label="No of Positives" name="positives" value={formData.positives} onChange={handleChange} />
                <InputField label="Feedback Done" name="feedbackDone" value={formData.feedbackDone} onChange={handleChange} />
                <InputField label="Group Follow Up Today" name="groupFollowUp" value={formData.groupFollowUp} onChange={handleChange} />
                <InputField label="Follow Up Calls" name="followUpCalls" value={formData.followUpCalls} onChange={handleChange} />

                {/* Upto Today Calls Section */}
                <div className="md:col-span-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <h5 className="text-xs font-bold text-slate-500 uppercase mb-3">Upto Today Calls</h5>
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="9 Star" name="calls9Star" value={formData.calls9Star} onChange={handleChange} />
                        <InputField label="8 Star" name="calls8Star" value={formData.calls8Star} onChange={handleChange} />
                        <InputField label="7 Star" name="calls7Star" value={formData.calls7Star} onChange={handleChange} />
                        <InputField label="6 Star" name="calls6Star" value={formData.calls6Star} onChange={handleChange} />
                    </div>
                </div>

                <InputField label="Quotes Sent" name="quotesSent" value={formData.quotesSent} onChange={handleChange} />
                <InputField label="Revised Quotes Sent" name="revisedQuotesSent" value={formData.revisedQuotesSent} onChange={handleChange} />
                <InputField label="No of Orders" name="noOfOrders" value={formData.noOfOrders} onChange={handleChange} />
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Remarks</label>
                <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows="2"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Any general notes..."
                ></textarea>
            </div>

            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onSuccess} className="flex-1 py-3 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors">
                    Cancel
                </button>
                <button type="submit" disabled={isLoading} className={`flex-1 text-white font-bold py-3 rounded-lg shadow-lg transition-transform active:scale-95 ${isOpening ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
                    {isLoading ? 'Submitting...' : (isOpening ? 'Submit Opening' : 'Submit Closing')}
                </button>
            </div>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => {
                    setShowSuccess(false);
                    if (onSuccess) onSuccess();
                }}
                message={isOpening ? "Opening Report Submitted" : "Closing Report Submitted"}
                subMessage="Client Facilitator entry recorded."
            />
        </form>
    );
};

const InputField = ({ label, name, value, onChange }) => (
    <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{label}</label>
        <input
            type="number"
            name={name}
            value={value}
            onChange={onChange}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-700"
            placeholder="0"
        />
    </div>
);

export default ClientFacilitatorWorkLogForm;
