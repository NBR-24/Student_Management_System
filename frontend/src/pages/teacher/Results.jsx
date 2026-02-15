import { useState } from 'react';
import axios from '../../api/axios';
import { Upload, FileText } from 'lucide-react';

const TeacherResults = ({ batches }) => {
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [examType, setExamType] = useState('university');
    const [semester, setSemester] = useState('S1');
    const [selectedBatch, setSelectedBatch] = useState('');

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || !selectedBatch) {
            setMessage('ERROR: Please select a batch and upload a file.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('examType', examType);
        formData.append('batchId', selectedBatch);
        if (examType === 'university') {
            formData.append('semester', semester);
        }

        setMessage('Processing PDF... Dictionary match taking place...');
        setLoading(true);

        try {
            const res = await axios.post('/academic/result/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob' // Important for file download
            });

            // Trigger download of the Excel file
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${examType}_results_${semester}.xlsx`);
            document.body.appendChild(link);
            link.click();

            setMessage('SUCCESS: Results parsed, saved to DB, and Excel generated!');
            setFile(null);
        } catch (error) {
            console.error(error);
            setMessage('ERROR: Failed to process PDF.');
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Result Management</h2>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-2xl">
                <div className="flex items-center mb-6">
                    <div className="h-12 w-12 bg-violet-100 text-violet-600 rounded-2xl flex items-center justify-center mr-4">
                        <Upload className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">Upload Result PDF</h3>
                        <p className="text-gray-500 text-sm">Upload result PDF to auto-generate Excel & publish.</p>
                    </div>
                </div>

                <form onSubmit={handleUpload} className="space-y-6">
                    {/* Batch Selection */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Target Batch</label>
                        <select
                            value={selectedBatch}
                            onChange={(e) => setSelectedBatch(e.target.value)}
                            required
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-transparent focus:ring-4 focus:ring-primary-50 outline-none cursor-pointer"
                        >
                            <option value="">Select a batch...</option>
                            {batches?.map(batch => (
                                <option key={batch._id} value={batch._id}>{batch.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Exam Type Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <div
                            onClick={() => setExamType('university')}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${examType === 'university' ? 'border-primary-600 bg-primary-50 text-primary-700 font-bold' : 'border-gray-100 hover:border-gray-200 text-gray-500'}`}
                        >
                            University Result
                        </div>
                        <div
                            onClick={() => setExamType('internal')}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${examType === 'internal' ? 'border-primary-600 bg-primary-50 text-primary-700 font-bold' : 'border-gray-100 hover:border-gray-200 text-gray-500'}`}
                        >
                            Internal Results
                        </div>
                    </div>

                    {/* Semester Dropdown (Only for University) */}
                    {examType === 'university' && (
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Semester</label>
                            <select
                                value={semester}
                                onChange={(e) => setSemester(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border-transparent focus:ring-4 focus:ring-primary-50 outline-none cursor-pointer"
                            >
                                {['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'].map(sem => (
                                    <option key={sem} value={sem}>{sem}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:bg-gray-50 transition-colors relative cursor-pointer group">
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => setFile(e.target.files[0])}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center">
                            <div className="h-14 w-14 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-3 group-hover:bg-white group-hover:shadow-md transition-all">
                                <FileText className="h-6 w-6" />
                            </div>
                            <span className="font-medium text-gray-700">
                                {file ? file.name : 'Click to upload PDF'}
                            </span>
                            <span className="text-xs text-gray-400 mt-2">.pdf files only</span>
                        </div>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl text-sm font-bold text-center ${message.includes('SUCCESS') ? 'bg-green-100 text-green-700' : 'bg-violet-100 text-violet-700'}`}>
                            {message}
                        </div>
                    )}

                    <button
                        disabled={!file || loading}
                        className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-gray-200 disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : 'Upload & Convert'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TeacherResults;
