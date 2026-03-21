import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { X, Trophy, AlertCircle, BookOpen, Building2 } from 'lucide-react';

const ResultAnalysis = ({ batchId, title, type, onClose, mode = 'batch' }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalysis = async () => {
            try {
                let url = '';
                if (mode === 'college') {
                    url = `/academic/result/analysis/college?title=${encodeURIComponent(title)}&type=${type}`;
                } else if (mode === 'department') {
                    url = `/academic/result/analysis/department?title=${encodeURIComponent(title)}&type=${type}`;
                } else {
                    url = `/academic/result/analysis/${batchId}?title=${encodeURIComponent(title)}&type=${type}`;
                }
                const res = await axios.get(url);
                setData(res.data);
            } catch (error) {
                console.error('Error fetching analysis:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalysis();
    }, [batchId, title, type, mode]);

    if (loading) return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-2xl animate-pulse text-gray-700 font-semibold">Loading Analysis...</div>
        </div>
    );

    if (!data) return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-gray-800 p-8 rounded-2xl text-white text-center space-y-3 max-w-sm">
                <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
                <p className="font-bold text-lg">No Data Available</p>
                <p className="text-gray-400 text-sm">No results found for this exam.</p>
                <button onClick={onClose} className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition">Close</button>
            </div>
        </div>
    );

    const COLORS = ['#10B981', '#EF4444'];
    const isCollege = mode === 'college';
    const totalPassRate = data.passFail
        ? ((data.passFail[0].value / (data.passFail[0].value + data.passFail[1].value)) * 100).toFixed(1)
        : 0;

    return (
        <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-md z-50 overflow-y-auto animate-in fade-in duration-300">
            <div className="min-h-screen p-4 md:p-8">

                {/* Header */}
                <div className="flex justify-between items-start mb-8 text-white max-w-7xl mx-auto">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${isCollege ? 'bg-blue-500/20 text-blue-300' :
                                    mode === 'department' ? 'bg-violet-500/20 text-violet-300' :
                                        'bg-gray-500/20 text-gray-300'
                                }`}>
                                {isCollege ? '🌐 College-Wide' :
                                    mode === 'department' ? `🏢 ${data.department || ''} Department` :
                                        '📋 Batch'}
                            </span>
                        </div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                            {mode === 'department' && data.department
                                ? `${data.department} Department Analysis`
                                : 'Result Analysis'}
                        </h1>
                        <p className="text-gray-400 mt-1 text-sm">{title} &nbsp;|&nbsp; {type?.toUpperCase()}
                            {data.totalStudents && <span className="ml-2 text-gray-500">• {data.totalStudents} students</span>}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors mt-1">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Top Performers */}
                        <div className="bg-gray-800/50 border border-gray-700 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500">
                                    <Trophy className="h-6 w-6" />
                                </div>
                                <h2 className="text-xl font-bold text-white">Top 10 Performers</h2>
                            </div>
                            <div className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart layout="vertical" data={data.topPerformers} margin={{ left: 40, right: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151" />
                                        <XAxis type="number" domain={[0, 10]} stroke="#9CA3AF" />
                                        <YAxis type="category" dataKey="name" stroke="#E5E7EB" width={110} tick={{ fontSize: 11 }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }} cursor={{ fill: '#374151' }} />
                                        <Bar dataKey="sgpa" name="SGPA" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fill: '#E5E7EB', fontSize: 12 }} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Pass/Fail Overview */}
                        <div className="bg-gray-800/50 border border-gray-700 rounded-3xl p-6 shadow-xl backdrop-blur-sm flex flex-col">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                    <AlertCircle className="h-6 w-6" />
                                </div>
                                <h2 className="text-xl font-bold text-white">Pass / Fail Overview</h2>
                            </div>
                            <div className="flex-1 min-h-[400px] flex items-center justify-center relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data.passFail}
                                            cx="50%" cy="50%"
                                            innerRadius={100} outerRadius={140}
                                            paddingAngle={5} dataKey="value"
                                        >
                                            {data.passFail.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }} />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-4xl font-bold text-white">{totalPassRate}%</span>
                                    <span className="text-gray-400 text-sm font-medium uppercase tracking-widest mt-1">Pass Rate</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Department Breakdown — only in College mode */}
                    {isCollege && data.deptBreakdown?.length > 0 && (
                        <div className="bg-gray-800/50 border border-gray-700 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                    <Building2 className="h-6 w-6" />
                                </div>
                                <h2 className="text-xl font-bold text-white">Department-wise Breakdown</h2>
                                <span className="ml-2 text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded-full">All Departments</span>
                            </div>
                            <div className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.deptBreakdown} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                        <XAxis dataKey="dept" stroke="#9CA3AF" />
                                        <YAxis stroke="#9CA3AF" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                                            cursor={{ fill: '#374151' }}
                                            formatter={(value, name) => [value, name.charAt(0).toUpperCase() + name.slice(1)]}
                                        />
                                        <Legend iconType="circle" />
                                        <Bar dataKey="pass" name="Passed" stackId="a" fill="#10B981" radius={[0, 0, 4, 4]} />
                                        <Bar dataKey="fail" name="Failed" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            {/* Stats Table */}
                            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {data.deptBreakdown.map(d => {
                                    const rate = d.total > 0 ? ((d.pass / d.total) * 100).toFixed(0) : 0;
                                    return (
                                        <div key={d.dept} className="bg-gray-900/50 rounded-xl p-3 text-center border border-gray-700">
                                            <p className="text-white font-bold text-lg">{d.dept}</p>
                                            <p className="text-gray-400 text-xs mt-1">{d.total} students</p>
                                            <p className={`text-sm font-bold mt-1 ${rate >= 80 ? 'text-green-400' : rate >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{rate}% Pass</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Subject-wise Analysis */}
                    <div className="bg-gray-800/50 border border-gray-700 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-pink-500/10 rounded-lg text-pink-500">
                                <BookOpen className="h-6 w-6" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Subject-wise Performance</h2>
                        </div>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.subjectAnalysis} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                    <XAxis dataKey="code" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                                    <YAxis stroke="#9CA3AF" />
                                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }} cursor={{ fill: '#374151' }} />
                                    <Legend iconType="circle" />
                                    <Bar dataKey="pass" name="Passed" stackId="a" fill="#10B981" radius={[0, 0, 4, 4]} />
                                    <Bar dataKey="fail" name="Failed" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ResultAnalysis;
