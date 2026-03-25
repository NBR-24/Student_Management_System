const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');
const seedAdmin = require('./utils/seed');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'db');
if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
}

// Database Connection
let mongod = null;

const connectDB = async () => {
    try {
        let mongoUri = process.env.MONGO_URI;
        let isEmbedded = false;

        // Check if we should use embedded DB (if no MONGO_URI or explicit override)
        if (!mongoUri || mongoUri.includes('memory-server')) {
            try {
                // Ensure dbPath exists
                if (!fs.existsSync(path.join(dataDir, 'db'))) {
                    fs.mkdirSync(path.join(dataDir, 'db'), { recursive: true });
                }

                // Remove lock file if it exists (fixes restart issues on Windows)
                const lockFile = path.join(dataDir, 'db', 'mongod.lock');
                if (fs.existsSync(lockFile)) {
                    try {
                        fs.unlinkSync(lockFile);
                    } catch (e) {
                        console.warn('Could not remove lock file, might be in use:', e.message);
                    }
                }

                mongod = await MongoMemoryServer.create({
                    instance: {
                        dbPath: path.join(dataDir, 'db'),
                        storageEngine: 'wiredTiger',
                        port: 27017 // Fixed port for easier access via Compass
                    },
                    binary: {
                        version: '6.0.4',
                    },
                });
                mongoUri = mongod.getUri();
                isEmbedded = true;
                console.log('---------------------------------------------------');
                console.log('🚀 Using Embedded Persistent Database');
                console.log(`📂 Data stored in: ${path.join(dataDir, 'db')}`);
                console.log('---------------------------------------------------');
            } catch (err) {
                console.error('Failed to start embedded DB:', err);
                // Fallback to whatever env has, or fail
                if (!mongoUri) throw new Error('No MongoDB URI provided and embedded DB failed to start');
            }
        }

        await mongoose.connect(mongoUri);
        console.log(`MongoDB Connected: ${isEmbedded ? 'Embedded (Persistent)' : 'External URI'}`);

        // Seed Admin only if it doesn't exist
        await seedAdmin();

    } catch (err) {
        console.error('MongoDB Connection Error:', err.message);
        process.exit(1);
    }
};

// Handle cleanup
const gracefulShutdown = async () => {
    if (mongod) {
        console.log('Stopping MongoDB...');
        await mongoose.disconnect();
        await mongod.stop();
        console.log('MongoDB stopped.');
    }
    process.exit(0);
};

// Nodemon restart signal
process.once('SIGUSR2', async () => {
    if (mongod) {
        await mongoose.disconnect();
        await mongod.stop();
    }
    process.kill(process.pid, 'SIGUSR2');
});

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/teacher', require('./routes/teacher'));

// Temporary Debug Route
app.get('/debug-users', async (req, res) => {
    const User = require('./models/User');
    const users = await User.find({}, 'name email role registerId admissionNo');
    res.json(users);
});

app.get('/debug-results', async (req, res) => {
    const Result = require('./models/Result');
    const results = await Result.find({}).sort({ createdAt: -1 });
    res.json({
        count: await Result.countDocuments(),
        results
    });
});

app.get('/seed-teacher', async (req, res) => {
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');
    try {
        let teacher = await User.findOne({ email: 'teacher@teacher.com' });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('teacher123', salt);

        if (!teacher) {
            teacher = new User({
                name: 'Test Teacher',
                email: 'teacher@teacher.com',
                role: 'teacher',
                department: 'CSE'
            });
        }
        teacher.password = hashedPassword;
        await teacher.save();
        res.json({ message: 'Teacher password forcefully reset', email: 'teacher@teacher.com', password: 'teacher123' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.use('/api/student', require('./routes/student'));
app.use('/api/academic', require('./routes/academic'));

app.get('/', (req, res) => {
    res.send('Student Management System API is running');
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
