const Request  = require('../models/Request');
const User     = require('../models/User');
const path     = require('path');
const fs       = require('fs');
const PDFDocument = require('pdfkit');
const QRCode   = require('qrcode');

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Generate unique request ID: REQ-YYYYMMDD-XXXX
const generateReqId = () => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `REQ-${date}-${rand}`;
};

// Default flow per request type
const DEFAULT_FLOWS = {
    bonafide:       ['tutor', 'hod', 'principal'],
    duty_leave:     ['tutor', 'hod'],
    lab_permission: ['tutor', 'hod'],
    custom:         []   // student provides custom flow
};

// Notify the next approver (simple in-app — extend later)
const notifyUser = async (userId, message) => {
    // Placeholder: in future hook into a Notification model
    console.log(`[NOTIFY → ${userId}]: ${message}`);
};

// ─── Generate PDF ─────────────────────────────────────────────────────────────
const generatePDF = async (request) => {
    const student = await User.findById(request.student).select('name registerId phone batch department');

    // Resolve approver names
    const resolvedFlow = await Promise.all(request.flow.map(async (step) => {
        const approver = await User.findById(step.assignedTo).select('name role designation department');
        return { ...step.toObject(), approverName: approver?.name || 'Unknown', approverRole: approver?.role || step.role };
    }));

    const reqId = request.reqId;

    // Public verification URL (update domain when deployed)
    const verifyUrl = `http://localhost:5173/verify/${reqId}`;

    // QR code as data URL (then convert to Buffer)
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 100, margin: 1 });
    const qrBuffer  = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');

    // Ensure uploads/requests dir exists
    const pdfsDir = path.join(__dirname, '..', 'uploads', 'requests');
    if (!fs.existsSync(pdfsDir)) fs.mkdirSync(pdfsDir, { recursive: true });

    const pdfPath = path.join(pdfsDir, `${reqId}.pdf`);

    await new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 60 });
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

        const pageW = doc.page.width;
        const marginL = 60;
        const marginR = 60;
        const contentW = pageW - marginL - marginR;

        // ── Header ──
        doc.fontSize(14).font('Helvetica-Bold')
           .text('GOVERNMENT ENGINEERING COLLEGE PALAKKAD', marginL, 60, { align: 'center', width: contentW });
        doc.fontSize(10).font('Helvetica')
           .text('Palakkad, Kerala — 678633', { align: 'center', width: contentW });
        doc.moveDown(0.5);
        doc.moveTo(marginL, doc.y).lineTo(pageW - marginR, doc.y).strokeColor('#333').stroke();
        doc.moveDown(0.8);

        // ── From / To ──
        const y0 = doc.y;
        doc.fontSize(10).font('Helvetica');
        doc.text('From:', marginL, y0);
        doc.font('Helvetica-Bold').text(student?.name || '', marginL + 45, y0);
        doc.font('Helvetica').text(`S${request.body.match(/S\d/)?.[0]?.slice(1) || ''} ${student?.department || ''} | ${student?.registerId || ''}`, marginL + 45, y0 + 14);
        doc.moveDown(1.2);

        doc.text('To:');
        doc.font('Helvetica-Bold').text('The Principal');
        doc.font('Helvetica').text('Government Engineering College Palakkad');
        doc.moveDown(1);

        // ── Date ──
        doc.text(`Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, { align: 'right' });
        doc.moveDown(0.8);

        // ── Subject ──
        doc.font('Helvetica-Bold').text(`Subject: ${request.subject}`);
        doc.moveDown(1);

        // ── Body ──
        doc.font('Helvetica').text('Respected Sir/Ma\'am,', { indent: 0 });
        doc.moveDown(0.5);
        doc.text(request.body, { align: 'justify', indent: 20 });
        doc.moveDown(1.5);

        doc.text('Sincerely,');
        doc.font('Helvetica-Bold').text(student?.name || '');
        doc.font('Helvetica').text(student?.registerId || '');
        if (student?.phone) doc.text(student.phone);

        doc.moveDown(1.5);

        // ── Approval Trail ──
        doc.moveTo(marginL, doc.y).lineTo(pageW - marginR, doc.y).strokeColor('#aaa').stroke();
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica-Bold').text('APPROVAL TRAIL', { align: 'center' });
        doc.moveDown(0.5);

        resolvedFlow.forEach((step) => {
            const label = step.role.charAt(0).toUpperCase() + step.role.slice(1);
            const dateStr = step.actedAt
                ? new Date(step.actedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : '';
            doc.fontSize(10).font('Helvetica-Bold').text(`${label}: `, { continued: true });
            doc.font('Helvetica').text(`${step.approverName}   ✓ Approved   ${dateStr}`);
        });

        doc.moveDown(1);

        // ── Req ID + QR ──
        const qrSize = 80;
        const qrX = pageW - marginR - qrSize;
        const qrY = doc.y;
        doc.image(qrBuffer, qrX, qrY, { width: qrSize });
        doc.fontSize(8).text(`Req ID: ${reqId}`, marginL, qrY + qrSize / 2, { lineBreak: false });
        doc.fontSize(7).fillColor('#888').text(`Scan to verify at: ${verifyUrl}`, marginL, qrY + qrSize / 2 + 12);

        doc.end();
        stream.on('finish', resolve);
        stream.on('error', reject);
    });

    return pdfPath;
};

// ─── Controllers ──────────────────────────────────────────────────────────────

// POST /api/request — student creates request
exports.createRequest = async (req, res) => {
    try {
        const { type, subject, body, flow: flowInput } = req.body;
        const studentId = req.user.userId;

        if (!type || !subject || !body) {
            return res.status(400).json({ message: 'type, subject, and body are required.' });
        }

        // Validate and build flow
        const flowSteps = [];
        const flowRoles = DEFAULT_FLOWS[type] || [];

        if (type === 'custom') {
            // flowInput must be array of { role, assignedTo }
            if (!Array.isArray(flowInput) || flowInput.length === 0) {
                return res.status(400).json({ message: 'Custom requests require a flow array.' });
            }
            for (const step of flowInput) {
                const person = await User.findById(step.assignedTo);
                if (!person) return res.status(400).json({ message: `User ${step.assignedTo} not found.` });
                flowSteps.push({ role: step.role, assignedTo: step.assignedTo, status: 'pending' });
            }
        } else {
            if (!Array.isArray(flowInput) || flowInput.length !== flowRoles.length) {
                return res.status(400).json({ message: `${type} requires ${flowRoles.length} flow steps: ${flowRoles.join(' → ')}.` });
            }
            for (let i = 0; i < flowRoles.length; i++) {
                const person = await User.findById(flowInput[i].assignedTo);
                if (!person) return res.status(400).json({ message: `User ${flowInput[i].assignedTo} not found.` });
                flowSteps.push({ role: flowRoles[i], assignedTo: flowInput[i].assignedTo, status: 'pending' });
            }
        }

        const reqId = generateReqId();

        const request = await Request.create({
            reqId,
            type,
            subject,
            body,
            student: studentId,
            flow: flowSteps,
            currentStep: 0,
            status: 'pending'
        });

        // Notify first approver
        notifyUser(flowSteps[0].assignedTo, `New request "${subject}" from a student needs your approval.`);

        res.status(201).json({ reqId: request.reqId, _id: request._id });
    } catch (err) {
        console.error('[createRequest]', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/request/my — student's own requests
exports.getMyRequests = async (req, res) => {
    try {
        const requests = await Request.find({ student: req.user.userId })
            .populate('flow.assignedTo', 'name role designation')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /api/request/pending — requests waiting for the logged-in approver
exports.getPendingRequests = async (req, res) => {
    try {
        const userId = req.user.userId;
        // Find requests where the current step is assigned to this user
        const requests = await Request.find({
            status: 'pending',
            $expr: {
                $eq: [{ $arrayElemAt: ['$flow.assignedTo', '$currentStep'] }, { $toObjectId: userId }]
            }
        }).populate('student', 'name registerId department phone batch')
          .populate('flow.assignedTo', 'name role designation')
          .sort({ createdAt: -1 });

        res.json(requests);
    } catch (err) {
        console.error('[getPendingRequests]', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
const mongoose = require('mongoose');

// GET /api/request/history — requests the approver has acted upon (approved, forwarded, reverted)
exports.getApproverHistory = async (req, res) => {
    try {
        const userId = req.user.userId;
        const requests = await Request.find({
            'flow': {
                $elemMatch: {
                    assignedTo: new mongoose.Types.ObjectId(userId),
                    status: { $in: ['approved', 'rejected'] }
                }
            }
        }).populate('student', 'name registerId department phone batch')
          .populate('flow.assignedTo', 'name role designation')
          .sort({ updatedAt: -1 });

        res.json(requests);
    } catch (err) {
        console.error('[getApproverHistory]', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/request/:id/approve — approver approves current step
exports.approveRequest = async (req, res) => {
    try {
        const { comment } = req.body || {};
        const userId = req.user.userId;
        const request = await Request.findById(req.params.id);

        if (!request) return res.status(404).json({ message: 'Request not found.' });
        if (request.status !== 'pending') return res.status(400).json({ message: 'Request is not pending.' });

        const step = request.flow[request.currentStep];
        if (!step || step.assignedTo.toString() !== userId) {
            return res.status(403).json({ message: 'You are not the current approver.' });
        }

        // Mark step approved
        step.status = 'approved';
        step.actedAt = new Date();
        if (comment) step.comment = comment;

        const isLastStep = request.currentStep >= request.flow.length - 1;

        if (isLastStep) {
            // Fully approved → generate PDF
            request.status = 'approved';
            await request.save();

            const pdfPath = await generatePDF(request);
            request.pdfPath = pdfPath;
            await request.save();

            notifyUser(request.student, `Your request "${request.subject}" has been fully approved. Download your PDF!`);
        } else {
            // Advance to next step
            request.currentStep += 1;
            await request.save();
            const nextStep = request.flow[request.currentStep];
            notifyUser(nextStep.assignedTo, `A request "${request.subject}" needs your approval.`);
        }

        res.json({ message: isLastStep ? 'Approved — PDF generated.' : 'Approved — forwarded to next step.', status: request.status });
    } catch (err) {
        console.error('[approveRequest]', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/request/:id/reject — approver rejects
exports.rejectRequest = async (req, res) => {
    try {
        const { comment } = req.body || {};
        const userId = req.user.userId;
        const request = await Request.findById(req.params.id);

        if (!request) return res.status(404).json({ message: 'Request not found.' });
        if (request.status !== 'pending') return res.status(400).json({ message: 'Request is not pending.' });

        const step = request.flow[request.currentStep];
        if (!step || step.assignedTo.toString() !== userId) {
            return res.status(403).json({ message: 'You are not the current approver.' });
        }

        step.status = 'rejected';
        step.actedAt = new Date();
        step.comment = comment || '';
        request.status = 'reverted';
        await request.save();

        notifyUser(request.student, `Your request "${request.subject}" was rejected. Reason: ${comment || 'No reason given'}`);

        res.json({ message: 'Request rejected and returned to student.' });
    } catch (err) {
        console.error('[rejectRequest]', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/request/:id/pdf — download PDF (auth required)
exports.downloadPDF = async (req, res) => {
    try {
        const request = await Request.findById(req.params.id);
        if (!request || !request.pdfPath) {
            return res.status(404).json({ message: 'PDF not available yet.' });
        }
        res.download(request.pdfPath, `${request.reqId}.pdf`);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /api/request/verify/:reqId — PUBLIC — QR verification
exports.verifyRequest = async (req, res) => {
    try {
        const request = await Request.findOne({ reqId: req.params.reqId })
            .populate('student', 'name registerId department')
            .populate('flow.assignedTo', 'name role designation department');

        if (!request) return res.status(404).json({ message: 'Request not found.' });

        res.json({
            reqId:   request.reqId,
            type:    request.type,
            subject: request.subject,
            status:  request.status,
            student: {
                name:       request.student?.name,
                registerId: request.student?.registerId,
                department: request.student?.department
            },
            approvalTrail: request.flow.map(step => ({
                role:     step.role,
                approver: step.assignedTo?.name,
                status:   step.status,
                actedAt:  step.actedAt
            })),
            createdAt: request.createdAt
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /api/request/staff — list tutors/HoDs for flow builder dropdown
exports.getStaff = async (req, res) => {
    try {
        const { dept, role } = req.query;
        const filter = { role: { $in: ['teacher', 'hod', 'principal'] } };
        if (dept) filter.department = new RegExp(`^${dept}$`, 'i');
        if (role === 'tutor') filter.designation = 'tutor';
        else if (role === 'hod') filter.role = 'hod';
        else if (role === 'principal') filter.role = 'principal';

        const staff = await User.find(filter).select('name role designation department');
        res.json(staff);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /api/request/:id/resubmit — student edits a reverted request
exports.resubmitRequest = async (req, res) => {
    try {
        const { subject, body, flow: flowInput } = req.body;
        const userId = req.user.userId;
        const request = await Request.findById(req.params.id);

        if (!request) return res.status(404).json({ message: 'Request not found.' });
        if (request.student.toString() !== userId) return res.status(403).json({ message: 'Not your request.' });
        if (request.status !== 'reverted') return res.status(400).json({ message: 'Only reverted requests can be resubmitted.' });

        if (subject) request.subject = subject;
        if (body)    request.body    = body;

        // Reset flow
        request.flow.forEach(step => {
            step.status  = 'pending';
            step.comment = undefined;
            step.actedAt = undefined;
        });

        // Update flow assignments if provided
        if (Array.isArray(flowInput)) {
            for (let i = 0; i < flowInput.length && i < request.flow.length; i++) {
                if (flowInput[i].assignedTo) request.flow[i].assignedTo = flowInput[i].assignedTo;
            }
        }

        request.currentStep = 0;
        request.status      = 'pending';
        request.pdfPath     = undefined;
        await request.save();

        notifyUser(request.flow[0].assignedTo, `A resubmitted request "${request.subject}" needs your approval.`);

        res.json({ message: 'Request resubmitted successfully.' });
    } catch (err) {
        console.error('[resubmitRequest]', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
