import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog } from '../../features/employee/employeeSlice';
import { getProjects } from '../../features/projects/projectSlice';

const LAWorkLogForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { isLoading } = useSelector((state) => state.employee);
    const { projects } = useSelector((state) => state.projects); // Correct store key is 'projects'

    useEffect(() => {
        dispatch(getProjects());
    }, [dispatch]);

    const [selectedProject, setSelectedProject] = useState('');

    const [formData, setFormData] = useState({
        la_number: '',
        la_mailId: '',
        la_projectLocation: '',
        la_freezingAmount: '',
        la_variant: '',
        la_projectValue: '',
        la_woodwork: '',
        la_addOns: '',
        la_cpCode: '',
        la_source: '',
        la_fa: '',
        la_referalBonus: '',
        la_siteStatus: '',
        la_specialNote: '',
        // Lists
        la_requirements: [''],
        la_colours: [''],
        // Tables
        la_onlineMeeting: [{ slNo: 1, date: '', discussedOn: '' }],
        la_showroomMeeting: [{ slNo: 1, date: '', discussedOn: '' }],
        la_measurements: [{ aeName: '', date: '', discussedOn: '' }],
        projectId: null,
    });

    const handleProjectSelect = (e) => {
        const projectId = e.target.value;
        setSelectedProject(projectId);

        if (projectId) {
            const project = projects.find(p => p.id === parseInt(projectId));
            if (project) {
                setFormData(prev => ({
                    ...prev,
                    la_number: project.number || '',
                    la_mailId: project.mailId || '',
                    la_projectLocation: project.location || '', // Using location as projectLocation
                    la_freezingAmount: project.freezingAmount || '',
                    la_variant: project.variant || '',
                    la_projectValue: project.projectValue || '',
                    la_woodwork: project.woodwork || '',
                    la_addOns: project.addOns || '',
                    la_cpCode: project.cpCode || '',
                    la_source: project.source || '',
                    la_fa: project.fa || '',
                    la_referalBonus: project.referalBonus || '',
                    la_siteStatus: project.siteStatus || '',
                    la_specialNote: project.specialNote || '',
                    la_requirements: project.requirements ? (typeof project.requirements === 'string' ? JSON.parse(project.requirements) : project.requirements) : [''],
                    la_colours: project.colours ? (typeof project.colours === 'string' ? JSON.parse(project.colours) : project.colours) : [''],
                    la_onlineMeeting: project.onlineMeeting ? (typeof project.onlineMeeting === 'string' ? JSON.parse(project.onlineMeeting) : project.onlineMeeting) : [{ slNo: 1, date: '', discussedOn: '' }],
                    la_showroomMeeting: project.showroomMeeting ? (typeof project.showroomMeeting === 'string' ? JSON.parse(project.showroomMeeting) : project.showroomMeeting) : [{ slNo: 1, date: '', discussedOn: '' }],
                    la_measurements: project.measurements ? (typeof project.measurements === 'string' ? JSON.parse(project.measurements) : project.measurements) : [{ aeName: '', date: '', discussedOn: '' }],
                    projectId: parseInt(projectId)
                }));
            }
        } else {
            // Reset or clear if deselected (optional, keeping current data might be safer or reset to empty)
            setFormData(prev => ({ ...prev, projectId: null }));
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // List Handlers
    const handleListChange = (key, index, value) => {
        const newList = [...formData[key]];
        newList[index] = value;
        setFormData({ ...formData, [key]: newList });
    };

    const addListItem = (key) => {
        setFormData({ ...formData, [key]: [...formData[key], ''] });
    };

    const removeListItem = (key, index) => {
        const newList = [...formData[key]];
        newList.splice(index, 1);
        setFormData({ ...formData, [key]: newList });
    };

    // Table Handlers
    const handleTableChange = (key, index, field, value) => {
        const newTable = [...formData[key]];
        newTable[index] = { ...newTable[index], [field]: value };
        setFormData({ ...formData, [key]: newTable });
    };

    const addTableItem = (key, defaultItem) => {
        setFormData({ ...formData, [key]: [...formData[key], defaultItem] });
    };

    const removeTableItem = (key, index) => {
        const newTable = [...formData[key]];
        newTable.splice(index, 1);
        setFormData({ ...formData, [key]: newTable });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Construct payload. Note: standard fields like date/clientName mapping might be needed if tracking standard stats is still required.
        // For now, we map 'la_projectLocation' to 'site' and 'clientName' can be derived or left empty if not strict.
        const payload = {
            ...formData,
            // Map some fields to standard ones for compatibility if needed
            projectName: formData.la_projectLocation, // Example mapping
            date: new Date().toISOString(),
            // Pass JSON objects directly or stringified depending on backend expectation. 
            // Our controller logic stringifies them if they are objects, but Prisma Json type works best with actual objects.
            // Let's pass objects, controller update handled stringify if needed, but actually Prisma needs objects.
            // Wait, previous step used stringify manually? Prisma Client handles object->dbjson. 
            // My controller update had `JSON.stringify`, so I should pass objects.
        };
        dispatch(createWorkLog(payload));
        if (onSuccess) onSuccess();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 text-sm text-slate-700 max-h-[80vh] overflow-y-auto pr-2">

            {/* Project Selection */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-2">Select Project (Optional)</label>
                <select
                    value={selectedProject}
                    onChange={handleProjectSelect}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="">-- Create New / No Project --</option>
                    {projects && projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.number || 'No Number'})</option>
                    ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Selecting a project will auto-fill available details.</p>
            </div>

            {/* Basic Info Section - 2 Cols */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                    <InputField label="Number" name="la_number" value={formData.la_number} onChange={handleChange} />
                    <InputField label="Mail ID" name="la_mailId" value={formData.la_mailId} onChange={handleChange} />
                    <InputField label="Project / Location" name="la_projectLocation" value={formData.la_projectLocation} onChange={handleChange} />
                    <InputField label="Freezing Amount" name="la_freezingAmount" value={formData.la_freezingAmount} onChange={handleChange} />
                    <InputField label="Variant" name="la_variant" value={formData.la_variant} onChange={handleChange} />
                    <InputField label="Project Value" name="la_projectValue" value={formData.la_projectValue} onChange={handleChange} />
                    <InputField label="Woodwork" name="la_woodwork" value={formData.la_woodwork} onChange={handleChange} />
                </div>
                <div className="space-y-4">
                    <InputField label="Add Ons" name="la_addOns" value={formData.la_addOns} onChange={handleChange} />
                    <InputField label="CP Code" name="la_cpCode" value={formData.la_cpCode} onChange={handleChange} />
                    <InputField label="Source" name="la_source" value={formData.la_source} onChange={handleChange} />
                    <InputField label="FA" name="la_fa" value={formData.la_fa} onChange={handleChange} />
                    <InputField label="Referral Bonus" name="la_referalBonus" value={formData.la_referalBonus} onChange={handleChange} />
                    <InputField label="Site Status" name="la_siteStatus" value={formData.la_siteStatus} onChange={handleChange} />
                    <InputField label="Special Note" name="la_specialNote" value={formData.la_specialNote} onChange={handleChange} />
                </div>
            </div>

            <hr className="border-slate-100" />

            {/* Requirements & Colours (Lists) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ListSection title="Requirements" items={formData.la_requirements}
                    onChange={(i, v) => handleListChange('la_requirements', i, v)}
                    onAdd={() => addListItem('la_requirements')}
                    onRemove={(i) => removeListItem('la_requirements', i)}
                />
                <ListSection title="Colours" items={formData.la_colours}
                    onChange={(i, v) => handleListChange('la_colours', i, v)}
                    onAdd={() => addListItem('la_colours')}
                    onRemove={(i) => removeListItem('la_colours', i)}
                />
            </div>

            <hr className="border-slate-100" />

            {/* Meetings Tables */}
            <div className="space-y-6">
                <TableSection title="Online Meeting"
                    headers={['Sl No', 'Date', 'Discussed On']}
                    rows={formData.la_onlineMeeting}
                    renderRow={(row, idx) => (
                        <>
                            <td><input type="text" className="w-full bg-transparent outline-none py-1" value={row.slNo} onChange={(e) => handleTableChange('la_onlineMeeting', idx, 'slNo', e.target.value)} /></td>
                            <td><input type="date" className="w-full bg-transparent outline-none py-1" value={row.date} onChange={(e) => handleTableChange('la_onlineMeeting', idx, 'date', e.target.value)} /></td>
                            <td><input type="text" className="w-full bg-transparent outline-none py-1" value={row.discussedOn} onChange={(e) => handleTableChange('la_onlineMeeting', idx, 'discussedOn', e.target.value)} /></td>
                        </>
                    )}
                    onAdd={() => addTableItem('la_onlineMeeting', { slNo: formData.la_onlineMeeting.length + 1, date: '', discussedOn: '' })}
                    onRemove={(i) => removeTableItem('la_onlineMeeting', i)}
                />

                <TableSection title="Showroom Meeting"
                    headers={['Sl No', 'Date', 'Discussed On']}
                    rows={formData.la_showroomMeeting}
                    renderRow={(row, idx) => (
                        <>
                            <td><input type="text" className="w-full bg-transparent outline-none py-1" value={row.slNo} onChange={(e) => handleTableChange('la_showroomMeeting', idx, 'slNo', e.target.value)} /></td>
                            <td><input type="date" className="w-full bg-transparent outline-none py-1" value={row.date} onChange={(e) => handleTableChange('la_showroomMeeting', idx, 'date', e.target.value)} /></td>
                            <td><input type="text" className="w-full bg-transparent outline-none py-1" value={row.discussedOn} onChange={(e) => handleTableChange('la_showroomMeeting', idx, 'discussedOn', e.target.value)} /></td>
                        </>
                    )}
                    onAdd={() => addTableItem('la_showroomMeeting', { slNo: formData.la_showroomMeeting.length + 1, date: '', discussedOn: '' })}
                    onRemove={(i) => removeTableItem('la_showroomMeeting', i)}
                />

                <TableSection title="Measurements"
                    headers={['AE Name', 'Date', 'Discussed On']}
                    rows={formData.la_measurements}
                    renderRow={(row, idx) => (
                        <>
                            <td><input type="text" className="w-full bg-transparent outline-none py-1" value={row.aeName} onChange={(e) => handleTableChange('la_measurements', idx, 'aeName', e.target.value)} /></td>
                            <td><input type="date" className="w-full bg-transparent outline-none py-1" value={row.date} onChange={(e) => handleTableChange('la_measurements', idx, 'date', e.target.value)} /></td>
                            <td><input type="text" className="w-full bg-transparent outline-none py-1" value={row.discussedOn} onChange={(e) => handleTableChange('la_measurements', idx, 'discussedOn', e.target.value)} /></td>
                        </>
                    )}
                    onAdd={() => addTableItem('la_measurements', { aeName: '', date: '', discussedOn: '' })}
                    onRemove={(i) => removeTableItem('la_measurements', i)}
                />
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={onSuccess} className="flex-1 py-3 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors">
                    Cancel
                </button>
                <button type="submit" disabled={isLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg transition-transform active:scale-95">
                    {isLoading ? 'Submitting...' : 'Submit log'}
                </button>
            </div>
        </form>
    );
};

// Helper Components
const InputField = ({ label, name, value, onChange }) => (
    <div className="flex items-center">
        <label className="w-1/3 text-xs font-bold text-slate-500 uppercase">{label}</label>
        <input type="text" name={name} value={value} onChange={onChange} className="w-2/3 px-2 py-1.5 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
    </div>
);

const ListSection = ({ title, items, onChange, onAdd, onRemove }) => (
    <div>
        <h4 className="font-bold text-slate-800 mb-2 border-b pb-1">{title}</h4>
        <div className="space-y-2">
            {items.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                    <input type="text" value={item} onChange={(e) => onChange(idx, e.target.value)} className="flex-1 px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
                    {items.length > 1 && (
                        <button type="button" onClick={() => onRemove(idx)} className="text-red-400 hover:text-red-600 font-bold px-1">&times;</button>
                    )}
                </div>
            ))}
            <button type="button" onClick={onAdd} className="text-xs text-blue-600 font-bold hover:underline">+ Add Item</button>
        </div>
    </div>
);

const TableSection = ({ title, headers, rows, renderRow, onAdd, onRemove }) => (
    <div>
        <h4 className="font-bold text-slate-800 mb-2 border-b pb-1">{title}</h4>
        <div className="border rounded-lg overflow-hidden text-sm">
            <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                    <tr>
                        {headers.map(h => <th key={h} className="px-3 py-2 border-b border-indigo-500/0">{h}</th>)}
                        <th className="w-8"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                            {renderRow(row, idx).props.children.map((child, i) => (
                                <td key={i} className="px-3 py-1 border-r border-slate-100 last:border-r-0">{child.props.children}</td>
                            ))}
                            <td className="px-1 py-1 text-center">
                                <button type="button" onClick={() => onRemove(idx)} className="text-red-400 hover:text-red-600 text-lg font-bold">&times;</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <button type="button" onClick={onAdd} className="mt-2 text-xs text-blue-600 font-bold hover:underline">+ Add Row</button>
    </div>
);

export default LAWorkLogForm;
