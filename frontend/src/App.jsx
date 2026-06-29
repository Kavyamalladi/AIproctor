import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import { ToastContainer} from 'react-toastify';
import ForgotPassword from './pages/ForgotPassword'
import getCurrentUser from './customHooks/getCurrentUser'
import { useSelector } from 'react-redux'
import Profile from './pages/Profile'
import EditProfile from './pages/EditProfile'
import Dashboard from './pages/admin/Dashboard'
import Courses from './pages/admin/Courses'
import AllCouses from './pages/AllCouses'
import AddCourses from './pages/admin/AddCourses'
import CreateCourse from './pages/admin/CreateCourse'
import CreateLecture from './pages/admin/CreateLecture'
import EditLecture from './pages/admin/EditLecture'
import getCouseData from './customHooks/getCouseData'
import ViewCourse from './pages/ViewCourse'
import ScrollToTop from './components/ScrollToTop'
import getCreatorCourseData from './customHooks/getCreatorCourseData'
import EnrolledCourse from './pages/EnrolledCourse'
import ViewLecture from './pages/ViewLecture'
import SearchWithAi from './pages/SearchWithAi'
import getAllReviews from './customHooks/getAllReviews'
import NotFound from './pages/NotFound';
import useSocketCourseJoin from './customHooks/useSocketCourseJoin'
// Exam Management imports
import ExamManagement from './pages/admin/ExamManagement'
import CreateExam from './pages/admin/CreateExam'
import ExamQuestions from './pages/admin/ExamQuestions'
import ExamAnalytics from './pages/admin/ExamAnalytics'
import EditExam from './pages/admin/EditExam'
import ExamAttemptDetail from './pages/admin/ExamAttemptDetail'
// Student Exam imports
import StudentExams from './pages/StudentExams'
import TakeExam from './pages/TakeExam'
import ExamResult from './pages/ExamResult'
import ExamPreInstructions from './pages/ExamPreInstructions'
import TeacherApplication from './pages/TeacherApplication'
import AdminPanel from './pages/admin/AdminPanel'
import AdminTeacherCourses from './pages/admin/AdminTeacherCourses'
import AdminCourseStudents from './pages/admin/AdminCourseStudents'
// Certification Interview imports
import CertificationPreInstructions from './pages/CertificationPreInstructions'
import CertificationInterview from './pages/CertificationInterview'
import CertificationResult from './pages/CertificationResult'
import MyCertificates from './pages/MyCertificates'



