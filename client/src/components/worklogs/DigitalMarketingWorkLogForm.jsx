import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog } from '../../features/employee/employeeSlice';
import SuccessModal from '../SuccessModal';
import ConfirmationModal from '../ConfirmationModal';
import { Megaphone, Briefcase, User, Clock, Link, FileText, CheckSquare, Save } from 'lucide-react';
import { motion } from 'framer-motion';

const DigitalMarketingWorkLogForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { isLoading } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);
    const [confirmationConfig, setConfirmationConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

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

        setConfirmationConfig({
            isOpen: true,
            title: 'Submit Marketing Log',
            message: 'Are you sure you want to submit this digital marketing task log?',
            onConfirm: () => {
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
                setConfirmationConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    return (
        <motion.form
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={onSubmit} className="space-y-6"
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
            </div>

            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onSuccess} className="flex-1 py-4 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-colors uppercase text-xs tracking-wider">
                    Cancel
                </button>
                <button type="submit" disabled={isLoading} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 uppercase text-xs tracking-wider">
                    {isLoading ? 'Submitting...' : <><Save size={18} /> Submit Log</>}
                </button>
            </div>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => {
                    setShowSuccess(false);
                    if (onSuccess) onSuccess();
                }}
                message="Work Log Submitted"
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
