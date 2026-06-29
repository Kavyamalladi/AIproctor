import { configureStore } from "@reduxjs/toolkit"
import userSlice from "./userSlice"
import courseSlice from "./courseSlice"
import lectureSlice from "./lectureSlice"
import reviewSlice from "./reviewSlice"
import examSlice from "./examSlice"

export const store = configureStore({
    reducer:{
        user: userSlice,
        course: courseSlice,
        lecture: lectureSlice,
        review: reviewSlice,
        exam: examSlice
    }
})