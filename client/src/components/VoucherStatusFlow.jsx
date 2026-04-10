import { Check, Clock, XCircle, AlertCircle } from 'lucide-react';

const VoucherStatusFlow = ({ voucher }) => {
    if (!voucher) return null;

    const { amStatus, cooStatus, status } = voucher;

    const stages = [
        { id: 'SUBMITTED', label: 'Submitted', isComplete: true, isCurrent: amStatus === 'PENDING' && status !== 'REJECTED' },
        { id: 'AM_APPROVAL', label: 'AM Review', isComplete: amStatus === 'APPROVED', isCurrent: amStatus === 'PENDING' && status !== 'REJECTED' },
        { id: 'COO_APPROVAL', label: 'COO Review', isComplete: cooStatus === 'APPROVED', isCurrent: amStatus === 'APPROVED' && cooStatus === 'PENDING' && status !== 'REJECTED' },
        { id: 'COMPLETED', label: status === 'WAITING' ? 'Disbursed' : 'Completed', isComplete: status === 'COMPLETED', isCurrent: status === 'WAITING' }
    ];

    const isRejected = status === 'REJECTED';

    return (
        <div className="w-full py-6">
            <div className="flex items-center justify-between relative">
                {/* Background Line */}
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
                
                {stages.map((stage, index) => (
                    <div key={stage.id} className="relative z-10 flex flex-col items-center">
                        <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500
                            ${stage.isComplete 
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100' 
                                : isRejected && index >= (amStatus === 'REJECTED' ? 1 : cooStatus === 'REJECTED' ? 2 : 0)
                                    ? 'bg-rose-50 border-rose-200 text-rose-400'
                                    : stage.isCurrent
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100 animate-pulse-subtle'
                                        : 'bg-white border-slate-200 text-slate-300'
                            }
                        `}>
                            {isRejected && index === (amStatus === 'REJECTED' ? 1 : cooStatus === 'REJECTED' ? 2 : 0) ? (
                                <XCircle size={20} />
                            ) : stage.isComplete ? (
                                <Check size={20} />
                            ) : stage.isCurrent ? (
                                <Clock size={20} />
                            ) : (
                                <span className="text-[10px] font-black">{index + 1}</span>
                            )
                            }
                        </div>
                        <span className={`
                            absolute -bottom-6 text-[9px] font-black uppercase tracking-widest whitespace-nowrap
                            ${stage.isComplete ? 'text-emerald-600' : stage.isCurrent ? 'text-blue-600' : 'text-slate-400'}
                            ${isRejected && index === (amStatus === 'REJECTED' ? 1 : cooStatus === 'REJECTED' ? 2 : 4) ? 'text-rose-500' : ''}
                        `}>
                            {isRejected && index === (amStatus === 'REJECTED' ? 1 : cooStatus === 'REJECTED' ? 2 : 4) ? 'Rejected' : stage.label}
                        </span>
                    </div>
                ))}
            </div>
            
            {status === 'WAITING' && (
                <div className="mt-10 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={16} className="text-amber-500" />
                    <p className="text-[10px] font-bold text-amber-700">Cash Disbursed. Please upload settlement proof/bill to complete.</p>
                </div>
            )}
        </div>
    );
};

export default VoucherStatusFlow;
