import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    AreaChart,
    Area
} from 'recharts';

const ExpenseCharts = ({ spentHistory }) => {
    // 1. Prepare data for Spending Trend (Grouped by Date)
    const trendData = spentHistory
        .filter(v => v.status === 'PAID' || v.status === 'COMPLETED' || v.status === 'WAITING')
        .reduce((acc, v) => {
            const date = new Date(v.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
            acc[date] = (acc[date] || 0) + v.amount;
            return acc;
        }, {});

    const trendChartData = Object.keys(trendData)
        .map(date => ({ date, amount: trendData[date] }))
        .slice(-7); // Last 7 unique dates with spending

    // 2. Prepare data for Category Distribution
    const categoryDataMap = spentHistory.reduce((acc, v) => {
        const type = v.type.replace(/_/g, ' ');
        acc[type] = (acc[type] || 0) + v.amount;
        return acc;
    }, {});

    const pieData = Object.keys(categoryDataMap).map(name => ({
        name,
        value: categoryDataMap[name]
    })).sort((a, b) => b.value - a.value).slice(0, 5); // Top 5 categories

    const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-8">
            {/* Spending Trend Chart */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">Spending Trend</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last 7 Active Days</p>
                    </div>
                </div>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendChartData}>
                            <defs>
                                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="date" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                                tickFormatter={(value) => `₹${value >= 1000 ? value / 1000 + 'k' : value}`}
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '1rem' }}
                                labelStyle={{ fontWeight: 'black', marginBottom: '0.25rem', color: '#1e293b' }}
                                itemStyle={{ fontWeight: 'bold', color: '#2563eb' }}
                                formatter={(value) => [`₹${value.toLocaleString()}`, 'Spent']}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="amount" 
                                stroke="#2563eb" 
                                strokeWidth={4}
                                fillOpacity={1} 
                                fill="url(#colorAmount)" 
                                animationDuration={1500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Category Pie Chart */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">Expense Categories</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top 5 Segments</p>
                    </div>
                </div>
                <div className="h-64 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                animationDuration={1500}
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '1rem' }}
                                formatter={(value) => `₹${value.toLocaleString()}`}
                            />
                            <Legend 
                                verticalAlign="middle" 
                                align="right" 
                                layout="vertical" 
                                iconType="circle"
                                wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default ExpenseCharts;
