import Comment from "../models/commentModel.js";

// Add a new comment/doubt
export const addComment = async (req, res) => {
    try {
        const { lectureId, text } = req.body;
        const userId = req.userId;

        if (!lectureId || !text) {
            return res.status(400).json({ message: "Lecture ID and text are required" });
        }

        const comment = await Comment.create({
            lecture: lectureId,
            user: userId,
            text
        });

        const populatedComment = await Comment.findById(comment._id)
            .populate("user", "name photoUrl role")
            .populate("replies.user", "name photoUrl role");

        return res.status(201).json(populatedComment);
    } catch (error) {
        console.error("Add Comment Error:", error);
        return res.status(500).json({ message: `Failed to add comment: ${error}` });
    }
};

// Add a reply to a comment
export const addReply = async (req, res) => {
    try {
        const { commentId, text } = req.body;
        const userId = req.userId;

        if (!commentId || !text) {
            return res.status(400).json({ message: "Comment ID and text are required" });
        }

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: "Comment not found" });
        }

        comment.replies.push({
            user: userId,
            text
        });

        await comment.save();

        const populatedComment = await Comment.findById(commentId)
            .populate("user", "name photoUrl role")
            .populate("replies.user", "name photoUrl role");

        return res.status(200).json(populatedComment);
    } catch (error) {
        console.error("Add Reply Error:", error);
        return res.status(500).json({ message: `Failed to add reply: ${error}` });
    }
};

// Get all comments for a lecture
export const getLectureComments = async (req, res) => {
    try {
        const { lectureId } = req.params;

        const comments = await Comment.find({ lecture: lectureId })
            .populate("user", "name photoUrl role")
            .populate("replies.user", "name photoUrl role")
            .sort({ createdAt: -1 });

        return res.status(200).json(comments);
    } catch (error) {
        console.error("Get Comments Error:", error);
        return res.status(500).json({ message: `Failed to get comments: ${error}` });
    }
};

// Delete a comment
export const deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.userId;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: "Comment not found" });
        }

        if (comment.user.toString() !== userId) {
            return res.status(403).json({ message: "Not authorized to delete this comment" });
        }

        await comment.deleteOne();
        return res.status(200).json({ message: "Comment deleted successfully" });
    } catch (error) {
        console.error("Delete Comment Error:", error);
        return res.status(500).json({ message: `Failed to delete comment: ${error}` });
    }
};
