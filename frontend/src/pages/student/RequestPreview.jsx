import { useState } from 'react';
import axios from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { ChevronRight, Send, Pencil } from 'lucide-react';

const TYPE_LABELS = {
    bonafide:       'Bonafide Certificate',
    duty_leave:     'Duty Leave',
    lab_permission: 'Lab / Classroom Permission',
    custom:         'Custom Request'
};

const RequestPreview = ({ draft, onEdit, onSubmitted }) => {
    const { user } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [reqId, setReqId] = useState(null);

    // Generate a temporary Req ID to show on preview (real one assigned on submit)
    const previewId = `REQ-${new Date().toISOString().slice(0,10).replace(/-/g,'')}`;

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            // Build flow payload: [{ role, assignedTo }]  — draft.flow already has this shape
            const res = await axios.post('/request', {
                type:    draft.type,
                subject: draft.subject,
                body:    draft.body,
                flow:    draft.flow
            });
            setReqId(res.data.reqId);
            onSubmitted(res.data.reqId);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to submit request.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#eef2f8] pb-28">
            {/* Header */}
            <div className="bg-white px-5 py-4 flex items-center gap-3 shadow-sm sticky top-0 z-10">
                <button onClick={onEdit} className="text-sm text-blue-600 font-semibold">← Edit</button>
                <h1 className="text-base font-bold text-gray-800 flex-1 text-center pr-8">Preview</h1>
            </div>

            <div className="px-4 py-5 space-y-4">
                {/* Flow chips */}
                <div>
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Request Flow</p>
                    <div className="flex items-center gap-2 flex-wrap">
                        {draft.flow.map((step, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="bg-white border border-gray-200 rounded-full px-4 py-1.5 text-sm font-semibold text-gray-700 shadow-sm">
                                    {step.approverName || step.role}
                                </span>
                                {i < draft.flow.length - 1 && (
                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Req ID */}
                <p className="text-sm font-bold text-blue-700">Req ID: {previewId}</p>

                {/* Formal Letter */}
                <div className="bg-white rounded-2xl shadow-sm p-5 font-[serif] text-sm leading-relaxed text-gray-800">
                    <p className="font-semibold">From</p>
                    <p className="font-bold">{user?.name}</p>
                    <p className="text-gray-600">{user?.registerId}</p>
                    <br />
                    <p className="font-semibold">To</p>
                    <p>
                        {draft.flow[draft.flow.length - 1]?.role === 'principal'
                            ? 'The Principal'
                            : draft.flow[draft.flow.length - 1]?.approverName || 'The Approver'}
                    </p>
                    <p className="text-gray-600">GEC Palakkad</p>
                    <br />
                    <p><span className="font-bold">Subject :</span> {draft.subject}</p>
                    <br />
                    <p>Respected Sir/Ma'am,</p>
                    <br />
                    <p className="whitespace-pre-wrap">{draft.body}</p>
                    <br />
                    <p>Sincerely,</p>
                    <p className="font-bold">{user?.name}</p>
                    {user?.phone && <p className="text-gray-600">{user.phone}</p>}
                    <br />
                    <p className="text-gray-400 text-xs">[Signature]</p>
                </div>
            </div>

            {/* Edit + Submit Buttons */}
            <div className="fixed bottom-0 left-0 right-0 p-4 flex gap-3">
                <button
                    onClick={onEdit}
                    className="flex-1 py-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-2xl shadow hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                    <Pencil className="h-4 w-4" />
                    Edit
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 py-4 bg-[#1a2744] text-white font-bold rounded-2xl shadow-2xl hover:bg-[#243566] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                    <Send className="h-4 w-4" />
                    {submitting ? 'Submitting...' : 'Submit'}
                </button>
            </div>
        </div>
    );
};

export default RequestPreview;
