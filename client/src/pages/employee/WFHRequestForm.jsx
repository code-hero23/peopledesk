import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send,
    Info,
    CheckCircle2,
    AlertTriangle,
    Home,
    Briefcase,
    ShieldCheck,
    Wifi,
    Clock,
    User,
    Check
} from 'lucide-react';
import { createWfhRequest, getBusinessHeads, reset } from '../../features/employee/employeeSlice';
import { toast } from 'react-toastify';

const WFHRequestForm = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const { isLoading, wfhSubmitted, isError, message, businessHeads } = useSelector((state) => state.employee);

    const [formData, setFormData] = useState({
        employeeName: user?.name || '',
        department: user?.department || '',
        designation: user?.designation || '',
        reportingManager: '',
        wfhDays: 1,
        startDate: '',
        endDate: '',

        // Justification
        realReason: '',
        necessityReason: '',
        impactIfRejected: '',
        proofDetails: '',

        // Work & Project
        primaryProject: '',
        criticalReason: '',
        deliverables: '',
        measurableOutput: '',
        deadline: '',

        // Productivity
        workingHours: '',
        trackingMethod: '',
        communicationPlan: '',
        responseTime: 30,

        // Environment
        environmentSetup: '',
        hasDedicatedWorkspace: false,
        hasStableInternet: false,
        noInterruptions: false,
        hasPowerBackup: false,
        hasSecurityCompliance: false,
        hasErgonomicSeating: false,

        // Risk
        risksManagement: '',
        failurePlan: '',
        officeVisitCommitment: false,
    });

    const [activeSection, setActiveSection] = useState(1);
    const totalSections = 7;

    useEffect(() => {
        dispatch(getBusinessHeads());
    }, [dispatch]);

    useEffect(() => {
        if (isError) {
            toast.error(message);
            dispatch(reset());
        }

        if (wfhSubmitted) {
            toast.success('WFH Request Submitted Successfully');

            // Redirect back to dashboard if it's mandatory
            if (user?.wfhViewEnabled) {
                navigate('/dashboard');
            }

            // Optional: reset form after success
            setFormData({
                ...formData,
                reportingManager: '',
                startDate: '',
                endDate: '',
                realReason: '',
                necessityReason: '',
                impactIfRejected: '',
                primaryProject: '',
                deliverables: '',
                deadline: '',
                workingHours: '',
                communicationPlan: '',
                environmentSetup: '',
                risksManagement: '',
                failurePlan: '',
                officeVisitCommitment: false,
            });

            setActiveSection(1);
            dispatch(reset());
        }

    }, [isError, wfhSubmitted, message, dispatch]);

    const onChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prevState) => ({
            ...prevState,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const onSubmit = (e) => {
        e.preventDefault();

        // Manual Validations because unmounted react components bypass HTML5 required validation
        const requiredFields = [
            'reportingManager', 'startDate', 'endDate',
            'wfhDays', 'realReason', 'necessityReason', 'impactIfRejected',
            'primaryProject', 'deliverables', 'deadline',
            'workingHours', 'communicationPlan', 'responseTime',
            'environmentSetup', 'risksManagement', 'failurePlan'
        ];

        const firstMissing = requiredFields.find(field => !formData[field]);
        if (firstMissing) {
            toast.error(`Please fill out the missing required field: ${firstMissing}`);
            return;
        }

        // Final Validations
        if (!formData.officeVisitCommitment) {
            toast.error('You must commit to attend urgent office visits.');
            return;
        }

        dispatch(createWfhRequest(formData));
    };

    const nextSection = () => setActiveSection(prev => Math.min(prev + 1, totalSections));
    const prevSection = () => setActiveSection(prev => Math.max(prev - 1, 1));

    const SectionHeader = ({ icon: Icon, title, sectionNumber }) => (
        <div className={`flex items-center gap-3 p-4 border-b ${activeSection === sectionNumber ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}>
            <div className={`p-2 rounded-lg ${activeSection === sectionNumber ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                <Icon size={20} />
            </div>
            <h3 className="font-bold">{title}</h3>
            {activeSection > sectionNumber && <CheckCircle2 size={18} className="ml-auto text-green-500" />}
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white">
                    <h1 className="text-3xl font-extrabold text-center">Work From Home Approval Request</h1>
                    <p className="text-blue-100 text-center mt-2">All fields are mandatory. Incomplete justifications will be rejected.</p>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-gray-100 w-full">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(activeSection / totalSections) * 100}%` }}
                        className="h-full bg-blue-600"
                    />
                </div>

                {user?.wfhViewEnabled && (
                    <div className="bg-amber-50 border-b border-amber-100 p-4 flex items-center gap-3">
                        <AlertTriangle className="text-amber-600" size={20} />
                        <p className="text-amber-800 text-sm font-bold">Mandatory: Please complete this WFH application to proceed to your dashboard.</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 min-h-[600px]">
                    {/* Sidebar Navigation */}
                    <div className="md:col-span-1 bg-gray-50 border-r border-gray-100">
                        <SectionHeader icon={User} title="Personnel" sectionNumber={1} />
                        <SectionHeader icon={Info} title="Justification" sectionNumber={2} />
                        <SectionHeader icon={Briefcase} title="Work Plan" sectionNumber={3} />
                        <SectionHeader icon={Clock} title="Productivity" sectionNumber={4} />
                        <SectionHeader icon={Wifi} title="Environment" sectionNumber={5} />
                        <SectionHeader icon={AlertTriangle} title="Risks" sectionNumber={6} />
                        <SectionHeader icon={ShieldCheck} title="Declaration" sectionNumber={7} />
                    </div>

                    {/* Form Content */}
                    <div className="md:col-span-3 p-8">
                        <form onSubmit={onSubmit} className="space-y-6">
                            <AnimatePresence mode="wait">
                                {activeSection === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="text-sm font-semibold text-gray-700">Employee Name</label>
                                                <input readOnly value={formData.employeeName} className="w-full p-3 bg-gray-50 border rounded-lg mt-1 outline-none" />
                                            </div>
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="text-sm font-semibold text-gray-700">Designation</label>
                                                <input readOnly value={formData.designation} className="w-full p-3 bg-gray-50 border rounded-lg mt-1 outline-none" />
                                            </div>
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="text-sm font-semibold text-gray-700">Reporting Manager *</label>
                                                <select
                                                    name="reportingManager"
                                                    required
                                                    value={formData.reportingManager}
                                                    onChange={onChange}
                                                    className="w-full p-3 border rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 bg-white"
                                                >
                                                    <option value="">Select Manager</option>
                                                    {businessHeads?.map(bh => (
                                                        <option key={bh.id} value={bh.name}>{bh.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="text-sm font-semibold text-gray-700">WFH Days *</label>
                                                <input type="number" name="wfhDays" min="1" required value={formData.wfhDays} onChange={onChange} className="w-full p-3 border rounded-lg mt-1 focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="text-sm font-semibold text-gray-700">Start Date *</label>
                                                <input type="date" name="startDate" required value={formData.startDate} onChange={onChange} className="w-full p-3 border rounded-lg mt-1 focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                            <div className="col-span-2 sm:col-span-1">
                                                <label className="text-sm font-semibold text-gray-700">End Date *</label>
                                                <input type="date" name="endDate" required value={formData.endDate} onChange={onChange} className="w-full p-3 border rounded-lg mt-1 focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeSection === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        <div>
                                            <label className="text-sm font-semibold text-gray-700">Explain the REAL reason you cannot work from office *</label>
                                            <textarea name="realReason" minLength={50} required value={formData.realReason} onChange={onChange} className="w-full p-3 border rounded-lg mt-1 h-24 focus:ring-2 focus:ring-blue-500" placeholder="Minimum 50 characters..." />
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-gray-700">Why is WFH absolutely necessary instead of leave? *</label>
                                            <textarea name="necessityReason" minLength={50} required value={formData.necessityReason} onChange={onChange} className="w-full p-3 border rounded-lg mt-1 h-24 focus:ring-2 focus:ring-blue-500" placeholder="Minimum 50 characters..." />
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-gray-700">Business impact if REJECTED? *</label>
                                            <textarea name="impactIfRejected" minLength={50} required value={formData.impactIfRejected} onChange={onChange} className="w-full p-3 border rounded-lg mt-1 h-20 focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                    </motion.div>
                                )}

                                {activeSection === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        <div>
                                            <label className="text-sm font-semibold text-gray-700">Primary project you will handle? *</label>
                                            <input name="primaryProject" required value={formData.primaryProject} onChange={onChange} className="w-full p-3 border rounded-lg mt-1 focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-gray-700">Daily Measurable Deliverables *</label>
                                            <textarea name="deliverables" minLength={50} required value={formData.deliverables} onChange={onChange} className="w-full p-3 border rounded-lg mt-1 h-24 focus:ring-2 focus:ring-blue-500" placeholder="List exact items you will finish..." />
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-gray-700">Deadline Commitment *</label>
                                            <input name="deadline" required value={formData.deadline} onChange={onChange} className="w-full p-3 border rounded-lg mt-1 focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                    </motion.div>
                                )}

                                {activeSection === 4 && (
                                    <motion.div
                                        key="step4"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        <div>
                                            <label className="text-sm font-semibold text-gray-700">Exact working hours you will follow? *</label>
                                            <input name="workingHours" required value={formData.workingHours} onChange={onChange} className="w-full p-3 border rounded-lg mt-1 focus:ring-2 focus:ring-blue-500" placeholder="e.g. 9:30 AM to 6:30 PM" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-gray-700">Communication Plan *</label>
                                            <textarea name="communicationPlan" minLength={50} required value={formData.communicationPlan} onChange={onChange} className="w-full p-3 border rounded-lg mt-1 h-24 focus:ring-2 focus:ring-blue-500" placeholder="Calls, reports, Zoom meetings..." />
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-gray-700">Guaranteed Response Time (Minutes) *</label>
                                            <input type="number" name="responseTime" required value={formData.responseTime} onChange={onChange} className="w-full p-3 border rounded-lg mt-1 focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                    </motion.div>
                                )}

                                {activeSection === 5 && (
                                    <motion.div
                                        key="step5"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {[
                                                { id: 'hasDedicatedWorkspace', label: 'Dedicated Workspace' },
                                                { id: 'hasStableInternet', label: 'High Speed Internet' },
                                                { id: 'noInterruptions', label: 'No Interruptions' },
                                                { id: 'hasPowerBackup', label: 'Power Backup' },
                                                { id: 'hasSecurityCompliance', label: 'Data Security' },
                                                { id: 'hasErgonomicSeating', label: 'Ergonomic Seating' },
                                            ].map(item => (
                                                <label key={item.id} className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${formData[item.id] ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-gray-50'}`}>
                                                    <input
                                                        type="checkbox"
                                                        name={item.id}
                                                        checked={formData[item.id]}
                                                        onChange={onChange}
                                                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm font-medium">{item.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <div className="mt-4">
                                            <label className="text-sm font-semibold text-gray-700">Describe your work setup in detail *</label>
                                            <textarea name="environmentSetup" minLength={50} required value={formData.environmentSetup} onChange={onChange} className="w-full p-3 border rounded-lg mt-1 h-24 focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                    </motion.div>
                                )}

                                {activeSection === 6 && (
                                    <motion.div
                                        key="step6"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        <div>
                                            <label className="text-sm font-semibold text-gray-700">Potential risks and management? *</label>
                                            <textarea name="risksManagement" minLength={50} required value={formData.risksManagement} onChange={onChange} className="w-full p-3 border rounded-lg mt-1 h-24 focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-gray-700">Backup plan if internet fails? *</label>
                                            <textarea name="failurePlan" minLength={50} required value={formData.failurePlan} onChange={onChange} className="w-full p-3 border rounded-lg mt-1 h-24 focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                        <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${formData.officeVisitCommitment ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-200'}`}>
                                            <input
                                                type="checkbox"
                                                name="officeVisitCommitment"
                                                checked={formData.officeVisitCommitment}
                                                onChange={onChange}
                                                required
                                                className="w-5 h-5 rounded border-gray-300 text-green-600 outline-none"
                                            />
                                            <span className="text-sm font-bold">I commit to attend office immediately if required by management. *</span>
                                        </label>
                                    </motion.div>
                                )}

                                {activeSection === 7 && (
                                    <motion.div
                                        key="step7"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                                            <h4 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                                                <ShieldCheck size={20} /> Mandatory Declaration
                                            </h4>
                                            <ul className="space-y-3">
                                                {[
                                                    'All information provided is true and accurate',
                                                    'I understand approval is not guaranteed',
                                                    'My performance will be strictly monitored',
                                                    'I accept full accountability for productivity',
                                                    'I am available during official work hours'
                                                ].map((text, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-blue-700">
                                                        <Check size={16} className="mt-0.5 flex-shrink-0" />
                                                        {text}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 flex gap-3 text-sm text-yellow-800">
                                            <AlertTriangle className="flex-shrink-0" size={20} />
                                            <p>This request will be routed through **HR**, **Business Head**, and <br></br>**raakesh natrajan** for approval. Submission does not guarantee WFH.</p>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isLoading ? 'Submitting...' : <><Send size={20} /> Submit WFH Request</>}
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Navigation Buttons */}
                            <div className="flex justify-between items-center pt-8 border-t">
                                {!user?.wfhViewEnabled && (
                                    <button
                                        type="button"
                                        onClick={prevSection}
                                        disabled={activeSection === 1}
                                        className="px-6 py-2 text-gray-600 font-semibold hover:bg-gray-100 rounded-lg disabled:opacity-30"
                                    >
                                        Previous
                                    </button>
                                )}
                                {user?.wfhViewEnabled && (
                                    <button
                                        type="button"
                                        onClick={prevSection}
                                        disabled={activeSection === 1}
                                        className={`px-6 py-2 text-gray-600 font-semibold hover:bg-gray-100 rounded-lg disabled:opacity-30 ${activeSection === 1 ? 'invisible' : ''}`}
                                    >
                                        Previous
                                    </button>
                                )}
                                {activeSection < totalSections && (
                                    <button
                                        type="button"
                                        onClick={nextSection}
                                        className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-md ml-auto"
                                    >
                                        Next Component
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default WFHRequestForm;
