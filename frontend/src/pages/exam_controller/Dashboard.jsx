import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Upload, FileText, Trash2, Eye, LogOut, Shield, ChevronRight, CheckCircle, AlertCircle, X, BarChart2, Globe, Download } from 'lucide-react';
import ResultAnalysis from '../teacher/ResultAnalysis';

const ExamControllerDashboard = () => {
    const { logout } = useAuth();
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);


    // Draft uploads (recent uploads awaiting publish)
    const [drafts, setDrafts] = useState([]);
    // All published results
    const [overview, setOverview] = useState([]);

    // View Details Modal
    const [viewingResult, setViewingResult] = useState(null);
    const [resultDetails, setResultDetails] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Analysis
    const [viewingAnalysis, setViewingAnalysis] = useState(null);

    useEffect(() => {
        fetchDrafts();
        fetchOverview();
    }, []);

    const fetchDrafts = async () => {
        try {
            const res = await axios.get('/academic/result/draft-overview');
            setDrafts(res.data);
        } catch (error) {
            console.error("Error fetching drafts:", error);
        }
    };

    const fetchOverview = async () => {
        try {
            const res = await axios.get('/academic/result/overview');
            setOverview(res.data);
        } catch (error) {
            console.error("Error fetching overview:", error);
        }
    };

    const refreshAll = () => {
        fetchDrafts();
        fetchOverview();
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            setMessage('ERROR: Please select a PDF file to upload.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('examType', 'university');

        setMessage('Processing PDF... This may take a moment...');
        setLoading(true);

        try {
            const res = await axios.post('/academic/result/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `University_Results.xlsx`);
            document.body.appendChild(link);
            link.click();

            setMessage('SUCCESS: PDF processed. Review in Recent Uploads below, then Publish when ready.');
            setFile(null);
            refreshAll();
        } catch (error) {
            console.error(error);
            setMessage('ERROR: Failed to process PDF. Ensure it is a valid University Result file.');
        }
        setLoading(false);
    };

    const handlePublish = async (item) => {
        if (!window.confirm(`Publish "${item.title}" to all teachers and students? This cannot be undone.`)) return;
        try {
            await axios.post('/academic/result/publish', { title: item.title, type: item.type });
            refreshAll();
        } catch (error) {
            alert("Failed to publish result.");
        }
    };

    const handleDelete = async (item) => {
        if (!window.confirm(`DANGER: Delete "${item.title}"? This cannot be undone.`)) return;
        try {
            await axios.post('/academic/result/delete', { title: item.title, type: item.type });
            refreshAll();
        } catch (error) {
            alert("Failed to delete result.");
        }
    };

    const handleDownload = async (item) => {
        try {
            const response = await axios.get('/academic/result/download/all', {
                params: { title: item.title, type: item.type },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${item.title}.xlsx`);
            document.body.appendChild(link);
            link.click();
        } catch (error) {
            alert("Failed to download Excel.");
        }
    };

    const handleViewDetails = async (item) => {
        setViewingResult(item);
        setLoadingDetails(true);
        try {
            const res = await axios.get('/academic/result/details/all', {
                params: { title: item.title, type: item.type }
            });
            setResultDetails(res.data);
        } catch (error) {
            alert("Failed to load result details.");
        }
        setLoadingDetails(false);
    };

    const handleCollegeAnalysis = (item) => {
        setViewingAnalysis({ ...item, mode: 'college' });
    };

    const handleDeptAnalysis = (item) => {
        setViewingAnalysis({ ...item, mode: 'department' });
    };

    // Reusable result card action buttons
    const ResultActions = ({ item, isDraft }) => (
        <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
                onClick={() => handleViewDetails(item)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="View Student Details"
            >
                <Eye className="h-4 w-4" />
            </button>
            <button
                onClick={() => handleDownload(item)}
                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Download Excel"
            >
                <Download className="h-4 w-4" />
            </button>
            <button
                onClick={() => handleDeptAnalysis(item)}
                className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                title="Department Analysis"
            >
                <BarChart2 className="h-4 w-4" />
            </button>
            <button
                onClick={() => handleCollegeAnalysis(item)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="College Analysis"
            >
                <Globe className="h-4 w-4" />
            </button>
            {isDraft && (
                <button
                    onClick={() => handlePublish(item)}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm shadow-green-200"
                    title="Publish to teachers & students"
                >
                    <CheckCircle className="h-3 w-3" />
                    Publish
                </button>
            )}
            <button
                onClick={() => handleDelete(item)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete"
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    );

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
                            <p className="text-blue-100 text-sm mt-1">Upload the official PDF result sheet. After upload, review and publish to release to teachers and students.</p>
                        </div>
                    </div>

                    <div className="p-8">
                        <form onSubmit={handleUpload} className="space-y-6">
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
                                    <span className="text-sm text-gray-400 mt-2">Official University Result PDF — semester detected automatically</span>
                                </div>
                            </div>

                            <button
                                disabled={!file || loading}
                                className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-xl shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {loading ? 'Processing...' : 'Process & Save as Draft'}
                                {!loading && <ChevronRight className="ml-2 h-5 w-5" />}
                            </button>
                        </form>

                        {message && (
                            <div className={`mt-6 p-4 rounded-xl flex items-center font-bold text-sm ${message.includes('SUCCESS') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                                {message.includes('SUCCESS') ? <CheckCircle className="mr-3 h-5 w-5" /> : <AlertCircle className="mr-3 h-5 w-5" />}
                                {message}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Uploads (Drafts) Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center">
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-400 mr-3 animate-pulse"></span>
                            Recent Uploads — Awaiting Publish
                            <span className="ml-3 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-bold">{drafts.length}</span>
                        </h3>
                    </div>

                    <div className="grid gap-4">
                        {drafts.map((item, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:shadow-md">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h4 className="font-bold text-lg text-gray-900">{item.title}</h4>
                                        <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-md tracking-wide bg-amber-100 text-amber-800">
                                            Draft
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Uploaded {new Date(item.lastUploaded).toLocaleDateString()} • {item.totalStudents} Students • Avg SGPA: {item.averageSGPA}
                                    </p>
                                </div>
                                <ResultActions item={item} isDraft={true} />
                            </div>
                        ))}
                        {drafts.length === 0 && (
                            <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                                <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                No pending uploads. Upload a PDF above to get started.
                            </div>
                        )}
                    </div>
                </div>

                {/* Published Results Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center">
                            <span className="h-2.5 w-2.5 rounded-full bg-green-500 mr-3"></span>
                            Published Results
                            <span className="ml-3 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-bold">{overview.length}</span>
                        </h3>
                    </div>

                    <div className="grid gap-4">
                        {overview.map((item, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:shadow-md">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h4 className="font-bold text-lg text-gray-900">{item.title}</h4>
                                        <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-md tracking-wide bg-green-100 text-green-800">
                                            Published
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Published {new Date(item.lastUploaded).toLocaleDateString()} • {item.totalStudents} Students • Avg SGPA: {item.averageSGPA}
                                    </p>
                                </div>
                                <ResultActions item={item} isDraft={false} />
                            </div>
                        ))}
                        {overview.length === 0 && (
                            <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                                <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                No published results yet.
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* View Details Modal */}
            {viewingResult && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{viewingResult.title}</h2>
                                <p className="text-sm text-gray-500">{resultDetails.length} Records</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {!viewingResult.published && (
                                    <button
                                        onClick={() => { handlePublish(viewingResult); setViewingResult(null); }}
                                        className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                        Publish
                                    </button>
                                )}
                                <button onClick={() => setViewingResult(null)} className="p-2 hover:bg-gray-200 rounded-full">
                                    <X className="h-6 w-6 text-gray-500" />
                                </button>
                            </div>
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
                                            <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Total Credits</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">SGPA</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {resultDetails.map((res, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-mono text-xs font-bold text-gray-600">{res.registerId}</td>
                                                <td className="px-4 py-3 font-medium text-gray-900">{res.student?.name || <span className="text-gray-400 italic">Unknown</span>}</td>
                                                <td className="px-4 py-3 text-gray-500 text-sm">{res.totalCredits}</td>
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

            {/* Analysis Modal */}
            {viewingAnalysis && (
                <ResultAnalysis
                    batchId={null}
                    title={viewingAnalysis.title}
                    type={viewingAnalysis.type}
                    mode={viewingAnalysis.mode}
                    onClose={() => setViewingAnalysis(null)}
                />
            )}
        </div>
    );
};

export default ExamControllerDashboard;
