import React, { forwardRef } from 'react';

const colors = {
    slate900: '#0f172a',
    slate800: '#1e293b',
    slate500: '#64748b',
    slate400: '#94a3b8',
    slate300: '#cbd5e1',
    slate200: '#e2e8f0',
    slate100: '#f1f5f9',
    slate50: '#f8fafc',
    emerald600: '#059669',
    emerald700: '#047857',
    amber600: '#d97706',
    amber700: '#b45309',
    rose600: '#e11d48',
    rose700: '#be123c',
    blue600: '#2563eb'
};

const ExpenseReportTemplate = forwardRef(({ data, summary, filters }, ref) => {
    const today = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });

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
                <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2" style={{ color: colors.slate400 }}>
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.slate900 }} /> {title}
                </h3>
                <div className="overflow-hidden rounded-xl border" style={{ borderColor: colors.slate200 }}>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-white text-[9px] font-black uppercase tracking-widest" style={{ backgroundColor: colors.slate900 }}>
                                <th className="px-4 py-4 border-r" style={{ borderColor: colors.slate700 || '#334155', width: '12%' }}>Date</th>
                                <th className="px-4 py-4 border-r" style={{ borderColor: colors.slate700 || '#334155', width: '23%' }}>Employee</th>
                                <th className="px-4 py-4 border-r" style={{ borderColor: colors.slate700 || '#334155', width: '40%' }}>Category / Purpose</th>
                                <th className="px-4 py-4 border-r" style={{ borderColor: colors.slate700 || '#334155', width: '10%' }}>Status</th>
                                <th className="px-4 py-4 text-right" style={{ width: '15%' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y border-b" style={{ borderColor: colors.slate200, divideColor: colors.slate100 }}>
                            {items.map((item, index) => (
                                <tr key={item.id} style={{ backgroundColor: index % 2 === 0 ? 'white' : colors.slate50 }}>
                                    <td className="px-4 py-3 text-[11px] font-bold whitespace-nowrap" style={{ color: colors.slate500 }}>
                                        {new Date(item.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-xs font-black" style={{ color: colors.slate800 }}>{item.user?.name}</p>
                                        <p className="text-[9px] font-bold uppercase" style={{ color: colors.slate400 }}>{item.user?.designation}</p>
                                    </td>
                                    <td className="px-4 py-3" style={{ width: '40%' }}>
                                        <div style={{ marginBottom: '4px' }}>
                                            <span className="text-[7px] font-black px-1.5 py-0.5 border rounded uppercase" style={{ backgroundColor: colors.slate100, borderColor: colors.slate200, display: 'inline-block' }}>
                                                {item.type.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                        <div className="text-[10px] font-medium leading-normal" style={{ color: '#475569', wordBreak: 'break-word' }}>
                                            {item.purpose}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: ['PAID', 'WAITING', 'COMPLETED'].includes(item.status) ? colors.emerald600 : colors.slate500 }}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <p className="text-xs font-black" style={{ color: colors.slate900 }}>₹{item.amount.toLocaleString()}</p>
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
        <div ref={ref} className="p-12 bg-white font-sans print:p-8" style={{ color: colors.slate800 }}>
            {/* Header */}
            <div className="flex justify-between items-start border-b-4 pb-8 mb-8" style={{ borderColor: colors.slate900 }}>
                <div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase" style={{ color: colors.slate900 }}>Financial Statement</h1>
                    <p className="font-bold tracking-widest text-xs mt-1 uppercase" style={{ color: colors.slate500 }}>PeopleDesk Expense Audit Hub</p>
                </div>
                <div className="text-right">
                    <p className="font-black" style={{ color: colors.slate900 }}>Cookscape Interiors</p>
                    <p className="text-xs font-bold" style={{ color: colors.slate500 }}>Generated on: {today}</p>
                </div>
            </div>

            {/* Filter Summary */}
            <div className="grid grid-cols-3 gap-6 mb-8 p-6 rounded-2xl border" style={{ backgroundColor: colors.slate50, borderColor: colors.slate100 }}>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: colors.slate400 }}>Date Range</p>
                    <p className="text-sm font-bold" style={{ color: '#334155' }}>
                        {filters.startDate || 'Beginning'} — {filters.endDate || 'Present'}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: colors.slate400 }}>Scope</p>
                    <p className="text-sm font-bold uppercase tracking-tight" style={{ color: '#334155' }}>{filters.status === 'ALL' ? 'FULL AUDIT' : filters.status}</p>
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: colors.slate400 }}>Record Count</p>
                    <p className="text-sm font-bold" style={{ color: '#334155' }}>{filteredData.length} Total Vouchers</p>
                </div>
            </div>

            {/* Financial Summary Cards (Print Optimized) */}
            <div className="grid grid-cols-5 gap-4 mb-10">
                <div className="border p-4 rounded-xl" style={{ borderColor: colors.slate200 }}>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: colors.slate400 }}>Report Total</p>
                    <p className="text-xl font-black" style={{ color: colors.slate900 }}>₹{filteredData.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}</p>
                </div>
                <div className="border p-4 rounded-xl border-emerald-100" style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', borderColor: '#d1fae5' }}>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: colors.emerald600 }}>Paid Total</p>
                    <p className="text-xl font-black" style={{ color: colors.emerald700 }}>₹{paidData.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}</p>
                </div>
                <div className="border p-4 rounded-xl border-amber-100" style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)', borderColor: '#fef3c7' }}>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: '#d97706' }}>Pipeline</p>
                    <p className="text-xl font-black" style={{ color: '#b45309' }}>₹{activeData.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}</p>
                </div>
                <div className="border p-4 rounded-xl" style={{ borderColor: colors.slate200 }}>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: colors.slate400 }}>Current Cash</p>
                    <p className="text-xl font-black" style={{ color: colors.slate900 }}>₹{summary?.currentCash?.toLocaleString() || '0'}</p>
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
            <div className="mt-12 pt-8 border-t flex justify-between items-end" style={{ borderColor: colors.slate100 }}>
                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: colors.slate300 }}>Authorized Signature</p>
                    <div className="w-48 h-12 border-b mt-4" style={{ borderColor: colors.slate200 }}></div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: colors.slate400 }}>Page 1 of 1</p>
                    <p className="text-[9px] italic mt-1" style={{ color: colors.slate300 }}>This is a system generated report and does not require a physical seal.</p>
                </div>
            </div>
        </div>
    );
});


ExpenseReportTemplate.displayName = 'ExpenseReportTemplate';

export default ExpenseReportTemplate;
