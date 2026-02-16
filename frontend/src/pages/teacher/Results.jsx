import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import ResultAnalysis from './ResultAnalysis';
import { Upload, FileText, Eye, CheckCircle, Trash2, X, AlertCircle, BarChart2, Globe } from 'lucide-react';

const TeacherResults = ({ batches }) => {
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [examType, setExamType] = useState('internal'); // Default to internal as University is now EC's job
    const [semester, setSemester] = useState('S1');
    const [selectedBatch, setSelectedBatch] = useState('');

    // Result History State
    const [overview, setOverview] = useState([]);
    const [viewingResult, setViewingResult] = useState(null); // Metadata of result being viewed
    const [resultDetails, setResultDetails] = useState([]);   // Student data for modal
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [viewingAnalysis, setViewingAnalysis] = useState(null); // Metadata for analysis

    useEffect(() => {
        if (selectedBatch) {
            fetchOverview();
        } else {
            setOverview([]);
        }
    }, [selectedBatch]);

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
        if (!file || !selectedBatch) {
            setMessage('ERROR: Please select a batch and upload a file.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('examType', examType); // Will be 'internal'
        formData.append('batchId', selectedBatch);
        // Semester not needed for internal typically, or can be added if needed. 
        // Logic below removed semester append for university check.

        setMessage('Processing Internal Marks... Dictionary match taking place...');
        setLoading(true);

        try {
            const res = await axios.post('/academic/result/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob'
            });

            // Trigger download of the Excel file
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${examType}_results.xlsx`);
            document.body.appendChild(link);
            link.click();

            setMessage('SUCCESS: Results parsed & saved as DRAFT. Review below.');
            setFile(null);
            fetchOverview(); // Refresh list
        } catch (error) {
            console.error(error);
            setMessage('ERROR: Failed to process PDF.');
        }
        setLoading(false);
    };

    const handlePublish = async (result) => {
        if (!window.confirm(`Are you sure you want to APPROVE & PUBLISH ${result.title} for all students?`)) return;
        try {
            await axios.post('/academic/result/publish', {
                batchId: selectedBatch,
                title: result.title,
                type: result.type
            });
            fetchOverview();
        } catch (error) {
            console.error("Error publishing:", error);
            alert("Failed to publish result.");
        }
    };

    const handleDelete = async (result) => {
        if (!window.confirm(`DANGER: Are you sure you want to DELETE ${result.title}? This cannot be undone.`)) return;
        try {
            await axios.post('/academic/result/delete', {
                batchId: selectedBatch,
                title: result.title,
                type: result.type
            });
            fetchOverview();
        } catch (error) {
            console.error("Error deleting:", error);
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
            console.error("Error fetching details:", error);
            setViewingResult(null); // Close modal on error
            alert("Failed to load result details.");
        }
        setLoadingDetails(false);
    };

    const handleDownload = async (result) => {
        try {
            const response = await axios.get(`/academic/result/download/${selectedBatch}`, {
                params: { title: result.title, type: result.type },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${result.title}_${result.type}.xlsx`);
            document.body.appendChild(link);
            link.click();
        } catch (error) {
            console.error("Error downloading result:", error);
            alert("Failed to download result.");
        }
    };

    const handleAnalysis = (result) => {
        console.log("Opening department analysis for:", result);
        // User requested: Analysis icon = Department Analysis (not batch)
        setViewingAnalysis({ ...result, mode: 'department' });
    };

    const handleCollegeAnalysis = (result) => {
        console.log("Opening college analysis for:", result);
        setViewingAnalysis({ ...result, mode: 'college' });
    };

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-900">Result Management</h2>

            {/* ... (Upload Section - Unchanged) ... */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Section */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-fit">
                    <div className="flex items-center mb-6">
                        <div className="h-10 w-10 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center mr-4">
                            <Upload className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg">Upload Internal Marks</h3>
                            <p className="text-gray-500 text-sm">Upload Internal assessment results.</p>
                        </div>
                    </div>

                    <form onSubmit={handleUpload} className="space-y-4">
                        {/* Batch Selection */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Target Batch</label>
                            <select
                                value={selectedBatch}
                                onChange={(e) => setSelectedBatch(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border-transparent focus:ring-2 focus:ring-violet-100 outline-none cursor-pointer"
                            >
                                <option value="">Select a batch...</option>
                                {batches?.map(batch => (
                                    <option key={batch._id} value={batch._id}>{batch.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Exam Type Selection REMOVED - Defaulting to Internal */}
                        {/* Semester Dropdown REMOVED - University specific */}

                        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:bg-gray-50 transition-colors relative cursor-pointer group">
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={(e) => setFile(e.target.files[0])}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center">
                                <FileText className="h-8 w-8 text-gray-300 mb-2 group-hover:text-violet-400 transition-colors" />
                                <span className="font-medium text-gray-700 text-sm">
                                    {file ? file.name : 'Click to upload PDF'}
                                </span>
                            </div>
                        </div>

                        {message && (
                            <div className={`p-3 rounded-xl text-xs font-bold text-center ${message.includes('SUCCESS') ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                                {message}
                            </div>
                        )}

                        <button
                            disabled={!file || loading}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-gray-200 disabled:opacity-50 text-sm"
                        >
                            {loading ? 'Processing...' : 'Upload Draft'}
                        </button>
                    </form>
                </div>

                {/* History Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center">
                        <FileText className="mr-2 h-5 w-5 text-gray-400" />
                        Uploaded Results
                        <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">{overview.length}</span>
                    </h3>

                    {selectedBatch ? (
                        <div className="space-y-3">
                            {overview.map((item, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-gray-900">{item.title}</h4>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${item.published ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {item.published ? 'Published' : 'Draft'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {new Date(item.lastUploaded).toLocaleDateString()} • {item.totalStudents} Students • Avg SGPA: {item.averageSGPA}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <button
                                            onClick={() => handleViewDetails(item)}
                                            className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors" title="View Details">
                                            <Eye className="h-4 w-4" />
                                        </button>

                                        <button
                                            onClick={() => handleDownload(item)}
                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Download Excel">
                                            <Upload className="h-4 w-4 rotate-180" />
                                        </button>

                                        <button
                                            onClick={() => handleAnalysis(item)}
                                            className="p-2 text-violet-500 hover:bg-violet-50 rounded-lg transition-colors" title="Department Analysis">
                                            <BarChart2 className="h-4 w-4" />
                                        </button>

                                        <button
                                            onClick={() => handleCollegeAnalysis(item)}
                                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="College Analysis">
                                            <Globe className="h-4 w-4" />
                                        </button>

                                        {!item.published && (
                                            <button
                                                onClick={() => handlePublish(item)}
                                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1">
                                                <CheckCircle className="h-3 w-3" />
                                                Approve & Publish
                                            </button>
                                        )}

                                        <button
                                            onClick={() => handleDelete(item)}
                                            className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors" title="Delete">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {overview.length === 0 && (
                                <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                                    <p>No results uploaded for this batch yet.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            Select a batch to view history.
                        </div>
                    )}
                </div>
            </div>

            {/* View Details Modal */}
            {viewingResult && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{viewingResult.title} Details</h2>
                                <p className="text-sm text-gray-500">{resultDetails.length} Records Found</p>
                            </div>
                            <button onClick={() => setViewingResult(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
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
                                            <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase rounded-l-xl">Reg No</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Name</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Total Credits</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right rounded-r-xl">SGPA</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {resultDetails.map((res, i) => (
                                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 font-mono text-xs font-bold text-gray-600">{res.registerId}</td>
                                                <td className="px-4 py-3 font-medium text-gray-900">{res.student?.name || <span className="text-gray-400 italic">Unknown</span>}</td>
                                                <td className="px-4 py-3 text-gray-500 text-sm">{res.totalCredits}</td>
                                                <td className="px-4 py-3 text-right font-bold text-primary-600">{res.sgpa}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                            {!viewingResult.published && (
                                <button
                                    onClick={() => { handlePublish(viewingResult); setViewingResult(null); }}
                                    className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-200">
                                    Publish Results
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Analysis Component */}
            {viewingAnalysis && (
                <ResultAnalysis
                    batchId={selectedBatch}
                    title={viewingAnalysis.title}
                    type={viewingAnalysis.type}
                    mode={viewingAnalysis.mode}
                    onClose={() => setViewingAnalysis(null)}
                />
            )}
        </div>
    );
};

export default TeacherResults;
