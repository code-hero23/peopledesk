import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog, closeWorkLog, getTodayLogStatus } from '../../features/employee/employeeSlice';
import SuccessModal from '../SuccessModal';
import ConfirmationModal from '../ConfirmationModal';
import {
    Phone, Star, Briefcase, FileText, Globe, CheckSquare,
    TrendingUp, Clock, MapPin, Layout, MessageCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

const FAWorkLogForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { isLoading, todayLog } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [confirmationConfig, setConfirmationConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    useEffect(() => {
        dispatch(getTodayLogStatus());
    }, [dispatch]);

    // Initial Data Structure
    const initialMetrics = {
        calls: {
            oneStar: '', twoStar: '', threeStar: '', fourStar: '', fiveStar: '',
            sixStar: '', sevenStar: '', eightStar: '', nineStar: ''
        },
        infurniaPending: { count: '', text1: '', text2: '' },
        quotationPending: '',
        initialQuote: { text: '', count: '' },
        revisedQuote: { text: '', count: '' },
        showroomVisit: '',
        onlineDiscussion: ''
    };

    const [openingData, setOpeningData] = useState({ ...initialMetrics });
    const [closingData, setClosingData] = useState({ ...initialMetrics, notes: '' });

    // Helper to update deeply nested state
    const updateState = (setter, path, value) => {
        setter(prev => {
            const newState = { ...prev };
            let current = newState;
            const keys = path.split('.');
            keys.slice(0, -1).forEach(key => {
                current[key] = { ...current[key] };
                current = current[key];
            });
            current[keys[keys.length - 1]] = value;
            return newState;
        });
    };

    const handleOpeningChange = (path, value) => updateState(setOpeningData, path, value);
    const handleClosingChange = (path, value) => updateState(setClosingData, path, value);

    const handleOpeningSubmit = (e) => {
        e.preventDefault();
        setConfirmationConfig({
            isOpen: true,
            title: 'Submit Opening Report',
            message: 'Are you sure you want to start your day with these targets?',
            onConfirm: () => {
                const payload = {
                    logStatus: 'OPEN',
                    fa_opening_metrics: openingData
                };
                dispatch(createWorkLog(payload)).then((res) => {
                    if (!res.error) {
                        setModalMessage("Opening Report Submitted! Day started.");
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
            message: 'Are you sure you want to submit your final achievements for today?',
            onConfirm: () => {
                const payload = {
                    fa_closing_metrics: closingData,
                    notes: closingData.notes
                };
                dispatch(closeWorkLog(payload)).then((res) => {
                    if (!res.error) {
                        setModalMessage("Closing Report Submitted! Day ended.");
                        setShowSuccess(true);
                    }
                });
                setConfirmationConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading workspace...</div>;

    const isTodayClosed = todayLog && todayLog.logStatus === 'CLOSED';
    const isTodayOpen = todayLog && todayLog.logStatus === 'OPEN';

    if (isTodayClosed) {
        return (
            <div className="bg-emerald-50 p-8 rounded-3xl text-center border border-emerald-100">
                <CheckSquare size={48} className="mx-auto text-emerald-500 mb-4" />
                <h3 className="text-2xl font-black text-emerald-800 mb-2">Day Completed!</h3>
                <p className="text-emerald-600 font-bold">Daily reports submitted successfully.</p>
            </div>
        );
    }



    if (isTodayOpen) {
        return (
            <>
                <FormLayout
                    data={closingData}
                    handleChange={handleClosingChange}
                    title="FA Closing Report"
                    onSubmit={handleClosingSubmit}
                    btnText="Submit Closing Report"
                    isOpening={false}
                />
                <SuccessModal isOpen={showSuccess} onClose={() => { setShowSuccess(false); if (onSuccess) onSuccess(); }} message={modalMessage} />
                <ConfirmationModal
                    isOpen={confirmationConfig.isOpen}
                    onClose={() => setConfirmationConfig(prev => ({ ...prev, isOpen: false }))}
                    onConfirm={confirmationConfig.onConfirm}
                    title={confirmationConfig.title}
                    message={confirmationConfig.message}
                />
            </>
        );
    }

    return (
        <>
            <FormLayout
                data={openingData}
                handleChange={handleOpeningChange}
                title="FA Opening Report"
                onSubmit={handleOpeningSubmit}
                btnText="Submit Opening Report"
                isOpening={true}
            />
            <SuccessModal isOpen={showSuccess} onClose={() => { setShowSuccess(false); if (onSuccess) onSuccess(); }} message={modalMessage} />
            <ConfirmationModal
                isOpen={confirmationConfig.isOpen}
                onClose={() => setConfirmationConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmationConfig.onConfirm}
                title={confirmationConfig.title}
                message={confirmationConfig.message}
            />
        </>
    );
};

export default FAWorkLogForm;

// --- SHARED UI COMPONENTS ---
const MetricCard = ({ title, icon: Icon, children, color = "blue" }) => (
    <div className={`bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group`}>
        <div className={`flex items-center gap-2 mb-4 pb-2 border-b border-slate-50`}>
            <div className={`p-2 rounded-lg bg-${color}-50 text-${color}-600 group-hover:bg-${color}-100 transition-colors`}>
                <Icon size={18} />
            </div>
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">{title}</h4>
        </div>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const InputGroup = ({ label, value, onChange, placeholder = "0", type = "number" }) => (
    <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{label}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-slate-50 p-2.5 rounded-xl font-bold text-slate-700 text-sm outline-none border border-slate-200 focus:border-blue-400 focus:bg-white transition-all placeholder:text-slate-300"
            placeholder={placeholder}
        />
    </div>
);

const FormLayout = ({ data, handleChange, title, onSubmit, btnText, isOpening }) => {
    const themeColor = isOpening ? 'blue' : 'emerald';
    const TitleIcon = isOpening ? Clock : TrendingUp;

    return (
        <motion.form
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={onSubmit} className="space-y-6"
        >
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className={`p-3 bg-${themeColor}-100 text-${themeColor}-600 rounded-xl`}>
                    <TitleIcon size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-800">{title}</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase">{isOpening ? "Start of Day Targets" : "End of Day Achievements"}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* STAR CALLS */}
                <div className="md:col-span-2">
                    <MetricCard title="Calls By Star Rating" icon={Star} color="amber">
                        <div className="grid grid-cols-3 md:grid-cols-9 gap-2">
                            {['nine', 'eight', 'seven', 'six', 'five', 'four', 'three', 'two', 'one'].map((num) => (
                                <InputGroup
                                    key={num}
                                    label={`${num} ☆`}
                                    value={data.calls[`${num}Star`]}
                                    onChange={(val) => handleChange(`calls.${num}Star`, val)}
                                />
                            ))}
                        </div>
                    </MetricCard>
                </div>

                {/* INFURNIA */}
                <MetricCard title="Infurnia Pending" icon={Layout} color="purple">
                    <div className="grid grid-cols-3 gap-3">
                        <InputGroup label="Count" value={data.infurniaPending.count} onChange={(val) => handleChange('infurniaPending.count', val)} />
                        <div className="col-span-2">
                            <InputGroup label="Details 1" value={data.infurniaPending.text1} onChange={(val) => handleChange('infurniaPending.text1', val)} type="text" placeholder="Details..." />
                        </div>
                        <div className="col-span-3">
                            <InputGroup label="Details 2" value={data.infurniaPending.text2} onChange={(val) => handleChange('infurniaPending.text2', val)} type="text" placeholder="More info..." />
                        </div>
                    </div>
                </MetricCard>

                {/* QUOTES */}
                <MetricCard title="Quotations" icon={FileText} color="blue">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <InputGroup label="Pending Count" value={data.quotationPending} onChange={(val) => handleChange('quotationPending', val)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <InputGroup label="Initial (Count)" value={data.initialQuote.count} onChange={(val) => handleChange('initialQuote.count', val)} />
                        <InputGroup label="Initial (Text)" value={data.initialQuote.text} onChange={(val) => handleChange('initialQuote.text', val)} type="text" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                        <InputGroup label="Revised (Count)" value={data.revisedQuote.count} onChange={(val) => handleChange('revisedQuote.count', val)} />
                        <InputGroup label="Revised (Text)" value={data.revisedQuote.text} onChange={(val) => handleChange('revisedQuote.text', val)} type="text" />
                    </div>
                </MetricCard>

                {/* VISITS */}
                <div className="md:col-span-2">
                    <MetricCard title="Visits & Discussions" icon={Globe} color="teal">
                        <div className="grid grid-cols-2 gap-4">
                            <InputGroup label="Showroom Visits" value={data.showroomVisit} onChange={(val) => handleChange('showroomVisit', val)} />
                            <InputGroup label="Online Discussions" value={data.onlineDiscussion} onChange={(val) => handleChange('onlineDiscussion', val)} />
                        </div>
                    </MetricCard>
                </div>

                {/* Daily Notes - Only for Closing Report */}
                {!isOpening && (
                    <div className="md:col-span-2 bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-blue-600">
                            <MessageCircle size={18} />
                            <h4 className="text-sm font-black uppercase tracking-widest">Daily Notes (for Admin & HR)</h4>
                        </div>
                        <textarea
                            value={data.notes || ''}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            className="w-full bg-white p-4 rounded-xl font-medium text-slate-700 text-sm outline-none border border-blue-200 focus:ring-2 ring-blue-100 transition-all placeholder:text-slate-300 min-h-[100px]"
                            placeholder="Share daily summary, insights, or updates for Admin and HR..."
                        ></textarea>
                    </div>
                )}
            </div>

            <button type="submit" className={`w-full bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2`}>
                <CheckSquare size={20} /> {btnText}
            </button>
        </motion.form>
    );
};
