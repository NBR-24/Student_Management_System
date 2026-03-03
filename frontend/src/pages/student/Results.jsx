import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { ChevronLeft, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StudentResults = () => {
    const [results, setResults] = useState([]);
    const [selectedResult, setSelectedResult] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const res = await axios.get('/academic/result/student');
                setResults(res.data);
            } catch (error) { console.error(error); }
        };
        fetchResults();
    }, []);

    const semesters = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'];

    const getResultForSemester = (sem) => {
        return results.find(r => r.title.includes(sem));
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 p-6">
            <div className="flex items-center mb-8">
                <button onClick={() => navigate(-1)} className="mr-4 p-2 bg-white rounded-full text-gray-600 shadow-sm hover:bg-gray-100 transition-colors">
                    <ChevronLeft className="h-6 w-6" />
                </button>
                <h1 className="text-3xl font-bold text-gray-900">University Results</h1>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
                {semesters.map((sem) => {
                    const result = getResultForSemester(sem);
                    const isPublished = !!result;

                    return (
                        <button
                            key={sem}
                            onClick={() => isPublished && setSelectedResult(result)}
                            disabled={!isPublished}
                            className={`
                                relative p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-300
                                ${isPublished
                                    ? 'bg-white shadow-sm shadow-violet-100 border border-transparent hover:border-violet-500 hover:shadow-md cursor-pointer group'
                                    : 'bg-gray-50 border border-gray-200 cursor-not-allowed opacity-60'}
                            `}
                        >
                            <div className={`
                                h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold mb-1
                                ${isPublished ? 'bg-violet-100 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors' : 'bg-gray-200 text-gray-400'}
                            `}>
                                {sem}
                            </div>
                            <span className={`text-xs font-bold ${isPublished ? 'text-gray-900' : 'text-gray-400'}`}>
                                {isPublished ? 'View' : 'N/A'}
                            </span>

                            {/* Status Indicator */}
                            {isPublished && (
                                <div className="absolute top-2 right-2 h-2 w-2 bg-green-500 rounded-full shadow-sm"></div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Result Details Section */}
            {selectedResult && (
                <div className="mt-8 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                    {/* Header */}
                    <div className="bg-violet-600 p-8 text-white">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-3xl font-bold">{selectedResult.title}</h2>
                                <p className="text-violet-200 text-sm mt-1">Published on {new Date(selectedResult.date).toLocaleDateString()}</p>
                            </div>
                            <button
                                onClick={() => setSelectedResult(null)}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold transition-colors"
                            >
                                Close View
                            </button>
                        </div>

                        <div className="mt-8 flex items-center gap-12">
                            <div>
                                <p className="text-5xl font-bold">{selectedResult.sgpa?.toFixed(2) || 'N/A'}</p>
                                <p className="text-violet-200 text-sm font-bold uppercase tracking-wider mt-1">SGPA</p>
                            </div>
                            <div className="h-12 w-px bg-white/20"></div>
                            <div>
                                <p className="text-4xl font-bold">{selectedResult.totalCredits || 0}</p>
                                <p className="text-violet-200 text-sm font-bold uppercase tracking-wider mt-1">Total Credits</p>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-8">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Subject Breakdown</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-12 gap-4 text-xs font-bold text-gray-400 pb-3 border-b border-gray-100">
                                <div className="col-span-8 px-4">Subject Code</div>
                                <div className="col-span-4 text-center">Grade</div>
                            </div>
                            {selectedResult.subjects.map((sub, sIdx) => (
                                <div key={sIdx} className="grid grid-cols-12 gap-4 items-center py-3 hover:bg-gray-50 rounded-xl transition-colors">
                                    <div className="col-span-8 px-4 font-semibold text-gray-700">{sub.subCode}</div>
                                    <div className="col-span-4 text-center">
                                        <span className={`
                                            inline-block w-12 py-1.5 rounded-lg text-xs font-bold
                                            ${['F', 'FE', 'I', 'Absent'].includes(sub.grade) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}
                                        `}>
                                            {sub.grade}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default StudentResults;
