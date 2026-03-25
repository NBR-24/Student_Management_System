const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/student_management_system')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

const seedTeacher = async () => {
    try {
        const existingTeacher = await User.findOne({ email: 'teacher@teacher.com' });
        if (existingTeacher) {
            console.log('Teacher teacher@teacher.com already exists. Updating password to teacher123');
            const salt = await bcrypt.genSalt(10);
            existingTeacher.password = await bcrypt.hash('teacher123', salt);
            await existingTeacher.save();
            console.log('Password reset to teacher123');
            process.exit();
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('teacher123', salt);

        const teacher = new User({
            name: 'Test Teacher',
            email: 'teacher@teacher.com',
            password: hashedPassword,
            role: 'teacher',
            department: 'CSE'
        });

        await teacher.save();
        console.log('Teacher created: teacher@teacher.com / teacher123');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedTeacher();
