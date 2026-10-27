import { Check, Clock, XCircle, AlertCircle } from 'lucide-react';

const VoucherStatusFlow = ({ voucher }) => {
    if (!voucher) return null;

    const { amStatus, cooStatus, status } = voucher;

    const isAMRejected = amStatus === 'REJECTED';
    const isCOORejected = cooStatus === 'REJECTED';
    const isRejected = status === 'REJECTED' || isAMRejected || isCOORejected;
    const rejectedStageIndex = isAMRejected ? 1 : (isCOORejected ? 2 : (status === 'REJECTED' ? 1 : -1));

    const stages = [
        { 
            id: 'SUBMITTED', 
            label: 'Raised', 
            isComplete: true, 
            isCurrent: amStatus === 'PENDING' && !isRejected 
        },
        { 
            id: 'AM_APPROVAL', 
            label: isAMRejected ? 'Reject by AM' : (amStatus === 'APPROVED' ? 'Approved by AM' : 'AM Review'), 
            isComplete: amStatus === 'APPROVED', 
            isCurrent: amStatus === 'PENDING' && !isRejected 
        },
        { 
            id: 'COO_APPROVAL', 
            label: isCOORejected ? 'Reject by COO' : (cooStatus === 'APPROVED' ? 'Approved by COO' : 'COO Review'), 
            isComplete: cooStatus === 'APPROVED', 
            isCurrent: amStatus === 'APPROVED' && cooStatus === 'PENDING' && !isRejected 
        },
        { 
            id: 'PAID', 
            label: 'Paid', 
            isComplete: ['PAID', 'COMPLETED'].includes(status), 
            isCurrent: cooStatus === 'APPROVED' && status === 'PAID' && !isRejected
        },
        { 
            id: 'SETTLED', 
            label: 'Settled', 
            isComplete: status === 'COMPLETED', 
            isCurrent: status === 'PAID' && !isRejected
        }
    ];

    return (
        <div className="w-full py-4 sm:py-6 overflow-x-auto">
            <div className="min-w-[340px] px-2 sm:px-0">
                <div className="flex items-center justify-between relative">
                    {/* Background Line */}
                    <div className="absolute top-4 sm:top-5 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
                    
                    {stages.map((stage, index) => {
                        const isThisStageRejected = isRejected && index === rejectedStageIndex;
                        const isAfterRejected = isRejected && index > rejectedStageIndex;

                        return (
                            <div key={stage.id} className="relative z-10 flex flex-col items-center">
                                <div className={`
                                    w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500
                                    ${stage.isComplete 
                                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100' 
                                        : isThisStageRejected
                                            ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-200'
                                            : isAfterRejected
                                                ? 'bg-slate-50 border-slate-200 text-slate-300'
                                                : stage.isCurrent
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100 animate-pulse-subtle'
                                                    : 'bg-white border-slate-200 text-slate-300'
                                    }
                                `}>
                                    {isThisStageRejected ? (
                                        <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                                    ) : stage.isComplete ? (
                                        <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                                    ) : stage.isCurrent ? (
                                        <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                                    ) : (
                                        <span className="text-[9px] sm:text-[10px] font-black">{index + 1}</span>
                                    )}
                                </div>
                                <span className={`
                                    absolute -bottom-5 sm:-bottom-6 text-[8px] sm:text-[9px] font-black uppercase tracking-tight sm:tracking-wider whitespace-nowrap
                                    ${isThisStageRejected ? 'text-rose-500 font-bold' : stage.isComplete ? 'text-emerald-600' : stage.isCurrent ? 'text-blue-600' : 'text-slate-400'}
                                `}>
                                    {isThisStageRejected ? stage.label : stage.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {amStatus === 'APPROVED' && cooStatus === 'PENDING' && !isRejected && (
                <div className="mt-8 sm:mt-10 p-3 bg-purple-50 border border-purple-100 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={16} className="text-purple-600 flex-shrink-0" />
                    <p className="text-[10px] font-bold text-purple-700">Approved by AM. Sent to COO for review & payment approval.</p>
                </div>
            )}
            {status === 'PAID' && (
                <div className="mt-8 sm:mt-10 p-3 bg-teal-50 border border-teal-100 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <Check size={16} className="text-teal-600 flex-shrink-0" />
                    <p className="text-[10px] font-bold text-teal-700">Approved by both AM & COO. Status is PAID. Ready for cash disbursement & settlement.</p>
                </div>
            )}
            {status === 'COMPLETED' && (
                <div className="mt-8 sm:mt-10 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <Check size={16} className="text-emerald-600 flex-shrink-0" />
                    <p className="text-[10px] font-bold text-emerald-700">Voucher Settled. Amount disbursed and proof verified.</p>
                </div>
            )}
        </div>
    );
};

export default VoucherStatusFlow;
