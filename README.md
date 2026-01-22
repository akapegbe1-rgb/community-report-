# Community Report System - Backend

A Node.js backend for the Community Report System using JSON file storage.

## Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Start the Server

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The server will run on `http://localhost:3000`

## API Endpoints

### Get All Reports
```
GET /api/reports
```
Returns all reports with statistics.

### Filter Reports
```
GET /api/reports/filter?category=Infrastructure&status=Pending
```
Query parameters:
- `category`: Filter by category (Infrastructure, Safety, Environment, Maintenance, Other, or 'all')
- `status`: Filter by status (Pending, Reviewing, Resolved, or 'all')

### Get Single Report
```
GET /api/reports/:id
```
Returns a specific report by ID.

### Submit New Report
```
POST /api/reports
```
Body:
```json
{
  "reporterName": "John Doe",
  "reporterEmail": "john@example.com",
  "title": "Pothole on Main Street",
  "category": "Infrastructure",
  "location": "123 Main Street",
  "description": "Large pothole affecting traffic",
  "image": "base64_encoded_image_or_null"
}
```

### Update Report Status
```
PUT /api/reports/:id/status
```
Body:
```json
{
  "status": "Reviewing"
}
```
Status values: `Pending`, `Reviewing`, `Resolved`

### Delete Report
```
DELETE /api/reports/:id
```

### Add Comment to Report
```
POST /api/reports/:id/comments
```
Body:
```json
{
  "author": "Admin",
  "comment": "We are investigating this issue"
}
```

### Get Statistics
```
GET /api/stats
```
Returns report statistics.

## Data Structure

Reports are stored in `backend/data/reports.json`:

```json
{
  "reports": [
    {
      "id": "report-1234567890-abc123",
      "reporterName": "John Doe",
      "reporterEmail": "john@example.com",
      "title": "Pothole on Main Street",
      "category": "Infrastructure",
      "location": "123 Main Street",
      "description": "Large pothole affecting traffic",
      "image": null,
      "status": "Pending",
      "createdAt": "2026-01-22T10:30:00.000Z",
      "updatedAt": "2026-01-22T10:30:00.000Z",
      "comments": []
    }
  ],
  "stats": {
    "total": 1,
    "pending": 1,
    "reviewing": 0,
    "resolved": 0
  }
}
```

## Frontend Integration

Update your HTML files to use the backend API:

```javascript
// Example: Submit a report
const submitReport = async (formData) => {
  const response = await fetch('http://localhost:3000/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });
  return await response.json();
};

// Example: Load all reports
const loadReports = async () => {
  const response = await fetch('http://localhost:3000/api/reports');
  const data = await response.json();
  return data.reports;
};
```

## Notes

- All timestamps are stored in ISO 8601 format
- Images are stored as base64 strings in the JSON file
- CORS is enabled for local frontend development
- Maximum request body size is 50MB (for image uploads)
