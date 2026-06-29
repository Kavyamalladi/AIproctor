import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { serverUrl } from '../config/serverUrl';

const LectureAnnouncements = ({ courseId }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);

  const pageSize = 3;

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${serverUrl}/api/announcement/course/${courseId}`, { withCredentials: true });
        setAnnouncements(res.data);
      } catch (err) {
        setError('Failed to fetch announcements');
      } finally {
        setLoading(false);
      }
    };
    if (courseId) fetchAnnouncements();
  }, [courseId]);

  const pagedAnnouncements = announcements.slice(page * pageSize, (page + 1) * pageSize);
  const hasPrev = page > 0;
  const hasNext = (page + 1) * pageSize < announcements.length;

  if (loading) return <div>Loading announcements...</div>;
  if (error) return <div>{error}</div>;
  if (!announcements.length) return <div className="text-gray-500">No announcements yet.</div>;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-8">
      <h2 className="text-lg font-semibold mb-4">Course Announcements</h2>
      <div className="space-y-4">
        {pagedAnnouncements.map(a => (
          <div key={a._id} className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold text-md mb-1">{a.title}</h3>
            <p className="text-gray-700 text-sm mb-2 whitespace-pre-line">{a.content}</p>
            <span className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString()}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-4">
        {hasPrev ? (
          <button className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300" onClick={() => setPage(page - 1)}>
            Previous Announcements
          </button>
        ) : <div />}
        {hasNext && (
          <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" onClick={() => setPage(page + 1)}>
            Next Announcements
          </button>
        )}
      </div>
    </div>
  );
};

export default LectureAnnouncements;
