import { useState } from 'react';
import axios from '../../api/axios';
import { Upload, FileText } from 'lucide-react';

const TeacherResults = () => {
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
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
            link.setAttribute('download', 'university_results.xlsx');
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
            <h2 className="text-2xl font-bold text-gray-900">University Results Management</h2>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-2xl">
                <div className="flex items-center mb-6">
                    <div className="h-12 w-12 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mr-4">
                        <Upload className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">Upload Result PDF</h3>
                        <p className="text-gray-500 text-sm">Upload university PDF to auto-generate Excel & publish.</p>
                    </div>
                </div>

                <form onSubmit={handleUpload} className="space-y-6">
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
                        <div className={`p-4 rounded-xl text-sm font-bold text-center ${message.includes('SUCCESS') ? 'bg-green-100 text-green-700' : 'bg-primary-50 text-primary-700'}`}>
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
