import { useState } from 'react';
import axios from '../../api/axios';
import { Upload, Download, FileText, CheckCircle, AlertCircle } from 'lucide-react';

const TeacherInternalResults = ({ batches }) => {
    const [selectedBatch, setSelectedBatch] = useState('');
    const [subject, setSubject] = useState('');
    const [file, setFile] = useState(null);
    const [loadingTemplate, setLoadingTemplate] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState(null);

    const handleDownloadTemplate = async () => {
        if (!selectedBatch || !subject.trim()) {
            setMessage({ type: 'error', text: 'Please select a batch and enter a subject name first.' });
            return;
        }

        setLoadingTemplate(true);
        setMessage(null);

        try {
            const response = await axios.get(`/teacher/internal/template/${selectedBatch}?subject=${encodeURIComponent(subject)}`, {
                responseType: 'blob'
            });

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Internal_Template_${subject.replace(/[^a-z0-9]/gi, '_')}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);

            setMessage({ type: 'success', text: 'Template downloaded! Please fill it out without renaming the headers.' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Failed to generate template.' });
        }
        setLoadingTemplate(false);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedBatch || !subject.trim() || !file) {
            setMessage({ type: 'error', text: 'Please provide batch, subject, and the filled Excel file.' });
            return;
        }

        setUploading(true);
        setMessage(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('subject', subject);

        try {
            const res = await axios.post(`/teacher/internal/upload/${selectedBatch}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setMessage({ type: 'success', text: `Success! Uploaded internal marks for ${res.data.count} students.` });
            setFile(null);
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: error.response?.data?.message || 'Upload failed. Ensure the format matches the template.' });
        }
        setUploading(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-8">
                <div className="max-w-3xl">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Publish Internal Results</h2>
                    <p className="text-gray-500 mb-8">
                        Generate a customized Excel template for your batch, fill in the raw marks for Attendance, Tests, and Assignments, and upload it to securely publish internal results.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Target Batch</label>
                            <select
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border-transparent focus:ring-4 focus:ring-[#1A8AE5]/10 outline-none cursor-pointer font-medium"
                                value={selectedBatch}
                                onChange={(e) => setSelectedBatch(e.target.value)}
                            >
                                <option value="">Select a batch...</option>
                                {batches?.map(b => <option key={b._id} value={b._id}>{b.name} ({b.branch})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Subject Name / Code</label>
                            <input
                                type="text"
                                placeholder="e.g. CST 202 COMPUTER ORGANIZATION"
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border-transparent focus:ring-4 focus:ring-[#1A8AE5]/10 outline-none font-medium text-gray-900"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 mb-8">
                        <button
                            onClick={handleDownloadTemplate}
                            disabled={loadingTemplate || !selectedBatch || !subject}
                            className={`flex items-center justify-center px-6 py-3 rounded-xl font-bold transition-all shadow-sm
                                ${(!selectedBatch || !subject || loadingTemplate)
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-white text-[#1A8AE5] border-2 border-[#1A8AE5] hover:bg-[#1A8AE5]/5'}`}
                        >
                            <Download className="w-5 h-5 mr-2" />
                            {loadingTemplate ? 'Generating...' : 'Download Template'}
                        </button>
                    </div>

                    <form onSubmit={handleUpload} className="space-y-6">
                        <div className="border-2 border-dashed border-[#1A8AE5]/30 rounded-2xl p-8 hover:bg-[#1A8AE5]/5 transition-colors group relative cursor-pointer">
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={(e) => setFile(e.target.files[0])}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                required
                            />
                            <div className="flex flex-col items-center text-center">
                                <div className="h-12 w-12 bg-[#1A8AE5]/10 text-[#1A8AE5] rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <FileText className="h-6 w-6" />
                                </div>
                                <span className="text-base font-bold text-gray-700 group-hover:text-[#1A8AE5]">
                                    {file ? file.name : 'Drop the filled Excel here to upload'}
                                </span>
                                <span className="text-sm text-gray-400 mt-2 max-w-sm">
                                    Ensure you have not modified the structure of the downloaded template.
                                </span>
                            </div>
                        </div>

                        {message && (
                            <div className={`flex items-center p-4 rounded-xl text-sm font-bold ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                }`}>
                                {message.type === 'success' ? <CheckCircle className="w-5 h-5 mr-3" /> : <AlertCircle className="w-5 h-5 mr-3" />}
                                {message.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={uploading || !file || !selectedBatch || !subject}
                            className={`w-full py-4 rounded-xl font-bold transition-all shadow-lg
                                ${(!file || !selectedBatch || !subject || uploading)
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-[#1A8AE5] to-blue-600 text-white hover:shadow-blue-500/25 shadow-[#1A8AE5]/20 hover:-translate-y-0.5'}`}
                        >
                            {uploading ? 'Processing Internal Results...' : 'Publish Internal Results'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TeacherInternalResults;
