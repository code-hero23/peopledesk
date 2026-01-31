import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog, closeWorkLog, getTodayLogStatus } from '../../features/employee/employeeSlice';
import SuccessModal from '../SuccessModal';

const CREWorkLogForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { isLoading, todayLog } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);
    const [modalMessage, setModalMessage] = useState('');

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
            quotesSent: '', // no of Quotes Sent
            uptoTodayCalls: { eightStar: '', sevenStar: '', sixStar: '', fiveStar: '' }, // and so on
            noOfProposal: '',
            firstQuotationSent: '',
            noOfOrders: '', // No of orders
            // Breakdown fields requested: 9. 8star, 10. 7star... wait, the user listed them flat in closing.
            // Let's verify the user's specific request structure.
            // "9. 8star, 10. 7star, 11. 6star, 12. 5star, 13. upto today calls, 14. upto today calls..."
            // This is a bit chaotic. I will map them as cleanly as possible.
            // Let's use a nested structure for cleanliness but display flat if needed.
            // Actually, keep it flat if it aids the user's view, or grouped. Grouping is better.

            // "upto today calls", "upto today calls"... repeating.
            // I will assume these correspond to different categories or stars.
            // Let's look at the user request again.
            // Closing:
            // 5. upto today calls
            // 9-12: 8star, 7star, 6star, 5star
            // 13-15: upto today calls (x3)

            // This suggests standardized blocks. I'll group them.

            // Let's just implement the fields exactly as listed to avoid confusion.
            fields: { // Flattened for simplicity or Grouped?
                floorPlanReceived: '',
                showroomVisit: '',
                reviewCollected: '',
                quotesSent: '',
                uptoTodayCalls_A: '', // Item 5

                proposalCount: '',
                firstQuotationSent: '',
                orderCount: '',

                eightStar: '',
                sevenStar: '',
                sixStar: '',
                fiveStar: '',

                uptoTodayCalls_B: '', // Item 13
                uptoTodayCalls_C: '', // Item 14
                uptoTodayCalls_D: '', // Item 15

                onlineDiscussion: '',
                siteMsmtDisc: '',
                whatsappSent: ''
            }
        }
    });

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

    const handleClosingChange = (e, section) => {
        if (section) {
            setClosingData(prev => ({
                ...prev,
                cre_closing_metrics: {
                    ...prev.cre_closing_metrics,
                    [section]: {
                        ...prev.cre_closing_metrics[section],
                        [e.target.name]: e.target.value
                    }
                }
            }));
        } else {
            setClosingData(prev => ({
                ...prev,
                cre_closing_metrics: {
                    ...prev.cre_closing_metrics,
                    [e.target.name]: e.target.value
                }
            }));
        }
    };

    const handleOpeningSubmit = (e) => {
        e.preventDefault();
        // Flatten or structure data for backend.
        // Backend expects 'cre_totalCalls' etc for standard fields, but we are moving to JSON metrics?
        // The implementation plan used `cre_opening_metrics` JSON field.

        // We also need to send `logStatus: 'OPEN'`
        const payload = {
            logStatus: 'OPEN',
            cre_opening_metrics: openingData.cre_opening_metrics,
            // Map some core fields if needed for analytics, e.g.
            // cre_totalCalls: ...
            // For now, dumping into JSON as per plan.
        };

        dispatch(createWorkLog(payload)).then((res) => {
            if (!res.error) {
                setModalMessage("Opening Report Submitted! Check in successful.");
                setShowSuccess(true);
            }
        });
    };

    const handleClosingSubmit = (e) => {
        e.preventDefault();
        const payload = {
            cre_closing_metrics: closingData.cre_closing_metrics
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

    // Status: CLOSED -> Show "Day Complete"
    // Status: OPEN -> Show Closing Form
    // Status: No Log (null) -> Show Opening Form

    // NOTE: If status is CLOSED, user has finished today.

    const isTodayClosed = todayLog && todayLog.logStatus === 'CLOSED';
    const isTodayOpen = todayLog && todayLog.logStatus === 'OPEN';

    if (isTodayClosed) {
        return (
            <div className="bg-green-50 p-8 rounded-lg text-center border border-green-200">
                <h3 className="text-2xl font-bold text-green-700 mb-2">You're all set!</h3>
                <p className="text-green-600">Daily report submitted. Great work today!</p>
            </div>
        );
    }

    if (isTodayOpen) {
        return (
            <form onSubmit={handleClosingSubmit} className="space-y-4">
                <h3 className="font-bold text-slate-700 border-b pb-2 mb-4">CRE Closing Report (End of Day)</h3>

                {/* 1. Floor Plan Received */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">No of FloorPlan Received</label>
                        <input type="number" name="floorPlanReceived" value={closingData.cre_closing_metrics.floorPlanReceived} onChange={(e) => handleClosingChange(e)} className="input-field" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">No of Showroom Visit</label>
                        <input type="number" name="showroomVisit" value={closingData.cre_closing_metrics.showroomVisit} onChange={(e) => handleClosingChange(e)} className="input-field" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Review Collected</label>
                        <input type="number" name="reviewCollected" value={closingData.cre_closing_metrics.reviewCollected} onChange={(e) => handleClosingChange(e)} className="input-field" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">No of Quotes Sent</label>
                        <input type="number" name="quotesSent" value={closingData.cre_closing_metrics.quotesSent} onChange={(e) => handleClosingChange(e)} className="input-field" />
                    </div>
                </div>

                {/* Upto Today Calls Block */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Upto Today Calls (A)</label>
                    <input type="text" name="uptoTodayCalls_A" value={closingData.cre_closing_metrics.uptoTodayCalls_A} onChange={(e) => handleClosingChange(e)} className="input-field" placeholder="Details..." />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">No of Proposal</label>
                        <input type="number" name="proposalCount" value={closingData.cre_closing_metrics.proposalCount} onChange={(e) => handleClosingChange(e)} className="input-field" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">First Quotation Sent</label>
                        <input type="number" name="firstQuotationSent" value={closingData.cre_closing_metrics.firstQuotationSent} onChange={(e) => handleClosingChange(e)} className="input-field" />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">No of Orders</label>
                    <input type="number" name="orderCount" value={closingData.cre_closing_metrics.orderCount} onChange={(e) => handleClosingChange(e)} className="input-field" />
                </div>

                {/* Stars Block */}
                <div className="p-3 bg-slate-50 rounded-lg">
                    <h4 className="text-sm font-bold text-slate-600 mb-2">Star Calls</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">8 Star</label>
                            <input type="text" name="eightStar" value={closingData.cre_closing_metrics.eightStar} onChange={(e) => handleClosingChange(e)} className="input-field" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">7 Star</label>
                            <input type="text" name="sevenStar" value={closingData.cre_closing_metrics.sevenStar} onChange={(e) => handleClosingChange(e)} className="input-field" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">6 Star</label>
                            <input type="text" name="sixStar" value={closingData.cre_closing_metrics.sixStar} onChange={(e) => handleClosingChange(e)} className="input-field" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">5 Star</label>
                            <input type="text" name="fiveStar" value={closingData.cre_closing_metrics.fiveStar} onChange={(e) => handleClosingChange(e)} className="input-field" />
                        </div>
                    </div>
                </div>

                {/* More Upto Today Calls */}
                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Upto Today Calls (B)</label>
                        <input type="text" name="uptoTodayCalls_B" value={closingData.cre_closing_metrics.uptoTodayCalls_B} onChange={(e) => handleClosingChange(e)} className="input-field" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Upto Today Calls (C)</label>
                        <input type="text" name="uptoTodayCalls_C" value={closingData.cre_closing_metrics.uptoTodayCalls_C} onChange={(e) => handleClosingChange(e)} className="input-field" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Upto Today Calls (D)</label>
                        <input type="text" name="uptoTodayCalls_D" value={closingData.cre_closing_metrics.uptoTodayCalls_D} onChange={(e) => handleClosingChange(e)} className="input-field" />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Online Disc.</label>
                        <input type="text" name="onlineDiscussion" value={closingData.cre_closing_metrics.onlineDiscussion} onChange={(e) => handleClosingChange(e)} className="input-field" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Site Msmt/Disc</label>
                        <input type="text" name="siteMsmtDisc" value={closingData.cre_closing_metrics.siteMsmtDisc} onChange={(e) => handleClosingChange(e)} className="input-field" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Whatsapp Sent</label>
                        <input type="text" name="whatsappSent" value={closingData.cre_closing_metrics.whatsappSent} onChange={(e) => handleClosingChange(e)} className="input-field" />
                    </div>
                </div>

                <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow-lg">
                    Submit Closing Report
                </button>

                <SuccessModal
                    isOpen={showSuccess}
                    onClose={() => {
                        setShowSuccess(false);
                        if (onSuccess) onSuccess();
                    }}
                    message={modalMessage}
                />
            </form>
        );
    }

    // Default: Opening Form
    return (
        <form onSubmit={handleOpeningSubmit} className="space-y-4">
            <h3 className="font-bold text-slate-700 border-b pb-2 mb-4">CRE Opening Report (Start of Day)</h3>

            {/* 1. Upto Today Calls (7*, 6*, 5*) */}
            <div className="bg-slate-50 p-3 rounded-lg mb-4">
                <h4 className="text-sm font-bold text-slate-600 mb-2">Upto Today Calls (A)</h4>
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">7 Star</label>
                        <input type="text" name="sevenStar" value={openingData.cre_opening_metrics.uptoTodayCalls1.sevenStar} onChange={(e) => handleOpeningChange(e, 'uptoTodayCalls1')} className="input-field" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">6 Star</label>
                        <input type="text" name="sixStar" value={openingData.cre_opening_metrics.uptoTodayCalls1.sixStar} onChange={(e) => handleOpeningChange(e, 'uptoTodayCalls1')} className="input-field" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">5 Star</label>
                        <input type="text" name="fiveStar" value={openingData.cre_opening_metrics.uptoTodayCalls1.fiveStar} onChange={(e) => handleOpeningChange(e, 'uptoTodayCalls1')} className="input-field" />
                    </div>
                </div>
            </div>

            {/* 2. Upto Today Calls (2*, 3*, 4*) */}
            <div className="bg-slate-50 p-3 rounded-lg mb-4">
                <h4 className="text-sm font-bold text-slate-600 mb-2">Upto Today Calls (B)</h4>
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">4 Star</label>
                        <input type="text" name="fourStar" value={openingData.cre_opening_metrics.uptoTodayCalls2.fourStar} onChange={(e) => handleOpeningChange(e, 'uptoTodayCalls2')} className="input-field" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">3 Star</label>
                        <input type="text" name="threeStar" value={openingData.cre_opening_metrics.uptoTodayCalls2.threeStar} onChange={(e) => handleOpeningChange(e, 'uptoTodayCalls2')} className="input-field" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">2 Star</label>
                        <input type="text" name="twoStar" value={openingData.cre_opening_metrics.uptoTodayCalls2.twoStar} onChange={(e) => handleOpeningChange(e, 'uptoTodayCalls2')} className="input-field" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Showroom Visit</label>
                    <input type="number" name="showroomVisit" value={openingData.cre_opening_metrics.showroomVisit} onChange={(e) => handleOpeningChange(e)} className="input-field" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Online Discussion</label>
                    <input type="number" name="onlineDiscussion" value={openingData.cre_opening_metrics.onlineDiscussion} onChange={(e) => handleOpeningChange(e)} className="input-field" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Site Msmt/Disc Fixed</label>
                    <input type="number" name="siteMsmtDiscFixed" value={openingData.cre_opening_metrics.siteMsmtDiscFixed} onChange={(e) => handleOpeningChange(e)} className="input-field" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">No of FP Received</label>
                    <input type="number" name="fpReceived" value={openingData.cre_opening_metrics.fpReceived} onChange={(e) => handleOpeningChange(e)} className="input-field" />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">FQ Sent</label>
                    <input type="number" name="fqSent" value={openingData.cre_opening_metrics.fqSent} onChange={(e) => handleOpeningChange(e)} className="input-field" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">No of Order</label>
                    <input type="number" name="noOfOrder" value={openingData.cre_opening_metrics.noOfOrder} onChange={(e) => handleOpeningChange(e)} className="input-field" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">No of Proposal (IQ)</label>
                    <input type="number" name="noOfProposalIQ" value={openingData.cre_opening_metrics.noOfProposalIQ} onChange={(e) => handleOpeningChange(e)} className="input-field" />
                </div>
            </div>

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg">
                Submit Opening Report & Start Day
            </button>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => {
                    setShowSuccess(false);
                    if (onSuccess) onSuccess();
                }}
                message={modalMessage}
            />
            {/* CSS Helper for input-field */}
            <style>{`
                .input-field {
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    border: 1px solid #e2e8f0;
                    border-radius: 0.5rem;
                    outline: none;
                    transition: all 0.2s;
                }
                .input-field:focus {
                    ring: 2px solid #3b82f6;
                    border-color: #3b82f6;
                }
            `}</style>
        </form>
    );
};

export default CREWorkLogForm;
