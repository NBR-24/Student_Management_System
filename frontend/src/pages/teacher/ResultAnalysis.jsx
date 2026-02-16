import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { X, Trophy, AlertCircle, BookOpen } from 'lucide-react';

const ResultAnalysis = ({ batchId, title, type, onClose, mode = 'batch' }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log("ResultAnalysis mounted with:", { batchId, title, type, mode });
        const fetchAnalysis = async () => {
            try {
                let url = '';
                if (mode === 'college') {
                    url = `/academic/result/analysis/college?title=${title}&type=${type}`;
                } else if (mode === 'department') {
                    url = `/academic/result/analysis/department?title=${title}&type=${type}`;
                } else {
                    // Default to batch
                    url = `/academic/result/analysis/${batchId}?title=${title}&type=${type}`;
                }

                console.log(`Fetching analysis from: ${url}`);
                const res = await axios.get(url);
                console.log("Analysis Data:", res.data);
                setData(res.data);
            } catch (error) {
                console.error("Error fetching analysis:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalysis();
    }, [batchId, title, type, mode]);

    if (loading) return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-2xl animate-pulse">Loading Analysis...</div>
        </div>
    );

    if (!data) return null;

    const COLORS = ['#10B981', '#EF4444']; // Green for Pass, Red for Fail

    return (
        <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-md z-50 overflow-y-auto animate-in fade-in duration-300">
            <div className="min-h-screen p-4 md:p-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8 text-white max-w-7xl mx-auto">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Result Analysis</h1>
                        <p className="text-gray-400 mt-1">{title} | {type}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">

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
                                    <YAxis type="category" dataKey="name" stroke="#E5E7EB" width={100} tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                                        cursor={{ fill: '#374151' }}
                                    />
                                    <Bar dataKey="sgpa" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fill: '#E5E7EB', fontSize: 12 }} />
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
                            <h2 className="text-xl font-bold text-white">Pass/Fail Overview</h2>
                        </div>
                        <div className="flex-1 min-h-[400px] flex items-center justify-center relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.passFail}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={100}
                                        outerRadius={140}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {data.passFail.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Center Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-4xl font-bold text-white">
                                    {(data.passFail[0].value / (data.passFail[0].value + data.passFail[1].value) * 100).toFixed(1)}%
                                </span>
                                <span className="text-gray-400 text-sm font-medium uppercase tracking-widest mt-1">Pass Rate</span>
                            </div>
                        </div>
                    </div>

                    {/* Subject-wise Analysis */}
                    <div className="bg-gray-800/50 border border-gray-700 rounded-3xl p-6 shadow-xl backdrop-blur-sm lg:col-span-2">
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
                                    <XAxis dataKey="code" stroke="#9CA3AF" />
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
