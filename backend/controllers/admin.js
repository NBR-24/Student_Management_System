const User = require('../models/User');
const bcrypt = require('bcryptjs');

exports.addStaff = async (req, res) => {
    const { name, email, password, department, role } = req.body;

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Validate Role
        const validRoles = ['teacher', 'exam_controller', 'hod', 'principal'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: 'Invalid role specified' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role,
            department: (role === 'teacher' || role === 'hod') ? department : undefined
        });

        await newUser.save();
        res.json({ message: `${role} added successfully`, user: newUser });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getStaff = async (req, res) => {
    try {
        const { role } = req.query;
        let query = { role: { $in: ['teacher', 'exam_controller', 'hod', 'principal'] } };

        if (role) {
            query.role = role;
        }

        const staff = await User.find(query).select('-password');
        res.json(staff);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.updateStaff = async (req, res) => {
    const { name, email, department, password, role } = req.body;
    try {
        let user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check if updating email conflicts with another user
        if (email && email !== user.email) {
            const userExists = await User.findOne({ email });
            if (userExists) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        }

        user.name = name || user.name;
        user.email = email || user.email;
        user.department = department || user.department;
        // Role update is generally not allowed, but if needed:
        // user.role = role || user.role;

        // Handle password update if provided
        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();
        res.json({ message: 'User updated successfully', user });
    } catch (err) {
        console.error('Update User Error:', err);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(500).json({ message: 'Server Error: ' + err.message });
    }
};

exports.deleteStaff = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        await User.deleteOne({ _id: req.params.id });
        res.json({ message: 'User removed' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(500).send('Server Error');
    }
};
