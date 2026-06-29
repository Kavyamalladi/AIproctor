// Get enrolled students with progress for a course (for teachers)
import Progress from "../models/progressModel.js";

export const getEnrolledStudentsWithProgress = async (req, res) => {
    try {
        const { courseId } = req.params;
        // Find the course and populate enrolled students
        const course = await Course.findById(courseId).populate({
            path: "enrolledStudents",
            select: "name email"
        }).populate("lectures");
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }
        const totalLectures = course.lectures.length;
        // For each student, calculate progress
        const students = await Promise.all(course.enrolledStudents.map(async (student) => {
            // Count completed lectures for this student in this course
            const completedCount = await Progress.countDocuments({
                user: student._id,
                course: courseId,
                isCompleted: true
            });
            const progressPercent = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;
            return {
                _id: student._id,
                name: student.name,
                email: student.email,
                progress: progressPercent
            };
        }));
        return res.status(200).json({ students });
    } catch (error) {
        console.error("Get Enrolled Students Error:", error);
        return res.status(500).json({ message: `Failed to get enrolled students: ${error}` });
    }
};
import uploadOnCloudinary, { uploadDocumentToCloudinary, getSignedUrl } from "../configs/cloudinary.js"
import { v2 as cloudinary } from 'cloudinary';
import Course from "../models/courseModel.js"
import Lecture from "../models/lectureModel.js"
import User from "../models/userModel.js"

export const createCourse = async (req, res) => {
  try {
    const { title, category } = req.body;

    if (!title || !category) {
      return res.status(400).json({ message: "Title and Category is required!" });
    }

        const creator = await User.findById(req.userId).select("role teacherApplication");

        if (!creator) {
            return res.status(404).json({ message: "User not found" });
        }

        if (creator.role !== "educator") {
            return res.status(403).json({ message: "Only educators can create courses" });
        }

        if (creator.teacherApplication?.status !== "approved") {
            return res.status(403).json({
                message:
                    "Your educator application is not approved yet. Please submit your application and wait for admin approval.",
            });
        }

    let thumbnailUrl = null;

    // if image is uploaded
    if (req.file) {
      thumbnailUrl = await uploadOnCloudinary(req.file.path);
    }

    const course = await Course.create({
      title,
      category,
      creator: req.userId,
      thumbnail: thumbnailUrl
    });

    return res.status(201).json(course);

  } catch (error) {
    return res.status(500).json({
      message: `Failed to create course error: ${error}`
    });
  }
};




export const getPublishedCourses = async (req,res) => {
    try {
        const courses = await Course.find({isPublished: true})
          .populate("lectures")
          .populate({
            path: "reviews",
            populate: { path: "user", select: "name photoUrl enrolledCourses" }
          });
        if(!courses){
            return res.status(404).json({message:"Course not found"})
        }
        return res.status(200).json(courses)
    } catch (error) {
        return res.status(500).json({message:`Failed to get all courses: ${error}`})
    }
}


export const getCreatorCourses = async (req,res) => {
    try {
        const userId = req.userId
        const courses = await Course.find({creator: userId})
        
        if(!courses){
            return res.status(404).json({message:"Course not found"})
        }

        return res.status(200).json(courses)
        
    } catch (error) {
        return res.status(500).json({message:`Failed to get creator courses: ${error}`})
    }
}


export const editCourse = async (req,res) => {
    try {
        const {courseId} = req.params;
        const {title, subTitle, description, category, level, price, isPublished} = req.body;
        
        console.log("Received isPublished:", isPublished, "Type:", typeof isPublished);
        
        // Convert isPublished from string to boolean (FormData sends strings)
        const isPublishedBool = isPublished === 'true' || isPublished === true;
        
        console.log("Converted isPublishedBool:", isPublishedBool);
        
        let updateData = { title, subTitle, description, category, level, price, isPublished: isPublishedBool }

        if (req.file) {
            updateData.thumbnail = await uploadOnCloudinary(req.file.path);
        }

        console.log("Update data:", updateData);

        const course = await Course.findByIdAndUpdate(courseId, updateData, {new:true});

        console.log("Updated course isPublished:", course?.isPublished);

        if (!course) {
            return res.status(404).json({message:"Course not found"});
        }

        return res.status(200).json(course);

    } catch (error) {
        return res.status(500).json({message:`Failed to update course: ${error}`})
    }
}



