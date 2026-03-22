import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    ClipboardList, RotateCcw, History, Plus, CheckCircle, XCircle,
    Clock, Download, ChevronRight, FileText, X, AlertCircle, User
} from 'lucide-react';

const TYPE_LABELS = {
    bonafide:       'Bonafide Certificate',
    duty_leave:     'Duty Leave',
    lab_permission: 'Lab / Classroom Permission',
    custom:         'Custom Request'
};

const STATUS_COLORS = {
    pending:  'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    reverted: 'bg-orange-100 text-orange-700',
};

// ─── Step Progress Bar ────────────────────────────────────────────────────────
const FlowProgress = ({ flow, currentStep, status }) => (
    <div className="flex items-center gap-1 mt-2 flex-wrap">
        {flow.map((step, i) => {
            const isDone    = step.status === 'approved';
            const isActive  = i === currentStep && status === 'pending';
            const isRejected= step.status === 'rejected';
            return (
                <div key={i} className="flex items-center gap-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        isDone     ? 'bg-green-50 text-green-600 border-green-200' :
                        isRejected ? 'bg-red-50 text-red-600 border-red-200' :
                        isActive   ? 'bg-blue-50 text-blue-600 border-blue-300 animate-pulse' :
                                     'bg-gray-100 text-gray-400 border-gray-200'
                    }`}>
                        {isDone ? '✓' : isRejected ? '✗' : isActive ? '⏳' : '○'}&nbsp;
                        {step.assignedTo?.name || step.role}
                    </span>
                    {i < flow.length - 1 && <ChevronRight className="h-3 w-3 text-gray-300" />}
                </div>
            );
        })}
    </div>
);

// ─── Request Card ─────────────────────────────────────────────────────────────
const RequestCard = ({ req, onDownload, onExpand }) => {
    const rejectedStep = req.flow.find(s => s.status === 'rejected');
    return (
        <div
            onClick={() => onExpand(req)}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-[#1a2744] transition-all duration-200"
        >
            <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                            {TYPE_LABELS[req.type]}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[req.status]}`}>
                            {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </span>
                    </div>
                    <p className="font-semibold text-gray-800 truncate">{req.subject}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {req.reqId} · {new Date(req.createdAt).toLocaleDateString('en-IN')}
                    </p>
                    <FlowProgress flow={req.flow} currentStep={req.currentStep} status={req.status} />
                    {rejectedStep?.comment && (
                        <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5 border border-red-100">
                            ✗ Rejected: {rejectedStep.comment}
                        </p>
                    )}
                </div>
                {req.status === 'approved' && (
                    <button
                        onClick={e => { e.stopPropagation(); onDownload(req); }}
                        className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-xl transition-colors flex-shrink-0"
                        title="Download PDF"
                    >
                        <Download className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
};

// ─── Expanded Detail Modal ────────────────────────────────────────────────────
const RequestDetailModal = ({ req, onClose }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
                <div>
                    <p className="text-xs text-gray-400 font-mono">{req.reqId}</p>
                    <h2 className="text-lg font-bold text-gray-800">{req.subject}</h2>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="h-5 w-5 text-gray-500" />
                </button>
            </div>
            <div className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-2xl p-4 font-[serif] text-sm leading-relaxed whitespace-pre-wrap text-gray-700">
                    {req.body}
                </div>
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Approval Trail</p>
                    <div className="space-y-2">
                        {req.flow.map((step, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className={`text-lg ${step.status === 'approved' ? 'text-green-500' : step.status === 'rejected' ? 'text-red-500' : 'text-gray-300'}`}>
                                    {step.status === 'approved' ? '✓' : step.status === 'rejected' ? '✗' : '○'}
                                </span>
                                <div>
                                    <p className="font-semibold text-sm text-gray-800">{step.assignedTo?.name || step.role}</p>
                                    {step.actedAt && <p className="text-xs text-gray-400">{new Date(step.actedAt).toLocaleDateString('en-IN')}</p>}
                                    {step.comment && <p className="text-xs text-red-500 mt-0.5">"{step.comment}"</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const StudentRequests = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading]   = useState(true);
    const [tab, setTab]           = useState('status');  // status | reverted | history
    const [expanded, setExpanded] = useState(null);

    useEffect(() => {
        axios.get('/request/my')
            .then(r => setRequests(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleDownload = async (req) => {
        try {
            const res = await axios.get(`/request/${req._id}/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a   = document.createElement('a');
            a.href = url; a.download = `${req.reqId}.pdf`;
            document.body.appendChild(a); a.click(); a.remove();
        } catch { alert('PDF not available yet.'); }
    };

    const pending  = requests.filter(r => r.status === 'pending');
    const reverted = requests.filter(r => r.status === 'reverted');
    const history  = requests.filter(r => r.status === 'approved' || r.status === 'rejected');

    const tiles = [
        { key: 'status',   icon: ClipboardList, label: 'Request Status',    count: pending.length  },
        { key: 'reverted', icon: RotateCcw,     label: 'Reverted Request', count: reverted.length },
        { key: 'history',  icon: History,       label: 'Request History',   count: history.length  },
    ];

    const displayed = tab === 'status' ? pending : tab === 'reverted' ? reverted : history;

    // Formatting date
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

    return (
        <div className="min-h-screen bg-[#1a2744] font-sans flex flex-col pt-10 pb-0">
            {/* Dark Blue Header */}
            <div className="px-6 flex flex-col flex-shrink-0">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white leading-none">ReQu.</h1>
                        <p className="text-[10px] text-blue-200 mt-1 uppercase tracking-widest font-semibold">Approvals Simplified</p>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-bold text-white">Hello, {user?.name?.split(' ')[0] || 'Student'}</h2>
                    <div className="h-10 w-10 rounded-full border-2 border-white flex items-center justify-center overflow-hidden">
                        <User className="h-6 w-6 text-white" />
                    </div>
                </div>
                
                <p className="text-blue-100 text-sm text-center mb-8">{formattedDate}</p>
            </div>

            {/* Light Blue Content Area */}
            <div className="flex-1 bg-[#eaf4fc] rounded-t-[2.5rem] px-6 pt-10 pb-28 flex flex-col shadow-inner">
                
                {/* Tabs */}
                {/* The UI shows a column of large cards for the tabs */}
                <div className="space-y-4 mb-8">
                    {tiles.map(t => {
                        const isActive = tab === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`w-full flex flex-col items-center justify-center p-6 rounded-3xl transition-all duration-300 shadow-sm ${
                                    isActive
                                        ? 'bg-[#1a2744] text-white shadow-[#1a2744]/30 shadow-lg scale-[1.02]'
                                        : 'bg-white text-[#1a2744] hover:shadow-md'
                                }`}
                            >
                                <t.icon className={`h-8 w-8 mb-3 ${isActive ? 'text-white' : 'text-[#1a2744]'}`} />
                                <span className={`text-lg font-bold ${isActive ? 'text-white' : 'text-[#1a2744]'}`}>
                                    {t.label}
                                </span>
                                {t.count > 0 && (
                                    <span className={`absolute top-4 right-4 text-xs font-bold px-2 py-0.5 rounded-full ${
                                        isActive ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        {t.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Cards rendering for selected tab */}
                <div className="space-y-4 flex-1">
                    {loading && <p className="text-[#1a2744] text-center font-bold py-8 animate-pulse">Loading...</p>}
                    {!loading && displayed.length === 0 && (
                        <div className="text-center py-12 text-[#1a2744]">
                            <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
                            <p className="font-semibold">No requests here</p>
                        </div>
                    )}
                    {displayed.map(r => (
                        <RequestCard key={r._id} req={r} onDownload={handleDownload} onExpand={setExpanded} />
                    ))}
                </div>
            </div>

            {/* Sticky Write Request Button */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#eaf4fc] via-[#eaf4fc] to-transparent pointer-events-none">
                <button
                    onClick={() => navigate('/student/requests/new')}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-[#1a2744] text-white font-bold text-lg rounded-2xl shadow-xl hover:bg-[#243566] transition-transform active:scale-95 pointer-events-auto"
                >
                    <FileText className="h-5 w-5" />
                    Write Request
                </button>
            </div>

            {expanded && <RequestDetailModal req={expanded} onClose={() => setExpanded(null)} />}
        </div>
    );
};

export default StudentRequests;
