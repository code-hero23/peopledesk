import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog, closeWorkLog, getTodayLogStatus } from '../../features/employee/employeeSlice';
import SuccessModal from '../SuccessModal';
import ConfirmationModal from '../ConfirmationModal';
import { Plus, Trash2, Clock, CheckSquare } from 'lucide-react';

const CustomerRelationshipWorkLogForm = ({ onSuccess }) => {
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

    const [formData, setFormData] = useState({
        fmrmClients: '',
        dailySheets: '',
        delayClients: '',
        refundClients: '',
        aeReports: '',
        fourC: '',
        fmSheet: '',
        factorySheet: '',
        collectionReport: '',
        loadedReports: '',
        remarks: '',
        notes: ''
    });

    useEffect(() => {
        dispatch(getTodayLogStatus());
    }, [dispatch]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleOpeningSubmit = () => {
        setConfirmationConfig({
            isOpen: true,
            title: 'Start CRM Session',
            message: 'Are you sure you want to start your work session?',
            onConfirm: () => {
                const payload = {
                    logStatus: 'OPEN',
                    process: 'Customer Relationship Session Started',
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
            message: `Are you sure you want to finalize your daily customer relationship metrics?`,
            onConfirm: () => {
                const payload = {
                    logStatus: 'CLOSED',
                    process: `CR Report: ${formData.fmrmClients} | Collection: ${formData.collectionReport}`,
                    customFields: {
                        "FMRM/Clients": formData.fmrmClients,
                        "Daily Sheets": formData.dailySheets,
                        "Delay Clients": formData.delayClients,
                        "Refund Clients": formData.refundClients,
                        "AE Reports": formData.aeReports,
                        "4C": formData.fourC,
                        "FM Sheet": formData.fmSheet,
                        "Factory Sheet": formData.factorySheet,
                        "Collection Report": formData.collectionReport,
                        "Loaded Reports": formData.loadedReports
                    },
                    remarks: formData.remarks,
                    notes: formData.notes,
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

    const InputField = ({ label, name, type = "text", placeholder = "" }) => (
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>
            <input
                type={type}
                name={name}
                value={formData[name]}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder={placeholder}
            />
        </div>
    );

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
                <div className="bg-gradient-to-r from-pink-500 to-pink-600 p-6 rounded-2xl text-white shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-xl">
                            <Clock size={24} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-black text-2xl tracking-tight">CRM Opening</h3>
                            <p className="text-pink-100 text-sm font-medium">Start your work session</p>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={handleOpeningSubmit}
                    className="w-full py-6 bg-pink-600 hover:bg-pink-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
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
            <div className="bg-pink-50 p-3 rounded-lg border border-pink-100 mb-4">
                <h4 className="font-bold text-pink-800 text-sm uppercase">Customer Relationship Daily Report</h4>
                <p className="text-xs text-pink-600">Please fill in all daily tracking metrics.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="FMRM / Clients" name="fmrmClients" />
                <InputField label="Daily Sheets" name="dailySheets" />
                <InputField label="4C" name="fourC" />
                <InputField label="FM Sheet" name="fmSheet" />
                <InputField label="Factory Sheet" name="factorySheet" />
                <InputField label="AE Reports" name="aeReports" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <InputField label="Collection Report" name="collectionReport" placeholder="Amount / Status" />
                <InputField label="Loaded Reports" name="loadedReports" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-red-50 p-3 rounded-lg border border-red-100">
                <InputField label="Delay Clients" name="delayClients" placeholder="Count / Details" />
                <InputField label="Refund Clients" name="refundClients" placeholder="Count / Details" />
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Remarks / Notes</label>
                <textarea
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleChange}
                    rows="2"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Any additional updates..."
                ></textarea>
            </div>

            {/* Daily Notes */}
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
                <div className="flex items-center gap-2 text-blue-600">
                    <Clock size={16} />
                    <label className="text-xs font-bold uppercase">Daily Notes (for Admin & HR)</label>
                </div>
                <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="2"
                    className="w-full px-3 py-2 border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm placeholder:text-slate-300"
                    placeholder="Share daily summary, insights, or updates for Admin and HR..."
                ></textarea>
            </div>

            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onSuccess} className="flex-1 py-3 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors">
                    Cancel
                </button>
                <button type="submit" disabled={isLoading} className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 rounded-lg shadow-lg transition-transform active:scale-95">
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

export default CustomerRelationshipWorkLogForm;
