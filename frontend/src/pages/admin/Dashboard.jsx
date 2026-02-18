import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { UserPlus, LogOut, Users, School, LayoutDashboard, Trash2, Edit2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard = () => {
    const { logout } = useAuth();
    const [teacherData, setTeacherData] = useState({ name: '', email: '', password: '', department: '' });
    const [teachers, setTeachers] = useState([]);
    const [editingTeacher, setEditingTeacher] = useState(null);
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState('teachers');

    useEffect(() => {
        if (activeTab === 'teachers') {
            fetchTeachers();
        }
    }, [activeTab]);

    const fetchTeachers = async () => {
        try {
            const res = await axios.get('/admin/teacher');
            setTeachers(res.data);
        } catch (error) {
            console.error('Error fetching teachers:', error);
        }
    };

    const handleAddTeacher = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('/admin/teacher', teacherData);
            setMessage('Teacher added successfully');
            setTeachers([...teachers, res.data.teacher]);
            setTeacherData({ name: '', email: '', password: '', department: '' });
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error adding teacher');
        }
    };

    const handleUpdateTeacher = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.put(`/admin/teacher/${editingTeacher._id}`, teacherData);
            setMessage('Teacher updated successfully');
            setTeachers(teachers.map(t => t._id === editingTeacher._id ? res.data.teacher : t));
            setTeacherData({ name: '', email: '', password: '', department: '' });
            setEditingTeacher(null);
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error updating teacher');
        }
    };

    const handleDeleteTeacher = async (id) => {
        if (!window.confirm('Are you sure you want to delete this teacher?')) return;
        try {
            await axios.delete(`/admin/teacher/${id}`);
            setTeachers(teachers.filter(t => t._id !== id));
            setMessage('Teacher deleted successfully');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('Error deleting teacher');
        }
    };

    const startEdit = (teacher) => {
        setEditingTeacher(teacher);
        setTeacherData({
            name: teacher.name || '',
            email: teacher.email || '',
            department: teacher.department || '',
            password: '' // Don't fill password
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setEditingTeacher(null);
        setTeacherData({ name: '', email: '', password: '', department: '' });
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans">
            {/* Sidebar */}
            {/* Sidebar */}
            <aside className="w-[250px] bg-white border-r border-gray-100 flex-shrink-0 hidden md:flex flex-col shadow-sm z-10">
                <div className="pt-[24px] px-6 pb-4">
                    <div className="flex items-center space-x-3 text-[#1A8AE5] mb-8">
                        <div className="h-8 w-8 bg-[#1A8AE5]/10 rounded-lg flex items-center justify-center">
                            <School className="h-5 w-5 text-[#1A8AE5]" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-gray-900">EduCore</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-[16px] py-2">
                    <button
                        onClick={() => setActiveTab('teachers')}
                        className={`w-full flex items-center gap-[12px] px-[18px] py-[12px] rounded-[10px] transition-all duration-200 ease-in-out group font-medium relative ${activeTab === 'teachers' ? 'bg-[#E8F3FD] text-[#1A8AE5]' : 'text-[#4B5563] hover:bg-[#F3F4F6] bg-transparent'}`}
                    >
                        {activeTab === 'teachers' && (
                            <div className="absolute left-2 top-1/2 -translate-y-1/2 h-6 w-1 bg-[#1A8AE5] rounded-full"></div>
                        )}
                        <Users className={`w-[18px] h-[18px] ${activeTab === 'teachers' ? 'text-[#1A8AE5]' : 'text-gray-400 group-hover:text-gray-500'}`} />
                        <span className="text-[15px]">Manage Teachers</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`w-full flex items-center gap-[12px] px-[18px] py-[12px] rounded-[10px] transition-all duration-200 ease-in-out group font-medium relative ${activeTab === 'dashboard' ? 'bg-[#E8F3FD] text-[#1A8AE5]' : 'text-[#4B5563] hover:bg-[#F3F4F6] bg-transparent'}`}
                    >
                        {activeTab === 'dashboard' && (
                            <div className="absolute left-2 top-1/2 -translate-y-1/2 h-6 w-1 bg-[#1A8AE5] rounded-full"></div>
                        )}
                        <LayoutDashboard className={`w-[18px] h-[18px] ${activeTab === 'dashboard' ? 'text-[#1A8AE5]' : 'text-gray-400 group-hover:text-gray-500'}`} />
                        <span className="text-[15px]">Dashboard</span>
                    </button>
                </nav>

                <div className="p-4 mt-auto">
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-[12px] px-[18px] py-[12px] rounded-[10px] text-[#4B5563] hover:bg-red-50 hover:text-red-600 transition-colors duration-200 ease-in-out group mt-4"
                    >
                        <LogOut className="w-[18px] h-[18px] group-hover:text-red-500 transition-colors" />
                        <span className="font-medium text-[15px]">Sign Out</span>
                    </button>
                    <div className="mt-4 px-2 pb-2 text-center">
                        <p className="text-[10px] text-gray-300 font-medium">© 2025 EduCore Inc.</p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-slate-50/50">
                {/* Mobile Header */}
                <header className="md:hidden bg-white px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-20">
                    <div className="flex items-center space-x-2 text-primary-700">
                        <School className="h-6 w-6" />
                        <span className="font-bold text-lg">EduAdmin</span>
                    </div>
                    <button onClick={logout} className="p-2 bg-gray-100 rounded-full text-gray-600">
                        <LogOut className="h-5 w-5" />
                    </button>
                </header>

                <div className="p-6 md:p-10 max-w-5xl mx-auto">
                    <div className="mb-10">
                        <h1 className="text-3xl font-bold text-gray-900">Teacher Management</h1>
                        <p className="text-gray-500 mt-2">Add, edit, and manage teaching staff access.</p>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                        <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 flex items-center">
                                    {editingTeacher ? <Edit2 className="mr-2 h-5 w-5 text-primary-600" /> : <UserPlus className="mr-2 h-5 w-5 text-primary-600" />}
                                    {editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    {editingTeacher ? 'Update details for this staff member' : 'Create credentials for a new staff member'}
                                </p>
                            </div>
                            {editingTeacher && (
                                <button onClick={cancelEdit} className="p-2 text-gray-400 hover:text-gray-600 bg-white rounded-lg border border-gray-200">
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>

                        <div className="p-8">
                            {message && (
                                <div className={`px-4 py-3 rounded-xl mb-8 flex items-center ${message.includes('Error') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                                    <span className="font-medium text-sm">{message}</span>
                                </div>
                            )}

                            <form onSubmit={editingTeacher ? handleUpdateTeacher : handleAddTeacher} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <div className="space-y-4 md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Sarah Connor"
                                        className="w-full px-5 py-3 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none transition-all duration-200"
                                        value={teacherData.name}
                                        onChange={(e) => setTeacherData({ ...teacherData, name: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="sarah@school.edu"
                                        className="w-full px-5 py-3 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none transition-all duration-200"
                                        value={teacherData.email}
                                        onChange={(e) => setTeacherData({ ...teacherData, email: e.target.value })}
                                        disabled={editingTeacher} // Often email isn't editable or needs special handling, but assume yes for now
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">Department</label>
                                    <select
                                        required
                                        className="w-full px-5 py-3 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none transition-all duration-200 appearance-none"
                                        value={teacherData.department}
                                        onChange={(e) => setTeacherData({ ...teacherData, department: e.target.value })}
                                    >
                                        <option value="" disabled>Select Department</option>
                                        <option value="Computer Science and Engineering">Computer Science and Engineering</option>
                                        <option value="Electronics and Communication Engineering">Electronics and Communication Engineering</option>
                                        <option value="Electrical and Electronics Engineering">Electrical and Electronics Engineering</option>
                                        <option value="Information Technology">Information Technology</option>
                                        <option value="Civil Engineering">Civil Engineering</option>
                                        <option value="Mechanical Engineering">Mechanical Engineering</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        {editingTeacher ? 'New Password (Optional)' : 'Initial Password'}
                                    </label>
                                    <input
                                        type="password"
                                        required={!editingTeacher}
                                        placeholder="••••••••"
                                        className="w-full px-5 py-3 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none transition-all duration-200"
                                        value={teacherData.password}
                                        onChange={(e) => setTeacherData({ ...teacherData, password: e.target.value })}
                                    />
                                </div>

                                <div className="md:col-span-2 pt-4">
                                    <button
                                        type="submit"
                                        className="w-full md:w-auto px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-primary-500/20 hover:shadow-primary-600/30 hover:-translate-y-0.5"
                                    >
                                        {editingTeacher ? 'Update Teacher' : 'Create Teacher Account'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Teacher List */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                            <h2 className="text-lg font-bold text-gray-900">Registered Teachers</h2>
                        </div>
                        <div className="p-0">
                            {teachers.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No teachers found.</div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            <th className="px-8 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                                            <th className="px-8 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                                            <th className="px-8 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                                            <th className="px-8 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {teachers.map((teacher) => (
                                            <tr key={teacher._id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-8 py-4 font-medium text-gray-900">{teacher.name}</td>
                                                <td className="px-8 py-4 text-gray-600">{teacher.email}</td>
                                                <td className="px-8 py-4 text-gray-600">
                                                    <span className="px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium">
                                                        {teacher.department}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-4 text-right">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <button
                                                            onClick={() => startEdit(teacher)}
                                                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteTeacher(teacher._id)}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
