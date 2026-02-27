import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Save, AlertCircle, Info, CheckCircle2, DollarSign, Clock } from 'lucide-react';

const SalarySettings = () => {
    const { user } = useSelector((state) => state.auth);
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const token = user.token;
            const config = {
                headers: { Authorization: `Bearer ${token}` },
            };
            const response = await axios.get(`${baseUrl}/settings`, config);
            setSettings(response.data);
        } catch (err) {
            setError('Failed to fetch settings');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const updateSetting = async (key, value) => {
        try {
            setSaving(true);
            setError('');
            setMessage('');
            const token = user.token;
            const config = {
                headers: { Authorization: `Bearer ${token}` },
            };
            await axios.post(`${baseUrl}/settings`, { key, value }, config);
            setSettings(prev => ({ ...prev, [key]: String(value) }));
            setMessage('Setting updated successfully');
        } catch (err) {
            setError('Failed to update setting');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const isGlobalShortageEnabled = settings.isGlobalShortageDeductionEnabled === 'false' ? false : true;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <DollarSign className="text-blue-600" size={28} />
                    Salary Settings
                </h1>
                <p className="text-slate-500 mt-1">Manage global payroll rules and system-wide salary behaviors.</p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
                    <AlertCircle size={18} />
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}

            {message && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
                    <CheckCircle2 size={18} />
                    <span className="text-sm font-medium">{message}</span>
                </div>
            )}

            <div className="grid gap-6">
                {/* Global Shortage Deduction Toggle */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                                <Clock size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Global Time Shortage Deduction</h3>
                                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                                    When disabled, <strong>all employees</strong> will have 0 shortage deduction, regardless of their individual profile settings. This is a master switch for the entire system.
                                </p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isGlobalShortageEnabled}
                                onChange={(e) => updateSetting('isGlobalShortageDeductionEnabled', e.target.checked)}
                                disabled={saving}
                            />
                            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600 shadow-sm"></div>
                        </label>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
                        <Info size={14} />
                        <span>Changes take effect immediately on all salary dashboard calculations.</span>
                    </div>
                </div>

                {/* Future Placeholder */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-300 opacity-60">
                    <p className="text-center text-sm text-slate-500 italic">
                        More global salary controls will appear here as they are implemented.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SalarySettings;
