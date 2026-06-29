import Course from "../models/courseModel.js";
import Lecture from "../models/lectureModel.js";
import Progress from "../models/progressModel.js";
import User from "../models/userModel.js";

const deleteCourseAndCleanup = async (courseId) => {
  const course = await Course.findById(courseId);

  if (!course) {
    return false;
  }

  await User.updateMany(
    { enrolledCourses: course._id },
    { $pull: { enrolledCourses: course._id } }
  );

  if (course.lectures?.length) {
    await Lecture.deleteMany({ _id: { $in: course.lectures } });
  }

  await course.deleteOne();
  return true;
};

export const submitTeacherApplication = async (req, res) => {
  try {
    const { qualification, interestsToTeach, whyTeach, personalDetails } = req.body;

    if (!qualification || !interestsToTeach || !whyTeach || !personalDetails) {
      return res.status(400).json({ message: "All application fields are required" });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "educator") {
      return res.status(403).json({ message: "Only educators can submit applications" });
    }

    if (user.teacherApplication?.status === "approved") {
      return res.status(400).json({ message: "Your application is already approved" });
    }

    user.teacherApplication = {
      qualification,
      interestsToTeach,
      whyTeach,
      personalDetails,
      status: "pending",
      submittedAt: new Date(),
      reviewedAt: undefined,
      reviewedBy: undefined,
      adminNote: "",
    };

    await user.save();

    return res.status(200).json({
      message: "Application submitted to admin successfully",
      teacherApplication: user.teacherApplication,
    });
  } catch (error) {
    return res.status(500).json({ message: `Submit application failed: ${error}` });
  }
};

export const getMyTeacherApplication = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select("role teacherApplication")
      .populate("teacherApplication.reviewedBy", "name email");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "educator") {
      return res.status(403).json({ message: "Only educators can access application status" });
    }

    return res.status(200).json({ teacherApplication: user.teacherApplication });
  } catch (error) {
    return res.status(500).json({ message: `Get application status failed: ${error}` });
  }
};

export const getTeacherApplications = async (_req, res) => {
  try {
    const teachers = await User.find({ role: "educator" })
      .select("name email photoUrl teacherApplication createdAt")
      .populate("teacherApplication.reviewedBy", "name email")
      .sort({ "teacherApplication.submittedAt": -1, createdAt: -1 });

    return res.status(200).json({ teachers });
  } catch (error) {
    return res.status(500).json({ message: `Get teacher applications failed: ${error}` });
  }
};

export const reviewTeacherApplication = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { action, adminNote = "" } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }

    const teacher = await User.findById(teacherId);

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    if (teacher.role !== "educator") {
      return res.status(400).json({ message: "Selected user is not an educator" });
    }

    if (teacher.teacherApplication?.status === "not_submitted") {
      return res.status(400).json({ message: "Teacher has not submitted application yet" });
    }

    teacher.teacherApplication.status = action === "approve" ? "approved" : "rejected";
    teacher.teacherApplication.reviewedAt = new Date();
    teacher.teacherApplication.reviewedBy = req.userId;
    teacher.teacherApplication.adminNote = adminNote;

    await teacher.save();

    return res.status(200).json({
      message: `Teacher application ${action}d successfully`,
      teacher,
    });
  } catch (error) {
    return res.status(500).json({ message: `Review application failed: ${error}` });
  }
};

export const getAdminOverview = async (_req, res) => {
  try {
    const [teachers, students, courses] = await Promise.all([
      User.find({ role: "educator" }).select("name email photoUrl teacherApplication createdAt"),
      User.find({ role: "student" }).select("name email photoUrl enrolledCourses createdAt").populate("enrolledCourses", "title creator"),
      Course.find({})
        .select("title category creator enrolledStudents isPublished createdAt")
        .populate("creator", "name email teacherApplication")
        .populate("enrolledStudents", "name email"),
    ]);

    return res.status(200).json({
      counts: {
        teachers: teachers.length,
        students: students.length,
        courses: courses.length,
      },
      teachers,
      students,
      courses,
    });
  } catch (error) {
    return res.status(500).json({ message: `Get admin overview failed: ${error}` });
  }
};

export const getTeacherCoursesWithStudents = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const teacher = await User.findById(teacherId).select("name email role teacherApplication");

    if (!teacher || teacher.role !== "educator") {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const courses = await Course.find({ creator: teacherId })
      .select("title category isPublished enrolledStudents createdAt")
      .populate("enrolledStudents", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ teacher, courses });
  } catch (error) {
    return res.status(500).json({ message: `Get teacher courses failed: ${error}` });
  }
};

export const removeUserByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(400).json({ message: "Admin user cannot be removed" });
    }

    if (user.role === "educator") {
      const teacherCourses = await Course.find({ creator: user._id }).select("_id");

      for (const course of teacherCourses) {
        await deleteCourseAndCleanup(course._id);
      }
    }

    if (user.role === "student") {
      await Course.updateMany(
        { enrolledStudents: user._id },
        { $pull: { enrolledStudents: user._id } }
      );
    }

    await user.deleteOne();

    return res.status(200).json({ message: "User removed successfully" });
  } catch (error) {
    return res.status(500).json({ message: `Remove user failed: ${error}` });
  }
};

export const removeCourseByAdmin = async (req, res) => {
  try {
    const { courseId } = req.params;
    const deleted = await deleteCourseAndCleanup(courseId);

    if (!deleted) {
      return res.status(404).json({ message: "Course not found" });
    }

    return res.status(200).json({ message: "Course removed successfully" });
  } catch (error) {
    return res.status(500).json({ message: `Remove course failed: ${error}` });
  }
};

export const getCourseStudentsWithProgressByAdmin = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId)
      .select("title creator enrolledStudents lectures")
      .populate("creator", "name email")
      .populate("enrolledStudents", "name email");

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const totalLectures = course.lectures?.length || 0;

    const students = await Promise.all(
      course.enrolledStudents.map(async (student) => {
        const completedCount = await Progress.countDocuments({
          user: student._id,
          course: courseId,
          isCompleted: true,
        });

        const progressPercent =
          totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;

        return {
          _id: student._id,
          name: student.name,
          email: student.email,
          completedLectures: completedCount,
          totalLectures,
          progress: progressPercent,
        };
      })
    );

    return res.status(200).json({ course, students });
  } catch (error) {
    return res.status(500).json({ message: `Get course students failed: ${error}` });
  }
};

export const removeStudentFromCourseByAdmin = async (req, res) => {
  try {
    const { courseId, studentId } = req.params;

    const [course, student] = await Promise.all([
      Course.findById(courseId).select("_id enrolledStudents"),
      User.findById(studentId).select("_id role enrolledCourses"),
    ]);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (!student || student.role !== "student") {
      return res.status(404).json({ message: "Student not found" });
    }

    await Promise.all([
      Course.updateOne({ _id: courseId }, { $pull: { enrolledStudents: studentId } }),
      User.updateOne({ _id: studentId }, { $pull: { enrolledCourses: courseId } }),
      Progress.deleteMany({ user: studentId, course: courseId }),
    ]);

    return res.status(200).json({ message: "Student removed from course successfully" });
  } catch (error) {
    return res.status(500).json({ message: `Remove student from course failed: ${error}` });
  }
};
