# Student Features Implementation Plan

## Goal Description
Enhance the student experience by providing better visibility into assignment status, deadlines, and grades, along with dedicated detail and confirmation views.

## User Review Required
None of these changes touch core database schemas or third-party integrations (n8n is unaffected). All changes are frontend-focused and utilize existing backend APIs, except for minor additions to controller `select` statements to retrieve missing fields like `grade` or `totalMark`.

## Proposed Changes

### Backend API Updates
We need to ensure the existing APIs return the necessary fields (`grade`, `totalMark`, `description`).

#### [MODIFY] [submissionController.js](file:///e:/Projects/automated-classwork/backend/src/controllers/submissionController.js)
- Update [getMySubmission](file:///e:/Projects/automated-classwork/backend/src/controllers/submissionController.js#100-126) to include `grade` and `gradedAt`.
- Update [listMySubmissions](file:///e:/Projects/automated-classwork/backend/src/controllers/submissionController.js#224-242) to include `grade` and `gradedAt`.

#### [MODIFY] [assignmentController.js](file:///e:/Projects/automated-classwork/backend/src/controllers/assignmentController.js)
- Ensure [listAssignments](file:///e:/Projects/automated-classwork/backend/src/controllers/assignmentController.js#50-66) and [getAssignmentById](file:///e:/Projects/automated-classwork/backend/src/controllers/assignmentController.js#67-89) include `totalMark` (should already be there if `findMany` has no `select` restriction, but we'll verify).

---

### Shared Components / Utilities
#### [MODIFY] [statusColors.js / constants]
- Add a "GRADED" status color across the platform (or handle it locally in MyAssignments/AssignmentDetail).

---

### Student Experience Components
#### [MODIFY] [MyAssignments.jsx](file:///e:/Projects/automated-classwork/frontend/src/pages/student/MyAssignments.jsx)
- **Feature 2 (Status Overview)**: Add a top summary section with cards (Pending, Submitted, Graded, Late) similar to the teacher analytics dashboard, but scoped to the student's own submissions.
- **Feature 4 (Deadline Indicators)**: Add visual badges (e.g., "Due in 2 hours" or "Overdue") using `date-fns` or native JS date math.
- **Feature 1 (View Grades)**: For graded assignments, display the grade alongside the `totalMark` badge (e.g., "Score: 18/20").
- **Navigation Changes**: Change the "Submit" link to an "Open" or "View Details" link that routes to the new assignment detail view instead of going straight to the submission form.

#### [NEW] [AssignmentDetail.jsx](file:///e:/Projects/automated-classwork/frontend/src/pages/student/AssignmentDetail.jsx)
- **Feature 3 (Assignment Detail View)**: A dedicated page for viewing an assignment's full description, due date, total marks, and current status.
- Contains the "Submit Work" button (or handles the file upload directly on this page to consolidate flow).
- Displays previous submission details (filename, timestamp) and grades if available.
- Add route `/student/assignments/:id` in [App.jsx](file:///e:/Projects/automated-classwork/frontend/src/App.jsx).

#### [MODIFY] [SubmitWork.jsx](file:///e:/Projects/automated-classwork/frontend/src/pages/student/SubmitWork.jsx)
- **Feature 5 (Submission Confirmation Page)**: Refactor to act as a confirmation view *after* a successful upload, rather than immediately redirecting back to the list.
- Show a success checkmark, the uploaded filename, timestamp, and a "Back to Dashboard" button.

#### [MODIFY] [App.jsx](file:///e:/Projects/automated-classwork/frontend/src/App.jsx)
- Register the new `AssignmentDetail` route.

## Verification Plan

### Manual Verification
1. Login as a student.
2. View the new **MyAssignments** dashboard summary cards and deadline indicators.
3. Click an assignment to view the new **Assignment Detail View**.
4. Submit a file and verify the new **Submission Confirmation** flow.
5. Login as a teacher, grade the submission.
6. Login as the student again and verify the **Grade** is visible on the dashboard and detail view, and the status changes to "Graded".
