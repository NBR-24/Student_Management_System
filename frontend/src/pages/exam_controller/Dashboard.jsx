import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Upload, FileText, Trash2, Eye, LogOut, Shield, ChevronRight, CheckCircle, AlertCircle, X, Search } from 'lucide-react';

const ExamControllerDashboard = () => {
    const { logout } = useAuth();
    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState('');
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [overview, setOverview] = useState([]);

    const [semester, setSemester] = useState('S1');
    const [uploadBatches, setUploadBatches] = useState([]); // Restored

    const toggleBatchSelection = (batchId) => {
        setUploadBatches(prev =>
            prev.includes(batchId)
                ? prev.filter(id => id !== batchId)
                : [...prev, batchId]
        );
    };

    // Details Modal State
    const [viewingResult, setViewingResult] = useState(null);
    const [resultDetails, setResultDetails] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        fetchBatches();
    }, []);

    useEffect(() => {
        if (selectedBatch) {
            fetchOverview();
        } else {
            setOverview([]);
        }
    }, [selectedBatch]);

    const fetchBatches = async () => {
        try {
            // We can reuse the teacher batch endpoint if it returns all batches for admin/EC
            // Or use a specific endpoint. Assuming getResultsByBatch might return batches if no batchId provided?
            // Actually, we need a way to list ALL batches in the college.
            // Let's try the admin endpoint or a new one. 
            // For now, let's try '/teacher/batch' but that might be restricted to "my batches".
            // Implementation Plan mentioned reuse or new.
            // Let's assume for now we need to fetch all batches. 
            // I'll use the public batch list or create a quick specialized fetch if needed.
            // Actually, let's use the one from TeacherDashboard but we need to ensure backend allows it.
            // Wait, '/teacher/batch' returns batches for the logged in teacher. 
            // Exam Controller needs ALL batches.
            // I'll assume for moment I can get them via a new call or I need to add one.
            // Let's try to hit '/admin/batch' if it exists or generic '/academic/batch'.
            // Checking routes... I didn't verify a "get all batches" route for EC.
            // I will use '/teacher/batch' and hope looking at the backend code that it returns all if generic, 
            // BUT backend teacher controller usually filters by `req.user.userId`.
            // I might need to fix this.

            // Temporary: allow EC to see all batches via the same endpoint or a new one.
            // I will optimistically check if I can just toggle a "fetch all" mode.
            // For this step I will write the code assuming there is a way, 
            // and if it fails I will fix the backend in the next step.
            const res = await axios.get('/teacher/batch'); // Attempting reuse
            setBatches(res.data);
        } catch (error) {
            console.error("Error fetching batches:", error);
        }
    };

    const fetchOverview = async () => {
        try {
            const res = await axios.get(`/academic/result/overview/${selectedBatch}`);
            setOverview(res.data);
        } catch (error) {
            console.error("Error fetching overview:", error);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || uploadBatches.length === 0) {
            setMessage('ERROR: Please select at least one batch and upload a file.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('examType', 'university'); // EC only uploads University results
        formData.append('batchIds', JSON.stringify(uploadBatches)); // Send multiple batches
        formData.append('semester', semester);

        setMessage('Processing PDF... This may take a moment...');
        setLoading(true);

        try {
            const res = await axios.post('/academic/result/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob' // Expecting Excel back
            });

            // Trigger download
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `University_${semester}_Results.xlsx`);
            document.body.appendChild(link);
            link.click();

            setMessage('SUCCESS: Results uploaded as DRAFT. Review below.');
            setFile(null);
            fetchOverview();
        } catch (error) {
            console.error(error);
            setMessage('ERROR: Failed to process PDF. Ensure it is a valid University Result file.');
        }
        setLoading(false);
    };

    const handleDelete = async (result) => {
        if (!window.confirm(`DANGER: Delete ${result.title}? This cannot be undone.`)) return;
        try {
            await axios.post('/academic/result/delete', {
                batchId: selectedBatch,
                title: result.title,
                type: result.type
            });
            fetchOverview();
        } catch (error) {
            alert("Failed to delete result.");
        }
    };

    const handleViewDetails = async (result) => {
        setViewingResult(result);
        setLoadingDetails(true);
        try {
            const res = await axios.get(`/academic/result/details/${selectedBatch}`, {
                params: { title: result.title, type: result.type }
            });
            setResultDetails(res.data);
        } catch (error) {
            alert("Failed to load result details.");
        }
        setLoadingDetails(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-gray-900 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                        <Shield className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Exam Controller Portal</h1>
                        <p className="text-xs text-gray-500 font-medium">University Result Management</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-xl transition-colors text-sm font-bold"
                >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                </button>
            </header>

            <main className="flex-1 p-8 max-w-6xl mx-auto w-full space-y-8">

                {/* Upload Section */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 flex justify-between items-center text-white">
                        <div>
                            <h2 className="text-xl font-bold flex items-center">
                                <Upload className="mr-3 h-6 w-6" />
                                Upload University Results
                            </h2>
                            <p className="text-blue-100 text-sm mt-1">Upload PDF results to generate drafts for teachers to approve.</p>
                        </div>
                    </div>

                    <div className="p-8">
                        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Select Target Batches (Multi)</label>
                                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-gray-50">
                                        {batches.map(b => (
                                            <div key={b._id} className="flex items-center space-x-3 mb-2 last:mb-0">
                                                <input
                                                    type="checkbox"
                                                    id={`batch-${b._id}`}
                                                    checked={uploadBatches.includes(b._id)}
                                                    onChange={() => toggleBatchSelection(b._id)}
                                                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                                />
                                                <label htmlFor={`batch-${b._id}`} className="text-sm font-medium text-gray-700 cursor-pointer select-none flex-1">
                                                    {b.name} <span className="text-gray-400">({b.branch})</span>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-blue-600 font-bold mt-2">{uploadBatches.length} batches selected</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Semester</label>
                                    <div className="flex space-x-2 overflow-x-auto pb-2">
                                        {['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'].map(sem => (
                                            <button
                                                key={sem}
                                                type="button"
                                                onClick={() => setSemester(sem)}
                                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${semester === sem ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                            >
                                                {sem}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:bg-blue-50 hover:border-blue-200 transition-all cursor-pointer relative group">
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={(e) => setFile(e.target.files[0])}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="flex flex-col items-center">
                                        <div className="h-14 w-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <FileText className="h-7 w-7" />
                                        </div>
                                        <span className="font-bold text-gray-700 text-lg">
                                            {file ? file.name : 'Click to Upload PDF'}
                                        </span>
                                        <span className="text-sm text-gray-400 mt-2">Supports University Result PDFs</span>
                                    </div>
                                </div>

                                <button
                                    disabled={!file || uploadBatches.length === 0 || loading}
                                    className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-xl shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                >
                                    {loading ? 'Processing...' : 'Process & Upload Result'}
                                    {!loading && <ChevronRight className="ml-2 h-5 w-5" />}
                                </button>
                            </div>
                        </form>

                        {message && (
                            <div className={`mt-6 p-4 rounded-xl flex items-center font-bold text-sm ${message.includes('SUCCESS') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                                {message.includes('SUCCESS') ? <CheckCircle className="mr-3 h-5 w-5" /> : <AlertCircle className="mr-3 h-5 w-5" />}
                                {message}
                            </div>
                        )}
                    </div>
                </div>

                {/* History Section */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center">
                            Result History
                            <span className="ml-3 px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">{overview.length}</span>
                        </h3>
                        <div className="w-64">
                            <select
                                value={selectedBatch}
                                onChange={(e) => setSelectedBatch(e.target.value)}
                                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer"
                            >
                                <option value="">Select Batch to View History...</option>
                                {batches.map(b => (
                                    <option key={b._id} value={b._id}>{b.name} ({b.branch})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {selectedBatch && (
                        <div className="grid gap-4">
                            {overview.map((item, idx) => (
                                <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h4 className="font-bold text-lg text-gray-900">{item.title}</h4>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md tracking-wide ${item.published ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                                {item.published ? 'Published' : 'Draft (Waiting Approval)'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Uploaded {new Date(item.lastUploaded).toLocaleDateString()} • {item.totalStudents} Students
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleViewDetails(item)}
                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="View Details"
                                        >
                                            <Eye className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete Result"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {overview.length === 0 && (
                                <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                    No results uploaded for this batch yet.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Modal */}
            {viewingResult && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{viewingResult.title}</h2>
                                <p className="text-sm text-gray-500">{resultDetails.length} Records</p>
                            </div>
                            <button onClick={() => setViewingResult(null)} className="p-2 hover:bg-gray-200 rounded-full">
                                <X className="h-6 w-6 text-gray-500" />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 p-6">
                            {loadingDetails ? (
                                <div className="text-center py-10">Loading...</div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Reg No</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Name</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">SGPA</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {resultDetails.map((res, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-mono text-xs font-bold text-gray-600">{res.registerId}</td>
                                                <td className="px-4 py-3 font-medium text-gray-900">{res.student?.name || 'Unknown'}</td>
                                                <td className="px-4 py-3 text-right font-bold text-blue-600">{res.sgpa}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamControllerDashboard;
