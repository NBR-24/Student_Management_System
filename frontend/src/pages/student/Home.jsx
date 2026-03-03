import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, Book, CreditCard, Bell, ChevronRight, GraduationCap, Trophy, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StudentHome = () => {
    const { logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await axios.get('/student/me');
                setProfile(res.data);
            } catch (error) { console.error(error); }
        };
        fetchProfile();
    }, []);

    if (!profile) return <div className="h-screen flex items-center justify-center bg-violet-50 text-primary-600 font-bold animate-pulse">Loading Profile...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-24 font-sans max-w-md mx-auto relative shadow-2xl">
            {/* Header Section */}
            <header className="bg-primary-600 text-white pt-12 pb-24 px-6 rounded-b-[2.5rem] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>

                {/* Top Bar */}
                <div className="relative z-10 flex justify-between items-start mb-8">
                    <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl">
                        <GraduationCap className="h-6 w-6 text-white" />
                    </div>
                    <button onClick={logout} className="bg-white/20 backdrop-blur-md p-2 rounded-xl hover:bg-white/30 transition-colors">
                        <LogOut className="h-5 w-5 text-white" />
                    </button>
                </div>

                {/* Greeting */}
                <div className="relative z-10">
                    <p className="text-primary-200 text-sm font-medium mb-1">Welcome back,</p>
                    <h1 className="text-3xl font-bold tracking-tight">{profile.name.split(' ')[0]}</h1>
                </div>
            </header>

            {/* ID Card - Floating */}
            <div className="px-6 -mt-16 relative z-20">
                <div className="bg-white rounded-3xl p-5 shadow-xl shadow-primary-900/10 border border-white/50 backdrop-blur-sm">
                    <div className="flex items-center space-x-4">
                        <div className="h-16 w-16 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 font-bold text-2xl shadow-inner">
                            {profile.name[0]}
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Student ID / Adm No</p>
                            <p className="text-xl font-bold text-gray-800 font-mono tracking-wide">{profile.admissionNo}</p>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
                        <span className="text-gray-500">Status</span>
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Active</span>
                    </div>
                </div>
            </div>

            {/* Grid Menu */}
            <div className="px-6 mt-8">
                <h3 className="text-lg font-bold text-gray-800 mb-4 px-1">Quick Access</h3>
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { icon: User, label: 'Profile', color: 'text-violet-600', bg: 'bg-violet-50', path: '/student' },
                        { icon: Book, label: 'Courses', color: 'text-pink-600', bg: 'bg-pink-50', path: '/student' },
                        { icon: Trophy, label: 'Results', color: 'text-emerald-600', bg: 'bg-emerald-50', path: '/student/results' },
                        { icon: FileText, label: 'Assign.', color: 'text-amber-600', bg: 'bg-amber-50', path: '/student/assignments' },
                    ].map((item, idx) => (
                        <div key={idx} onClick={() => navigate(item.path)} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center aspect-square active:scale-95 transition-transform cursor-pointer">
                            <div className={`h-14 w-14 ${item.bg} ${item.color} rounded-full flex items-center justify-center mb-3`}>
                                <item.icon className="h-7 w-7" />
                            </div>
                            <span className="font-bold text-gray-700 text-sm">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Detail List */}
            <div className="px-6 mt-8">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-5">
                    <div className="flex items-center justify-between group cursor-pointer">
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase">Register ID</p>
                            <p className="font-medium text-gray-800 mt-1">{profile.registerId || 'N/A'}</p>
                        </div>
                        <ChevronRight className="text-gray-300 h-5 w-5" />
                    </div>
                    <div className="flex items-center justify-between group cursor-pointer">
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase">Email Address</p>
                            <p className="font-medium text-gray-800 mt-1">{profile.email || 'Not Provided'}</p>
                        </div>
                        <ChevronRight className="text-gray-300 h-5 w-5" />
                    </div>
                    <div className="flex items-center justify-between group cursor-pointer">
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase">Role</p>
                            <p className="font-medium text-gray-800 mt-1 capitalize">{profile.role}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentHome;
