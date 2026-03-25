const User = require('../models/User');

exports.getMe = async (req, res) => {
    try {
        const student = await User.findById(req.user.userId).select('-password');
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.json(student);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getInternalResults = async (req, res) => {
    try {
        const InternalResult = require('../models/InternalResult');
        const results = await InternalResult.find({ student: req.user.userId })
            .populate('batch', 'name branch scheme')
            .sort({ createdAt: -1 });

        res.json(results);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
