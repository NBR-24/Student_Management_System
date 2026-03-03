
// --- Result Publishing Operations ---

exports.getBatchResultOverview = async (req, res) => {
    try {
        const { batchId } = req.params;

        // Aggregate to get unique exams uploaded for this batch
        const overview = await Result.aggregate([
            { $match: { batch: new mongoose.Types.ObjectId(batchId) } },
            {
                $group: {
                    _id: { title: "$title", type: "$type" },
                    totalStudents: { $sum: 1 },
                    published: { $first: "$published" }, // Assuming all in a set have same status
                    lastUploaded: { $max: "$date" },
                    averageSGPA: { $avg: "$sgpa" }
                }
            },
            { $sort: { lastUploaded: -1 } }
        ]);

        res.json(overview.map(item => ({
            title: item._id.title,
            type: item._id.type,
            totalStudents: item.totalStudents,
            published: item.published,
            lastUploaded: item.lastUploaded,
            averageSGPA: (item.averageSGPA || 0).toFixed(2)
        })));

    } catch (err) {
        console.error("Error fetching result overview:", err);
        res.status(500).send('Server Error');
    }
};

exports.publishResult = async (req, res) => {
    try {
        const { batchId, title, type } = req.body;

        if (!batchId || !title) {
            return res.status(400).json({ message: "Batch ID and Title are required" });
        }

        const result = await Result.updateMany(
            {
                batch: batchId,
                title: title,
                type: type || 'university'
            },
            { $set: { published: true } }
        );

        res.json({ message: "Result published successfully", modified: result.modifiedCount });

    } catch (err) {
        console.error("Error publishing result:", err);
        res.status(500).send('Server Error');
    }
};

exports.getBatchResultDetails = async (req, res) => {
    try {
        const { batchId } = req.params;
        const { title, type } = req.query;

        if (!title) {
            return res.status(400).json({ message: "Title is required" });
        }

        const results = await Result.find({
            batch: batchId,
            title: title,
            type: type || 'university'
        })
            .populate('student', 'name admissionNo registerId')
            .sort({ 'student.registerId': 1 }); // Sort by Register ID associated with student if possible

        // Manual sort might be needed if populate sort doesn't work directly on subfields in older mongoose
        // But let's try basic find first.

        res.json(results);

    } catch (err) {
        console.error("Error fetching result details:", err);
        res.status(500).send('Server Error');
    }
};

exports.deleteResult = async (req, res) => {
    try {
        const { batchId, title, type } = req.body;

        if (!batchId || !title) return res.status(400).json({ message: "Missing parameters" });

        const result = await Result.deleteMany({
            batch: batchId,
            title: title,
            type: type || 'university'
        });

        res.json({ message: "Result set deleted", deletedCount: result.deletedCount });

    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};
