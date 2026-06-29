import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { serverUrl } from '../config/serverUrl';

const EnrolledStudentsProgress = ({ courseId }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${serverUrl}/api/course/enrolled-students/${courseId}`, { withCredentials: true });
        setStudents(res.data.students);
      } catch (err) {
        setError('Failed to fetch students');
      } finally {
        setLoading(false);
      }
    };
    if (courseId) fetchStudents();
  }, [courseId]);

  if (loading) return <div className="p-4 text-center">Loading students...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!students.length) return <div className="p-4 text-gray-500">No students enrolled yet.</div>;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mt-6 md:mt-8">
      <h2 className="text-lg font-semibold mb-4">Enrolled Students & Progress</h2>
      
      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {students.map((student) => (
          <div key={student._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-1">{student.name}</h3>
            <p className="text-sm text-gray-500 mb-3">{student.email}</p>
            <div className="space-y-1">
              <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${student.progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-600">{student.progress}% Complete</p>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="py-3 px-4 font-semibold text-gray-700">Name</th>
              <th className="py-3 px-4 font-semibold text-gray-700">Email</th>
              <th className="py-3 px-4 font-semibold text-gray-700">Progress</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student._id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                <td className="py-3 px-4 text-gray-800">{student.name}</td>
                <td className="py-3 px-4 text-gray-600">{student.email}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${student.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600 min-w-fit">{student.progress}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EnrolledStudentsProgress;
