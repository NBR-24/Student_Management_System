import { Routes, Route } from 'react-router-dom';
import StudentHome from './Home';
import StudentResults from './Results';
import StudentRequests from './Requests';
import WriteRequest from './WriteRequest';
import PreviewRequest from './PreviewRequest';

const StudentDashboard = () => {
    return (
        <Routes>
            <Route path="/"         element={<StudentHome />} />
            <Route path="/results"  element={<StudentResults />} />
            <Route path="/requests" element={<StudentRequests />} />
            <Route path="/requests/new" element={<WriteRequest />} />
            <Route path="/requests/preview" element={<PreviewRequest />} />
        </Routes>
    );
};

export default StudentDashboard;
