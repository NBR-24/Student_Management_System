import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, XCircle, ChevronRight, X, Clock, FileText } from 'lucide-react';

const TYPE_LABELS = {
    bonafide:       'Bonafide Certificate',
    duty_leave:     'Duty Leave',
    lab_permission: 'Lab / Classroom Permission',
    custom:         'Custom Request'
};

const RejectModal = ({ onConfirm, onCancel }) => {
    const [comment, setComment] = useState('');
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
            <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 space-y-4">
                <h3 className="text-lg font-bold text-gray-800">Revert Request</h3>
                <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Reason for reverting (optional)..."
                    rows={4}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none focus:border-red-400 resize-none"
                />
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50">
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(comment)}
                        className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
                    >
                        Confirm Revert
                    </button>
                </div>
            </div>
        </div>
    );
};

const RequestDetailModal = ({ req, onApprove, onReject, onClose, acting, readonly }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 overflow-y-auto">
        <div className="min-h-screen p-4 flex items-start justify-center">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full mt-8">
                {/* Header */}
                <div className="flex justify-between items-start p-6 border-b border-gray-100">
                    <div>
                        <span className="text-xs font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-full">
                            {TYPE_LABELS[req.type]}
                        </span>
                        <h2 className="text-xl font-bold text-gray-800 mt-2">{req.subject}</h2>
                        <p className="text-sm text-gray-400 mt-0.5">
                            From: <span className="font-semibold text-gray-700">
                                {req.student?.name} · {req.student?.registerId}
                            </span>
                        </p>
                        <p className="text-xs text-gray-400 font-mono mt-1">{req.reqId}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Flow chips */}
                <div className="px-6 pt-4 flex items-center gap-2 flex-wrap">
                    {req.flow.map((step, i) => (
                        <div key={i} className="flex items-center gap-1">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                step.status === 'approved' ? 'bg-green-50 text-green-600 border-green-200' :
                                step.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                                i === req.currentStep ? 'bg-blue-50 text-blue-600 border-blue-300' :
                                'bg-gray-100 text-gray-400 border-gray-200'
                            }`}>
                                {step.assignedTo?.name || step.role}
                            </span>
                            {i < req.flow.length - 1 && <ChevronRight className="h-3 w-3 text-gray-300" />}
                        </div>
                    ))}
                </div>

                {/* Letter body */}
                <div className="p-6">
                    <div className="bg-gray-50 rounded-2xl p-5 font-[serif] text-sm leading-relaxed text-gray-800 space-y-3">
                        <div>
                            <p className="font-bold">From</p>
                            <p>{req.student?.name}</p>
                            <p className="text-gray-500">{req.student?.registerId}</p>
                        </div>
                        <div>
                            <p className="font-bold">Subject:</p>
                            <p className="break-words">{req.subject}</p>
                        </div>
                        <div>
                            <p>Respected Sir/Ma'am,</p>
                            <p className="whitespace-pre-wrap mt-2 break-words max-h-96 overflow-y-auto pr-2">{req.body}</p>
                        </div>
                        <div>
                            <p>Sincerely,</p>
                            <p className="font-bold">{req.student?.name}</p>
                        </div>
                    </div>

                    {/* Submitted date */}
                    <p className="text-xs text-gray-400 mt-3">
                        Submitted: {new Date(req.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                </div>

                {/* Action Buttons */}
                {!readonly && (
                    <div className="flex gap-3 px-6 pb-6">
                        <button
                            onClick={() => onReject(req._id)}
                            disabled={acting}
                            className="flex-1 py-3 border-2 border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <XCircle className="h-4 w-4" />
                            Revert
                        </button>
                        <button
                            onClick={() => onApprove(req._id)}
                            disabled={acting}
                            className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <CheckCircle className="h-4 w-4" />
                            {acting ? 'Processing...' : (req.currentStep === req.flow.length - 1 ? 'Approve Final' : 'Forward')}
                        </button>
                    </div>
                )}
                {readonly && (
                    <div className="px-6 pb-6 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Read Only — {req.status === 'approved' ? 'Officially Approved' : 
                                     req.status === 'reverted' ? 'Currently Reverted' : 'In Progress'}
                    </div>
                )}
            </div>
        </div>
    </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const PendingRequests = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [history, setHistory]   = useState([]);
    const [tab, setTab]           = useState('new'); // new | approved | reverted
    const [loading, setLoading]   = useState(true);
    const [selected, setSelected] = useState(null);
    const [rejecting, setRejecting] = useState(false);   // id of request being rejected
    const [acting, setActing]     = useState(false);

    const load = () => {
        setLoading(true);
        Promise.all([
            axios.get('/request/pending'),
            axios.get('/request/history')
        ]).then(([pendingRes, historyRes]) => {
            setRequests(pendingRes.data);
            setHistory(historyRes.data);
        }).catch(console.error)
          .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const handleApprove = async (id) => {
        setActing(true);
        try {
            await axios.post(`/request/${id}/approve`);
            setSelected(null);
            load();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to approve.');
        }
        setActing(false);
    };

    const handleRejectConfirm = async (comment) => {
        setActing(true);
        try {
            await axios.post(`/request/${rejecting}/reject`, { comment });
            setRejecting(false);
            setSelected(null);
            load();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to reject.');
        }
        setActing(false);
    };

    const myId = user?.userId || user?._id || user?.id;
    const myApproved = history.filter(req => 
        req.flow.some(step => step.assignedTo?._id == myId && step.status === 'approved')
    );
    const myReverted = history.filter(req => 
        req.flow.some(step => step.assignedTo?._id == myId && step.status === 'rejected')
    );

    const displayed = tab === 'new' ? requests : tab === 'approved' ? myApproved : myReverted;

    return (
        <div className="min-h-screen bg-transparent p-2">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">Request Management</h1>
            <p className="text-gray-400 text-sm mb-6">Manage incoming requests and view your history</p>

            {/* Tabs */}
            <div className="flex space-x-2 bg-white rounded-xl p-1 mb-6 shadow-sm border border-gray-100 max-w-lg">
                {[
                    { id: 'new', label: 'New Requests' },
                    { id: 'approved', label: 'Approved & Forwarded' },
                    { id: 'reverted', label: 'Reverted' }
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                            tab === t.id ? 'bg-[#1a2744] text-white shadow-md' : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {loading && <p className="text-gray-400 text-center py-16 font-semibold animate-pulse">Loading...</p>}

            {!loading && displayed.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-semibold">No requests found in this section</p>
                    <p className="text-sm mt-1 opacity-60">You're all caught up!</p>
                </div>
            )}

            <div className="space-y-3 max-w-3xl">
                {displayed.map(req => (
                    <div
                        key={req._id}
                        onClick={() => setSelected(req)}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all"
                    >
                        <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                    {TYPE_LABELS[req.type]}
                                </span>
                                <p className="font-semibold text-gray-800 mt-1 truncate">{req.subject}</p>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {req.student?.name} · <span className="font-mono text-xs">{req.student?.registerId}</span>
                                </p>
                                <p className="text-xs text-gray-400 mt-1">{req.reqId}</p>
                            </div>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                                {new Date(req.createdAt).toLocaleDateString('en-IN')}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {selected && (
                <RequestDetailModal
                    req={selected}
                    acting={acting}
                    readonly={tab !== 'new'}
                    onClose={() => setSelected(null)}
                    onApprove={handleApprove}
                    onReject={(id) => { setRejecting(id); }}
                />
            )}

            {rejecting && (
                <RejectModal
                    onConfirm={handleRejectConfirm}
                    onCancel={() => setRejecting(false)}
                />
            )}
        </div>
    );
};

export default PendingRequests;
