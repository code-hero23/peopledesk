import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createProject } from '../features/projects/projectSlice';

const ProjectCreationForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { isLoading } = useSelector((state) => state.projects);

    const [formData, setFormData] = useState({
        name: '', // Required field
        number: '',
        mailId: '',
        location: '',
        freezingAmount: '',
        variant: '',
        projectValue: '',
        woodwork: '',
        addOns: '',
        cpCode: '',
        source: '',
        fa: '',
        referalBonus: '',
        siteStatus: '',
        specialNote: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };



    const handleSubmit = (e) => {
        e.preventDefault();

        // Basic validation
        if (!formData.name) {
            alert('Please enter a Client Name (Project Name)');
            return;
        }

        dispatch(createProject(formData))
            .unwrap()
            .then(() => {
                if (onSuccess) onSuccess();
            })
            .catch((err) => {
                alert(`Error: ${err}`);
            });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 text-sm text-slate-700 max-h-[80vh] overflow-y-auto pr-2">

            {/* Project Name / Client Name is mandatory */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <InputField label="Name (Client/Project)" name="name" value={formData.name} onChange={handleChange} required />
            </div>

            {/* Basic Info Section - 2 Cols */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                    <InputField label="Number" name="number" value={formData.number} onChange={handleChange} />
                    <InputField label="Mail ID" name="mailId" value={formData.mailId} onChange={handleChange} />
                    <InputField label="Project / Location" name="location" value={formData.location} onChange={handleChange} />
                    <InputField label="Freezing Amount" name="freezingAmount" value={formData.freezingAmount} onChange={handleChange} />
                    <InputField label="Variant" name="variant" value={formData.variant} onChange={handleChange} />
                    <InputField label="Project Value" name="projectValue" value={formData.projectValue} onChange={handleChange} />
                    <InputField label="Woodwork" name="woodwork" value={formData.woodwork} onChange={handleChange} />
                </div>
                <div className="space-y-4">
                    <InputField label="Add Ons" name="addOns" value={formData.addOns} onChange={handleChange} />
                    <InputField label="CP Code" name="cpCode" value={formData.cpCode} onChange={handleChange} />
                    <InputField label="Source" name="source" value={formData.source} onChange={handleChange} />
                    <InputField label="FA" name="fa" value={formData.fa} onChange={handleChange} />
                    <InputField label="Referral Bonus" name="referalBonus" value={formData.referalBonus} onChange={handleChange} />
                    <InputField label="Site Status" name="siteStatus" value={formData.siteStatus} onChange={handleChange} />
                    <InputField label="Special Note" name="specialNote" value={formData.specialNote} onChange={handleChange} />
                </div>
            </div>



            <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={onSuccess} className="flex-1 py-3 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors">
                    Cancel
                </button>
                <button type="submit" disabled={isLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg transition-transform active:scale-95">
                    {isLoading ? 'Creating Project...' : 'Create Project'}
                </button>
            </div>
        </form>
    );
};

// Helper Components
const InputField = ({ label, name, value, onChange, required }) => (
    <div className="flex items-center">
        <label className="w-1/3 text-xs font-bold text-slate-500 uppercase">{label} {required && <span className="text-red-500">*</span>}</label>
        <input type="text" name={name} value={value} onChange={onChange} required={required} className="w-2/3 px-2 py-1.5 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
    </div>
);



export default ProjectCreationForm;
