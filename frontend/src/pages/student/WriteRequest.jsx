import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import { Edit, ChevronLeft, ChevronDown, ChevronRight, Eye, AlertCircle } from 'lucide-react';

const REQUEST_TYPES = [
    { id: 'bonafide', label: 'Bonafide Certificate' },
    { id: 'duty_leave', label: 'Duty Leave' },
    { id: 'lab_permission', label: 'Lab / Classroom Permission' },
    { id: 'custom', label: 'Custom Request' }
];

const DEFAULT_FLOWS = {
    bonafide:       ['tutor', 'hod', 'principal'],
    duty_leave:     ['tutor', 'hod'],
    lab_permission: ['tutor', 'hod'],
    custom:         []
};

const WriteRequest = () => {
    const navigate = useNavigate();
    const [type, setType] = useState('bonafide');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [staffList, setStaffList] = useState([]);
    
    // Flow is an array of selected user IDs matching the roles
    const [flowUsers, setFlowUsers] = useState([]);

    const [loadingStaff, setLoadingStaff] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // Fetch all staff so we can populate dropdowns
        const fetchStaff = async () => {
            try {
                const res = await axios.get('/request/staff');
                setStaffList(res.data);
                setLoadingStaff(false);
            } catch (err) {
                console.error(err);
                setError('Failed to load staff list.');
                setLoadingStaff(false);
            }
        };
        fetchStaff();
    }, []);

    // Automatically set default flow when type changes or staff loads
    useEffect(() => {
        if (loadingStaff) return;
        
        const rolesNeeded = DEFAULT_FLOWS[type] || [];
        const newFlow = rolesNeeded.map(roleReq => {
            // Find a default staff member for this role
            // In a real app, this should filter by the student's department/batch
            // For now, take the first available
            const defaultStaff = staffList.find(s => {
                if (roleReq === 'tutor') return s.designation === 'tutor' || s.role === 'teacher';
                if (roleReq === 'hod') return s.role === 'hod';
                if (roleReq === 'principal') return s.role === 'principal';
                return false;
            });
            return {
                role: roleReq,
                assignedTo: defaultStaff ? defaultStaff._id : ''
            };
        });
        
        setFlowUsers(newFlow);
    }, [type, loadingStaff, staffList]);

    const handleFlowChange = (index, userId) => {
        const updated = [...flowUsers];
        updated[index].assignedTo = userId;
        setFlowUsers(updated);
    };

    const handlePreview = () => {
        setError('');
        if (!type || !subject.trim() || !body.trim()) {
            setError('Please fill out all fields (Type, Subject, Body).');
            return;
        }

        if (flowUsers.some(f => !f.assignedTo)) {
            setError('Please select a staff member for all steps in the flow.');
            return;
        }

        // Gather the full staff objects to pass to preview
        const resolvedFlow = flowUsers.map(f => {
            const staffMatch = staffList.find(s => s._id === f.assignedTo);
            return {
                role: f.role,
                assignedTo: f.assignedTo,
                name: staffMatch?.name,
                designation: staffMatch?.designation
            };
        });

        const formData = {
            type,
            subject,
            body,
            flow: resolvedFlow
        };

        navigate('/student/requests/preview', { state: { formData } });
    };

    return (
        <div className="min-h-screen bg-[#eaf4fc] flex flex-col font-sans pb-28">
            {/* Header */}
            <div className="bg-[#eaf4fc] text-[#1a2744] pt-10 pb-6 px-6 relative z-10 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-[#1a2744]/10 rounded-xl transition-colors">
                        <Edit className="h-6 w-6 text-[#1a2744]" />
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold">Write Request</h1>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="flex-1 px-5 overflow-y-auto space-y-6">
                
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-2xl text-sm font-semibold flex items-center gap-2 border border-red-200">
                        <AlertCircle className="h-5 w-5" />
                        {error}
                    </div>
                )}

                {/* Request Type */}
                <div>
                    <div className="relative">
                        <select
                            value={type}
                            onChange={e => setType(e.target.value)}
                            className="w-full appearance-none bg-white font-semibold flex items-center justify-between text-gray-500 p-4 rounded-2xl shadow-sm border-0 focus:ring-2 focus:ring-blue-500 pr-10"
                        >
                            {REQUEST_TYPES.map(t => (
                                <option key={t.id} value={t.id}>{t.label}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 text-[#1a2744] top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>

                {/* To Target (Readonly/Visual for now based on UI) */}
                <div>
                    <div className="bg-white font-semibold text-[#1a2744] p-4 rounded-2xl shadow-sm flex justify-between items-center bg-opacity-80">
                        <span className="text-sm">To : The Principal, GEC Palakkad (Default)</span>
                        <ChevronDown className="text-[#1a2744]" />
                    </div>
                </div>

                {/* Flow Section */}
                {type !== 'custom' && (
                    <div>
                        <div className="flex justify-between items-center mb-3 px-1">
                            <label className="font-bold text-[#1a2744] text-sm">Request flow (Default)</label>
                            <button className="text-[#1a2744] text-sm font-bold flex items-center gap-1 opacity-70">
                                <Edit className="h-4 w-4" /> Edit
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-wrap">
                            {flowUsers.map((step, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <div className="bg-white rounded-[20px] shadow-sm px-4 py-2 relative">
                                        <select 
                                            value={step.assignedTo}
                                            onChange={(e) => handleFlowChange(idx, e.target.value)}
                                            className="appearance-none bg-transparent font-bold text-[#1a2744] text-[13px] pr-6 focus:outline-none"
                                        >
                                            <option value="">Select {step.role}</option>
                                            {staffList
                                                .filter(s => {
                                                    if (step.role === 'tutor') return s.designation === 'tutor' || s.role === 'teacher';
                                                    if (step.role === 'hod') return s.role === 'hod';
                                                    if (step.role === 'principal') return s.role === 'principal';
                                                    return true;
                                                })
                                                .map(s => (
                                                    <option key={s._id} value={s._id}>
                                                        {step.role.toUpperCase()} {s.name.split(' ')[0]}
                                                    </option>
                                                ))
                                            }
                                        </select>
                                        <ChevronDown className="absolute right-3 text-[#1a2744] h-4 w-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                    {idx < flowUsers.length - 1 && (
                                        <ChevronRight className="text-gray-500 h-5 w-5" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Subject */}
                <div>
                    <label className="font-bold text-[#1a2744] text-[13px] px-1 mb-2 block">Subject</label>
                    <input
                        type="text"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        placeholder="Write the Subject"
                        className="w-full bg-white font-medium text-gray-800 p-4 rounded-2xl shadow-sm border-0 focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                    />
                </div>

                {/* Body */}
                <div className="flex-1 flex flex-col">
                    <label className="font-bold text-[#1a2744] text-[13px] px-1 mb-2 block">Body</label>
                    <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        placeholder="Write the Body"
                        className="w-full flex-1 min-h-[250px] bg-white font-medium text-gray-800 p-4 rounded-2xl shadow-sm border-0 focus:ring-2 focus:ring-blue-500 placeholder-gray-400 resize-none"
                    ></textarea>
                </div>

            </div>

            {/* Sticky Preview Button */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#eaf4fc] via-[#eaf4fc] to-transparent">
                <button
                    onClick={handlePreview}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-[#1a2744] text-white font-bold text-lg rounded-2xl shadow-xl hover:bg-[#243566] transition-transform active:scale-95"
                >
                    <Eye className="h-5 w-5" />
                    Preview
                </button>
            </div>
        </div>
    );
};

export default WriteRequest;
