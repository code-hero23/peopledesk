import React from 'react';
import { formatDate, formatTime } from '../../utils/dateUtils';

export const WFHPrintTemplate = React.forwardRef(({ request }, ref) => {
    if (!request) return null;

    return (
        <div ref={ref} className="p-10 text-slate-800 bg-white min-h-screen font-sans">
            {/* Header */}
            <div className="flex justify-between items-center border-b-2 border-blue-600 pb-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-blue-900 uppercase">Work From Home Request</h1>
                    <p className="text-sm font-bold text-blue-600/70 tracking-widest mt-1">PEOPLEDESK OFFICIAL DOCUMENT</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase">Request ID</p>
                    <p className="font-mono text-lg font-black text-slate-900">#WFH-{request.id}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-10 mb-10">
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest border-l-4 border-blue-600 pl-3">Employee Details</h3>
                    <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                        <p className="flex justify-between border-b border-slate-200 pb-1"><span className="text-slate-500 font-bold text-xs uppercase">Name:</span> <span className="font-black text-slate-900">{request.employeeName}</span></p>
                        <p className="flex justify-between border-b border-slate-200 pb-1"><span className="text-slate-500 font-bold text-xs uppercase">Designation:</span> <span className="font-black text-slate-900">{request.designation}</span></p>
                        <p className="flex justify-between"><span className="text-slate-500 font-bold text-xs uppercase">Employee ID:</span> <span className="font-mono font-bold text-slate-900">{request.userId}</span></p>
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest border-l-4 border-blue-600 pl-3">Duration Details</h3>
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 space-y-2">
                        <p className="flex justify-between border-b border-blue-100 pb-1"><span className="text-blue-600/70 font-bold text-xs uppercase">Start Date:</span> <span className="font-black text-blue-900">{formatDate(request.startDate)}</span></p>
                        <p className="flex justify-between border-b border-blue-100 pb-1"><span className="text-blue-600/70 font-bold text-xs uppercase">Total Days:</span> <span className="font-black text-blue-900">{request.wfhDays} Days</span></p>
                        <p className="flex justify-between pt-1"><span className="text-blue-600/70 font-bold text-xs uppercase">Requested On:</span> <span className="font-bold text-blue-800">{formatDate(request.createdAt)} {formatTime(request.createdAt)}</span></p>
                    </div>
                </div>
                <SignatureBlock
                    label="Business Head"
                    status={request.bhStatus}
                    text={request.bhStatus === 'APPROVED' ? "DIGITALLY SIGNED" : "PENDING"}
                />
                <SignatureBlock
                    label="HR Dept / Admin"
                    status={request.hrStatus === 'APPROVED' && request.adminStatus === 'APPROVED' ? 'APPROVED' : 'PENDING'}
                    text={request.hrStatus === 'APPROVED' ? "VERIFIED & SIGNED" : "PENDING"}
                />
            </div>

            <div className="mt-12 text-center">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Generated via PeopleDesk System • Corporate Compliance Document</p>
            </div>
        </div>
    );
});

const ComplianceItem = ({ label, value }) => (
    <div className="flex flex-col items-center p-2 bg-white rounded-lg shadow-sm border border-emerald-100/50">
        <span className="text-[8px] font-black text-slate-400 uppercase mb-1">{label}</span>
        {value ? (
            <span className="text-[10px] font-black text-emerald-600">✓ CERTIFIED</span>
        ) : (
            <span className="text-[10px] font-black text-red-500">✕ INCOMPLETE</span>
        )}
    </div>
);

const SignatureBlock = ({ label, status, name, text }) => (
    <div className="text-center border-t border-slate-200 pt-4">
        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{label}</p>
        <div className="h-10 flex items-center justify-center font-cursive text-indigo-700 text-lg italic opacity-70">
            {status === 'APPROVED' ? (text || name) : '---'}
        </div>
        <p className="text-[8px] font-bold text-slate-300">Sign / Stamp</p>
    </div>
);
