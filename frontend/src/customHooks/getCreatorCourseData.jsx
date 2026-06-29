import React, { useEffect } from 'react'
import { serverUrl } from '../config/serverUrl'
import axios from 'axios'
import { setCreatorCourseData } from '../redux/courseSlice'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'react-toastify'

const getCreatorCourseData = () => {
  const dispatch = useDispatch()
  const {userData} = useSelector(state=>state.user)

  return (
    useEffect(()=>{
      const getCreatorData = async () => {
        if (!userData || (userData.role !== "educator" && userData.role !== "admin")) {
          dispatch(setCreatorCourseData([]))
          return
        }
        try {
          const result = await axios.get(serverUrl + "/api/course/getcreatorcourses", {withCredentials:true})
          await dispatch(setCreatorCourseData(result.data))
          console.log(result.data)

        } catch (error) {
          console.log(error)
          toast.error(error?.response?.data?.message || "Unable to fetch creator courses")
        }
      }
      getCreatorData()
    },[userData, dispatch])
  )
}

export default getCreatorCourseData
