import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { serverUrl } from "../config/serverUrl";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import {
  FaArrowLeftLong,
  FaCertificate,
  FaDownload,
  FaEye,
  FaCalendar,
  FaAward
} from "react-icons/fa6";
import { ClipLoader } from "react-spinners";

function MyCertificates() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState([]);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const response = await axios.get(
        `${serverUrl}/api/certification/my-certificates`,
        { withCredentials: true }
      );
      setCertificates(response.data);
    } catch (error) {
      console.error("Error fetching certificates:", error);
      toast.error("Failed to load certificates");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Nav />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <ClipLoader size={40} />
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-gray-50 pt-24 pb-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-black mb-6"
          >
            <FaArrowLeftLong /> Back
          </button>

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <FaCertificate className="text-blue-600" />
                My Certificates
              </h1>
              <p className="text-gray-500 mt-2">
                Your earned certifications from AI Interviews
              </p>
            </div>
            <div className="bg-blue-100 px-4 py-2 rounded-lg">
              <span className="text-blue-800 font-semibold">
                {certificates.length} Certificate{certificates.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Certificates Grid */}
          {certificates.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaAward className="w-12 h-12 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                No Certificates Yet
              </h2>
              <p className="text-gray-500 mb-6">
                Complete a course and pass the AI Certification Interview to earn your first certificate!
              </p>
              <button
                onClick={() => navigate("/enrolledcourses")}
                className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800"
              >
                View My Courses
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certificates.map((cert) => (
                <div 
                  key={cert._id}
                  className="bg-white rounded-xl shadow-sm overflow-hidden border hover:shadow-md transition-shadow"
                >
                  {/* Certificate Preview */}
                  <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white">
                    <div className="absolute top-3 right-3">
                      <FaCertificate className="w-8 h-8 opacity-30" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs uppercase tracking-wider opacity-80 mb-2">
                        Certificate of Completion
                      </p>
                      <h3 className="text-lg font-bold mb-1">{cert.courseName}</h3>
                      <p className="text-sm opacity-80">{cert.studentName}</p>
                    </div>
                  </div>

                  {/* Certificate Details */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-2">
                        <FaCalendar className="text-gray-400" />
                        Issued
                      </span>
                      <span className="text-gray-800 font-medium">
                        {new Date(cert.completionDate).toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Certificate ID</span>
                      <span className="text-gray-800 font-mono text-xs">
                        {cert.certificateId}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Interview Score</span>
                      <span className="text-green-600 font-semibold">
                        {cert.interviewScore.toFixed(0)}%
                      </span>
                    </div>

                    {/* Action Buttons */}
                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-3 border-t">
                      <a
                        href={`${serverUrl?.replace(/\/$/, '')}/api/certification/view/${cert._id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                      >
                        <FaEye /> View
                      </a>
                      <a
                        href={`${serverUrl?.replace(/\/$/, '')}/api/certification/download/${cert._id}`}
                        download={`${cert.certificateId}.pdf`}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                      >
                        <FaDownload /> Download
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

export default MyCertificates;
