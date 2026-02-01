import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog } from '../../features/employee/employeeSlice';
import SuccessModal from '../SuccessModal';

const CustomerRelationshipWorkLogForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { isLoading } = useSelector((state) => state.employee);
    const [showSuccess, setShowSuccess] = useState(false);

    const [formData, setFormData] = useState({
        fmrmClients: '',
        dailySheets: '',
        delayClients: '',
        refundClients: '',
        aeReports: '',
        fourC: '',
        fmSheet: '',
        factorySheet: '',
        collectionReport: '',
        loadedReports: '',
        remarks: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const onSubmit = (e) => {
        e.preventDefault();

        // Map to customFields for backend storage
        const payload = {
            logStatus: 'CLOSED', // Single Daily Report
            process: `CR Report: ${formData.fmrmClients} | Collection: ${formData.collectionReport}`, // Summary for generic view
            customFields: {
                "FMRM/Clients": formData.fmrmClients,
                "Daily Sheets": formData.dailySheets,
                "Delay Clients": formData.delayClients,
                "Refund Clients": formData.refundClients,
                "AE Reports": formData.aeReports,
                "4C": formData.fourC,
                "FM Sheet": formData.fmSheet,
                "Factory Sheet": formData.factorySheet,
                "Collection Report": formData.collectionReport,
                "Loaded Reports": formData.loadedReports
            },
            remarks: formData.remarks
        };

        dispatch(createWorkLog(payload)).then((res) => {
            if (!res.error) {
                setFormData({
                    fmrmClients: '', dailySheets: '', delayClients: '', refundClients: '',
                    aeReports: '', fourC: '', fmSheet: '', factorySheet: '',
                    collectionReport: '', loadedReports: '', remarks: ''
                });
                setShowSuccess(true);
            }
        });
    };

    const InputField = ({ label, name, type = "text", placeholder = "" }) => (
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>
            <input
                type={type}
                name={name}
                value={formData[name]}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder={placeholder}
            />
        </div>
    );

    return (
        <form onSubmit={onSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto px-1">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                <h4 className="font-bold text-blue-800 text-sm">Customer Relationship Daily Report</h4>
                <p className="text-xs text-blue-600">Please fill in all daily tracking metrics.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="FMRM / Clients" name="fmrmClients" />
                <InputField label="Daily Sheets" name="dailySheets" />
                <InputField label="4C" name="fourC" />
                <InputField label="FM Sheet" name="fmSheet" />
                <InputField label="Factory Sheet" name="factorySheet" />
                <InputField label="AE Reports" name="aeReports" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <InputField label="Collection Report" name="collectionReport" placeholder="Amount / Status" />
                <InputField label="Loaded Reports" name="loadedReports" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-red-50 p-3 rounded-lg border border-red-100">
                <InputField label="Delay Clients" name="delayClients" placeholder="Count / Details" />
                <InputField label="Refund Clients" name="refundClients" placeholder="Count / Details" />
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Remarks / Notes</label>
                <textarea
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleChange}
                    rows="2"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Any additional updates..."
                ></textarea>
            </div>

            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onSuccess} className="flex-1 py-3 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors">
                    Cancel
                </button>
                <button type="submit" disabled={isLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg transition-transform active:scale-95">
                    {isLoading ? 'Submitting...' : 'Submit Report'}
                </button>
            </div>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => {
                    setShowSuccess(false);
                    if (onSuccess) onSuccess();
                }}
                message="Report Submitted"
                subMessage="Customer Relationship metrics recorded."
            />
        </form>
    );
};

export default CustomerRelationshipWorkLogForm;
