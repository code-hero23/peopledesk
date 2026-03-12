import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog, closeWorkLog, getTodayLogStatus } from '../../features/employee/employeeSlice';
import SuccessModal from '../SuccessModal';
import ConfirmationModal from '../ConfirmationModal';
import { Plus, Trash2, Clock, CheckSquare } from 'lucide-react';

const ClientFacilitatorWorkLogForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { todayLog, isLoading } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [confirmationConfig, setConfirmationConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const isTodayOpen = todayLog && todayLog.logStatus === 'OPEN';
    const isTodayClosed = todayLog && todayLog.logStatus === 'CLOSED';

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
    const [notes, setNotes] = useState('');

    useEffect(() => {
        dispatch(getTodayLogStatus());
    }, [dispatch]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleOpeningSubmit = () => {
        setConfirmationConfig({
            isOpen: true,
            title: 'Start Facilitator Session',
            message: 'Are you sure you want to start your work session?',
            onConfirm: () => {
                const payload = {
                    logStatus: 'OPEN',
                    process: 'Client Facilitator Session Started',
                    startTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                };
                dispatch(createWorkLog(payload)).then((res) => {
                    if (!res.error) {
                        setModalMessage("Session Started!");
                        setShowSuccess(true);
                    }
                });
                setConfirmationConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleClosingSubmit = (e) => {
        e.preventDefault();

        setConfirmationConfig({
            isOpen: true,
            title: 'Submit Closing Report',
            message: `Are you sure you want to finalize your daily facilitator metrics?`,
            onConfirm: () => {
                const customFieldsPayload = {};
                const labelMap = {
                    onlineLeads: 'Online Leads',
                    ashwinLeads: 'Ashwin Leads',
                    fpReceived: 'FP Received',
                    positives: 'Positives',
                    feedbackDone: 'Feedback Done',
                    groupFollowUp: 'Group Follow Up',
                    followUpCalls: 'Follow Up Calls',
                    calls9Star: '9 Star Calls',
                    calls8Star: '8 Star Calls',
                    calls7Star: '7 Star Calls',
                    calls6Star: '6 Star Calls',
                    quotesSent: 'Quotes Sent',
                    revisedQuotesSent: 'Revised Quotes Sent',
                    noOfOrders: 'No of Orders'
                };

                Object.keys(formData).forEach(key => {
                    if (formData[key]) {
                        customFieldsPayload[labelMap[key]] = formData[key];
                    }
                });

                const payload = {
                    logStatus: 'CLOSED',
                    process: 'Client Facilitator Daily Report Submitted',
                    customFields: customFieldsPayload,
                    remarks: remarks,
                    notes: notes,
                    endTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                };
                dispatch(closeWorkLog(payload)).then((res) => {
                    if (!res.error) {
                        setModalMessage("Report Submitted!");
                        setShowSuccess(true);
                    }
                });
                setConfirmationConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading workspace...</div>;

    if (isTodayClosed) {
        return (
            <div className="bg-emerald-50 p-8 rounded-3xl text-center border border-emerald-100">
                <CheckSquare size={48} className="mx-auto text-emerald-500 mb-4" />
                <h3 className="text-2xl font-black text-emerald-800 mb-2">Reports Submitted!</h3>
                <p className="text-emerald-600 font-bold">Your daily reports have been submitted successfully.</p>
                <div className="mt-4 text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                    Session: {todayLog?.startTime} - {todayLog?.endTime}
                </div>
                <button onClick={onSuccess} className="mt-6 text-sm font-bold text-emerald-700 hover:text-emerald-800 underline">Okay, close</button>
            </div>
        );
    }

    if (!isTodayOpen) {
        return (
            <div className="space-y-6">
                <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-6 rounded-2xl text-white shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-xl">
                            <Clock size={24} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-black text-2xl tracking-tight">Facilitator Opening</h3>
                            <p className="text-indigo-100 text-sm font-medium">Start your work session</p>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={handleOpeningSubmit}
                    className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                    <Plus size={24} />
                    START WORK SESSION
                </button>
                <SuccessModal isOpen={showSuccess} onClose={() => { setShowSuccess(false); if (onSuccess) onSuccess(); }} message={modalMessage} />
                <ConfirmationModal
                    isOpen={confirmationConfig.isOpen}
                    onClose={() => setConfirmationConfig(prev => ({ ...prev, isOpen: false }))}
                    onConfirm={confirmationConfig.onConfirm}
                    title={confirmationConfig.title}
                    message={confirmationConfig.message}
                />
            </div>
        );
    }

    return (
        <form onSubmit={handleClosingSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto px-1">
            <div className={`p-4 rounded-lg border mb-4 bg-indigo-50 border-indigo-100`}>
                <h4 className={`font-bold text-sm uppercase text-indigo-800`}>
                    Client Facilitator - Daily Report
                </h4>
                <p className="text-xs opacity-75">
                    Enter the actual numbers achieved today.
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

            {/* Daily Notes */}
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
                <div className="flex items-center gap-2 text-blue-600">
                    <Clock size={16} />
                    <label className="text-xs font-bold uppercase">Daily Notes (for Admin & HR)</label>
                </div>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows="2"
                    className="w-full px-3 py-2 border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm placeholder:text-slate-300"
                    placeholder="Share daily summary, insights, or updates for Admin and HR..."
                ></textarea>
            </div>

            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onSuccess} className="flex-1 py-3 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors">
                    Cancel
                </button>
                <button type="submit" disabled={isLoading} className={`flex-1 text-white font-bold py-3 rounded-lg shadow-lg transition-transform active:scale-95 bg-indigo-600 hover:bg-indigo-700`}>
                    {isLoading ? 'Submitting...' : 'Submit Closing Report'}
                </button>
            </div>

            <SuccessModal isOpen={showSuccess} onClose={() => { setShowSuccess(false); if (onSuccess) onSuccess(); }} message={modalMessage} />
            <ConfirmationModal
                isOpen={confirmationConfig.isOpen}
                onClose={() => setConfirmationConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmationConfig.onConfirm}
                title={confirmationConfig.title}
                message={confirmationConfig.message}
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
