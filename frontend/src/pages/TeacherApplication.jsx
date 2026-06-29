import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { serverUrl } from "../config/serverUrl";
import { useDispatch, useSelector } from "react-redux";
import { setUserData } from "../redux/userSlice";
import { FaArrowLeftLong } from "react-icons/fa6";

const TeacherApplication = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  const [formData, setFormData] = useState({
    qualification: "",
    interestsToTeach: "",
    whyTeach: "",
    personalDetails: "",
  });
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const fetchStatus = async () => {
    try {
      setFetching(true);
      const result = await axios.get(`${serverUrl}/api/admin/teacher-application/me`, {
        withCredentials: true,
      });

      const teacherApplication = result.data?.teacherApplication;
      setApplication(teacherApplication);

      // Update Redux userData with latest teacherApplication status
      if (teacherApplication && userData) {
        dispatch(
          setUserData({
            ...userData,
            teacherApplication: teacherApplication,
          })
        );
      }

      if (teacherApplication) {
        setFormData({
          qualification: teacherApplication.qualification || "",
          interestsToTeach: teacherApplication.interestsToTeach || "",
          whyTeach: teacherApplication.whyTeach || "",
          personalDetails: teacherApplication.personalDetails || "",
        });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch application status");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!userData) {
      navigate("/login");
      return;
    }

    if (userData?.role !== "educator") {
      navigate("/");
      return;
    }

    fetchStatus();

    // Auto-refresh status every 10 seconds if pending
    let interval;
    if (application?.status === "pending") {
      interval = setInterval(() => {
        fetchStatus();
      }, 10000); // Poll every 10 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [userData, application?.status]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const result = await axios.post(`${serverUrl}/api/admin/teacher-application`, formData, {
        withCredentials: true,
      });

      setApplication(result.data.teacherApplication);

      dispatch(
        setUserData({
          ...userData,
          teacherApplication: result.data.teacherApplication,
        })
      );

      toast.success("Application submitted successfully");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  const status = application?.status || "not_submitted";
  const isApproved = status === "approved";
  const isPending = status === "pending";

  const handleGoToDashboard = async () => {
    // Refresh status before navigating to ensure we have latest data
    await fetchStatus();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="max-w-3xl mx-auto bg-white rounded-md shadow-md p-6 mt-16">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mb-4 flex items-center gap-2 text-gray-700 hover:text-black"
        >
          <FaArrowLeftLong /> Back
        </button>
        <h2 className="text-2xl font-semibold mb-2">Educator Verification Form</h2>
        <p className="text-gray-600 mb-6">
          Submit your teaching profile for admin approval. You can create courses only after approval.
        </p>

        <div className="mb-6 p-3 bg-gray-50 border rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium">
                Status: <span className="capitalize">{status.replace("_", " ")}</span>
              </p>
              {application?.adminNote && (
                <p className="text-sm text-gray-600 mt-2">Admin note: {application.adminNote}</p>
              )}
              {isPending && (
                <p className="text-xs text-gray-500 mt-2">⏱️ Auto-refreshing every 10 seconds...</p>
              )}
            </div>
            {isPending && (
              <button
                type="button"
                onClick={fetchStatus}
                disabled={fetching}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded hover:bg-blue-200 disabled:bg-gray-200"
              >
                {fetching ? "Refreshing..." : "Refresh Now"}
              </button>
            )}
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium mb-1">Qualification</label>
            <textarea
              name="qualification"
              value={formData.qualification}
              onChange={handleChange}
              rows={2}
              className="w-full border rounded-md px-3 py-2 focus:outline-none"
              placeholder="Your qualifications and teaching experience"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Interest to Teach</label>
            <textarea
              name="interestsToTeach"
              value={formData.interestsToTeach}
              onChange={handleChange}
              rows={2}
              className="w-full border rounded-md px-3 py-2 focus:outline-none"
              placeholder="Topics and domains you want to teach"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Why do you want to teach?</label>
            <textarea
              name="whyTeach"
              value={formData.whyTeach}
              onChange={handleChange}
              rows={3}
              className="w-full border rounded-md px-3 py-2 focus:outline-none"
              placeholder="Your motivation to teach on the platform"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Personal Details</label>
            <textarea
              name="personalDetails"
              value={formData.personalDetails}
              onChange={handleChange}
              rows={3}
              className="w-full border rounded-md px-3 py-2 focus:outline-none"
              placeholder="Brief background and personal details"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || fetching || isApproved}
              className="bg-black text-white px-4 py-2 rounded-md disabled:bg-gray-500"
            >
              {loading ? "Submitting..." : isApproved ? "Approved" : "Submit Application"}
            </button>

            {isApproved && (
              <button
                type="button"
                onClick={handleGoToDashboard}
                className="border border-black px-4 py-2 rounded-md hover:bg-black hover:text-white transition"
              >
                Go to Dashboard
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeacherApplication;
