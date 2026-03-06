import React from 'react';
import { formatDate, formatTime } from '../../utils/dateUtils';

export const WFHPrintTemplate = React.forwardRef(({ request }, ref) => {
    if (!request) return null;

    const complianceFields = [
        { label: 'Stable Internet', value: request.hasStableInternet },
        { label: 'Power Backup', value: request.hasPowerBackup },
        { label: 'Dedicated Workspace', value: request.hasDedicatedWorkspace },
        { label: 'Security Compliance', value: request.hasSecurityCompliance },
        { label: 'Ergonomic Seating', value: request.hasErgonomicSeating },
        { label: 'No Interruptions', value: request.noInterruptions },
        { label: 'Office Visit Commitment', value: request.officeVisitCommitment }
    ];

    return (
        <div ref={ref} className="p-6 text-black bg-white min-h-screen font-sans text-[10px] leading-tight">
            {/* Header */}
            <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black text-black uppercase">Work From Home Request</h1>
                    <p className="text-[9px] font-bold text-slate-600 tracking-widest mt-0.5">PEOPLEDESK OFFICIAL COMPLIANCE DOCUMENT</p>
                </div>
                <div className="text-right">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Case ID</p>
                    <p className="font-mono text-base font-black text-black">#WFH-{request.id}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Employee Info */}
                <div className="space-y-3">
                    <h3 className="text-[9px] font-black text-black uppercase tracking-widest border-l-3 border-black pl-2">Personnel Profile</h3>
                    <div className="bg-white p-3 rounded-lg space-y-1.5 border border-slate-300">
                        <p className="flex justify-between border-b border-slate-200 pb-1"><span className="text-slate-600 font-bold uppercase text-[9px]">Name:</span> <span className="font-black text-black">{request.employeeName}</span></p>
                        <p className="flex justify-between border-b border-slate-200 pb-1"><span className="text-slate-600 font-bold uppercase text-[9px]">Designation:</span> <span className="font-black text-black">{request.designation}</span></p>
                        <p className="flex justify-between"><span className="text-slate-600 font-bold uppercase text-[9px]">Emp ID:</span> <span className="font-mono font-bold text-black">{request.userId}</span></p>
                    </div>
                </div>

                {/* Duration Info */}
                <div className="space-y-3">
                    <h3 className="text-[9px] font-black text-black uppercase tracking-widest border-l-3 border-black pl-2">Schedule & Timeline</h3>
                    <div className="bg-white p-3 rounded-lg border border-slate-300 space-y-1.5">
                        <p className="flex justify-between border-b border-slate-200 pb-1"><span className="text-slate-600 font-bold uppercase text-[9px]">Duration:</span> <span className="font-black text-black">{formatDate(request.startDate)} to {formatDate(request.endDate)}</span></p>
                        <p className="flex justify-between border-b border-slate-200 pb-1"><span className="text-slate-600 font-bold uppercase text-[9px]">Total Days:</span> <span className="font-black text-black">{request.wfhDays} Business Days</span></p>
                        <p className="flex justify-between pt-0.5"><span className="text-slate-600 font-bold uppercase text-[9px]">Requested:</span> <span className="font-bold text-black">{formatDate(request.createdAt)} {formatTime(request.createdAt)}</span></p>
                    </div>
                </div>
            </div>

            {/* Justification & Impact */}
            <div className="space-y-3 mb-4">
                <h3 className="text-[9px] font-black text-black uppercase tracking-widest border-l-3 border-black pl-2">Strategic Justification</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-slate-300">
                        <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Reason for Request</p>
                        <p className="font-bold text-black leading-tight">{request.realReason}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-slate-300">
                        <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Impact of Rejection</p>
                        <p className="font-bold text-black leading-tight italic">"{request.impactIfRejected}"</p>
                    </div>
                </div>
            </div>

            {/* Work Plan */}
            <div className="space-y-3 mb-4">
                <h3 className="text-[9px] font-black text-black uppercase tracking-widest border-l-3 border-black pl-2">Work Execution Plan</h3>
                <div className="bg-white text-black p-4 rounded-lg space-y-3 border border-slate-300">
                    <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-3">
                        <div>
                            <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Primary Project</p>
                            <p className="text-xs font-black text-black">{request.primaryProject || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Critical Focus</p>
                            <p className="text-xs font-bold text-black">{request.criticalReason || 'N/A'}</p>
                        </div>
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Target Deliverables</p>
                        <p className="text-[9px] font-medium text-black leading-tight">{request.deliverables}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                        <div className="bg-slate-50 p-2 rounded border border-slate-200">
                            <p className="text-[7px] font-black text-slate-500 uppercase">Hours</p>
                            <p className="text-[9px] font-bold text-black">{request.workingHours}</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-200">
                            <p className="text-[7px] font-black text-slate-500 uppercase">Comm. Plan</p>
                            <p className="text-[9px] font-bold text-black">{request.communicationPlan}</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-200">
                            <p className="text-[7px] font-black text-slate-500 uppercase">Tracking</p>
                            <p className="text-[9px] font-bold text-black">{request.trackingMethod}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Compliance Matrix */}
            <div className="space-y-3 mb-6">
                <h3 className="text-[9px] font-black text-black uppercase tracking-widest border-l-3 border-black pl-2">Infrastructure Compliance Matrix</h3>
                <div className="grid grid-cols-4 gap-2">
                    {complianceFields.map((field, i) => (
                        <div key={i} className={`p-2 rounded border flex flex-col items-center text-center bg-white border-slate-300`}>
                            <span className="text-[7px] font-black text-slate-500 uppercase mb-1">{field.label}</span>
                            <span className={`text-[8px] font-black ${field.value ? 'text-black' : 'text-slate-400'}`}>
                                {field.value ? '✓ VERIFIED' : '✕ INCOMPLETE'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-6 mt-auto pt-4 border-t border-slate-300">
                <SignatureBlock
                    label="Business Head Approval"
                    status={request.bhStatus}
                    text={request.bhStatus === 'APPROVED' ? "DIGITALLY AUTHORIZED" : "PENDING"}
                />
                <SignatureBlock
                    label="HR Dept Verification"
                    status={request.hrStatus}
                    text={request.hrStatus === 'APPROVED' ? "VERIFIED & SIGNED" : "PENDING"}
                />
                <SignatureBlock
                    label="Admin Final Oversight"
                    status={request.adminStatus}
                    text={request.adminStatus === 'APPROVED' ? "FINAL APPROVAL" : "PENDING"}
                />
            </div>

            <div className="mt-8 text-center">
                <p className="text-[7px] font-bold text-slate-500 uppercase tracking-[0.3em]">Institutional Compliance Ledger • Case Integrity Secured • PeopleDesk Corporate Security</p>
            </div>
        </div>
    );
});

const SignatureBlock = ({ label, status, text }) => (
    <div className="text-center">
        <p className="text-[8px] font-black text-slate-500 uppercase mb-2">{label}</p>
        <div className={`h-12 flex items-center justify-center font-cursive text-base italic border-b border-slate-300 mb-1 ${status === 'APPROVED' ? 'text-black font-bold' : 'text-slate-400'}`}>
            {status === 'APPROVED' ? text : '---'}
        </div>
        <p className="text-[7px] font-bold text-slate-400 tracking-widest uppercase">{status === 'APPROVED' ? 'Status: Approved' : 'Status: Pending'}</p>
    </div>
);

