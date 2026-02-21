# Software Design Document (SDD)
## for Scalable Academic Management System (SAMS)

**Version 1.1 (Template Aligned)**

**Prepared by Team 10**
**Department of Computer Science and Engineering**
**Government Engineering College, Sreekrishnapuram, under APJ Abdul Kalam Technological University**
**February 2026**

---

## TABLE OF CONTENTS

1.  [INTRODUCTION](#1-introduction)
    *   1.1 [Purpose](#11-purpose)
    *   1.2 [Scope](#12-scope)
    *   1.3 [Overview](#13-overview)
    *   1.4 [Reference Material](#14-reference-material)
    *   1.5 [Definitions and Acronyms](#15-definitions-and-acronyms)
2.  [SYSTEM OVERVIEW](#2-system-overview)
3.  [SYSTEM ARCHITECTURE](#3-system-architecture)
    *   3.1 [Architectural Design](#31-architectural-design)
    *   3.2 [Decomposition Description](#32-decomposition-description)
    *   3.3 [Design Rationale](#33-design-rationale)
4.  [DATA DESIGN](#4-data-design)
    *   4.1 [Data Description](#41-data-description)
    *   4.2 [Data Dictionary](#42-data-dictionary)
5.  [COMPONENT DESIGN](#5-component-design)
    *   5.1 [Auth Components](#51-auth-components)
    *   5.2 [Feature 1 – Exam Controller PDF Upload](#52-feature-1--exam-controller-pdf-upload)
    *   5.3 [Feature 2 – Teacher Student Registration & Internal Marks](#53-feature-2--teacher-student-registration--internal-marks)
    *   5.4 [Student Unified Marks Retrieval](#54-student-unified-marks-retrieval)
    *   5.5 [Feature 3 - Request Management (Planned)](#55-feature-3---request-management-planned)
6.  [HUMAN INTERFACE DESIGN](#6-human-interface-design)
    *   6.1 [Overview of User Interface](#61-overview-of-user-interface)
    *   6.2 [Screen Images](#62-screen-images)
    *   6.3 [Screen Objects and Actions](#63-screen-objects-and-actions)
7.  [REQUIREMENTS MATRIX](#7-requirements-matrix)
8.  [APPENDICES](#8-appendices)
    *   [Appendix A – Diagrams](#appendix-a--diagrams)
    *   [Appendix B – Additional Design Notes](#appendix-b--additional-design-notes)
    *   [Appendix C – TBD List](#appendix-c--tbd-list)

---

## 1. INTRODUCTION

### 1.1 Purpose
The purpose of this Software Design Document (SDD) is to describe the architectural and detailed design of the **Scalable Academic Management System (SAMS)**. It provides a blueprint for the implementation of the system, covering data structures, software components, and interfaces.

**Intended Audience**:
-   **Development Team**: For implementing the backend API and frontend UI.
-   **Project Guide & Evaluation Committee**: For assessing the technical depth and design soundness of the project.
-   **Future Maintainers**: For understanding the system structure for future extensions (e.g., Attendance module).

### 1.2 Scope
SAMS is a web-based academic management platform designed to streamline result processing and student data tracking.
**Current Scope (Design & Implementation)**:
-   **Authentication**: Secure, role-based access for Students, Teachers, Exam Controllers, and Admins.
-   **Exam Controller Workflow**: Uploading and parsing official KTU Result PDFs.
-   **Teacher Workflow**: Creating student batches and registering students via Excel upload.
-   **Student Workflow**: Viewing unified academic results (Official & Internal) from a personal dashboard.
-   **Admin Workflow**: Managing system users and staff.
-   **Request Management**: System for students to submit academic requests to authorities.

### 1.3 Overview
This document is organized as follows:
-   **Section 2**: System Overview & Context.
-   **Section 3**: System Architecture (Client-Server-DB).
-   **Section 4**: Data Design (Schema & Dictionary).
-   **Section 5**: Component Design (Module Descriptions).
-   **Section 6**: Human Interface Design (UI Flows).
-   **Section 7**: Requirements Matrix (Traceability).
-   **Section 8**: Appendices (Diagrams & Notes).

### 1.4 Reference Material
1.  **System Requirements Specification (SRS)** for SAMS (Version 1.2).
2.  **IEEE Std 1016-2009**: IEEE Standard for Information Technology—Systems Design—Software Design Descriptions.
3.  **Sinaj P.S. SDD Template**: The mandated format for this document.
4.  **KTU B.Tech Regulations**: For grading logic (SGPA calculation).
5.  **Project Spec**: Project Info document & KTU CSD 334 Syllabus.

### 1.5 Definitions and Acronyms
-   **SAMS**: Scalable Academic Management System.
-   **KTU Official**: Results published by the university (external source).
-   **Series/Internal**: Continuous assessment marks (internal source).
-   **Unified Marks Collection**: A database design strategy (`Result` collection) storing both external and internal marks.
-   **StudentMark**: The data entity representing a student's result.
-   **JWT**: JSON Web Token (used for stateless authentication).
-   **RBAC**: Role-Based Access Control.
-   **AuditLog**: Record of sensitive system actions.

---

## 2. SYSTEM OVERVIEW

SAMS functions as a centralized repository for academic data, replacing disparate Excel files and manual record-keeping. It operates as a three-tier web application:
1.  **Presentation Layer**: A React-based Single Page Application (SPA) accessible via web browsers.
2.  **Logic Layer**: A Node.js/Express server that handles business logic, file parsing (PDF/Excel), and API routing.
3.  **Data Layer**: A MongoDB database storing Users, Batches, and Results.

**Context**:
The system is designed to work independently of the university's live portal. The **Exam Controller** downloads result PDFs from the university portal and uploads them to SAMS. SAMS then parses these files to populate the local database, allowing **Students** to view their results anytime. **Teachers** manage the student registry by creating batches and uploading student lists.

---

## 3. SYSTEM ARCHITECTURE

### 3.1 Architectural Design
The system follows a **Modular Monolithic** architecture using the **MERN** stack.

#### Client Layer (Frontend)
-   **Framework**: React + Vite (SPA).
-   **Responsibility**: Rendering UI, managing client state, consuming REST APIs.
-   **Pages**: Login, Teacher Dashboard, Student Dashboard, Admin Dashboard, Request Pages.

#### Application Layer (Backend)
-   **Runtime**: Node.js + Express.
-   **Responsibility**: Request handling, authentication, file processing, database interactions.
-   **Modules**:
    -   `AuthModule`: Registration, Login, JWT handling.
    -   `AcademicModule`: PDF uploading, Result parsing (`pdf-parse`), Unified marks retrieval.
    -   `TeacherModule`: Batch creation, Student Excel parsing (`xlsx`), Internal marks upload.
    -   `AdminModule`: User statistics, User management.
    -   `RequestModule`: Request creation and status tracking.
    -   `SharedServices`: Logging, Error Handling.

#### Data Layer (Database)
-   **Database**: MongoDB Atlas.
-   **Responsibility**: Persistent storage.
-   **Collections**: `users`, `batches`, `results`, `requests`, `audit_logs` (planned), `upload_logs` (planned).

*(Architecture Diagrams are referenced in Appendix A)*

### 3.2 Decomposition Description

#### Routing Layer
-   `/api/auth`: Authentication routes (login, register).
-   `/api/teacher`: Batch management, student upload, internal marks upload.
-   `/api/result`: Exam controller PDF upload, student result retrieval.
-   `/api/admin`: User management, system stats.
-   `/api/requests`: Request CRUD operations.

#### Controllers/Handlers
-   **AuthController**: `login`, `register` (if applicable).
-   **TeacherController**: `createBatch`, `uploadStudents`, `uploadInternalMarks`.
-   **AcademicController**: `uploadResultPDF`, `getResultsByStudent`.
-   **AdminController**: `getStaff`, `createStaff`, `deleteStaff`.
-   **RequestController**: `createRequest`, `listRequests`, `updateRequestStatus`.

#### Services
-   **PDFParserService**: Wraps `pdf-parse` logic to extract grades from KTU PDFs.
-   **ExcelParserService**: Wraps `xlsx` logic to map Excel rows to User/Result objects.
-   **MarksService**: Aggregates internal and external marks for the student dashboard.
-   **RequestService**: Business logic for routing requests to the correct authority.

#### Middleware
-   **AuthMiddleware**: Verifies JWT signature and expiry.
-   **RoleMiddleware**: Enforces RBAC (e.g., only 'teacher' can create batches).
-   **MulterConfig**: Handles multipart file uploads (PDF/Excel) to memory/disk.

### 3.3 Design Rationale
-   **Three-Tier Architecture**: Separation of concerns allows independent scaling of frontend and backend.
-   **MongoDB**: Flexible document schema is ideal for storing results where subject codes and counts vary per semester.
-   **JWT**: Stateless authentication reduces server memory load and simplifies scaling.
-   **Dedicated Request Entity**: Decoupling requests from User documents prevents schema bloating and allows efficiently querying pending requests.

---

## 4. DATA DESIGN

### 4.1 Data Description
The system's information domain is mapped as follows:
-   **Users**: Access control entities.
-   **Marks**: Stored in a unified `Result` collection. Field `source` distinguishes "KTU Official" from "Series/Internal".
-   **Batches**: Cohorts of students.
-   **Requests**: Communication records between Students and Authorities.
-   **Logs**: `AuditLog` for security and `UploadLog` for file processing history.

### 4.2 Data Dictionary
Alphabetically ordered dictionary of main entities:

| Entity | Attributes | Description |
| :--- | :--- | :--- |
| **AuditLog** | `logId`, `userId`, `action`, `details`, `ip`, `timestamp` | Tracks critical actions (e.g., Grade Upload). |
| **Batch** | `batchId`, `name`, `scheme`, `createdBy`, `students[]` | Represents a class or student cohort. |
| **Request** | `reqId`, `studentId`, `targetRole`, `category`, `message`, `status`, `response` | A grievance or request from a student. |
| **Result** | `resId`, `studentId`, `registerId`, `type` (Exam), `source`, `subjects[]`, `sgpa` | Unified academic result record. |
| **UploadLog** | `uploadId`, `uploaderId`, `fileName`, `type`, `status`, `timestamp` | History of file uploads. |
| **User** | `userId`, `name`, `email`, `passwordHash`, `role`, `registerId`, `batchId` | System actor (Student, Teacher, etc.). |

---

## 5. COMPONENT DESIGN

### 5.1 Auth Components
**Login**:
1.  Input: JSON `{ email, password }`.
2.  Logic: Find User -> Verify Password (`bcrypt`) -> Create JWT (payload: id, role).
3.  Output: `{ token, user }` or 401 Unauthorized.

### 5.2 Feature 1 – Exam Controller PDF Upload
**Route Handler**:
1.  Receive `multipart/form-data` (PDF).
2.  Pass buffer to **PDFParserService**.
3.  **PDFParserService**:
    -   Regex parse: `PKD\d{2}[A-Z]{2}\d{3}` (Register ID).
    -   Regex parse: `[A-Z]{3,}\d{3}\([A-Z\+]\)` (Subject & Grade).
    -   Return `studentData[]`.
4.  Upsert `Result` documents (`published: false` initially).
5.  Create `UploadLog` entry.

### 5.3 Feature 2 – Teacher Student Registration & Internal Marks
**Student Registration**:
1.  Receive Excel.
2.  **ExcelParserService**: Map rows to `User` objects.
3.  Check existing users (by `AdmissionNo`).
4.  Bulk Insert new users; Update Batch `students` array.

**Internal Marks Upload (Planned)**:
1.  Receive Excel + `ExamType` (e.g., Series 1).
2.  Parse rows: `RegisterNo`, `Subject`, `Mark`.
3.  Create `Result` document with `source: 'Series/Internal'`.

### 5.4 Student Unified Marks Retrieval
**Route**: `GET /api/result/student`
**Logic**:
1.  Extract `studentId` from JWT.
2.  Query `Result` collection: `{ student: studentId }`.
3.  **Aggregation**: Group by `Semester` and `type` (University vs Internal).
4.  Return JSON: `{ university: [...], internal: [...] }`.

### 5.5 Feature 3 - Request Management (Planned)
**Create Request**:
1.  Validate inputs (`category`, `message`).
2.  Create `Request` document with `status: 'Pending'`.
**Update Request**:
1.  Authority updates `status` (e.g., 'Resolved').
2.  Add `responseMessage` and `handledBy` timestamp.

---

## 6. HUMAN INTERFACE DESIGN

### 6.1 Overview of User Interface
-   **Student**: Dashboard for Marks (Unified View) and Request Tracking.
-   **Teacher**: Dashboard for Batch Lists, File Uploads (PDF/Excel), History.
-   **Admin/Exam Controller**: Dashboard for System Stats and Result Publishing.

### 6.2 Screen Images
*(List of screens to be designed)*
1.  **Login Screen**: Universal entry point.
2.  **Teacher Dashboard**:
    -   *Upload KTU PDF Form*.
    -   *Upload Student Excel Form*.
    -   *Batch Management List*.
3.  **Student Dashboard**:
    -   *Unified Marks View* (Filterable by Exam Type).
    -   *My Requests List*.
    -   *New Request Form*.
4.  **Admin/Authority Dashboard**:
    -   *Request Inbox* (Pending/Resolved).
    -   *User Management Table*.

### 6.3 Screen Objects and Actions
-   **Login Screen**: Input (Email, Password), Button (Sign In).
-   **Marks Table**: Columns (Subject, Grade, Credits, Exam Type). Action (Download PDF).
-   **Upload Form**: File Picker, Dropdown (Semester, Scheme), Button (Upload).
-   **Request Form**: Dropdown (Category), Text Area (Message), Button (Submit).

---

## 7. REQUIREMENTS MATRIX

| Requirement ID (SRS) | Design Component (SDD) | Implementation Module |
| :--- | :--- | :--- |
| **FR-A1..A3** (Auth) | Auth Service, User Model | `controllers/auth.js` |
| **FR-EC1..EC2** (PDF) | Academic Service, Result Model | `controllers/academic.js` |
| **FR-T1..T2** (Batch) | Teacher Service, Batch Model | `controllers/teacher.js` |
| **FR-S1..S2** (Results) | Academic Service | `controllers/academic.js`|
| **FR-RQ1** (Request) | Request Service | `(Planned)` |
| **FR-AD1** (Admin) | Admin Service | `controllers/admin.js` |

---

## 8. APPENDICES

### Appendix A – Diagrams
*(Conceptual Descriptions)*
1.  **Context Diagram**: Shows User (Browser) <-> Node.js Server <-> MongoDB Cluster.
2.  **ER Diagram**:
    -   `User` (1) ---- (N) `Result`
    -   `Teacher` (1) ---- (N) `Batch`
    -   `Batch` (1) ---- (N) `Student`

3.  **High-Level Architecture**:
    -   **Client Layer**: Browser running React SPA.
    -   **Application Layer**: Node.js/Express API with Auth, Controllers, and Parser Services.
    -   **Data Layer**: MongoDB Cluster.

4.  **Sequence Diagram (Result Upload)**:
    -   **Exam Controller** uploads PDF -> **API** validates & sends to **Parser**.
    -   **Parser** extracts text/grades -> returns data to **API**.
    -   **API** saves results to **DB** -> returns success to **Exam Controller**.

### Appendix B – Additional Design Notes
-   **Performance**: Indexing on `registerId` and `batch` fields in MongoDB for fast lookups.
-   **Security**: Minimal data exposure in API responses (prevent over-fetching).

### Appendix C – TBD List
-   Exact format for "Internal Marks" Excel template.
-   List of specific Request Categories (e.g., "Grace Mark", "Correction").
