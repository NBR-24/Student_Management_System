import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import ResultAnalysis from './ResultAnalysis';
import { useAuth } from '../../context/AuthContext';
import { Eye, X, BarChart2, Globe, Download, GraduationCap } from 'lucide-react';

const TeacherResults = ({ batches }) => {
    const { user } = useAuth();
    const isExamController = user?.role === 'exam_controller';

    const [file, setFile] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState('');

    // University results (all, from EC) — no batch filter
    const [uniResults, setUniResults] = useState([]);

    const [viewingResult, setViewingResult] = useState(null);
    const [resultDetails, setResultDetails] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [viewingAnalysis, setViewingAnalysis] = useState(null);

    // Fetch global university results on mount (no batch needed)
    useEffect(() => {
        fetchUniResults();
    }, []);

    const fetchUniResults = async () => {
        try {
            const res = await axios.get('/academic/result/overview');
            setUniResults(res.data.filter(r => r.type === 'university'));
        } catch (error) {
            console.error('Error fetching university results:', error);
        }
    };


    // View details handler
    const handleViewDetails = async (result, source = 'global') => {
        setViewingResult(result);
        setLoadingDetails(true);
        try {
            const res = await axios.get('/academic/result/details/all', {
                params: { title: result.title, type: result.type }
            });
            setResultDetails(res.data);
        } catch (error) {
            alert('Failed to load result details.');
            setViewingResult(null);
        }
        setLoadingDetails(false);
    };

    const handleDownload = async (result) => {
        try {
            const response = await axios.get('/academic/result/download/all', {
                params: { title: result.title, type: result.type },
                responseType: 'blob'
            });
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

    // Reusable action row for university (global) results
    const UniActions = ({ item }) => (
        <div className="flex items-center gap-2 flex-wrap justify-end">
            <button onClick={() => handleDownload(item, true)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Download Excel"><Download className="h-4 w-4" /></button>
            <button onClick={() => handleAnalysis(item, 'department')} className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors" title="Dept Analysis"><BarChart2 className="h-4 w-4" /></button>
            <button onClick={() => handleAnalysis(item, 'college')} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="College Analysis"><Globe className="h-4 w-4" /></button>
        </div>
    );

    return (
        <div className="space-y-10">
            <h2 className="text-2xl font-bold text-gray-900">University Results</h2>

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

                        {isExamController && !viewingResult.published && (
                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                                <button
                                    onClick={() => { fetchUniResults(); setViewingResult(null); }}
                                    className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
                                >
                                    Refresh Results
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
