const StatCard = ({ title, value, icon, color }) => {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-700',
        green: 'bg-green-50 text-green-700',
        purple: 'bg-purple-50 text-purple-700',
        orange: 'bg-orange-50 text-orange-700',
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex items-center gap-4 transition-transform hover:-translate-y-1 duration-200">
            <div className={`p-4 rounded-lg ${colorClasses[color] || 'bg-gray-100'}`}>
                {/* Simple SVG Icon Placeholder */}
                <div className="w-6 h-6 font-bold text-center flex items-center justify-center">
                    {icon}
                </div>
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{title}</p>
                <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
            </div>
        </div>
    );
};

export default StatCard;
