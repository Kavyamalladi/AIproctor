import React from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FaArrowLeftLong } from "react-icons/fa6";

function Profile() {
  let { userData } = useSelector((state) => state.user);
  let navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 px-4 py-10 flex items-center justify-center">
      <div className="bg-white shadow-2xl rounded-3xl p-10 max-w-lg w-full relative transition-all duration-300 hover:shadow-[0_10px_40px_rgba(0,0,0,0.2)]">
        {/* Back Button */}
        <FaArrowLeftLong
          className="absolute top-6 left-6 w-6 h-6 cursor-pointer text-gray-700 hover:text-black transition"
          onClick={() => navigate("/")}
        />

        {/* Profile Header */}
        <div className="flex flex-col items-center text-center">
          {userData.photoUrl ? (
            <img
              src={userData?.photoUrl}
              alt="profile"
              className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-md"
            />
          ) : (
            <div className="w-28 h-28 rounded-full text-white flex items-center justify-center text-3xl font-semibold border-4 border-white bg-gradient-to-br from-black to-gray-700 shadow-md">
              {userData?.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <h2 className="text-2xl font-bold mt-4 text-gray-800">
            {userData.name}
          </h2>
          <p className="text-sm text-gray-500">{userData.role}</p>
        </div>

        {/* Profile Info */}
        <div className="mt-8 space-y-4 bg-gray-50 rounded-xl p-5 shadow-inner">
          <div className="text-sm">
            <span className="font-semibold text-gray-700">Email: </span>
            <span className="ml-1 text-gray-600">{userData.email}</span>
          </div>

          <div className="text-sm">
            <span className="font-semibold text-gray-700">Bio: </span>
            <span className="text-gray-600 ml-1">
              {userData.description || "No bio added yet."}
            </span>
          </div>

          <div className="text-sm">
            <span className="font-semibold text-gray-700 ">
              Enrolled Courses:{" "}
            </span>
            <span className="text-gray-600 ml-1">
              {userData.enrolledCourses.length}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-center">
          <button
            className="px-6 py-2 rounded-full bg-gradient-to-r from-black to-gray-800 text-white font-medium shadow-md hover:shadow-lg hover:scale-105 transition-transform duration-200"
            onClick={() => navigate("/editprofile")}
          >
            ✏️ Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;
