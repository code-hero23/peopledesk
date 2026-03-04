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
            </div>

            {/* Core Justification */}
            <div className="mb-10 space-y-6">
                <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest border-l-4 border-blue-600 pl-3">Technical & Personal Justification</h3>

                <div className="grid grid-cols-1 gap-6">
                    <div className="bg-white border-2 border-slate-100 p-5 rounded-2xl relative">
                        <span className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-black text-slate-400 uppercase tracking-tight">Primary Reason</span>
                        <p className="text-sm font-medium leading-relaxed italic">"{request.realReason}"</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-white border border-slate-200 p-4 rounded-xl">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2">Necessity & Criticality</h4>
                            <p className="text-xs leading-relaxed text-slate-700">{request.necessityReason}</p>
                        </div>
                        <div className="bg-red-50/30 border border-red-100 p-4 rounded-xl">
                            <h4 className="text-[10px] font-black text-red-400 uppercase mb-2">Impact If Rejected</h4>
                            <p className="text-xs leading-relaxed text-red-900 font-medium">{request.impactIfRejected}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Work Plan */}
            <div className="mb-10 space-y-4">
                <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest border-l-4 border-blue-600 pl-3">Operational Work Plan</h3>
                <div className="bg-slate-900 text-white rounded-2xl overflow-hidden">
                    <div className="grid grid-cols-3 gap-px bg-slate-800">
                        <div className="p-4 bg-slate-900">
                            <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Primary Project</p>
                            <p className="text-xs font-bold text-blue-400">{request.primaryProject || "N/A"}</p>
                        </div>
                        <div className="p-4 bg-slate-900">
                            <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Target Deliverables</p>
                            <p className="text-xs font-medium">{request.deliverables}</p>
                        </div>
                        <div className="p-4 bg-slate-900">
                            <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Schedule</p>
                            <p className="text-xs font-medium">{request.workingHours}</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="p-3 border border-slate-100 rounded-lg">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Communication Strategy</p>
                        <p className="text-xs font-medium">{request.communicationPlan}</p>
                    </div>
                    <div className="p-3 border border-slate-100 rounded-lg flex justify-between items-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Response SL:</p>
                        <p className="text-xs font-black text-blue-600">{request.responseTime} Minutes</p>
                    </div>
                </div>
            </div>

            {/* Infrastructure */}
            <div className="mb-12 bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6">
                <h3 className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" /> Infrastructure & Compliance
                </h3>
                <div className="grid grid-cols-4 gap-4">
                    <ComplianceItem label="Internet" value={request.hasStableInternet} />
                    <ComplianceItem label="Power Backup" value={request.hasPowerBackup} />
                    <ComplianceItem label="Workspace" value={request.hasDedicatedWorkspace} />
                    <ComplianceItem label="Office Visits" value={request.officeVisitCommitment} />
                </div>
            </div>

            {/* Signatures */}
            <div className="mt-auto pt-10 grid grid-cols-3 gap-8">
                <SignatureBlock label="Employee" name={request.employeeName} />
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
