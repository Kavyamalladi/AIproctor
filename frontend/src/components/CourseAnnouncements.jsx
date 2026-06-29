import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { serverUrl } from '../config/serverUrl';

const CourseAnnouncements = ({ courseId, isTeacher }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  // Paging state (unified for all users)
  const [page, setPage] = useState(1);
  const pageSize = 3;
  const totalPages = Math.ceil(announcements.length / pageSize);
  const pagedAnnouncements = announcements.slice((page - 1) * pageSize, page * pageSize);

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

  useEffect(() => {
    if (courseId) fetchAnnouncements();
    // eslint-disable-next-line
  }, [courseId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${serverUrl}/api/announcement/create`, { courseId, title, content }, { withCredentials: true });
      setTitle(''); setContent('');
      fetchAnnouncements();
    } catch (err) {
      alert('Failed to create announcement');
    }
  };

  const handleEdit = async (id) => {
    try {
      await axios.put(`${serverUrl}/api/announcement/edit/${id}`, { title: editTitle, content: editContent }, { withCredentials: true });
      setEditingId(null);
      fetchAnnouncements();
    } catch (err) {
      alert('Failed to edit announcement');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await axios.delete(`${serverUrl}/api/announcement/delete/${id}`, { withCredentials: true });
      fetchAnnouncements();
    } catch (err) {
      alert('Failed to delete announcement');
    }
  };

  if (loading) return <div>Loading announcements...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-8">
      <h2 className="text-lg font-semibold mb-4">Course Announcements</h2>
      {isTeacher && (
        <form onSubmit={handleCreate} className="mb-6 flex flex-col gap-2">
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="border px-2 py-1 rounded"
            required
          />
          <textarea
            placeholder="Content"
            value={content}
            onChange={e => setContent(e.target.value)}
            className="border px-2 py-1 rounded"
            required
          />
          <button type="submit" className="bg-blue-500 text-white px-4 py-1 rounded w-fit">Post Announcement</button>
        </form>
      )}
      <ul className="space-y-4">
        {pagedAnnouncements.map(a => (
          <li key={a._id} className="border border-gray-400 rounded-xl p-4 bg-gray-50">
            {editingId === a._id ? (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="border px-2 py-1 rounded"
                />
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="border px-2 py-1 rounded"
                />
                <div className="flex gap-2">
                  <button className="bg-green-500 text-white px-2 py-1 rounded" onClick={() => handleEdit(a._id)}>Save</button>
                  <button className="bg-gray-300 px-2 py-1 rounded" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-md">{a.title}</h3>
                  {isTeacher && (
                    <div className="flex gap-2">
                      <button className="text-blue-500 text-xs" onClick={() => { setEditingId(a._id); setEditTitle(a.title); setEditContent(a.content); }}>Edit</button>
                      <button className="text-red-500 text-xs" onClick={() => handleDelete(a._id)}>Delete</button>
                    </div>
                  )}
                </div>
                <p className="text-gray-700 text-sm mt-1 whitespace-pre-line">{a.content}</p>
                <span className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString()}</span>
              </div>
            )}
          </li>
        ))}
        {announcements.length === 0 && <li className="text-gray-500">No announcements yet.</li>}
      </ul>
      {/* Paging controls for all users */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            className={`px-6 py-2 rounded bg-gray-200 text-gray-700 font-semibold ${page === 1 ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-300'}`}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous Announcements
          </button>
          <button
            className={`px-6 py-2 rounded bg-blue-500 text-white font-semibold ${page === totalPages ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-600'}`}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next Announcements
          </button>
        </div>
      )}
    </div>
  );
};

export default CourseAnnouncements;
