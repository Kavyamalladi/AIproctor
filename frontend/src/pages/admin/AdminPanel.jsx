import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { serverUrl } from "../../config/serverUrl";
import { FaArrowLeftLong } from "react-icons/fa6";

const AdminPanel = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState({
    counts: { teachers: 0, students: 0, courses: 0 },
    teachers: [],
    students: [],
    courses: [],
  });
  const [loading, setLoading] = useState(false);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const result = await axios.get(`${serverUrl}/api/admin/overview`, { withCredentials: true });
      setOverview(result.data);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const reviewApplication = async (teacherId, action) => {
    try {
      const adminNote = window.prompt(`Optional note for ${action}:`) || "";
      await axios.patch(
        `${serverUrl}/api/admin/teacher-applications/${teacherId}/review`,
        { action, adminNote },
        { withCredentials: true }
      );
      toast.success(`Application ${action}d`);
      await fetchOverview();
    } catch (error) {
      toast.error(error?.response?.data?.message || `Failed to ${action} application`);
    }
  };

  const removeUser = async (userId) => {
    try {
      const confirmed = window.confirm("Remove this user?");
      if (!confirmed) return;

      await axios.delete(`${serverUrl}/api/admin/users/${userId}`, { withCredentials: true });
      toast.success("User removed");
      await fetchOverview();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to remove user");
    }
  };

  const removeCourse = async (courseId) => {
    try {
      const confirmed = window.confirm("Remove this course?");
      if (!confirmed) return;

      await axios.delete(`${serverUrl}/api/admin/courses/${courseId}`, { withCredentials: true });
      toast.success("Course removed");
      await fetchOverview();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to remove course");
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const pendingApplications = overview.teachers.filter(
    (teacher) => teacher?.teacherApplication?.status === "pending"
  );

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="max-w-7xl mx-auto mt-5">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mb-4 flex items-center gap-2 text-gray-700 hover:text-black"
        >
          <FaArrowLeftLong /> Back to Home
        </button>
        <h1 className="text-3xl font-semibold mb-6">Admin Panel</h1>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-md shadow">Teachers: {overview.counts.teachers}</div>
          <div className="bg-white p-4 rounded-md shadow">Students: {overview.counts.students}</div>
          <div className="bg-white p-4 rounded-md shadow">Courses: {overview.counts.courses}</div>
        </div>

        <div className="bg-white rounded-md shadow p-4 mb-8">
          <h2 className="text-xl font-semibold mb-4">Pending Teacher Applications</h2>
          {pendingApplications.length === 0 && <p className="text-gray-500">No pending applications</p>}

          <div className="space-y-4">
            {pendingApplications.map((teacher) => (
              <div key={teacher._id} className="border rounded-md p-3">
                <p className="font-medium">{teacher.name} ({teacher.email})</p>
                <p className="text-sm text-gray-700 mt-1">
                  Qualification: {teacher.teacherApplication?.qualification}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  Interests: {teacher.teacherApplication?.interestsToTeach}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  Why teach: {teacher.teacherApplication?.whyTeach}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  Personal details: {teacher.teacherApplication?.personalDetails}
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    className="px-3 py-1 bg-black text-white rounded"
                    onClick={() => reviewApplication(teacher._id, "approve")}
                  >
                    Approve
                  </button>
                  <button
                    className="px-3 py-1 border border-black rounded"
                    onClick={() => reviewApplication(teacher._id, "reject")}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-md shadow p-4">
            <h2 className="text-xl font-semibold mb-4">Teachers</h2>
            <div className="space-y-3 max-h-[400px] overflow-auto">
              {overview.teachers.map((teacher) => (
                <div key={teacher._id} className="border rounded-md p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{teacher.name}</p>
                      <p className="text-sm text-gray-600">{teacher.email}</p>
                      <p className="text-xs capitalize text-gray-500">
                        Application: {teacher?.teacherApplication?.status?.replace("_", " ") || "not submitted"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="px-2 py-1 border border-black rounded text-sm"
                        onClick={() => navigate(`/admin/teacher-courses/${teacher._id}`)}
                      >
                        View Courses
                      </button>
                      <button
                        className="px-2 py-1 bg-black text-white rounded text-sm"
                        onClick={() => removeUser(teacher._id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-md shadow p-4">
            <h2 className="text-xl font-semibold mb-4">Students</h2>
            <div className="space-y-3 max-h-[400px] overflow-auto">
              {overview.students.map((student) => (
                <div key={student._id} className="border rounded-md p-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-gray-600">{student.email}</p>
                    <p className="text-xs text-gray-500">
                      Enrolled courses: {student.enrolledCourses?.length || 0}
                    </p>
                  </div>
                  <button
                    className="px-2 py-1 bg-black text-white rounded text-sm"
                    onClick={() => removeUser(student._id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-md shadow p-4 mb-8">
          <h2 className="text-xl font-semibold mb-4">Courses Created by Teachers</h2>
          {loading && <p className="text-gray-500">Loading...</p>}
          <div className="space-y-3">
            {overview.courses.map((course) => (
              <div key={course._id} className="border rounded-md p-3 flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{course.title}</p>
                  <p className="text-sm text-gray-600">
                    Teacher: {course.creator?.name || "Unknown"} | Students: {course.enrolledStudents?.length || 0}
                  </p>
                </div>
                <button
                  className="px-2 py-1 bg-black text-white rounded text-sm"
                  onClick={() => removeCourse(course._id)}
                >
                  Remove Course
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
