import React, { forwardRef } from 'react';

const ExpenseReportTemplate = forwardRef(({ data, summary, filters }, ref) => {
    const today = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });

    // Apply UI Filters to the full data passed
    const filteredData = data.filter(item => {
        const matchesSearch = !filters.search || 
            item.user?.name.toLowerCase().includes(filters.search.toLowerCase()) ||
            item.purpose.toLowerCase().includes(filters.search.toLowerCase()) ||
            item.type.toLowerCase().includes(filters.search.toLowerCase()) ||
            item.amount.toString().includes(filters.search);
            
        const matchesStatus = filters.status === 'ALL' ? true : 
                              filters.status === 'UNPAID' ? (['PENDING', 'APPROVED'].includes(item.status)) :
                              filters.status === 'PAID_SETTLED' ? (['PAID', 'WAITING', 'COMPLETED'].includes(item.status)) :
                              item.status === filters.status;

        const itemDate = new Date(item.updatedAt);
        const matchesStartDate = !filters.startDate || itemDate >= new Date(filters.startDate);
        const matchesEndDate = !filters.endDate || itemDate <= new Date(filters.endDate + 'T23:59:59');

        return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate;
    });

    const paidData = filteredData.filter(item => ['PAID', 'WAITING', 'COMPLETED'].includes(item.status));
    const activeData = filteredData.filter(item => !['PAID', 'WAITING', 'COMPLETED'].includes(item.status));

    const renderTable = (items, title) => {
        if (items.length === 0) return null;
        return (
            <div className="mb-12">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <div className="h-2 w-2 bg-slate-900 rounded-full" /> {title}
                </h3>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                                <th className="px-4 py-4 border-r border-slate-700">Date</th>
                                <th className="px-4 py-4 border-r border-slate-700">Employee</th>
                                <th className="px-4 py-4 border-r border-slate-700">Category / Purpose</th>
                                <th className="px-4 py-4 border-r border-slate-700">Status</th>
                                <th className="px-4 py-4 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 border-b border-slate-200">
                            {items.map((item, index) => (
                                <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                                    <td className="px-4 py-3 text-[11px] font-bold text-slate-500 whitespace-nowrap">
                                        {new Date(item.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-xs font-black text-slate-800">{item.user?.name}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">{item.user?.designation}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[8px] font-black px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded uppercase">
                                                {item.type.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-600 font-medium leading-tight line-clamp-2">{item.purpose}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${['PAID', 'WAITING', 'COMPLETED'].includes(item.status) ? 'text-emerald-600' : 'text-slate-500'}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <p className="text-xs font-black text-slate-900">₹{item.amount.toLocaleString()}</p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div ref={ref} className="p-12 bg-white text-slate-800 font-sans print:p-8">
            {/* Header */}
            <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8 mb-8">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Financial Statement</h1>
                    <p className="text-slate-500 font-bold tracking-widest text-xs mt-1 uppercase">PeopleDesk Expense Audit Hub</p>
                </div>
                <div className="text-right">
                    <p className="font-black text-slate-900">Cookscape Interiors</p>
                    <p className="text-xs text-slate-500 font-bold">Generated on: {today}</p>
                </div>
            </div>

            {/* Filter Summary */}
            <div className="grid grid-cols-3 gap-6 mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date Range</p>
                    <p className="text-sm font-bold text-slate-700">
                        {filters.startDate || 'Beginning'} — {filters.endDate || 'Present'}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Scope</p>
                    <p className="text-sm font-bold text-slate-700 uppercase tracking-tight">{filters.status === 'ALL' ? 'FULL AUDIT' : filters.status}</p>
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Record Count</p>
                    <p className="text-sm font-bold text-slate-700">{filteredData.length} Total Vouchers</p>
                </div>
            </div>

            {/* Financial Summary Cards (Print Optimized) */}
            <div className="grid grid-cols-5 gap-4 mb-10">
                <div className="border border-slate-200 p-4 rounded-xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Report Total</p>
                    <p className="text-xl font-black text-slate-900">₹{filteredData.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}</p>
                </div>
                <div className="border border-slate-200 p-4 rounded-xl bg-emerald-50/30 border-emerald-100">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Paid Total</p>
                    <p className="text-xl font-black text-emerald-700">₹{paidData.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}</p>
                </div>
                <div className="border border-slate-200 p-4 rounded-xl bg-amber-50/30 border-amber-100">
                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Pipeline</p>
                    <p className="text-xl font-black text-amber-700">₹{activeData.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}</p>
                </div>
                <div className="border border-slate-200 p-4 rounded-xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Cash</p>
                    <p className="text-xl font-black text-slate-900">₹{summary?.currentCash?.toLocaleString() || '0'}</p>
                </div>
            </div>

            {/* Data Tables */}
            {filters.status === 'ALL' ? (
                <>
                    {renderTable(activeData, 'Active / Pending Vouchers (Pipeline)')}
                    {renderTable(paidData, 'Finalized Payments (Settled)')}
                </>
            ) : (
                renderTable(filteredData, `${filters.status} Vouchers`)
            )}

            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-end">
                <div>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Authorized Signature</p>
                    <div className="w-48 h-12 border-b border-slate-200 mt-4"></div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page 1 of 1</p>
                    <p className="text-[9px] text-slate-300 italic mt-1">This is a system generated report and does not require a physical seal.</p>
                </div>
            </div>
        </div>
    );
});

ExpenseReportTemplate.displayName = 'ExpenseReportTemplate';

export default ExpenseReportTemplate;
