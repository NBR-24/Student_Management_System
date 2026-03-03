import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import ExamControllerDashboard from './pages/exam_controller/Dashboard';
import TeacherDashboard from './pages/teacher/Dashboard';
import StudentDashboard from './pages/student/Dashboard';
// import Unauthorized from './pages/Unauthorized';

const RedirectToDashboard = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'admin') return <Navigate to="/admin" />;
  if (user.role === 'teacher') return <Navigate to="/teacher" />;
  if (user.role === 'student') return <Navigate to="/student" />;
  if (user.role === 'exam_controller') return <Navigate to="/exam-controller" />;
  return <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RedirectToDashboard />} />

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/*" element={<AdminDashboard />} />
          </Route>

          {/* Teacher Routes */}
          <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
            <Route path="/teacher/*" element={<TeacherDashboard />} />
          </Route>

          {/* Exam Controller Routes */}
          <Route element={<ProtectedRoute allowedRoles={['exam_controller']} />}>
            <Route path="/exam-controller/*" element={<ExamControllerDashboard />} />
          </Route>

          {/* Student Routes */}

          {/* Student Routes */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route path="/student/*" element={<StudentDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
