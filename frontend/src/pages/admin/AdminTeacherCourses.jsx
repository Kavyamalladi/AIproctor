import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { serverUrl } from "../../config/serverUrl";

const AdminTeacherCourses = () => {
  const navigate = useNavigate();
  const { teacherId } = useParams();

  const [teacherData, setTeacherData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTeacherCourses = async () => {
    try {
      setLoading(true);
      const result = await axios.get(`${serverUrl}/api/admin/teacher/${teacherId}/courses`, {
        withCredentials: true,
      });
      setTeacherData(result.data?.teacher || null);
      setCourses(result.data?.courses || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load teacher courses");
    } finally {
      setLoading(false);
    }
  };

  const removeCourse = async (courseId) => {
    try {
      const confirmed = window.confirm("Remove this course?");
      if (!confirmed) return;

      await axios.delete(`${serverUrl}/api/admin/courses/${courseId}`, { withCredentials: true });
      toast.success("Course removed");
      setCourses((prev) => prev.filter((course) => course._id !== courseId));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to remove course");
    }
  };

  useEffect(() => {
    fetchTeacherCourses();
  }, [teacherId]);

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="max-w-6xl mx-auto mt-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold">Teacher Courses</h1>
            <p className="text-gray-600 mt-1">
              {teacherData ? `${teacherData.name} (${teacherData.email})` : "Loading teacher..."}
            </p>
          </div>
          <button
            className="px-3 py-2 border border-black rounded"
            onClick={() => navigate("/adminpanel")}
          >
            Back to Admin Panel
          </button>
        </div>

        <div className="bg-white rounded-md shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Courses Created</h2>

          {loading && <p className="text-gray-500">Loading...</p>}

          {!loading && courses.length === 0 && (
            <p className="text-gray-500">No courses found for this teacher</p>
          )}

          <div className="space-y-3">
            {courses.map((course) => (
              <div key={course._id} className="border rounded-md p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{course.title}</p>
                  <p className="text-sm text-gray-600">
                    Category: {course.category || "N/A"} | Students: {course.enrolledStudents?.length || 0}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    className="px-2 py-1 border border-black rounded text-sm"
                    onClick={() => navigate(`/admin/course-students/${course._id}`)}
                  >
                    View Students
                  </button>
                  <button
                    className="px-2 py-1 bg-black text-white rounded text-sm"
                    onClick={() => removeCourse(course._id)}
                  >
                    Remove Course
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTeacherCourses;
