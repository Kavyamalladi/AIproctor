import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { serverUrl } from "../../config/serverUrl";

const AdminCourseStudents = () => {
  const navigate = useNavigate();
  const { courseId } = useParams();

  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCourseStudents = async () => {
    try {
      setLoading(true);
      const result = await axios.get(`${serverUrl}/api/admin/courses/${courseId}/students`, {
        withCredentials: true,
      });
      setCourse(result.data?.course || null);
      setStudents(result.data?.students || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load course students");
    } finally {
      setLoading(false);
    }
  };

  const removeStudentFromCourse = async (studentId) => {
    try {
      const confirmed = window.confirm("Remove this student from this course?");
      if (!confirmed) return;

      await axios.delete(`${serverUrl}/api/admin/courses/${courseId}/students/${studentId}`, {
        withCredentials: true,
      });

      toast.success("Student removed from course");
      setStudents((prev) => prev.filter((student) => student._id !== studentId));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to remove student");
    }
  };

  useEffect(() => {
    fetchCourseStudents();
  }, [courseId]);

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="max-w-6xl mx-auto mt-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold">Course Students</h1>
            <p className="text-gray-600 mt-1">
              {course ? `${course.title} | Teacher: ${course.creator?.name || "N/A"}` : "Loading course..."}
            </p>
          </div>
          <button
            className="px-3 py-2 border border-black rounded"
            onClick={() => navigate(-1)}
          >
            Back
          </button>
        </div>

        <div className="bg-white rounded-md shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Enrolled Students with Progress</h2>

          {loading && <p className="text-gray-500">Loading...</p>}

          {!loading && students.length === 0 && (
            <p className="text-gray-500">No students enrolled in this course</p>
          )}

          <div className="space-y-3">
            {students.map((student) => (
              <div key={student._id} className="border rounded-md p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{student.name}</p>
                  <p className="text-sm text-gray-600">{student.email}</p>
                  <p className="text-sm text-gray-600">
                    Progress: {student.progress}% ({student.completedLectures}/{student.totalLectures} lectures)
                  </p>
                </div>

                <button
                  className="px-2 py-1 bg-black text-white rounded text-sm"
                  onClick={() => removeStudentFromCourse(student._id)}
                >
                  Remove Student
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCourseStudents;
