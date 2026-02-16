import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { UserPlus, LogOut, Users, School, LayoutDashboard, Trash2, Edit2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard = () => {
    const { logout } = useAuth();
    // Reusing teacherData state structure but renaming conceptually
    const [formData, setFormData] = useState({ name: '', email: '', password: '', department: '' });
    const [staffList, setStaffList] = useState([]);
    const [editingStaff, setEditingStaff] = useState(null);
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState('staff');
    const [activeRole, setActiveRole] = useState('teacher'); // 'teacher', 'exam_controller', 'hod'

    useEffect(() => {
        if (activeTab === 'staff') {
            fetchStaff();
        }
    }, [activeTab, activeRole]);

    const fetchStaff = async () => {
        try {
            const res = await axios.get('/admin/staff', { params: { role: activeRole } });
            setStaffList(res.data);
        } catch (error) {
            console.error('Error fetching staff:', error);
            setStaffList([]);
        }
    };

    const handleAddStaff = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData, role: activeRole };
            const res = await axios.post('/admin/staff', payload);
            setMessage(`${activeRole} added successfully`);
            setStaffList([...staffList, res.data.user]);
            setFormData({ name: '', email: '', password: '', department: '' });
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error adding user');
        }
    };

    const handleUpdateStaff = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData, role: activeRole };
            const res = await axios.put(`/admin/staff/${editingStaff._id}`, payload);
            setMessage('User updated successfully');
            setStaffList(staffList.map(s => s._id === editingStaff._id ? res.data.user : s));
            setFormData({ name: '', email: '', password: '', department: '' });
            setEditingStaff(null);
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error updating user');
        }
    };

    const handleDeleteStaff = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await axios.delete(`/admin/staff/${id}`);
            setStaffList(staffList.filter(s => s._id !== id));
            setMessage('User deleted successfully');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage('Error deleting user');
        }
    };

    const startEdit = (staff) => {
        setEditingStaff(staff);
        setFormData({
            name: staff.name || '',
            email: staff.email || '',
            department: staff.department || '',
            password: ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setEditingStaff(null);
        setFormData({ name: '', email: '', password: '', department: '' });
    };

    const roleLabels = {
        teacher: 'Teachers',
        exam_controller: 'Exam Controllers',
        hod: 'HODs'
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans">
            {/* Sidebar */}
            <aside className="w-72 bg-white border-r border-gray-100 flex-shrink-0 hidden md:flex flex-col shadow-sm z-10">
                <div className="p-8 pb-4">
                    <div className="flex items-center space-x-3 text-primary-700">
                        <School className="h-8 w-8" />
                        <span className="text-xl font-bold tracking-tight">EduAdmin</span>
                    </div>
                </div>

                <nav className="mt-8 px-4 space-y-2 flex-1">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex items-center space-x-3 w-full px-4 py-3.5 rounded-xl transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                        <LayoutDashboard className="h-5 w-5" />
                        <span>Dashboard</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('staff')}
                        className={`flex items-center space-x-3 w-full px-4 py-3.5 rounded-xl transition-all duration-200 ${activeTab === 'staff' ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                    >
                        <Users className="h-5 w-5" />
                        <span>Manage Staff</span>
                    </button>
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={logout}
                        className="flex items-center space-x-3 w-full px-4 py-3 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                        <LogOut className="h-5 w-5" />
                        <span className="font-medium">Sign Out</span>
                    </button>
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
                        <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
                        <p className="text-gray-500 mt-2">Add, edit, and manage teaching and administrative staff.</p>
                    </div>

                    {/* Role Tabs */}
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-8 w-fit">
                        {Object.keys(roleLabels).map((role) => (
                            <button
                                key={role}
                                onClick={() => setActiveRole(role)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeRole === role
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {roleLabels[role]}
                            </button>
                        ))}
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                        <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 flex items-center">
                                    {editingStaff ? <Edit2 className="mr-2 h-5 w-5 text-primary-600" /> : <UserPlus className="mr-2 h-5 w-5 text-primary-600" />}
                                    {editingStaff ? `Edit ${roleLabels[activeRole].slice(0, -1)}` : `Add New ${roleLabels[activeRole].slice(0, -1)}`}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    {editingStaff ? 'Update details for this staff member' : 'Create credentials for a new staff member'}
                                </p>
                            </div>
                            {editingStaff && (
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

                            <form onSubmit={editingStaff ? handleUpdateStaff : handleAddStaff} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <div className="space-y-4 md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Sarah Connor"
                                        className="w-full px-5 py-3 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none transition-all duration-200"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="sarah@school.edu"
                                        className="w-full px-5 py-3 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none transition-all duration-200"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        disabled={editingStaff}
                                    />
                                </div>

                                {(activeRole === 'teacher' || activeRole === 'hod') && (
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-gray-700">Department</label>
                                        <select
                                            required
                                            className="w-full px-5 py-3 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none transition-all duration-200 appearance-none"
                                            value={formData.department}
                                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
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
                                )}

                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        {editingStaff ? 'New Password (Optional)' : 'Initial Password'}
                                    </label>
                                    <input
                                        type="password"
                                        required={!editingStaff}
                                        placeholder="••••••••"
                                        className="w-full px-5 py-3 rounded-xl bg-gray-50 border-gray-200 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none transition-all duration-200"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>

                                <div className="md:col-span-2 pt-4">
                                    <button
                                        type="submit"
                                        className="w-full md:w-auto px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-primary-500/20 hover:shadow-primary-600/30 hover:-translate-y-0.5"
                                    >
                                        {editingStaff ? `Update ${roleLabels[activeRole].slice(0, -1)}` : `Create ${roleLabels[activeRole].slice(0, -1)} Account`}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Staff List */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                            <h2 className="text-lg font-bold text-gray-900">Registered {roleLabels[activeRole]}</h2>
                        </div>
                        <div className="p-0">
                            {staffList.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No {roleLabels[activeRole].toLowerCase()} found.</div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            <th className="px-8 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                                            <th className="px-8 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                                            {(activeRole === 'teacher' || activeRole === 'hod') && (
                                                <th className="px-8 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                                            )}
                                            <th className="px-8 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {staffList.map((staff) => (
                                            <tr key={staff._id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-8 py-4 font-medium text-gray-900">{staff.name}</td>
                                                <td className="px-8 py-4 text-gray-600">{staff.email}</td>
                                                {(activeRole === 'teacher' || activeRole === 'hod') && (
                                                    <td className="px-8 py-4 text-gray-600">
                                                        <span className="px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-medium">
                                                            {staff.department}
                                                        </span>
                                                    </td>
                                                )}
                                                <td className="px-8 py-4 text-right">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <button
                                                            onClick={() => startEdit(staff)}
                                                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteStaff(staff._id)}
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