function App() {
  
  let {userData} = useSelector(state => state.user)
  const isEducator = userData?.role === "educator"
  const isAdmin = userData?.role === "admin"
  const isEducatorApproved = isEducator && userData?.teacherApplication?.status === "approved"

  // Join course rooms globally for real-time announcements
  useSocketCourseJoin()

  getCurrentUser()
  getCouseData()
  getCreatorCourseData()
  getAllReviews()

  return (
    <>
      <ToastContainer/>
      <ScrollToTop/>
      <Routes>
        <Route path='/' element={<Home/>}/>
        <Route path='/login' element={<Login/>}/>
        <Route path='/signup' element={!userData ? <SignUp/> : <Navigate to={"/"}/>}/>
        <Route path='/profile' element={userData ? <Profile/> : <Navigate to={"/signup"}/>}/>
        <Route path='/allcourses' element={userData ? <AllCouses/> : <Navigate to={"/signup"}/>}/>
        <Route path='/viewcourse/:courseId' element={userData ? <ViewCourse/> : <Navigate to={"/signup"}/>}/>
        <Route path='/editprofile' element={userData ? <EditProfile/> : <Navigate to={"/signup"}/>}/>
        <Route path='/enrolledcourses' element={userData ? <EnrolledCourse/> : <Navigate to={"/signup"}/>}/>
        <Route path='/viewlecture/:courseId' element={userData ? <ViewLecture/> : <Navigate to={"/signup"}/>}/>
        <Route path='/searchwithai' element={userData ? <SearchWithAi/> : <Navigate to={"/signup"}/>}/>
        <Route path='/teacher-application' element={isEducator ? <TeacherApplication/> : <Navigate to={"/signup"}/>}/>
        <Route path='/adminpanel' element={isAdmin ? <AdminPanel/> : <Navigate to={"/signup"}/>}/>
        <Route path='/admin/teacher-courses/:teacherId' element={isAdmin ? <AdminTeacherCourses/> : <Navigate to={"/signup"}/>}/>
        <Route path='/admin/course-students/:courseId' element={isAdmin ? <AdminCourseStudents/> : <Navigate to={"/signup"}/>}/>
        
        
        <Route path='/dashboard' element={isEducatorApproved ? <Dashboard/> : <Navigate to={isEducator ? "/teacher-application" : "/signup"}/>}/>
        <Route path='/courses' element={isEducatorApproved ? <Courses/> : <Navigate to={isEducator ? "/teacher-application" : "/signup"}/>}/>
        <Route path='/addcourses/:courseId' element={isEducatorApproved ? <AddCourses/> : <Navigate to={isEducator ? "/teacher-application" : "/signup"}/>}/>
        <Route path='/createcourses' element={isEducatorApproved ? <CreateCourse/> : <Navigate to={isEducator ? "/teacher-application" : "/signup"}/>}/>
        <Route path='/createlecture/:courseId' element={isEducatorApproved ? <CreateLecture/> : <Navigate to={isEducator ? "/teacher-application" : "/signup"}/>}/>
        <Route path='/editlecture/:courseId/:lectureId' element={isEducatorApproved ? <EditLecture/> : <Navigate to={isEducator ? "/teacher-application" : "/signup"}/>}/>
        
        {/* Educator Exam Routes */}
        <Route path='/exammanagement/:courseId' element={isEducatorApproved ? <ExamManagement/> : <Navigate to={isEducator ? "/teacher-application" : "/signup"}/>}/>
        <Route path='/createexam/:courseId' element={isEducatorApproved ? <CreateExam/> : <Navigate to={isEducator ? "/teacher-application" : "/signup"}/>}/>
        <Route path='/editexam/:examId' element={isEducatorApproved ? <EditExam/> : <Navigate to={isEducator ? "/teacher-application" : "/signup"}/>}/>
        <Route path='/examquestions/:examId' element={isEducatorApproved ? <ExamQuestions/> : <Navigate to={isEducator ? "/teacher-application" : "/signup"}/>}/>
        <Route path='/examanalytics/:examId' element={isEducatorApproved ? <ExamAnalytics/> : <Navigate to={isEducator ? "/teacher-application" : "/signup"}/>}/>
        <Route path='/examattempt/:attemptId' element={isEducatorApproved ? <ExamAttemptDetail/> : <Navigate to={isEducator ? "/teacher-application" : "/signup"}/>}/>
        
        {/* Student Exam Routes */}
        <Route path='/studentexams' element={userData ? <StudentExams/> : <Navigate to={"/signup"}/>}/>
        <Route path='/studentexams/:courseId' element={userData ? <StudentExams/> : <Navigate to={"/signup"}/>}/>
        <Route path='/exampreinstructions/:examId' element={userData ? <ExamPreInstructions/> : <Navigate to={"/signup"}/>}/>
        <Route path='/takeexam/:examId' element={userData ? <TakeExam/> : <Navigate to={"/signup"}/>}/>
        <Route path='/examresult/:attemptId' element={userData ? <ExamResult/> : <Navigate to={"/signup"}/>}/>
        
        {/* Certification Interview Routes */}
        <Route path='/certification-pre/:courseId' element={userData ? <CertificationPreInstructions/> : <Navigate to={"/signup"}/>}/>
        <Route path='/certification-interview/:sessionId' element={userData ? <CertificationInterview/> : <Navigate to={"/signup"}/>}/>
        <Route path='/certification-result/:sessionId' element={userData ? <CertificationResult/> : <Navigate to={"/signup"}/>}/>
        <Route path='/my-certificates' element={userData ? <MyCertificates/> : <Navigate to={"/signup"}/>}/>
        
        <Route path='/forgotpassword' element={<ForgotPassword/>}/>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

export default App