export const getCourseById = async (req,res) => {
    try {
        const {courseId} = req.params
        let course = await Course.findById(courseId)
          .populate("lectures")
          .populate({
            path: "reviews",
            populate: { path: "user", select: "name photoUrl enrolledCourses" }
          });
        if(!course){
            return res.status(404).json({message:"Course not found"})
        }
        return res.status(200).json(course)
        
    } catch (error) {
        return res.status(500).json({message:`Failed to get course error:${error}`})
    }
}


export const removeCourse = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const course = await Course.findById(courseId);
    
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    await course.deleteOne();
    return res.status(200).json({ message: "Course Removed Successfully"});
  } catch (error) {
    console.error(error);
    return res.status(500).json({message:`Failed to remove course error: ${error}`})
  }
};



//create lecture

export const createLecture = async (req,res) => {
    try {
        const {lectureTitle} = req.body
        const {courseId} = req.params

        if(!lectureTitle || !courseId){
            return res.status(400).json({message:"Lecture Title is required"})
        }

        const lecture = await Lecture.create({lectureTitle})
        const course = await Course.findById(courseId)
        
        if(course){
            course.lectures.push(lecture._id)    
        }

        await course.populate("lectures")
        await course.save()
        return res.status(201).json({lecture,course})
        
    } catch (error) {
        return res.status(500).json({message:`Failed to Create Lecture error: ${error}`})
    }
    
}


export const getCourseLecture = async (req,res) => {
    try {
        const {courseId} = req.params
        const course = await Course.findById(courseId)
        if(!course){
            return res.status(404).json({message:"Course not found"})
        }
        await course.populate("lectures")
        await course.save()
        return res.status(200).json(course)
    } catch (error) {
        return res.status(500).json({message:`Failed to get Lectures ${error}`})
    }
}


export const editLecture = async (req,res) => {
    try {
        const {lectureId} = req.params
        const {isPreviewFree, lectureTitle, removeAssignment} = req.body
        const lecture = await Lecture.findById(lectureId)

        if(!lecture){
            return res.status(404).json({ message:"Lecture not found" })
        }

        // Handle video upload
        if(req.files?.videoUrl?.[0]){
            const videoUrl = await uploadOnCloudinary(req.files.videoUrl[0].path)
            lecture.videoUrl = videoUrl
        }

        // Handle assignment upload (use raw upload for documents)
        if(req.files?.assignment?.[0]){
            const assignmentUrl = await uploadDocumentToCloudinary(
                req.files.assignment[0].path, 
                req.files.assignment[0].originalname
            )
            lecture.assignmentUrl = assignmentUrl
            lecture.assignmentName = req.files.assignment[0].originalname
        }

        // Handle assignment removal
        if(removeAssignment === 'true' || removeAssignment === true){
            lecture.assignmentUrl = null
            lecture.assignmentName = null
        }

        if(lectureTitle){
            lecture.lectureTitle = lectureTitle
        }

        // Convert string "true"/"false" to boolean (FormData sends strings)
        lecture.isPreviewFree = isPreviewFree === 'true' || isPreviewFree === true
        
        await lecture.save()
        return res.status(200).json(lecture)
    
    } catch (error) {
        return res.status(500).json({ message:`Failed to edit Lectures ${error}` })
    }
}


export const removeLecture = async (req,res) => {
    try {
        const {lectureId} = req.params
        const lecture = await Lecture.findByIdAndDelete(lectureId)
        
        if(!lecture){
            return res.status(404).json({ message:"Lecture not found" })
        }

        // Remove the lecture from associated course
        await Course.updateOne(
            {lectures: lectureId},
            {$pull:{lectures: lectureId}}
        )
        return res.status(200).json({message:"Lecture Remove Successfully"})
    
    } catch (error) {
        return res.status(500).json({message:`Failed to remove Lectures ${error}`})
    }
}


