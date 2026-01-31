import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog, closeWorkLog, getTodayLogStatus } from '../../features/employee/employeeSlice';
import SuccessModal from '../SuccessModal';

const FAWorkLogForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { isLoading, todayLog } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);
    const [modalMessage, setModalMessage] = useState('');

    useEffect(() => {
        dispatch(getTodayLogStatus());
    }, [dispatch]);

    // Initial Data Structure for Both Opening and Closing
    // Since fields are identical, we can reuse structure but store in separate state keys for clarity or just mapped on submit.
    // Spec:
    // 1. No of Calls (1-9 stars)
    // 2. Infurnia pending (int + 2 text fields?) -> Let's do Count + Client + Remarks? or just Description.
    //    User said: "(integer)& (text,text)" -> Count, Client Name, Details?
    // 3. Quotation pending (int)
    // 4. Initial quote (text & integer)
    // 5. Revised quote (text & integer)
    // 6. Showroom visit
    // 7. Online discussion

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
    const [closingData, setClosingData] = useState({ ...initialMetrics });

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
    };

    const handleClosingSubmit = (e) => {
        e.preventDefault();
        const payload = {
            fa_closing_metrics: closingData
        };
        dispatch(closeWorkLog(payload)).then((res) => {
            if (!res.error) {
                setModalMessage("Closing Report Submitted! Day ended.");
                setShowSuccess(true);
            }
        });
    };

    // Render Logic
    if (isLoading) return <div>Loading...</div>;

    const isTodayClosed = todayLog && todayLog.logStatus === 'CLOSED';
    const isTodayOpen = todayLog && todayLog.logStatus === 'OPEN';

    if (isTodayClosed) {
        return (
            <div className="bg-green-50 p-8 rounded-lg text-center border border-green-200">
                <h3 className="text-2xl font-bold text-green-700 mb-2">Day Completed!</h3>
                <p className="text-green-600">Great job today. Your report is submitted.</p>
            </div>
        );
    }

    // SHARED FORM RENDERER
    const renderForm = (data, handleChange, title, onSubmit, btnText, colorClass = "blue") => (
        <form onSubmit={onSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
            <h3 className={`font-bold text-slate-700 border-b pb-2 mb-4`}>{title}</h3>

            {/* 1. Star Calls */}
            <div className="bg-slate-50 p-3 rounded-lg mb-4">
                <h4 className="text-sm font-bold text-slate-600 mb-2">No of Calls</h4>
                <div className="grid grid-cols-3 gap-3">
                    {['nine', 'eight', 'seven', 'six', 'five', 'four', 'three', 'two', 'one'].map((num) => (
                        <div key={num}>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{num} Star</label>
                            <input
                                type="number"
                                value={data.calls[`${num}Star`]}
                                onChange={(e) => handleChange(`calls.${num}Star`, e.target.value)}
                                className="input-field"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* 2. Infurnia Pending */}
            <div className="bg-slate-50 p-3 rounded-lg mb-4">
                <h4 className="text-sm font-bold text-slate-600 mb-2">Infurnia Pending</h4>
                <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-3">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Count</label>
                        <input type="number" value={data.infurniaPending.count} onChange={(e) => handleChange('infurniaPending.count', e.target.value)} className="input-field" />
                    </div>
                    <div className="col-span-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Text 1</label>
                        <input type="text" value={data.infurniaPending.text1} onChange={(e) => handleChange('infurniaPending.text1', e.target.value)} className="input-field" />
                    </div>
                    <div className="col-span-5">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Text 2</label>
                        <input type="text" value={data.infurniaPending.text2} onChange={(e) => handleChange('infurniaPending.text2', e.target.value)} className="input-field" />
                    </div>
                </div>
            </div>

            {/* 3. Quotation Pending */}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quotation Pending (Count)</label>
                <input type="number" value={data.quotationPending} onChange={(e) => handleChange('quotationPending', e.target.value)} className="input-field" />
            </div>

            {/* 4. Initial Quote */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Initial Quote (Text)</label>
                    <input type="text" value={data.initialQuote.text} onChange={(e) => handleChange('initialQuote.text', e.target.value)} className="input-field" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Count</label>
                    <input type="number" value={data.initialQuote.count} onChange={(e) => handleChange('initialQuote.count', e.target.value)} className="input-field" />
                </div>
            </div>

            {/* 5. Revised Quote */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Revised Quote (Text)</label>
                    <input type="text" value={data.revisedQuote.text} onChange={(e) => handleChange('revisedQuote.text', e.target.value)} className="input-field" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Count</label>
                    <input type="number" value={data.revisedQuote.count} onChange={(e) => handleChange('revisedQuote.count', e.target.value)} className="input-field" />
                </div>
            </div>

            {/* 6 & 7. Visits */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Showroom Visit</label>
                    <input type="number" value={data.showroomVisit} onChange={(e) => handleChange('showroomVisit', e.target.value)} className="input-field" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Online Discussion</label>
                    <input type="number" value={data.onlineDiscussion} onChange={(e) => handleChange('onlineDiscussion', e.target.value)} className="input-field" />
                </div>
            </div>

            <button type="submit" className={`w-full bg-${colorClass}-600 hover:bg-${colorClass}-700 text-white font-bold py-3 rounded-lg shadow-lg mt-4`}>
                {btnText}
            </button>

            <style>{`
                .input-field {
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    border: 1px solid #e2e8f0;
                    border-radius: 0.5rem;
                    outline: none;
                    transition: all 0.2s;
                    font-size: 0.875rem;
                }
                .input-field:focus {
                    ring: 2px solid #3b82f6;
                    border-color: #3b82f6;
                }
            `}</style>
        </form>
    );

    if (isTodayOpen) {
        return (
            <>
                {renderForm(closingData, handleClosingChange, "FA Closing Report (End of Day)", handleClosingSubmit, "Submit Closing Report", "green")}
                <SuccessModal isOpen={showSuccess} onClose={() => { setShowSuccess(false); if (onSuccess) onSuccess(); }} message={modalMessage} />
            </>
        );
    }

    return (
        <>
            {renderForm(openingData, handleOpeningChange, "FA Opening Report (Start of Day)", handleOpeningSubmit, "Submit Opening Report", "blue")}
            <SuccessModal isOpen={showSuccess} onClose={() => { setShowSuccess(false); if (onSuccess) onSuccess(); }} message={modalMessage} />
        </>
    );
};

export default FAWorkLogForm;
