import React, { useState, useMemo } from 'react';
import {
    Search,
    Phone,
    AlertCircle,
    LifeBuoy,
    ShieldCheck,
    HardHat,
    CreditCard,
    Globe,
    Flame,
    Ambulance,
    Activity,
    ExternalLink,
    Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const OSCDirectory = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDept, setSelectedDept] = useState('');

    const contacts = [
        { sno: 1, department: "Back End", category: "Server Issue", description: "Server down / Slow system / Data access issue", person: "Thilagar", mobile: "7305271116", alternate: "" },
        { sno: 2, department: "Back End", category: "WiFi / Internet", description: "No internet / Slow speed / Router issue", person: "Sreemathi", mobile: "9092055679", alternate: "" },
        { sno: 3, department: "Back End", category: "Orbix Projects App", description: "Login issue / Data not loading", person: "Gopi", mobile: "9092705679", alternate: "" },
        { sno: 4, department: "Back End", category: "Printer", description: "Not printing / Ink issue / Network printer error", person: "Thilagar", mobile: "7305271116", alternate: "" },
        { sno: 5, department: "Back End", category: "Biometric Device", description: "Fingerprint not detecting / Machine error", person: "Sreemathi", mobile: "9092055679", alternate: "" },
        { sno: 6, department: "HR", category: "PeopleDesk App", description: "Login issue / Attendance not updating", person: "Gopi", mobile: "9092705679", alternate: "" },
        { sno: 7, department: "HR", category: "Salary", description: "Salary credit issue / Payslip clarification", person: "Gopi", mobile: "9092705679", alternate: "" },
        { sno: 8, department: "HR", category: "Attendance", description: "Attendance correction / Leave balance issue", person: "Gopi", mobile: "9092705679", alternate: "" },
        { sno: 9, department: "HR", category: "Internal Team Issue", description: "Reporting issue / Workplace concern", person: "Gopi", mobile: "9092705679", alternate: "" },
        { sno: 10, department: "HR", category: "Joining / Exit", description: "Offer letter / Relieving letter request", person: "Gopi", mobile: "9092705679", alternate: "" },
        { sno: 11, department: "Admin", category: "EB (Electricity)", description: "Power cut / Voltage fluctuation", person: "Poongoth Subash", mobile: "7373656478", alternate: "" },
        { sno: 12, department: "Admin", category: "AC Issue", description: "AC not cooling / Remote issue", person: "Poongoth Subash", mobile: "7373656478", alternate: "" },
        { sno: 13, department: "Admin", category: "Water Supply", description: "Drinking water issue / Tank problem", person: "Poongoth Subash", mobile: "7373656478", alternate: "" },
        { sno: 14, department: "Admin", category: "Furniture", description: "Broken chair / Table damage", person: "Poongoth Subash", mobile: "7373656478", alternate: "" },
        { sno: 15, department: "Admin", category: "Parking", description: "Parking allocation / Vehicle complaint", person: "Poongoth Subash", mobile: "7373656478", alternate: "" },
        { sno: 16, department: "Admin", category: "Floor Cleaning", description: "Floor not cleaned / Washroom issue", person: "Poongoth Subash", mobile: "7373656478", alternate: "" },
        { sno: 17, department: "Admin", category: "Cafeteria", description: "Food quality / Hygiene complaint", person: "Poongoth Subash", mobile: "7373656478", alternate: "" },
        { sno: 18, department: "Admin", category: "Pest Control", description: "Mosquito / Insect issue", person: "Poongoth Subash", mobile: "7373656478", alternate: "" },
        { sno: 19, department: "Admin", category: "Fire & Safety", description: "Fire extinguisher / Emergency alarm issue", person: "Poongoth Subash", mobile: "7373656478", alternate: "" },
        { sno: 20, department: "Accounts", category: "Vendor Payment", description: "Payment delay / Invoice clarification", person: "Sreemathi", mobile: "9092055679", alternate: "" },
        { sno: 21, department: "Accounts", category: "Reimbursement", description: "Travel claim / Expense claim", person: "Thilagar", mobile: "7305271116", alternate: "" },
        { sno: 22, department: "Accounts", category: "Vendor / Other Transfer", description: "Bank credit issue", person: "Padmavathi", mobile: "7200115679", alternate: "" },
        { sno: 23, department: "Security", category: "Visitor Entry", description: "Visitor pass issue", person: "Ramkumar", mobile: "7418544956", alternate: "" },
        { sno: 24, department: "Security", category: "Gate / Access", description: "Access control issue", person: "Ramkumar", mobile: "7418544956", alternate: "" },
        { sno: 25, department: "External", category: "EB Office", description: "Power supply complaint", person: "Poongoth Subash", mobile: "7373656478", alternate: "" },
        { sno: 26, department: "External", category: "Internet Provider", description: "Internet outage complaint", person: "Thilagar", mobile: "7305271116", alternate: "" },
        { sno: 27, department: "External", category: "Printer Vendor", description: "Printer maintenance", person: "Thilagar", mobile: "7305271116", alternate: "" },
        { sno: 28, department: "External", category: "AC Service Provider", description: "AC maintenance", person: "Poongoth Subash", mobile: "7373656478", alternate: "" },
        { sno: 29, department: "External", category: "Housekeeping Vendor", description: "Cleaning service support", person: "Poongoth Subash", mobile: "7373656478", alternate: "" },
        { sno: 30, department: "External", category: "Pest Control Vendor", description: "Pest treatment service", person: "Poongoth Subash", mobile: "7373656478", alternate: "" }
    ];

    const emergencyContacts = [
        { service: "EB Office MTRS", contact: "044-24363191", icon: Activity },
        { service: "Government Ambulance (Free Service)", contact: "108", icon: Ambulance },
        { service: "Private Emergency Ambulance", contact: "1298", icon: Ambulance },
        { service: "Fire Emergency", contact: "101", icon: Flame },
        { service: "TN Fire & Rescue Control Room", contact: "044-28550920", icon: Flame }
    ];

    const departments = useMemo(() => [...new Set(contacts.map(c => c.department))], []);

    const filteredContacts = contacts.filter(contact => {
        const matchesSearch = Object.values(contact).some(
            val => val.toString().toLowerCase().includes(searchTerm.toLowerCase())
        );
        const matchesDept = !selectedDept || contact.department === selectedDept;
        return matchesSearch && matchesDept;
    });

    const getDeptIcon = (dept) => {
        switch (dept) {
            case 'Back End': return LifeBuoy;
            case 'HR': return ShieldCheck;
            case 'Admin': return HardHat;
            case 'Accounts': return CreditCard;
            case 'Security': return Globe;
            case 'External': return ExternalLink;
            default: return Briefcase;
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-10 pb-32">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500 rounded-2xl shadow-lg ring-4 ring-blue-500/20">
                            <LifeBuoy className="text-white" size={24} />
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter text-white">OSC Directory</h1>
                    </div>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] ml-1">Office Support & Emergency Contacts</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 relative z-10">
                    <div className="relative group w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Find support category or name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-800 pl-12 pr-4 py-3.5 rounded-2xl border border-slate-700 text-white outline-none focus:ring-4 ring-blue-500/20 transition-all font-bold text-xs shadow-inner"
                        />
                    </div>
                </div>
            </header>

            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-3">
                <button
                    onClick={() => setSelectedDept('')}
                    className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${!selectedDept ? 'bg-blue-600 text-white shadow-xl translate-y-[-2px]' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}
                >
                    ALL DEPARTMENTS
                </button>
                {departments.map(dept => (
                    <button
                        key={dept}
                        onClick={() => setSelectedDept(dept)}
                        className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${selectedDept === dept ? 'bg-blue-600 text-white shadow-xl translate-y-[-2px]' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}
                    >
                        {dept}
                    </button>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Directory Table */}
                <div className="lg:col-span-8 bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-3">
                            <Briefcase className="text-blue-500" size={16} /> Contact Registry
                        </h3>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {filteredContacts.length} Resources Found
                        </div>
                    </div>
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Support Issue</th>
                                    <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Primary Contact</th>
                                    <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                <AnimatePresence mode="popLayout">
                                    {filteredContacts.map((contact) => (
                                        <motion.tr
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            key={contact.sno}
                                            className="hover:bg-slate-50/50 transition-colors group"
                                        >
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col gap-1 max-w-xs md:max-w-md">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase whitespace-nowrap">{contact.department}</span>
                                                        <span className="text-sm font-black text-slate-800 line-clamp-1">{contact.category}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 font-medium group-hover:text-slate-600 transition-colors">{contact.description}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-800">{contact.person}</span>
                                                    <span className="text-xs font-bold text-blue-500 tracking-tight">{contact.mobile}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <a
                                                    href={`tel:${contact.mobile}`}
                                                    className="inline-flex items-center justify-center p-3.5 bg-white border border-slate-100 text-emerald-500 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 rounded-2xl transition-all shadow-sm active:scale-90"
                                                >
                                                    <Phone size={18} />
                                                </a>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                        {filteredContacts.length === 0 && (
                            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                                <AlertCircle size={48} className="text-slate-200" />
                                <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">No matching contacts in database</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Emergency & Sidebar Info */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Emergency Contacts */}
                    <div className="bg-rose-50 rounded-[3rem] border border-rose-100 shadow-xl p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                            <Flame size={120} />
                        </div>
                        <h3 className="flex items-center gap-3 text-rose-600 font-black uppercase text-xs tracking-widest mb-6 relative z-10">
                            <Activity size={18} /> Emergency Signals
                        </h3>
                        <div className="space-y-4 relative z-10">
                            {emergencyContacts.map((item, idx) => {
                                const Icon = item.icon;
                                return (
                                    <div key={idx} className="flex items-center justify-between bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-rose-100/50 group/item hover:bg-white transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl group-hover/item:scale-110 transition-transform">
                                                <Icon size={18} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-slate-800 leading-tight pr-4">{item.service}</span>
                                                <span className="text-sm font-black text-rose-600 tracking-tighter">{item.contact}</span>
                                            </div>
                                        </div>
                                        <a href={`tel:${item.contact}`} className="p-2 bg-rose-600 text-white rounded-lg shadow-lg shadow-rose-200 active:scale-90 transition-all">
                                            <Phone size={14} />
                                        </a>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Support Card */}
                    <div className="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
                        <h4 className="font-black uppercase text-[10px] tracking-widest text-slate-400 mb-2">Need More Help?</h4>
                        <p className="text-lg font-black leading-tight mb-6">Contact the main reception if an issue is unlisted.</p>
                        <button className="w-full bg-blue-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40 active:scale-95">
                            Request New Entry
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OSCDirectory;

