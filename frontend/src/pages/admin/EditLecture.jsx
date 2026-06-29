import axios from 'axios'
import React, { useState } from 'react'
import { FaArrowLeft, FaFileAlt, FaTrash, FaDownload } from "react-icons/fa"
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { serverUrl } from '../../config/serverUrl'
import { setLectureData } from '../../redux/lectureSlice'
import { toast } from 'react-toastify'
import { ClipLoader } from 'react-spinners'

function EditLecture() {
  const [loading,setLoading] = useState(false)
  const [loading1,setLoading1] = useState(false)
  const {courseId , lectureId} = useParams()
  const {lectureData} = useSelector(state=>state.lecture)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const selectedLecture = lectureData.find(lecture => lecture._id === lectureId)
  const [videoUrl,setVideoUrl] = useState(null)
  const [lectureTitle,setLectureTitle] = useState(selectedLecture?.lectureTitle || "")
  const [isPreviewFree,setIsPreviewFree] = useState(selectedLecture?.isPreviewFree || false)
  const [showNewUpload, setShowNewUpload] = useState(!selectedLecture?.videoUrl)
  const [assignment, setAssignment] = useState(null)
  const [showNewAssignment, setShowNewAssignment] = useState(!selectedLecture?.assignmentUrl)
  const [removeAssignment, setRemoveAssignment] = useState(false)

  const editLecture = async () => {
    setLoading(true)
    const formData = new FormData()
    formData.append("lectureTitle",lectureTitle)
    formData.append("isPreviewFree",isPreviewFree)
    // Only append video if a new one is selected
    if(videoUrl) {
      formData.append("videoUrl",videoUrl)
    }
    // Append assignment if selected
    if(assignment) {
      formData.append("assignment", assignment)
    }
    // Handle assignment removal
    if(removeAssignment) {
      formData.append("removeAssignment", "true")
    }
    
    try {
      const result = await axios.post(serverUrl + `/api/course/editlecture/${lectureId}` , formData , {withCredentials:true})
      console.log(result.data)
      // Replace the edited lecture in the array instead of adding a duplicate
      const updatedLectures = lectureData.map(lecture => 
        lecture._id === lectureId ? result.data : lecture
      )
      dispatch(setLectureData(updatedLectures))
      toast.success("Lecture Updated")
      navigate("/courses")
      setLoading(false)

    } catch (error) {
      console.log(error)
      toast.error(error.response.data.message)
      setLoading(false)
    }
  }

  const removeLecture = async () => {
    setLoading1(true)
    try {
      const result = await axios.delete(serverUrl + `/api/course/removelecture/${lectureId}` , {withCredentials:true})
      console.log(result.data)
      // Remove the lecture from Redux state
      const updatedLectures = lectureData.filter(lecture => lecture._id !== lectureId)
      dispatch(setLectureData(updatedLectures))
      toast.success("Lecture Removed Successfully")
      navigate(`/createlecture/${courseId}`)
      setLoading1(false)

    } catch (error) {
      console.log(error)
      toast.error(error.response?.data?.message || "Lecture remove error")
      setLoading1(false)
    }
  }


  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-lg p-6 space-y-6">

        {/* Header Inside Box */}
        <div className="flex items-center gap-2 mb-2">
          <FaArrowLeft className="text-gray-600 cursor-pointer" onClick={() => navigate(`/createlecture/${courseId}`)} />
          <h2 className="text-xl font-semibold text-gray-800">Update Your Lecture</h2>
        </div>

        {/* Instruction */}
        <div>
          <button className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all text-sm" disabled={loading1} onClick={removeLecture}>
            {loading1 ? <ClipLoader size={30} color='white'/> : "Remove Lecture"}
          </button>
        </div>

        {/* Input Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[black] focus:outline-none"
              placeholder={selectedLecture?.lectureTitle || "Enter lecture title"}
              onChange={(e )=> setLectureTitle(e.target.value)}
              value={lectureTitle}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Video *</label>
            
            {/* Show existing video if available */}
            {selectedLecture?.videoUrl && !showNewUpload ? (
              <div className="space-y-3">
                <div className="border border-gray-300 rounded-md p-3 bg-gray-50">
                  <p className="text-sm text-gray-600 mb-2">Current Video:</p>
                  <video 
                    src={selectedLecture.videoUrl} 
                    controls 
                    className="w-full max-h-48 rounded-md"
                  />
                </div>
                <button 
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                  onClick={() => setShowNewUpload(true)}
                >
                  Upload a different video
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="file"
                  accept='video/*'
                  className="w-full border border-gray-300 rounded-md p-2 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-gray-700 file:text-[white] hover:file:bg-gray-500"
                  onChange={(e) => setVideoUrl(e.target.files[0])}
                />
                {selectedLecture?.videoUrl && (
                  <button 
                    type="button"
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                    onClick={() => {
                      setShowNewUpload(false)
                      setVideoUrl(null)
                    }}
                  >
                    Cancel - Keep existing video
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Assignment Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FaFileAlt className="inline mr-2" />
              Assignment (PDF, DOC, etc.)
            </label>
            
            {/* Show existing assignment if available */}
            {selectedLecture?.assignmentUrl && !showNewAssignment && !removeAssignment ? (
              <div className="space-y-3">
                <div className="border border-gray-300 rounded-md p-3 bg-green-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FaFileAlt className="text-green-600" />
                    <span className="text-sm text-gray-700">{selectedLecture.assignmentName || "Assignment"}</span>
                  </div>
                  <div className="flex gap-2">
                    <a 
                      href={selectedLecture.assignmentUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FaDownload />
                    </a>
                    <button 
                      type="button"
                      onClick={() => setRemoveAssignment(true)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
                <button 
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                  onClick={() => setShowNewAssignment(true)}
                >
                  Upload a different assignment
                </button>
              </div>
            ) : removeAssignment && !showNewAssignment ? (
              <div className="space-y-2">
                <div className="border border-red-300 rounded-md p-3 bg-red-50 text-sm text-red-700">
                  Assignment will be removed on save
                </div>
                <button 
                  type="button"
                  className="text-sm text-gray-600 hover:text-gray-800 underline"
                  onClick={() => setRemoveAssignment(false)}
                >
                  Cancel removal
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="file"
                  accept='.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar'
                  className="w-full border border-gray-300 rounded-md p-2 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-green-600 file:text-white hover:file:bg-green-700"
                  onChange={(e) => {
                    setAssignment(e.target.files[0])
                    setRemoveAssignment(false)
                  }}
                />
                {assignment && (
                  <p className="text-sm text-green-600">Selected: {assignment.name}</p>
                )}
                {(selectedLecture?.assignmentUrl || removeAssignment) && (
                  <button 
                    type="button"
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                    onClick={() => {
                      setShowNewAssignment(false)
                      setAssignment(null)
                      setRemoveAssignment(false)
                    }}
                  >
                    Cancel - Keep existing assignment
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              className="accent-[black] h-4 w-4"
              checked={isPreviewFree}
              onChange={() => setIsPreviewFree(prev=>!prev)}
            />
            <label htmlFor="isFree" className="text-sm text-gray-700">Make this video FREE</label>
          </div>

        </div>

        <div>
          {loading && (
            <div className="flex flex-col items-center gap-2 mt-2">
              <p className="text-gray-700 text-sm font-medium">Uploading files... Please wait</p>
              
              <div className="flex gap-2">
                <span className="w-3 h-3 bg-black rounded-full animate-bounce"></span>
                <span className="w-3 h-3 bg-black rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-3 h-3 bg-black rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}
        </div>
        
        {/* Submit Button */}
        <div className="pt-4">
          <button className="w-full bg-black text-white py-3 rounded-md text-sm font-medium hover:bg-gray-700 transition" disabled={loading} onClick={editLecture}>
            {loading ? <ClipLoader size={30} color='white'/> :"Update Lecture"}
          </button>
        </div>
        
      </div>
    </div>
  )
}

export default EditLecture
