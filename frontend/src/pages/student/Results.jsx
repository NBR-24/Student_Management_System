import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { ChevronLeft, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StudentResults = () => {
    const [results, setResults] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const res = await axios.get('/academic/result/student');
                // Backend returns array of Result documents. 
                setResults(res.data);
            } catch (error) { console.error(error); }
        };
        fetchResults();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 pb-20 p-6">
            <div className="flex items-center mb-6">
                <button onClick={() => navigate(-1)} className="mr-3 p-2 bg-white rounded-full text-gray-600 shadow-sm">
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">My Results</h1>
            </div>

            <div className="space-y-6">
                {results.map((result, idx) => (
                    <div key={idx} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">{result.title}</h3>
                                <span className="text-xs font-bold text-primary-600 uppercase tracking-wider bg-primary-50 px-2 py-1 rounded-md mt-1 inline-block">
                                    {result.type}
                                </span>
                                <p className="text-gray-400 text-xs mt-2">Published on {new Date(result.date).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right flex items-center gap-4">
                                <div>
                                    <p className="text-2xl font-bold text-primary-600">{result.sgpa?.toFixed(2) || 'N/A'}</p>
                                    <p className="text-xs text-gray-400 font-bold">SGPA</p>
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-gray-700">{result.totalCredits || 0}</p>
                                    <p className="text-xs text-gray-400 font-bold">Credits</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="grid grid-cols-12 gap-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">
                                <div className="col-span-6">Subject</div>
                                <div className="col-span-3 text-center">Grade</div>
                                <div className="col-span-3 text-right">Points</div>
                            </div>
                            {result.subjects.map((sub, sIdx) => {
                                const points = { 'S': 10, 'A+': 9, 'A': 8.5, 'B+': 8, 'B': 7.5, 'C+': 7, 'C': 6.5, 'D': 6, 'P': 5.5, 'F': 0, 'FE': 0, 'I': 0, 'Absent': 0 }[sub.grade] || 0;
                                return (
                                    <div key={sIdx} className="grid grid-cols-12 gap-4 items-center py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 px-2 rounded-lg transition-colors">
                                        <div className="col-span-6 font-medium text-gray-700">{sub.subCode}</div>
                                        <div className="col-span-3 text-center">
                                            <span className={`font-bold px-2 py-1 rounded text-xs ${['F', 'FE', 'I', 'Absent'].includes(sub.grade) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                {sub.grade}
                                            </span>
                                        </div>
                                        <div className="col-span-3 text-right font-semibold text-gray-600">
                                            {points}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {results.length === 0 && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center py-12">
                        <div className="mx-auto h-12 w-12 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mb-3">
                            <Trophy className="h-6 w-6" />
                        </div>
                        <p className="text-gray-500 text-sm">No results found.</p>
                    </div>
                )}
            </div>
        </div >
    );
};

export default StudentResults;
