import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog, closeWorkLog, getTodayLogStatus } from '../../features/employee/employeeSlice';
import SuccessModal from '../SuccessModal';
import ConfirmationModal from '../ConfirmationModal';
import { Megaphone, Briefcase, User, Clock, Link, FileText, CheckSquare, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect } from 'react';

const DigitalMarketingWorkLogForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { todayLog, isLoading } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);
    const [modalMessage, setModalMessage] = useState('');

    useEffect(() => {
        dispatch(getTodayLogStatus());
    }, [dispatch]);
    const [confirmationConfig, setConfirmationConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const isTodayOpen = todayLog && todayLog.logStatus === 'OPEN';
    const isTodayClosed = todayLog && todayLog.logStatus === 'CLOSED';

    const [formData, setFormData] = useState({
        work: '',
        workGivenBy: '',
        hoursSpent: '',
        status: 'In Progress',
        fileLink: '',
        remarks: '',
        notes: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleOpeningSubmit = () => {
        setConfirmationConfig({
            isOpen: true,
            title: 'Start Marketing Session',
            message: 'Are you sure you want to start your work session?',
            onConfirm: () => {
                const payload = {
                    logStatus: 'OPEN',
                    process: 'Marketing Session Started',
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
            title: 'Submit Closing Log',
            message: 'Are you sure you want to submit this log and close your day?',
            onConfirm: () => {
                const payload = {
                    logStatus: 'CLOSED',
                    process: `DM Task: ${formData.work} (${formData.status})`,
                    hours: parseFloat(formData.hoursSpent) || 0,
                    customFields: {
                        "Work Description": formData.work,
                        "Work Given By": formData.workGivenBy,
                        "Hours Spent": formData.hoursSpent,
                        "Status": formData.status,
                        "File Link": formData.fileLink
                    },
                    remarks: formData.remarks,
                    notes: formData.notes,
                    endTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                };

                dispatch(closeWorkLog(payload)).then((res) => {
                    if (!res.error) {
                        setModalMessage("Work Log Submitted!");
                        setShowSuccess(true);
                        setFormData({
                            work: '', workGivenBy: '', hoursSpent: '',
                            status: 'In Progress', fileLink: '', remarks: '', notes: ''
                        });
                    }
                });
                setConfirmationConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    if (isTodayClosed) {
        return (
            <div className="bg-emerald-50 p-8 rounded-3xl text-center border border-emerald-100">
                <CheckSquare size={48} className="mx-auto text-emerald-500 mb-4" />
                <h3 className="text-2xl font-black text-emerald-800 mb-2">Work Completed!</h3>
                <p className="text-emerald-600 font-bold">Marketing log submitted successfully.</p>
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
                <div className="bg-gradient-to-r from-purple-500 to-fuchsia-600 p-6 rounded-2xl text-white shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-xl">
                            <Clock size={24} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-black text-2xl tracking-tight">Marketing Opening</h3>
                            <p className="text-purple-100 text-sm font-medium">Start your work session</p>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={handleOpeningSubmit}
                    className="w-full py-6 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                    <Megaphone size={24} />
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
        <motion.form
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={handleClosingSubmit} className="space-y-6"
        >
            <div className="bg-gradient-to-r from-purple-500 to-fuchsia-600 p-6 rounded-2xl text-white shadow-lg shadow-purple-200">
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                        <Megaphone size={24} className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-black text-2xl tracking-tight">Digital Marketing Log</h3>
                        <p className="text-purple-100 text-sm font-medium opacity-90">Track content & campaigns</p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-50">
                    <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                        <Briefcase size={18} />
                    </div>
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Task Details</h4>
                </div>

                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Work Description</label>
                    <textarea
                        name="work"
                        required
                        value={formData.work}
                        onChange={handleChange}
                        rows="3"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-100 focus:border-purple-300 outline-none text-sm font-medium transition-all resize-none"
                        placeholder="Describe the campaign or content created..."
                    ></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase mb-1">
                            <User size={10} /> Work Given By
                        </label>
                        <input
                            type="text"
                            name="workGivenBy"
                            required
                            value={formData.workGivenBy}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-100 focus:border-purple-300 outline-none text-sm font-semibold transition-all"
                            placeholder="e.g. Manager Name"
                        />
                    </div>
                    <div>
                        <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase mb-1">
                            <Clock size={10} /> Hours Spent
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            name="hoursSpent"
                            required
                            value={formData.hoursSpent}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-100 focus:border-purple-300 outline-none text-sm font-semibold transition-all"
                            placeholder="e.g. 2.5"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase mb-1">
                            <CheckSquare size={10} /> Status
                        </label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-100 focus:border-purple-300 outline-none text-sm font-semibold transition-all cursor-pointer"
                        >
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Pending Review">Pending Review</option>
                            <option value="On Hold">On Hold</option>
                        </select>
                    </div>
                    <div>
                        <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase mb-1">
                            <Link size={10} /> File Link (Drive/Canva)
                        </label>
                        <input
                            type="url"
                            name="fileLink"
                            value={formData.fileLink}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-100 focus:border-purple-300 outline-none text-sm font-semibold transition-all text-blue-600 underline-offset-2"
                            placeholder="https://..."
                        />
                    </div>
                </div>

                <div>
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase mb-1">
                        <FileText size={10} /> Remarks
                    </label>
                    <textarea
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleChange}
                        rows="2"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-100 focus:border-purple-300 outline-none text-sm font-medium transition-all resize-none"
                        placeholder="Any blockers or additional notes..."
                    ></textarea>
                </div>

                {/* Daily Notes */}
                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 space-y-3">
                    <div className="flex items-center gap-2">
                        <Clock size={16} className="text-blue-500" />
                        <label className="text-[10px] font-bold text-blue-500 uppercase">Daily Notes (for Admin & HR)</label>
                    </div>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows="2"
                        className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none text-sm font-medium transition-all resize-none placeholder:text-slate-300"
                        placeholder="Share daily summary, campaign insights, or updates for Admin and HR..."
                    ></textarea>
                </div>
            </div>

            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onSuccess} className="flex-1 py-4 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-colors uppercase text-xs tracking-wider">
                    Cancel
                </button>
                <button type="submit" disabled={isLoading} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 uppercase text-xs tracking-wider">
                    {isLoading ? 'Submitting...' : <><Save size={18} /> Complete & Submit Log</>}
                </button>
            </div>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => {
                    setShowSuccess(false);
                    if (onSuccess) onSuccess();
                }}
                message={modalMessage || "Work Log Submitted"}
                subMessage="Digital Marketing entry recorded successfully."
            />
            <ConfirmationModal
                isOpen={confirmationConfig.isOpen}
                onClose={() => setConfirmationConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmationConfig.onConfirm}
                title={confirmationConfig.title}
                message={confirmationConfig.message}
            />
        </motion.form>
    );
};

export default DigitalMarketingWorkLogForm;
