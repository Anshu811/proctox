import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";
import StudentLayout from "./layouts/StudentLayout";
import Home from "./pages/Home";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import StudentDashboard from "./pages/student/StudentDashboard";
import McqExam from "./pages/exam/McqExam";
import CodingExam from "./pages/exam/CodingExam";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import CreateMcqExam from "./pages/teacher/CreateMcqExam";
import CreateCodingExam from "./pages/teacher/CreateCodingExam";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Students only */}
        <Route element={<ProtectedRoute role="student" />}>
          <Route path="/student" element={<StudentLayout />}>
            <Route index element={<StudentDashboard />} />
          </Route>

          {/* Exam: no navbar / sidebar */}
          <Route path="/exam/mcq" element={<McqExam />} />
          <Route path="/exam/mcq/:examId" element={<McqExam />} />
          <Route path="/exam/coding" element={<CodingExam />} />
          <Route path="/exam/coding/:examId" element={<CodingExam />} />
        </Route>

        {/* Teachers only */}
        <Route element={<ProtectedRoute role="teacher" />}>
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/teacher/exams/new" element={<CreateMcqExam />} />
          <Route path="/teacher/exams/new-coding" element={<CreateCodingExam />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}