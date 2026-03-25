import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { FileText, BookOpen, AlertCircle, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StudentInternalResults = () => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchInternals = async () => {
            try {
                const res = await axios.get('/student/internal');
                setResults(res.data);
            } catch (err) {
                console.error(err);
                setError('Failed to load internal results.');
            }
            setLoading(false);
        };
        fetchInternals();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A8AE5]"></div>
            </div>
        );
    }

    // Determine scheme from the first result (all results for one student share the same batch scheme)
    const scheme = results.length > 0 ? results[0]?.batch?.scheme : null;
    const is2024 = scheme === '2024';



    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center mb-6">
                <button onClick={() => navigate(-1)} className="mr-4 p-2 bg-white rounded-full text-gray-600 shadow-sm hover:bg-gray-100 transition-colors">
                    <ChevronLeft className="h-6 w-6" />
                </button>
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">Internal Marks</h2>
                    <p className="text-gray-500 mt-1">Detailed breakdown of your internal assessments.</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center font-medium">
                    <AlertCircle className="w-5 h-5 mr-3" />
                    {error}
                </div>
            )}

            {!loading && results.length === 0 ? (
                <div className="bg-white rounded-[24px] p-12 text-center border border-gray-100 shadow-sm">
                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No Internals Published</h3>
                    <p className="text-gray-500">Your teachers have not published any internal marks yet.</p>
                </div>
            ) : (
                <div className="bg-white shadow-sm rounded-[24px] overflow-hidden border border-gray-100">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            {is2024 ? (
                                <>
                                    <thead>
                                        <tr>
                                            <th className="bg-gray-50/80 px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100" rowSpan="2">Subject</th>
                                            <th className="bg-gray-50/80 px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center border-b border-l border-gray-100" colSpan="4">Raw Marks</th>
                                            <th className="bg-[#E8F3FD]/50 px-4 py-4 text-xs font-bold text-[#1A8AE5] uppercase tracking-wider text-center border-b border-l border-[#1A8AE5]/10" colSpan="4">Calculated Internals</th>
                                        </tr>
                                        <tr>
                                            <th className="bg-gray-50/80 px-3 py-3 text-[10px] font-bold text-gray-500 uppercase text-center border-b border-l border-gray-100">Attendance %</th>
                                            <th className="bg-gray-50/80 px-3 py-3 text-[10px] font-bold text-gray-500 uppercase text-center border-b border-gray-100">Series 1 (40)</th>
                                            <th className="bg-gray-50/80 px-3 py-3 text-[10px] font-bold text-gray-500 uppercase text-center border-b border-gray-100">Series 2 (40)</th>
                                            <th className="bg-gray-50/80 px-3 py-3 text-[10px] font-bold text-gray-500 uppercase text-center border-b border-gray-100">Assignment (15)</th>

                                            <th className="bg-[#E8F3FD]/50 px-3 py-3 text-[10px] font-bold text-[#1A8AE5] uppercase text-center border-b border-l border-[#1A8AE5]/10">Att (5)</th>
                                            <th className="bg-[#E8F3FD]/50 px-3 py-3 text-[10px] font-bold text-[#1A8AE5] uppercase text-center border-b border-[#1A8AE5]/10">Series (20)</th>
                                            <th className="bg-[#E8F3FD]/50 px-3 py-3 text-[10px] font-bold text-[#1A8AE5] uppercase text-center border-b border-[#1A8AE5]/10">Assign (15)</th>
                                            <th className="bg-[#E8F3FD] px-3 py-3 text-xs font-bold text-[#0066CC] uppercase text-center border-b border-[#1A8AE5]/20">Total (40)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {results.map((item) => (
                                            <tr key={item._id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-4 text-sm font-bold text-gray-900 border-b border-gray-50">
                                                    <div className="flex items-center">
                                                        <BookOpen className="w-4 h-4 mr-2 text-gray-400" />
                                                        {item.subject}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-4 text-sm text-gray-600 text-center border-b border-l border-gray-50">{item.attendancePercentage || '-'}</td>
                                                <td className="px-3 py-4 text-sm text-gray-600 text-center border-b border-gray-50">{item.series1 || '-'}</td>
                                                <td className="px-3 py-4 text-sm text-gray-600 text-center border-b border-gray-50">{item.series2 || '-'}</td>
                                                {/* assignment1 holds the single assignment mark for 2024 scheme */}
                                                <td className="px-3 py-4 text-sm text-gray-600 text-center border-b border-gray-50">{item.assignment1 || '-'}</td>

                                                <td className="px-3 py-4 text-sm font-medium text-gray-800 text-center border-b border-l border-gray-50 bg-[#E8F3FD]/10">{item.internalAttendance}</td>
                                                <td className="px-3 py-4 text-sm font-medium text-gray-800 text-center border-b border-gray-50 bg-[#E8F3FD]/10">{item.internalSeries}</td>
                                                <td className="px-3 py-4 text-sm font-medium text-gray-800 text-center border-b border-gray-50 bg-[#E8F3FD]/10">{item.internalAssignments}</td>
                                                <td className="px-3 py-4 text-base font-bold text-[#1A8AE5] text-center border-b border-gray-50 bg-[#E8F3FD]/30">{item.total}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </>
                            ) : (
                                <>
                                    <thead>
                                        <tr>
                                            <th className="bg-gray-50/80 px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100" rowSpan="2">Subject</th>
                                            <th className="bg-gray-50/80 px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center border-b border-l border-gray-100" colSpan="5">Raw Marks</th>
                                            <th className="bg-[#E8F3FD]/50 px-4 py-4 text-xs font-bold text-[#1A8AE5] uppercase tracking-wider text-center border-b border-l border-[#1A8AE5]/10" colSpan="4">Calculated Internals</th>
                                        </tr>
                                        <tr>
                                            <th className="bg-gray-50/80 px-3 py-3 text-[10px] font-bold text-gray-500 uppercase text-center border-b border-l border-gray-100">Attendance %</th>
                                            <th className="bg-gray-50/80 px-3 py-3 text-[10px] font-bold text-gray-500 uppercase text-center border-b border-gray-100">Test 1 (50)</th>
                                            <th className="bg-gray-50/80 px-3 py-3 text-[10px] font-bold text-gray-500 uppercase text-center border-b border-gray-100">Test 2 (50)</th>
                                            <th className="bg-gray-50/80 px-3 py-3 text-[10px] font-bold text-gray-500 uppercase text-center border-b border-gray-100">Assign 1</th>
                                            <th className="bg-gray-50/80 px-3 py-3 text-[10px] font-bold text-gray-500 uppercase text-center border-b border-gray-100">Assign 2</th>

                                            <th className="bg-[#E8F3FD]/50 px-3 py-3 text-[10px] font-bold text-[#1A8AE5] uppercase text-center border-b border-l border-[#1A8AE5]/10">Att (10)</th>
                                            <th className="bg-[#E8F3FD]/50 px-3 py-3 text-[10px] font-bold text-[#1A8AE5] uppercase text-center border-b border-[#1A8AE5]/10">Tests (25)</th>
                                            <th className="bg-[#E8F3FD]/50 px-3 py-3 text-[10px] font-bold text-[#1A8AE5] uppercase text-center border-b border-[#1A8AE5]/10">Assign (15)</th>
                                            <th className="bg-[#E8F3FD] px-3 py-3 text-xs font-bold text-[#0066CC] uppercase text-center border-b border-[#1A8AE5]/20">Total (50)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {results.map((item) => (
                                            <tr key={item._id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-4 text-sm font-bold text-gray-900 border-b border-gray-50">
                                                    <div className="flex items-center">
                                                        <BookOpen className="w-4 h-4 mr-2 text-gray-400" />
                                                        {item.subject}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-4 text-sm text-gray-600 text-center border-b border-l border-gray-50">{item.attendancePercentage || '-'}</td>
                                                <td className="px-3 py-4 text-sm text-gray-600 text-center border-b border-gray-50">{item.test1 || '-'}</td>
                                                <td className="px-3 py-4 text-sm text-gray-600 text-center border-b border-gray-50">{item.test2 || '-'}</td>
                                                <td className="px-3 py-4 text-sm text-gray-600 text-center border-b border-gray-50">{item.assignment1 || '-'}</td>
                                                <td className="px-3 py-4 text-sm text-gray-600 text-center border-b border-gray-50">{item.assignment2 || '-'}</td>

                                                <td className="px-3 py-4 text-sm font-medium text-gray-800 text-center border-b border-l border-gray-50 bg-[#E8F3FD]/10">{item.internalAttendance}</td>
                                                <td className="px-3 py-4 text-sm font-medium text-gray-800 text-center border-b border-gray-50 bg-[#E8F3FD]/10">{item.internalTests}</td>
                                                <td className="px-3 py-4 text-sm font-medium text-gray-800 text-center border-b border-gray-50 bg-[#E8F3FD]/10">{item.internalAssignments}</td>
                                                <td className="px-3 py-4 text-base font-bold text-[#1A8AE5] text-center border-b border-gray-50 bg-[#E8F3FD]/30">{item.total}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </>
                            )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentInternalResults;
