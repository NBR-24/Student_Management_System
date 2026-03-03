import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import ResultAnalysis from './ResultAnalysis';
import { Upload, FileText, Eye, CheckCircle, Trash2, X, BarChart2, Globe, Download, GraduationCap } from 'lucide-react';

const TeacherResults = ({ batches }) => {
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [examType] = useState('internal');
    const [selectedBatch, setSelectedBatch] = useState('');

    // Batch-level internal results
    const [overview, setOverview] = useState([]);

    // University results (all, from EC) — no batch filter
    const [uniResults, setUniResults] = useState([]);

    const [viewingResult, setViewingResult] = useState(null);
    const [resultDetails, setResultDetails] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [viewingAnalysis, setViewingAnalysis] = useState(null);
    const [detailSource, setDetailSource] = useState('batch'); // 'batch' | 'global'

    // Fetch global university results on mount (no batch needed)
    useEffect(() => {
        fetchUniResults();
    }, []);

    // Fetch batch internal results when batch changes
    useEffect(() => {
        if (selectedBatch) fetchOverview();
        else setOverview([]);
    }, [selectedBatch]);

    const fetchUniResults = async () => {
        try {
            const res = await axios.get('/academic/result/overview');
            setUniResults(res.data.filter(r => r.type === 'university'));
        } catch (error) {
            console.error('Error fetching university results:', error);
        }
    };

    const fetchOverview = async () => {
        try {
            const res = await axios.get(`/academic/result/overview/${selectedBatch}`);
            setOverview(res.data);
        } catch (error) {
            console.error('Error fetching overview:', error);
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
        formData.append('examType', examType);
        formData.append('batchId', selectedBatch);

        setMessage('Processing Internal Marks...');
        setLoading(true);
        try {
            const res = await axios.post('/academic/result/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${examType}_results.xlsx`);
            document.body.appendChild(link);
            link.click();
            setMessage('SUCCESS: Results parsed & saved as DRAFT. Review below.');
            setFile(null);
            fetchOverview();
        } catch (error) {
            console.error(error);
            setMessage('ERROR: Failed to process file.');
        }
        setLoading(false);
    };

    const handlePublish = async (result) => {
        if (!window.confirm(`Publish "${result.title}" for all students?`)) return;
        try {
            await axios.post('/academic/result/publish', {
                batchId: selectedBatch || undefined,
                title: result.title,
                type: result.type
            });
            fetchOverview();
            fetchUniResults();
        } catch (error) {
            alert('Failed to publish result.');
        }
    };

    const handleDelete = async (result) => {
        if (!window.confirm(`DANGER: Delete "${result.title}"? This cannot be undone.`)) return;
        try {
            await axios.post('/academic/result/delete', {
                batchId: selectedBatch || undefined,
                title: result.title,
                type: result.type
            });
            fetchOverview();
            fetchUniResults();
        } catch (error) {
            alert('Failed to delete result.');
        }
    };

    // View Details — for batch-level
    const handleViewDetails = async (result, source = 'batch') => {
        setViewingResult(result);
        setDetailSource(source);
        setLoadingDetails(true);
        try {
            let res;
            if (source === 'global') {
                res = await axios.get('/academic/result/details/all', {
                    params: { title: result.title, type: result.type }
                });
            } else {
                res = await axios.get(`/academic/result/details/${selectedBatch}`, {
                    params: { title: result.title, type: result.type }
                });
            }
            setResultDetails(res.data);
        } catch (error) {
            alert('Failed to load result details.');
            setViewingResult(null);
        }
        setLoadingDetails(false);
    };

    const handleDownload = async (result, global = false) => {
        try {
            const response = await axios.get(
                global ? '/academic/result/download/all' : `/academic/result/download/${selectedBatch}`,
                { params: { title: result.title, type: result.type }, responseType: 'blob' }
            );
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${result.title}.xlsx`);
            document.body.appendChild(link);
            link.click();
        } catch (error) {
            alert('Failed to download result.');
        }
    };

    const handleAnalysis = (result, mode = 'department') => {
        setViewingAnalysis({ ...result, mode });
    };

    // Reusable action row for batch results
    const BatchActions = ({ item }) => (
        <div className="flex items-center gap-2 flex-wrap justify-end">
            <button onClick={() => handleViewDetails(item, 'batch')} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Details"><Eye className="h-4 w-4" /></button>
            <button onClick={() => handleDownload(item, false)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Download Excel"><Download className="h-4 w-4" /></button>
            <button onClick={() => handleAnalysis(item, 'department')} className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors" title="Dept Analysis"><BarChart2 className="h-4 w-4" /></button>
            <button onClick={() => handleAnalysis(item, 'college')} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="College Analysis"><Globe className="h-4 w-4" /></button>
            {!item.published && (
                <button onClick={() => handlePublish(item)} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Publish
                </button>
            )}
            <button onClick={() => handleDelete(item)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
        </div>
    );

    // Reusable action row for university (global) results
    const UniActions = ({ item }) => (
        <div className="flex items-center gap-2 flex-wrap justify-end">
            <button onClick={() => handleViewDetails(item, 'global')} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View All Students"><Eye className="h-4 w-4" /></button>
            <button onClick={() => handleDownload(item, true)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Download Excel"><Download className="h-4 w-4" /></button>
            <button onClick={() => handleAnalysis(item, 'department')} className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors" title="Dept Analysis"><BarChart2 className="h-4 w-4" /></button>
            <button onClick={() => handleAnalysis(item, 'college')} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="College Analysis"><Globe className="h-4 w-4" /></button>
        </div>
    );

    return (
        <div className="space-y-10">
            <h2 className="text-2xl font-bold text-gray-900">Result Management</h2>

            {/* ─── UNIVERSITY RESULTS SECTION ─── */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                        <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Available University Results</h3>
                        <p className="text-xs text-gray-400">Published by Exam Controller — visible college-wide</p>
                    </div>
                    <span className="ml-auto px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">{uniResults.length}</span>
                </div>

                <div className="grid gap-3">
                    {uniResults.map((item, idx) => (
                        <div key={idx} className="bg-white p-5 rounded-2xl border border-blue-50 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition-all">
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-bold text-gray-900">{item.title}</h4>
                                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Published</span>
                                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">University</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {new Date(item.lastUploaded).toLocaleDateString()} • {item.totalStudents} Students • Avg SGPA: {item.averageSGPA}
                                </p>
                            </div>
                            <UniActions item={item} />
                        </div>
                    ))}
                    {uniResults.length === 0 && (
                        <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                            <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            No university results published yet.
                        </div>
                    )}
                </div>
            </div>

            <hr className="border-gray-100" />

            {/* ─── INTERNAL MARKS SECTION ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-fit">
                    <div className="flex items-center mb-6">
                        <div className="h-10 w-10 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center mr-4">
                            <Upload className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg">Upload Internal Marks</h3>
                            <p className="text-gray-500 text-sm">Upload internal assessment results.</p>
                        </div>
                    </div>

                    <form onSubmit={handleUpload} className="space-y-4">
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

                        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:bg-gray-50 transition-colors relative cursor-pointer group">
                            <input
                                type="file"
                                accept=".pdf,.xlsx,.csv"
                                onChange={(e) => setFile(e.target.files[0])}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center">
                                <FileText className="h-8 w-8 text-gray-300 mb-2 group-hover:text-violet-400 transition-colors" />
                                <span className="font-medium text-gray-700 text-sm">
                                    {file ? file.name : 'Click to upload file'}
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

                {/* Batch Results History */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center">
                        <FileText className="mr-2 h-5 w-5 text-gray-400" />
                        Internal Results — {selectedBatch ? batches?.find(b => b._id === selectedBatch)?.name : 'Select a batch'}
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
                                    <BatchActions item={item} />
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

            {/* ─── VIEW DETAILS MODAL ─── */}
            {viewingResult && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{viewingResult.title}</h2>
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
                                            <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Reg No</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Name</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Total Credits</th>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">SGPA</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {resultDetails.map((res, i) => (
                                            <tr key={i} className="hover:bg-gray-50 transition-colors">
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

                        {detailSource === 'batch' && !viewingResult.published && (
                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                                <button
                                    onClick={() => { handlePublish(viewingResult); setViewingResult(null); }}
                                    className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
                                >
                                    Publish Results
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── ANALYSIS MODAL ─── */}
            {viewingAnalysis && (
                <ResultAnalysis
                    batchId={viewingAnalysis.mode === 'college' || viewingAnalysis.mode === 'department' ? null : selectedBatch}
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
