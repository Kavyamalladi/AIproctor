import uploadOnCloudinary from "../configs/cloudinary.js";
import User from "../models/userModel.js";

export const getCurrentUser = async (req,res) => {
    try {
        const user = await User.findById(req.userId).select("-password").populate("enrolledCourses")
        
        if(!user){
            return res.status(400).json({message:"User does not exist"})
        }
        return res.status(200).json(user)

    } catch (error) {
        console.log(error);
        return res.status(500).json({message:`Get Current User Error: ${error}`})
    }
}

export const UpdateProfile = async (req,res) => {
    try {
        const userId = req.userId
        const {name, description} = req.body

        let updateData = { name, description }

        if(req.file){
           const photoUrl = await uploadOnCloudinary(req.file.path)
           if (photoUrl) {
               updateData.photoUrl = photoUrl
           }
        }

        const user = await User.findByIdAndUpdate(
            userId, 
            updateData,
            { new: true }  // Return the updated document
        ).select("-password").populate("enrolledCourses")

        if(!user){
            return res.status(404).json({message:"User not found"})
        }
        
        return res.status(200).json(user)
    } catch (error) {
        console.log(error);
        return res.status(500).json({message:`Update Profile Error: ${error}`})
    }
}
