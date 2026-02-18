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
                                <span className="text-xs font-bold text-primary-600 uppercase tracking-wider bg-primary-50 px-2 py-1 rounded-md">
                                    {result.examType}
                                </span>
                                <p className="text-gray-400 text-xs mt-2">Published on {new Date(result.date).toLocaleDateString()}</p>
                            </div>
                            <Trophy className="h-6 w-6 text-primary-500" />
                        </div>

                        <div className="space-y-3">
                            {result.subjects.map((sub, sIdx) => (
                                <div key={sIdx} className="flex justify-between items-center py-2">
                                    <span className="font-medium text-gray-700">{sub.subCode}</span>
                                    <span className={`font-bold px-3 py-1 rounded-lg text-sm ${['F', 'Absent'].includes(sub.grade) ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
                                        }`}>
                                        {sub.grade}
                                    </span>
                                </div>
                            ))}
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
        </div>
    );
};

export default StudentResults;
