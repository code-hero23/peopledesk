import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog, closeWorkLog, getTodayLogStatus } from '../../features/employee/employeeSlice';
import SuccessModal from '../SuccessModal';
import ConfirmationModal from '../ConfirmationModal';
import { Plus, Trash2, Clock, CheckSquare } from 'lucide-react';

const EscalationWorkLogForm = ({ onSuccess }) => {
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

    const [rows, setRows] = useState([
        { description: '', count: '', remarks: '' },
        { description: '', count: '', remarks: '' },
        { description: '', count: '', remarks: '' }
    ]);

    const [generalRemarks, setGeneralRemarks] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        dispatch(getTodayLogStatus());
    }, [dispatch]);

    const handleRowChange = (index, field, value) => {
        const newRows = [...rows];
        newRows[index][field] = value;
        setRows(newRows);
    };

    const addRow = () => {
        setRows([...rows, { description: '', count: '', remarks: '' }]);
    };

    const removeRow = (index) => {
        const newRows = rows.filter((_, i) => i !== index);
        setRows(newRows);
    };

    const handleOpeningSubmit = () => {
        setConfirmationConfig({
            isOpen: true,
            title: 'Start Escalation Session',
            message: 'Are you sure you want to start your work session?',
            onConfirm: () => {
                const payload = {
                    logStatus: 'OPEN',
                    process: 'Escalation Session Started',
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
        const validRows = rows.filter(r => r.description.trim() !== '');

        setConfirmationConfig({
            isOpen: true,
            title: 'Submit Closing Report',
            message: `Are you sure you want to finalize your daily escalations?`,
            onConfirm: () => {
                const payload = {
                    logStatus: 'CLOSED',
                    process: 'Escalation Daily Report Submitted',
                    customFields: {
                        escalations: validRows
                    },
                    remarks: generalRemarks,
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
                <p className="text-emerald-600 font-bold">Your escalation reports have been submitted successfully.</p>
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
                <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 rounded-2xl text-white shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-xl">
                            <Clock size={24} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-black text-2xl tracking-tight">Escalation Opening</h3>
                            <p className="text-red-100 text-sm font-medium">Start your work session</p>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={handleOpeningSubmit}
                    className="w-full py-6 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
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
            <div className={`p-4 rounded-lg border mb-4 bg-red-50 border-red-100`}>
                <h4 className={`font-bold text-sm uppercase text-red-800`}>
                    Escalation - Daily Report
                </h4>
                <p className="text-xs opacity-75">
                    Update the escalation stats/results for the day.
                </p>
            </div>

            <div className="space-y-3">
                {rows.map((row, index) => (
                    <div key={index} className="flex flex-col md:flex-row gap-2 items-start bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <span className="text-xs font-bold text-slate-400 w-4">{index + 1}.</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
                            <div className="flex-1">
                                <label className="block md:hidden text-[10px] font-bold text-slate-400 uppercase">Description</label>
                                <input
                                    type="text"
                                    placeholder="Description"
                                    value={row.description}
                                    onChange={(e) => handleRowChange(index, 'description', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                            <div className="w-full md:w-24">
                                <label className="block md:hidden text-[10px] font-bold text-slate-400 uppercase">Count</label>
                                <input
                                    type="number"
                                    placeholder="Count"
                                    value={row.count}
                                    onChange={(e) => handleRowChange(index, 'count', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block md:hidden text-[10px] font-bold text-slate-400 uppercase">Remarks</label>
                                <input
                                    type="text"
                                    placeholder="Remarks"
                                    value={row.remarks}
                                    onChange={(e) => handleRowChange(index, 'remarks', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                        </div>

                        {rows.length > 1 && (
                            <button
                                type="button"
                                onClick={() => removeRow(index)}
                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors self-center md:self-start"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={addRow}
                className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 font-bold hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-sm"
            >
                <Plus size={16} /> Add Another Row
            </button>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">General Remarks</label>
                <textarea
                    value={generalRemarks}
                    onChange={(e) => setGeneralRemarks(e.target.value)}
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
                <button type="submit" disabled={isLoading} className={`flex-1 text-white font-bold py-3 rounded-lg shadow-lg transition-transform active:scale-95 bg-red-600 hover:bg-red-700`}>
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

export default EscalationWorkLogForm;
