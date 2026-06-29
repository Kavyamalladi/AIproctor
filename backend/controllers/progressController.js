import Progress from "../models/progressModel.js";

// Update video progress
export const updateProgress = async (req, res) => {
    try {
        const { lectureId, courseId, watchedDuration, totalDuration } = req.body;
        const userId = req.userId;

        if (!lectureId || !courseId) {
            return res.status(400).json({ message: "Lecture ID and Course ID are required" });
        }

        // Calculate if video is completed (watched at least 90% of the video)
        const watchPercentage = (watchedDuration / totalDuration) * 100;
        const isCompleted = watchPercentage >= 90;

        let progress = await Progress.findOne({ user: userId, lecture: lectureId });

        if (progress) {
            // Only update if new duration is greater
            if (watchedDuration > progress.watchedDuration) {
                progress.watchedDuration = watchedDuration;
                progress.totalDuration = totalDuration;
                
                if (isCompleted && !progress.isCompleted) {
                    progress.isCompleted = true;
                    progress.completedAt = new Date();
                }
                
                await progress.save();
            }
        } else {
            progress = await Progress.create({
                user: userId,
                course: courseId,
                lecture: lectureId,
                watchedDuration,
                totalDuration,
                isCompleted,
                completedAt: isCompleted ? new Date() : null
            });
        }

        return res.status(200).json(progress);
    } catch (error) {
        console.error("Update Progress Error:", error);
        return res.status(500).json({ message: `Failed to update progress: ${error}` });
    }
};

// Get progress for a specific lecture
export const getLectureProgress = async (req, res) => {
    try {
        const { lectureId } = req.params;
        const userId = req.userId;

        const progress = await Progress.findOne({ user: userId, lecture: lectureId });

        return res.status(200).json(progress || { isCompleted: false, watchedDuration: 0 });
    } catch (error) {
        console.error("Get Progress Error:", error);
        return res.status(500).json({ message: `Failed to get progress: ${error}` });
    }
};

// Get all progress for a course
export const getCourseProgress = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.userId;

        const progress = await Progress.find({ user: userId, course: courseId });

        return res.status(200).json(progress);
    } catch (error) {
        console.error("Get Course Progress Error:", error);
        return res.status(500).json({ message: `Failed to get course progress: ${error}` });
    }
};

// Update quiz score
export const updateQuizScore = async (req, res) => {
    try {
        const { lectureId, score } = req.body;
        const userId = req.userId;

        const progress = await Progress.findOne({ user: userId, lecture: lectureId });

        if (!progress) {
            return res.status(404).json({ message: "Progress not found" });
        }

        progress.quizScore = score;
        progress.quizAttempted = true;
        await progress.save();

        return res.status(200).json(progress);
    } catch (error) {
        console.error("Update Quiz Score Error:", error);
        return res.status(500).json({ message: `Failed to update quiz score: ${error}` });
    }
};