// Download assignment file - fetches from Cloudinary and streams to client
export const downloadAssignment = async (req, res) => {
    try {
        const { lectureId } = req.params;
        console.log("Download assignment request for lectureId:", lectureId);
        
        const lecture = await Lecture.findById(lectureId);

        if (!lecture) {
            return res.status(404).json({ message: "Lecture not found" });
        }

        if (!lecture.assignmentUrl) {
            return res.status(404).json({ message: "No assignment available for this lecture" });
        }

        const assignmentUrl = lecture.assignmentUrl;
        const fileName = lecture.assignmentName || 'assignment';
        
        console.log("Assignment URL:", assignmentUrl);
        
        // Configure cloudinary
        cloudinary.config({ 
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
            api_key: process.env.CLOUDINARY_API_KEY, 
            api_secret: process.env.CLOUDINARY_API_SECRET 
        });
        
        // Parse URL to get resource info
        const urlParts = assignmentUrl.split('/');
        const uploadIndex = urlParts.indexOf('upload');
        
        if (uploadIndex === -1) {
            return res.status(400).json({ message: "Invalid assignment URL format" });
        }
        
        // Get resource type from URL (image, raw, video)
        const urlResourceType = urlParts[uploadIndex - 1] || 'image';
        const publicIdWithVersion = urlParts.slice(uploadIndex + 1).join('/');
        // Keep file extension for public_id when accessing
        const publicIdWithExt = publicIdWithVersion.replace(/^v\d+\//, '');
        const publicIdNoExt = publicIdWithExt.replace(/\.[^/.]+$/, '');
        
        console.log("URL Resource Type:", urlResourceType);
        console.log("Public ID:", publicIdNoExt);
        
        let fileBuffer = null;
        
        // Method 1: Use Cloudinary Admin API to get resource and download URL
        try {
            console.log("Method 1: Using Admin API...");
            const resource = await cloudinary.api.resource(publicIdNoExt, {
                resource_type: urlResourceType,
                type: 'upload'
            });
            
            if (resource && resource.secure_url) {
                console.log("Admin API found resource, URL:", resource.secure_url);
                
                // Generate a signed URL using cloudinary.url with sign_url
                const signedUrl = cloudinary.url(publicIdWithExt, {
                    resource_type: urlResourceType,
                    type: 'upload',
                    sign_url: true,
                    secure: true
                });
                
                console.log("Generated signed URL:", signedUrl);
                
                const response = await fetch(signedUrl);
                console.log("Signed URL fetch status:", response.status);
                
                if (response.ok) {
                    fileBuffer = Buffer.from(await response.arrayBuffer());
                    console.log("Downloaded via signed URL!");
                }
            }
        } catch (e) {
            console.log("Admin API method failed:", e.message);
        }
        
        // Method 2: Use private_download_url for authenticated resources
        if (!fileBuffer) {
            try {
                console.log("Method 2: Using private_download_url...");
                const privateUrl = cloudinary.utils.private_download_url(publicIdNoExt, 'pdf', {
                    resource_type: urlResourceType,
                    type: 'upload',
                    expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour
                });
                
                console.log("Private download URL:", privateUrl);
                
                const response = await fetch(privateUrl);
                console.log("Private URL fetch status:", response.status);
                
                if (response.ok) {
                    fileBuffer = Buffer.from(await response.arrayBuffer());
                    console.log("Downloaded via private URL!");
                }
            } catch (e) {
                console.log("Private download method failed:", e.message);
            }
        }
        
        // Method 3: Direct fetch attempts
        if (!fileBuffer) {
            console.log("Method 3: Direct fetch attempts...");
            
            const urlsToTry = [
                assignmentUrl,
                assignmentUrl.replace('/image/upload/', '/raw/upload/'),
                assignmentUrl.replace('/upload/', '/upload/fl_attachment/')
            ];
            
            for (const url of urlsToTry) {
                console.log("Trying:", url);
                const response = await fetch(url);
                console.log("Status:", response.status);
                
                if (response.ok) {
                    fileBuffer = Buffer.from(await response.arrayBuffer());
                    console.log("Downloaded!");
                    break;
                }
            }
        }
        
        // If still no file
        if (!fileBuffer) {
            console.log("All methods failed. The file needs to be re-uploaded.");
            
            return res.status(403).json({
                message: "This file was uploaded with restricted access. Please ask the instructor to delete and re-upload the assignment.",
                solution: "The instructor should go to Edit Lecture, remove the current assignment, and upload it again."
            });
        }
        
        // Determine content type
        const ext = fileName.split('.').pop()?.toLowerCase();
        const mimeTypes = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'txt': 'text/plain',
            'zip': 'application/zip'
        };
        
        const contentType = mimeTypes[ext] || 'application/octet-stream';

        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', fileBuffer.length);
        
        console.log("SUCCESS! Sending", fileBuffer.length, "bytes");
        return res.send(fileBuffer);

    } catch (error) {
        console.error("Download error:", error);
        return res.status(500).json({ message: `Download failed: ${error.message}` });
    }
};


// Get Creator data

// controllers/userController.js

export const getCreatorById = async (req, res) => {
    try {
        const {userId} = req.body;

        const user = await User.findById(userId).select("-password"); // Exclude password

        if (!user) {
        return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json( user );

    } catch (error) {
        console.error("Error fetching user by ID:", error);
        res.status(500).json({ message: "get Creator error" });
    }
};




