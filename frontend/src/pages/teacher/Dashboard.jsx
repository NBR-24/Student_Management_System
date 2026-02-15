import { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { Upload, Plus, Users, LogOut, FileText, ChevronRight, GraduationCap, LayoutDashboard, Calculator, CheckSquare, X, Trash2, Edit2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import TeacherAssignments from './Assignments';
import TeacherResults from './Results';

const TeacherDashboard = () => {
    const { logout } = useAuth();
    const [activeTab, setActiveTab] = useState('manage-batches');
    const [batches, setBatches] = useState([]);
    const [newBatch, setNewBatch] = useState({ name: '', scheme: '2024' });
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [file, setFile] = useState(null);
    const [uploadMessage, setUploadMessage] = useState('');
    const [loading, setLoading] = useState(false);

    // Student Management State
    const [viewingBatch, setViewingBatch] = useState(null);
    const [batchStudents, setBatchStudents] = useState([]);
    const [editingStudent, setEditingStudent] = useState(null);
    const [studentForm, setStudentForm] = useState({ name: '', admissionNo: '', registerId: '' });

    const fetchBatches = async () => {
        try {
            const res = await axios.get('/teacher/batch');
            // Safety check: ensure we set an array
            if (Array.isArray(res.data)) {
                setBatches(res.data);
            } else {
                console.error('Invalid batches format:', res.data);
                setBatches([]);
            }
        } catch (error) {
            console.error('Error fetching batches:', error);
            setBatches([]); // Fallback to empty array on error
        }
    };

    useEffect(() => { fetchBatches(); }, []);

    // Use optional chaining for length checks to prevent crashes
    const totalBatches = batches?.length || 0;

    const handleCreateBatch = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('/teacher/batch', newBatch);
            setNewBatch({ name: '', scheme: '2024' });
            fetchBatches();
        } catch (error) { console.error(error); }
        setLoading(false);
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!file || !selectedBatch) return;

        const formData = new FormData();
        formData.append('file', file);
        setUploadMessage('Uploading...');

        try {
            const res = await axios.post(`/teacher/batch/${selectedBatch}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUploadMessage(`SUCCESS: ${res.data.count} students uploaded & credentials generated!`);
            setFile(null);
            fetchBatches();
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.message || 'Upload failed. Check format.';
            const details = error.response?.data?.errors ? ` (${error.response.data.errors[0]})` : '';
            setUploadMessage(`ERROR: ${msg}${details}`);
        }
    }

    const openBatchDetails = async (batch) => {
        setViewingBatch(batch);
        try {
            const res = await axios.get(`/teacher/batch/${batch._id}`);
            setBatchStudents(res.data.students || []);
        } catch (error) {
            console.error('Error fetching batch details:', error);
        }
    };

    const handleDeleteStudent = async (studentId) => {
        if (!window.confirm('Are you sure you want to remove this student?')) return;
        try {
            await axios.delete(`/teacher/student/${studentId}`);
            setBatchStudents(batchStudents.filter(s => s._id !== studentId));
            fetchBatches(); // Update counts
        } catch (error) {
            console.error('Error deleting student', error);
        }
    };

    const startEditStudent = (student) => {
        setEditingStudent(student);
        setStudentForm({
            name: student.name,
            admissionNo: student.admissionNo,
            registerId: student.registerId
        });
    };

    const handleUpdateStudent = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.put(`/teacher/student/${editingStudent._id}`, studentForm);
            setBatchStudents(batchStudents.map(s => s._id === editingStudent._id ? res.data.student : s));
            setEditingStudent(null);
        } catch (error) {
            console.error('Error updating student', error);
        }
    };

    const renderDashboard = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Actions */}
            <div className="lg:col-span-1 space-y-8">
                {/* Create Batch Card */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 bg-gradient-to-r from-primary-600 to-violet-600">
                        <h2 className="text-lg font-bold text-white flex items-center">
                            <Plus className="mr-2 h-5 w-5 opacity-80" />
                            New Batch
                        </h2>
                        <p className="text-primary-100 text-sm mt-1">Initialize a new student group</p>
                    </div>
                    <div className="p-6">
                        <form onSubmit={handleCreateBatch} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Batch ID / Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Class of 2025"
                                    className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all font-medium"
                                    value={newBatch.name}
                                    onChange={(e) => setNewBatch({ ...newBatch, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Scheme</label>
                                <select
                                    className="mt-1 w-full px-4 py-3 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all font-medium"
                                    value={newBatch.scheme}
                                    onChange={(e) => setNewBatch({ ...newBatch, scheme: e.target.value })}
                                    required
                                >
                                    <option value="2024">2024</option>
                                    <option value="2019">2019</option>
                                </select>
                            </div>
                            {/* Department input removed as per user request (Auto-assigned) */}
                            <button
                                disabled={loading}
                                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors shadow-lg shadow-gray-200"
                            >
                                {loading ? 'Creating...' : 'Create Batch'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Upload Card */}
                <div className="bg-white rounded-3xl shadow-lg shadow-primary-500/5 border border-primary-100 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Upload className="h-24 w-24 text-primary-600" />
                    </div>
                    <div className="p-6">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center mb-4">
                            <Upload className="mr-2 h-5 w-5 text-primary-600" />
                            Bulk Upload
                        </h2>

                        <form onSubmit={handleFileUpload} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Target Batch</label>
                                <select
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-transparent focus:ring-4 focus:ring-primary-50 outline-none cursor-pointer"
                                    onChange={(e) => setSelectedBatch(e.target.value)}
                                    required
                                >
                                    <option value="">Select a batch...</option>
                                    {batches.map(b => <option key={b._id} value={b._id}>{b.name} ({b.branch})</option>)}
                                </select>
                            </div>

                            <div className="border-2 border-dashed border-primary-200 rounded-2xl p-6 text-center hover:bg-primary-50 transition-colors group cursor-pointer relative">
                                <input
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    onChange={(e) => setFile(e.target.files[0])}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="flex flex-col items-center">
                                    <div className="h-10 w-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-600 group-hover:text-primary-700">
                                        {file ? file.name : 'Drop Excel file here'}
                                    </span>
                                    <span className="text-xs text-gray-400 mt-1">.xlsx or .csv</span>
                                </div>
                            </div>

                            {uploadMessage && (
                                <div className={`text-xs font-bold p-3 rounded-lg text-center ${uploadMessage.includes('SUCCESS') ? 'bg-green-100 text-green-700' : 'bg-primary-100 text-primary-700'}`}>
                                    {uploadMessage}
                                </div>
                            )}

                            <button
                                disabled={!file || !selectedBatch}
                                className="w-full py-3 bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20"
                            >
                                Process & Generate Logins
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Right Column: Batches List */}
            <div className="lg:col-span-2">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Active Batches</h2>
                        <p className="text-gray-500">Overview of all student groups under your management.</p>
                    </div>
                    <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs font-bold">
                        {totalBatches} Total
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.isArray(batches) && batches.map(batch => (
                        <div
                            key={batch._id}
                            onClick={() => openBatchDetails(batch)}
                            className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group cursor-pointer"
                        >
                            <div className="flex justify-between items-start">
                                <div className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                                    <Users className="h-6 w-6" />
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-primary-500 transition-colors" />
                            </div>

                            <div className="mt-4">
                                <h3 className="font-bold text-lg text-gray-900 group-hover:text-primary-700 transition-colors">{batch.name}</h3>
                                <p className="text-sm text-gray-500 font-medium">{batch.branch}</p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-8 w-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] text-gray-500 font-bold">
                                            S{i}
                                        </div>
                                    ))}
                                    {(batch.students?.length || 0) > 3 && (
                                        <div className="h-8 w-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] text-gray-500 font-bold">
                                            +{batch.students.length - 3}
                                        </div>
                                    )}
                                </div>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                                    {batch.students?.length || 0} Students
                                </span>
                            </div>
                        </div>
                    ))}
                    {totalBatches === 0 && (
                        <div className="col-span-2 py-12 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                            <div className="mx-auto h-12 w-12 text-gray-300">
                                <Users className="h-full w-full" />
                            </div>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No batches yet</h3>
                            <p className="mt-1 text-sm text-gray-500">Get started by creating a new batch on the left.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Student Management Modal */}
            {viewingBatch && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{viewingBatch.name}</h2>
                                <p className="text-sm text-gray-500">{batchStudents.length} Students Enrolled</p>
                            </div>
                            <button onClick={() => setViewingBatch(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X className="h-6 w-6 text-gray-500" />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-6">
                            {editingStudent ? (
                                <form onSubmit={handleUpdateStudent} className="space-y-4 bg-gray-50 p-6 rounded-2xl">
                                    <h3 className="font-bold text-gray-800">Edit Student</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <input
                                            className="px-4 py-2 rounded-xl border-gray-200"
                                            placeholder="Name"
                                            value={studentForm.name}
                                            onChange={e => setStudentForm({ ...studentForm, name: e.target.value })}
                                        />
                                        <input
                                            className="px-4 py-2 rounded-xl border-gray-200"
                                            placeholder="Admission No"
                                            value={studentForm.admissionNo}
                                            onChange={e => setStudentForm({ ...studentForm, admissionNo: e.target.value })}
                                        />
                                        <input
                                            className="px-4 py-2 rounded-xl border-gray-200"
                                            placeholder="Register ID"
                                            value={studentForm.registerId}
                                            onChange={e => setStudentForm({ ...studentForm, registerId: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex space-x-2">
                                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium">Save Changes</button>
                                        <button type="button" onClick={() => setEditingStudent(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium">Cancel</button>
                                    </div>
                                </form>
                            ) : null}

                            <table className="w-full text-left mt-4">
                                <thead className="bg-gray-50/50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Roll No</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Adm No</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {batchStudents.map(student => (
                                        <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs text-gray-500">{student.registerId}</td>
                                            <td className="px-4 py-3 font-medium text-gray-900">{student.name}</td>
                                            <td className="px-4 py-3 text-gray-600 font-mono text-xs">{student.admissionNo}</td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end space-x-2">
                                                    <button onClick={() => startEditStudent(student)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteStudent(student._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {batchStudents.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="text-center py-8 text-gray-400">No students available. Upload an Excel file to add them.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'manage-batches':
                return renderDashboard();
            case 'assignments':
                return <TeacherAssignments />;
            case 'results':
                return <TeacherResults batches={batches} />;
            default:
                return renderDashboard();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 w-72 bg-white border-r border-gray-100 hidden lg:flex flex-col z-20">
                <div className="p-8">
                    <div className="flex items-center space-x-3 text-primary-600 mb-2">
                        <div className="h-10 w-10 bg-primary-50 rounded-xl flex items-center justify-center">
                            <GraduationCap className="h-6 w-6" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-gray-900">Academia</span>
                    </div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-widest pl-14">Teacher Portal</p>
                </div>

                <nav className="flex-1 px-4 space-y-2 py-4">
                    {[
                        { id: 'manage-batches', label: 'Manage Batches', icon: LayoutDashboard },
                        { id: 'assignments', label: 'Assignments', icon: Calculator },
                        { id: 'results', label: 'Results', icon: CheckSquare },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center space-x-3.5 px-6 py-3.5 rounded-2xl transition-all duration-200 group font-medium ${activeTab === item.id
                                ? 'bg-primary-50 text-primary-700 shadow-sm shadow-primary-500/10'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <item.icon className={`h-5 w-5 ${activeTab === item.id ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                            <span>{item.label}</span>
                            {activeTab === item.id && (
                                <ChevronRight className="h-4 w-4 ml-auto text-primary-400" />
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-4 mt-auto">
                    <button
                        onClick={logout}
                        className="w-full flex items-center space-x-3 px-6 py-4 rounded-2xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors group"
                    >
                        <LogOut className="h-5 w-5 group-hover:text-red-500 transition-colors" />
                        <span className="font-medium">Sign Out</span>
                    </button>
                    <div className="mt-4 px-6 pb-4 text-center">
                        <p className="text-xs text-gray-300 font-medium">© 2025 Academia Inc.</p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:ml-72 flex-1 min-h-screen">
                <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-extrabold text-gray-900 capitalize text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600">
                            {activeTab === 'manage-batches' ? 'Manage Batches' : activeTab}
                        </h1>
                        <p className="text-sm text-gray-500 font-medium mt-0.5">Welcome back, Professor</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 bg-gradient-to-br from-primary-500 to-violet-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-primary-500/20 ring-4 ring-white">
                            P
                        </div>
                    </div>
                </header>

                <div className="p-8 max-w-7xl mx-auto">
                    {renderContent()}
                </div>
            </main>

            {/* Student Management Modal */}
            {viewingBatch && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{viewingBatch.name}</h2>
                                <p className="text-sm text-gray-500">{batchStudents.length} Students Enrolled</p>
                            </div>
                            <button onClick={() => setViewingBatch(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X className="h-6 w-6 text-gray-500" />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-6">
                            {editingStudent ? (
                                <form onSubmit={handleUpdateStudent} className="space-y-4 bg-gray-50 p-6 rounded-2xl mb-6 border border-gray-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold text-gray-800 flex items-center">
                                            <Edit2 className="h-4 w-4 mr-2 text-primary-500" />
                                            Edit Student Details
                                        </h3>
                                        <button type="button" onClick={() => setEditingStudent(null)} className="text-xs text-gray-500 hover:text-gray-900 font-bold uppercase">Cancel</button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Full Name</label>
                                            <input
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                                                placeholder="Name"
                                                value={studentForm.name}
                                                onChange={e => setStudentForm({ ...studentForm, name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Admission No</label>
                                            <input
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                                                placeholder="Admission No"
                                                value={studentForm.admissionNo}
                                                onChange={e => setStudentForm({ ...studentForm, admissionNo: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Register ID</label>
                                            <input
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                                                placeholder="Register ID"
                                                value={studentForm.registerId}
                                                onChange={e => setStudentForm({ ...studentForm, registerId: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <button type="submit" className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-gray-200">Save Changes</button>
                                    </div>
                                </form>
                            ) : null}

                            <table className="w-full text-left">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase rounded-l-xl">Roll No</th>
                                        <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Name</th>
                                        <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Adm No</th>
                                        <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right rounded-r-xl">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {batchStudents.map(student => (
                                        <tr key={student._id} className="hover:bg-gray-50/80 transition-colors group">
                                            <td className="px-4 py-3.5 font-mono text-xs text-gray-500 font-bold">{student.registerId}</td>
                                            <td className="px-4 py-3.5 font-medium text-gray-900">{student.name}</td>
                                            <td className="px-4 py-3.5 text-gray-500 font-mono text-xs">{student.admissionNo}</td>
                                            <td className="px-4 py-3.5 text-right">
                                                <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => startEditStudent(student)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteStudent(student._id)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {batchStudents.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="text-center py-12">
                                                <div className="mx-auto h-12 w-12 text-gray-200 mb-2">
                                                    <Users className="h-full w-full" />
                                                </div>
                                                <p className="text-gray-400 font-medium text-sm">No students available.</p>
                                                <p className="text-gray-300 text-xs mt-1">Upload an Excel file to add them.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherDashboard;
