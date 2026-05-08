import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { X, Plus, MapPin, Briefcase, User } from 'lucide-react';
import { createProject } from '../../features/projects/projectSlice';
import { toast } from 'react-toastify';

const CreateProjectModal = ({ isOpen, onClose, initialData = {} }) => {
    const dispatch = useDispatch();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: initialData.name || '',
        location: initialData.location || '',
        description: '',
        clientEmail: initialData.email || '',
        clientPhone: ''
    });

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) {
            toast.error("Project name is required");
            return;
        }

        setIsSubmitting(true);
        try {
            await dispatch(createProject(formData)).unwrap();
            toast.success("Project created successfully!");
            onClose();
        } catch (error) {
            toast.error(error || "Failed to create project");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="relative z-10 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20">
                                <Plus size={24} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black tracking-tight">Create New Project</h3>
                                <p className="text-blue-100 text-xs font-bold uppercase tracking-widest">Administrative Project Setup</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        {/* Project Name */}
                        <div className="group">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest group-focus-within:text-blue-500 transition-colors">
                                Project / Client Name
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <Briefcase size={18} />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-transparent group-focus-within:border-blue-100 group-focus-within:bg-white rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-700 outline-none transition-all placeholder:text-slate-300"
                                    placeholder="e.g. John Doe - Residence"
                                />
                            </div>
                        </div>

                        {/* Location */}
                        <div className="group">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest group-focus-within:text-blue-500 transition-colors">
                                Site Location
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <MapPin size={18} />
                                </div>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-transparent group-focus-within:border-blue-100 group-focus-within:bg-white rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-700 outline-none transition-all placeholder:text-slate-300"
                                    placeholder="e.g. HSR Layout, Bangalore"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Client Email */}
                            <div className="group">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest group-focus-within:text-blue-500 transition-colors">
                                    Client Email
                                </label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                        <User size={16} />
                                    </div>
                                    <input
                                        type="email"
                                        value={formData.clientEmail}
                                        onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-transparent group-focus-within:border-blue-100 group-focus-within:bg-white rounded-2xl py-3 pl-11 pr-4 font-bold text-slate-700 outline-none transition-all text-sm placeholder:text-slate-300"
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>

                            {/* Client Phone */}
                            <div className="group">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest group-focus-within:text-blue-500 transition-colors">
                                    Client Phone
                                </label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                        <User size={16} />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.clientPhone}
                                        onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-transparent group-focus-within:border-blue-100 group-focus-within:bg-white rounded-2xl py-3 pl-11 pr-4 font-bold text-slate-700 outline-none transition-all text-sm placeholder:text-slate-300"
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs"
                        >
                            Discard
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-[2] bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl transition-all shadow-xl hover:shadow-slate-200 uppercase tracking-widest text-xs active:scale-95 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Creating...' : 'Initialize Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateProjectModal;
