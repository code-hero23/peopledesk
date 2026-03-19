import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { createWorkLog, closeWorkLog, getTodayLogStatus } from '../../features/employee/employeeSlice';
import { toast } from 'react-toastify';
import SuccessModal from '../SuccessModal';
import ConfirmationModal from '../ConfirmationModal';
import {
    Phone, Star, MapPin, MessageSquare, FileText,
    ShoppingCart, Send, ClipboardList, CheckSquare,
    Clock, TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';
const CREWorkLogForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isLoading, todayLog } = useSelector((state) => state.employee);
    const isTodayClosed = todayLog && todayLog.logStatus === 'CLOSED';
    const isTodayOpen = todayLog && todayLog.logStatus === 'OPEN';
    
    const [showSuccess, setShowSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
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

    // Initial State for Opening
    const [openingData, setOpeningData] = useState({
        cre_opening_metrics: {
            uptoTodayCalls1: { sevenStar: '', sixStar: '', fiveStar: '' },
            uptoTodayCalls2: { twoStar: '', threeStar: '', fourStar: '' },
            showroomVisit: '',
            onlineDiscussion: '',
            siteMsmtDiscFixed: '',
            fpReceived: '',
            fqSent: '',
            noOfOrder: '',
            noOfProposalIQ: ''
        }
    });

    // Initial State for Closing
    const [closingData, setClosingData] = useState({
        cre_closing_metrics: {
            floorPlanReceived: '',
            showroomVisit: '',
            reviewCollected: '',
            quotesSent: '',
            uptoTodayCalls: '',
            proposalCount: '',
            firstQuotationSent: '',
            orderCount: '',
            eightStar: '',
            sevenStar: '',
            sixStar: '',
            fiveStar: '',
            fourStar: '',
            threeStar: '',
            twoStar: '',
            onlineDiscussion: '',
            siteMsmtDisc: '',
            whatsappSent: ''
        },
        notes: ''
    });

    // Persistence: Preload data from todayLog (Opening Metrics) into Closing Form
    useEffect(() => {
        if (isTodayOpen && todayLog?.cre_opening_metrics) {
            const om = todayLog.cre_opening_metrics;
            setClosingData(prev => ({
                ...prev,
                cre_closing_metrics: {
                    ...prev.cre_closing_metrics,
                    // Map opening fields to closing fields where they overlap
                    showroomVisit: om.showroomVisit || prev.cre_closing_metrics.showroomVisit,
                    onlineDiscussion: om.onlineDiscussion || prev.cre_closing_metrics.onlineDiscussion,
                    siteMsmtDisc: om.siteMsmtDiscFixed || prev.cre_closing_metrics.siteMsmtDisc,
                    floorPlanReceived: om.fpReceived || prev.cre_closing_metrics.floorPlanReceived,
                    firstQuotationSent: om.fqSent || prev.cre_closing_metrics.firstQuotationSent,
                    orderCount: om.noOfOrder || prev.cre_closing_metrics.orderCount,
                    proposalCount: om.noOfProposalIQ || prev.cre_closing_metrics.proposalCount,
                    // Star calls
                    sevenStar: om.uptoTodayCalls1?.sevenStar || prev.cre_closing_metrics.sevenStar,
                    sixStar: om.uptoTodayCalls1?.sixStar || prev.cre_closing_metrics.sixStar,
                    fiveStar: om.uptoTodayCalls1?.fiveStar || prev.cre_closing_metrics.fiveStar,
                    fourStar: om.uptoTodayCalls2?.fourStar || prev.cre_closing_metrics.fourStar,
                    threeStar: om.uptoTodayCalls2?.threeStar || prev.cre_closing_metrics.threeStar,
                    twoStar: om.uptoTodayCalls2?.twoStar || prev.cre_closing_metrics.twoStar,
                }
            }));
        }
    }, [isTodayOpen, todayLog]);



    const handleOpeningChange = (e, section) => {
        if (section) {
            setOpeningData(prev => ({
                ...prev,
                cre_opening_metrics: {
                    ...prev.cre_opening_metrics,
                    [section]: {
                        ...prev.cre_opening_metrics[section],
                        [e.target.name]: e.target.value
                    }
                }
            }));
        } else {
            setOpeningData(prev => ({
                ...prev,
                cre_opening_metrics: {
                    ...prev.cre_opening_metrics,
                    [e.target.name]: e.target.value
                }
            }));
        }
    };

    const handleClosingChange = (e) => {
        const { name, value } = e.target;

        // Check if this is the notes field (top-level) or a metric field (nested)
        if (name === 'notes') {
            setClosingData(prev => ({
                ...prev,
                notes: value
            }));
        } else {
            // All other fields are part of cre_closing_metrics
            setClosingData(prev => ({
                ...prev,
                cre_closing_metrics: {
                    ...prev.cre_closing_metrics,
                    [name]: value
                }
            }));
        }
    };

    const handleOpeningSubmit = (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        setConfirmationConfig({
            isOpen: true,
            title: 'Submit Opening Report',
            message: 'Are you sure you want to start your day with these metrics?',
            onConfirm: () => {
                if (isSubmitting) return;
                setIsSubmitting(true);
                const payload = {
                    logStatus: 'OPEN',
                    cre_opening_metrics: openingData.cre_opening_metrics,
                    startTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                };

                dispatch(createWorkLog(payload)).then((res) => {
                    if (!res.error) {
                        setModalMessage("Opening Report Submitted! Day started.");
                        setShowSuccess(true);
                    }
                    setIsSubmitting(false);
                });
                setConfirmationConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleClosingSubmit = (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        setConfirmationConfig({
            isOpen: true,
            title: 'Submit Closing Report',
            message: 'Are you sure you want to submit your final metrics for today?',
            onConfirm: () => {
                if (isSubmitting) return;
                setIsSubmitting(true);
                const payload = {
                    cre_closing_metrics: closingData.cre_closing_metrics,
                    notes: closingData.notes,
                    endTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                };
                dispatch(closeWorkLog(payload)).then((res) => {
                    if (!res.error) {
                        setModalMessage("Closing Report Submitted! Day ended.");
                        setShowSuccess(true);
                    }
                    setIsSubmitting(false);
                });
                setConfirmationConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500 dark:text-slate-400 animate-pulse transition-colors">Loading workspace...</div>;

    if (isTodayClosed) {
        return (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-8 rounded-3xl text-center border border-emerald-100 dark:border-emerald-900/50 transition-colors">
                <CheckSquare size={48} className="mx-auto text-emerald-500 dark:text-emerald-400 mb-4" />
                <h3 className="text-2xl font-black text-emerald-800 dark:text-emerald-200 mb-2">Day Completed!</h3>
                <p className="text-emerald-600 dark:text-emerald-400 font-bold">Daily metrics submitted successfully.</p>
            </div>
        );
    }

    if (isTodayOpen) {
        // --- CLOSING FORM ---
        return (
            <motion.form
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                onSubmit={handleClosingSubmit} className="space-y-6"
            >
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800 transition-colors">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white transition-colors">Closing Report</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-500 font-bold uppercase transition-colors">End of Day Metrics</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <MetricCard title="Visits & Plans" icon={MapPin} color="emerald">
                        <div className="grid grid-cols-2 gap-3">
                            <InputGroup label="Floor Plans Rx" name="floorPlanReceived" value={closingData.cre_closing_metrics.floorPlanReceived} onChange={handleClosingChange} />
                            <InputGroup label="Showroom Visits" name="showroomVisit" value={closingData.cre_closing_metrics.showroomVisit} onChange={handleClosingChange} />
                        </div>
                        <InputGroup label="Reviews Collected" name="reviewCollected" value={closingData.cre_closing_metrics.reviewCollected} onChange={handleClosingChange} />
                    </MetricCard>

                    <MetricCard title="Sales & Quotes" icon={ShoppingCart} color="amber">
                        <div className="grid grid-cols-2 gap-3">
                            <InputGroup label="Quotes Sent" name="quotesSent" value={closingData.cre_closing_metrics.quotesSent} onChange={handleClosingChange} />
                            <InputGroup label="First Quote Sent" name="firstQuotationSent" value={closingData.cre_closing_metrics.firstQuotationSent} onChange={handleClosingChange} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <InputGroup label="Proposals" name="proposalCount" value={closingData.cre_closing_metrics.proposalCount} onChange={handleClosingChange} />
                            <InputGroup label="Orders" name="orderCount" value={closingData.cre_closing_metrics.orderCount} onChange={handleClosingChange} />
                        </div>
                    </MetricCard>

                    <MetricCard title="Star Calls (Target)" icon={Star} color="purple">
                        <div className="grid grid-cols-2 gap-3">
                            <InputGroup label="8 Star" name="eightStar" value={closingData.cre_closing_metrics.eightStar} onChange={handleClosingChange} />
                            <InputGroup label="7 Star" name="sevenStar" value={closingData.cre_closing_metrics.sevenStar} onChange={handleClosingChange} />
                            <InputGroup label="6 Star" name="sixStar" value={closingData.cre_closing_metrics.sixStar} onChange={handleClosingChange} />
                            <InputGroup label="5 Star" name="fiveStar" value={closingData.cre_closing_metrics.fiveStar} onChange={handleClosingChange} />
                            <InputGroup label="4 Star" name="fourStar" value={closingData.cre_closing_metrics.fourStar} onChange={handleClosingChange} />
                            <InputGroup label="3 Star" name="threeStar" value={closingData.cre_closing_metrics.threeStar} onChange={handleClosingChange} />
                            <InputGroup label="2 Star" name="twoStar" value={closingData.cre_closing_metrics.twoStar} onChange={handleClosingChange} />
                        </div>
                    </MetricCard>

                    <MetricCard title="Client Interactions" icon={MessageSquare} color="blue">
                        <div className="grid grid-cols-2 gap-3">
                            <InputGroup label="Online Discussion" name="onlineDiscussion" value={closingData.cre_closing_metrics.onlineDiscussion} onChange={handleClosingChange} />
                            <InputGroup label="Calls (Upto Today)" name="uptoTodayCalls" value={closingData.cre_closing_metrics.uptoTodayCalls} onChange={handleClosingChange} />
                        </div>
                        <InputGroup label="Site Msmt/Disc" name="siteMsmtDisc" value={closingData.cre_closing_metrics.siteMsmtDisc} onChange={handleClosingChange} />
                        <InputGroup label="WhatsApp Sent" name="whatsappSent" value={closingData.cre_closing_metrics.whatsappSent} onChange={handleClosingChange} />

                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2 transition-colors">
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard/call-reports')}
                                className="w-full text-center text-[10px] font-black text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                            >
                                VIEW DETAILED ANALYTICS →
                            </button>
                        </div>
                    </MetricCard>

                    <div className="md:col-span-2 bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/30 flex flex-col gap-3 transition-colors">
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 transition-colors">
                            <MessageSquare size={18} />
                            <h4 className="text-sm font-black uppercase tracking-widest">Daily Notes (for Admin & HR)</h4>
                        </div>
                        <textarea
                            name="notes"
                            value={closingData.notes}
                            onChange={handleClosingChange}
                            className="w-full bg-white dark:bg-slate-800 p-4 rounded-xl font-medium text-slate-700 dark:text-white text-sm outline-none border border-blue-200 dark:border-slate-700 focus:ring-2 ring-blue-100 dark:ring-blue-900/40 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 min-h-[100px]"
                            placeholder="Share daily summary, insights, or site updates for Admin and HR..."
                        ></textarea>
                    </div>
                </div>

                <button type="submit" disabled={isSubmitting || isLoading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2">
                    {isSubmitting || isLoading ? 'Submitting...' : <><CheckSquare size={20} /> Submit Closing Report</>}
                </button>
                <SuccessModal isOpen={showSuccess} onClose={() => { setShowSuccess(false); if (onSuccess) onSuccess(); }} message={modalMessage} />
                <ConfirmationModal
                    isOpen={confirmationConfig.isOpen}
                    onClose={() => setConfirmationConfig(prev => ({ ...prev, isOpen: false }))}
                    onConfirm={confirmationConfig.onConfirm}
                    title={confirmationConfig.title}
                    message={confirmationConfig.message}
                />
            </motion.form>
        );
    }

    // --- OPENING FORM ---
    return (
        <motion.form
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={handleOpeningSubmit} className="space-y-6"
        >
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800 transition-colors">
                <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white transition-colors">Opening Report</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider transition-colors">Plan your day & targets</p>
                </div>
            </div>

            {/* --- NEW START DAY CARD --- */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-200 relative overflow-hidden mb-8">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/20 rounded-full -ml-12 -mb-12 blur-xl"></div>
                
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                                <Clock size={12} /> Live Session
                            </div>
                            <h2 className="text-3xl font-black mb-1">Start Your Day</h2>
                            <p className="text-blue-100 font-bold text-sm">Review your targets and begin tracking</p>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 min-w-[120px]">
                                <p className="text-[10px] font-black text-blue-200 uppercase mb-1">Current Date</p>
                                <p className="text-lg font-black">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 min-w-[120px]">
                                <p className="text-[10px] font-black text-blue-200 uppercase mb-1">Session Time</p>
                                <p className="text-lg font-black">{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <MetricCard title="Target Calls (Upto Today)" icon={Star} color="purple">
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                            <div className="col-span-1 md:col-span-1"><InputGroup label="7 Star" name="sevenStar" value={openingData.cre_opening_metrics.uptoTodayCalls1.sevenStar} onChange={(e) => handleOpeningChange(e, 'uptoTodayCalls1')} /></div>
                            <div className="col-span-1 md:col-span-1"><InputGroup label="6 Star" name="sixStar" value={openingData.cre_opening_metrics.uptoTodayCalls1.sixStar} onChange={(e) => handleOpeningChange(e, 'uptoTodayCalls1')} /></div>
                            <div className="col-span-1 md:col-span-1"><InputGroup label="5 Star" name="fiveStar" value={openingData.cre_opening_metrics.uptoTodayCalls1.fiveStar} onChange={(e) => handleOpeningChange(e, 'uptoTodayCalls1')} /></div>
                            <div className="col-span-1 md:col-span-1"><InputGroup label="4 Star" name="fourStar" value={openingData.cre_opening_metrics.uptoTodayCalls2.fourStar} onChange={(e) => handleOpeningChange(e, 'uptoTodayCalls2')} /></div>
                            <div className="col-span-1 md:col-span-1"><InputGroup label="3 Star" name="threeStar" value={openingData.cre_opening_metrics.uptoTodayCalls2.threeStar} onChange={(e) => handleOpeningChange(e, 'uptoTodayCalls2')} /></div>
                            <div className="col-span-1 md:col-span-1"><InputGroup label="2 Star" name="twoStar" value={openingData.cre_opening_metrics.uptoTodayCalls2.twoStar} onChange={(e) => handleOpeningChange(e, 'uptoTodayCalls2')} /></div>
                        </div>
                    </MetricCard>
                </div>

                <MetricCard title="Visits & Discussions" icon={MessageSquare} color="blue">
                    <div className="grid grid-cols-2 gap-3">
                        <InputGroup label="Showroom Visits" name="showroomVisit" value={openingData.cre_opening_metrics.showroomVisit} onChange={handleOpeningChange} />
                        <InputGroup label="Online Disc." name="onlineDiscussion" value={openingData.cre_opening_metrics.onlineDiscussion} onChange={handleOpeningChange} />
                    </div>
                    <InputGroup label="Site Msmt/Disc Fixed" name="siteMsmtDiscFixed" value={openingData.cre_opening_metrics.siteMsmtDiscFixed} onChange={handleOpeningChange} />
                </MetricCard>

                <MetricCard title="Sales Pipeline" icon={ShoppingCart} color="amber">
                    <div className="grid grid-cols-2 gap-3">
                        <InputGroup label="FP Received" name="fpReceived" value={openingData.cre_opening_metrics.fpReceived} onChange={handleOpeningChange} />
                        <InputGroup label="FQ Sent" name="fqSent" value={openingData.cre_opening_metrics.fqSent} onChange={handleOpeningChange} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <InputGroup label="Orders" name="noOfOrder" value={openingData.cre_opening_metrics.noOfOrder} onChange={handleOpeningChange} />
                        <InputGroup label="Proposals (IQ)" name="noOfProposalIQ" value={openingData.cre_opening_metrics.noOfProposalIQ} onChange={handleOpeningChange} />
                    </div>
                </MetricCard>
            </div>

            <button type="submit" disabled={isSubmitting || isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2">
                {isSubmitting || isLoading ? 'Submitting...' : <><CheckSquare size={20} /> Submit Opening Report</>}
            </button>
            <SuccessModal isOpen={showSuccess} onClose={() => { setShowSuccess(false); if (onSuccess) onSuccess(); }} message={modalMessage} />
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

export default CREWorkLogForm;

// --- REUSABLE CARD COMPONENT ---
const MetricCard = ({ title, icon: Icon, children, color = "blue" }) => (
    <div className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group`}>
        <div className={`flex items-center gap-2 mb-4 pb-2 border-b border-slate-50 dark:border-slate-800 transition-colors`}>
            <div className={`p-2 rounded-lg bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400 group-hover:bg-${color}-100 dark:group-hover:bg-${color}-900/40 transition-colors`}>
                <Icon size={18} />
            </div>
            <h4 className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest transition-colors">{title}</h4>
        </div>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const InputGroup = ({ label, name, value, onChange, placeholder = "0" }) => (
    <div>
        <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1 transition-colors">{label}</label>
        <input
            type="text"
            name={name}
            value={value}
            onChange={onChange}
            className="w-full bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl font-bold text-slate-700 dark:text-white text-sm outline-none border border-slate-200 dark:border-slate-700 focus:border-blue-400 dark:focus:border-blue-600 focus:bg-white dark:focus:bg-slate-700 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
            placeholder={placeholder}
        />
    </div>
);
