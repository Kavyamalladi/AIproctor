import mongoose from "mongoose";

const lectureSchema = new mongoose.Schema({
    lectureTitle:{
        type:String,
        required:true
    },
    videoUrl:{
        type:String
    },
    isPreviewFree:{
        type:Boolean
    },
    assignmentUrl:{
        type:String
    },
    assignmentName:{
        type:String
    },
    
},{timestamps:true})

const Lecture = mongoose.model("Lecture" , lectureSchema)

export default Lecture