import React, { useState, useEffect } from 'react';
import { Smartphone, Download, CheckCircle2, ShieldCheck, X, MapPin, PhoneCall, ExternalLink, Sparkles, AlertCircle } from 'lucide-react';
import axios from 'axios';

const ApkDownloadModal = ({ isOpen, onClose }) => {
    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    useEffect(() => {
        if (!isOpen) return;
        const fetchInfo = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${baseUrl}/downloads/info`);
                setInfo(res.data);
            } catch (err) {
                console.warn('Could not fetch APK metadata:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchInfo();
    }, [isOpen, baseUrl]);

    if (!isOpen) return null;

    const peopledeskUrl = `${baseUrl}/downloads/peopledesk-apk`;
    const aeManagerUrl = `${baseUrl}/downloads/ae-manager-apk`;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
            <div className="relative w-full max-w-2xl rounded-3xl border border-slate-700/80 bg-gradient-to-b from-slate-900 via-[#0b1120] to-slate-950 p-6 md:p-8 shadow-2xl text-slate-100 overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all z-10"
                    title="Close"
                >
                    <X size={18} />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3.5 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <Smartphone size={24} />
                    </div>
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-black uppercase tracking-wider text-blue-400 mb-1">
                            <Sparkles size={11} /> Official Mobile Builds
                        </div>
                        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                            Download Android APKs
                        </h2>
                    </div>
                </div>

                <p className="text-xs text-slate-400 mb-6 font-medium">
                    Choose the designated mobile application build for your work profile. Both APKs are compatible with Android 8.0 and above.
                </p>

                {/* Dual APK Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* 1. PeopleDesk Call Sync APK */}
                    <div className="relative rounded-2xl border border-slate-700/80 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-blue-500/50 transition-all group">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                                    <PhoneCall size={20} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                    General & CRE
                                </span>
                            </div>

                            <div>
                                <h3 className="text-base font-extrabold text-white group-hover:text-blue-400 transition-colors">
                                    PeopleDesk APK
                                </h3>
                                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                                    Official staff app for automated customer call syncing, attendance punch-in, and leave requests.
                                </p>
                            </div>

                            <div className="space-y-1 text-[11px] text-slate-300">
                                <div className="flex items-center gap-1.5 text-slate-400">
                                    <CheckCircle2 size={12} className="text-blue-400" />
                                    <span>Call log background sync (CREs)</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-400">
                                    <CheckCircle2 size={12} className="text-blue-400" />
                                    <span>Package: <code className="text-blue-300 text-[10px]">com.peopledesk.app</code></span>
                                </div>
                                {info?.peopledesk?.sizeMB && (
                                    <div className="text-[10px] text-slate-500 font-mono pt-1">
                                        Build Size: {info.peopledesk.sizeMB}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-white/5">
                            <a
                                href={peopledeskUrl}
                                download="PeopleDesk-latest.apk"
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Download size={15} />
                                Download PeopleDesk APK
                            </a>
                        </div>
                    </div>

                    {/* 2. AE Manager APK */}
                    <div className="relative rounded-2xl border border-emerald-700/50 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-emerald-500/50 transition-all group">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                                    <MapPin size={20} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                    AE & Field
                                </span>
                            </div>

                            <div>
                                <h3 className="text-base font-extrabold text-white group-hover:text-emerald-400 transition-colors">
                                    AE Manager APK
                                </h3>
                                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                                    Exclusive field app for Area Executives with 7 AM – 8 PM IST live GPS travel logging and site visit updates.
                                </p>
                            </div>

                            <div className="space-y-1 text-[11px] text-slate-300">
                                <div className="flex items-center gap-1.5 text-slate-400">
                                    <CheckCircle2 size={12} className="text-emerald-400" />
                                    <span>High-frequency GPS tracking window</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-400">
                                    <CheckCircle2 size={12} className="text-emerald-400" />
                                    <span>Package: <code className="text-emerald-300 text-[10px]">com.peopledesk.aemanager</code></span>
                                </div>
                                {info?.aeManager?.sizeMB && (
                                    <div className="text-[10px] text-slate-500 font-mono pt-1">
                                        Build Size: {info.aeManager.sizeMB}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-white/5">
                            <a
                                href={aeManagerUrl}
                                download="AEManager-latest.apk"
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Download size={15} />
                                Download AE Manager APK
                            </a>
                        </div>
                    </div>
                </div>

                {/* Installation Note */}
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300/90 text-xs">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-400" />
                    <div>
                        <span className="font-bold">Installation Note: </span>
                        When downloading via Chrome/browser on Android, tap <b className="text-white">"Download anyway"</b> and ensure <b className="text-white">"Install unknown apps"</b> is enabled for your browser in Android Settings.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApkDownloadModal;
