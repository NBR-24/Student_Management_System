import { Routes, Route } from 'react-router-dom';
import StudentHome from './Home';
import StudentResults from './Results';
import StudentInternalResults from './InternalResults';

const StudentDashboard = () => {
    return (
        <Routes>
            <Route path="/" element={<StudentHome />} />
            <Route path="/results" element={<StudentResults />} />
            <Route path="/internals" element={<StudentInternalResults />} />
            {/* Add more routes here like /assignments */}
        </Routes>
    );
};

export default StudentDashboard;
