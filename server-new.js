const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

// Database files path
const reportsFile = path.join(__dirname, 'data', 'reports.json');
const dataDir = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize reports file if it doesn't exist
if (!fs.existsSync(reportsFile)) {
    fs.writeFileSync(reportsFile, JSON.stringify({ reports: [], stats: { total: 0, pending: 0, reviewing: 0, resolved: 0 } }, null, 2));
}

// Helper functions
const readReports = () => {
    try {
        const data = fs.readFileSync(reportsFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading reports:', error);
        return { reports: [], stats: { total: 0, pending: 0, reviewing: 0, resolved: 0 } };
    }
};

const writeReports = (data) => {
    try {
        fs.writeFileSync(reportsFile, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing reports:', error);
        return false;
    }
};

const updateStats = (reports) => {
    const stats = {
        total: reports.length,
        pending: reports.filter(r => r.status === 'Pending').length,
        reviewing: reports.filter(r => r.status === 'Reviewing').length,
        resolved: reports.filter(r => r.status === 'Resolved').length
    };
    return stats;
};

// Parse JSON from request body
const parseBody = (req, callback) => {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        try {
            callback(null, body ? JSON.parse(body) : {});
        } catch (error) {
            callback(error, null);
        }
    });
};

// Send JSON response
const sendJSON = (res, statusCode, data) => {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
};

// Create server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    try {
        // GET /api/reports
        if (pathname === '/api/reports' && req.method === 'GET') {
            const data = readReports();
            return sendJSON(res, 200, {
                success: true,
                reports: data.reports,
                stats: updateStats(data.reports)
            });
        }

        // GET /api/reports/filter
        if (pathname === '/api/reports/filter' && req.method === 'GET') {
            const data = readReports();
            let filtered = data.reports;

            if (query.category && query.category !== 'all') {
                filtered = filtered.filter(r => r.category === query.category);
            }

            if (query.status && query.status !== 'all') {
                filtered = filtered.filter(r => r.status === query.status);
            }

            return sendJSON(res, 200, {
                success: true,
                reports: filtered,
                stats: updateStats(data.reports)
            });
        }

        // GET /api/reports/:id
        if (pathname.startsWith('/api/reports/') && req.method === 'GET' && !pathname.includes('/comments') && !pathname.includes('/status') && !pathname.includes('/filter')) {
            const id = pathname.split('/')[3];
            const data = readReports();
            const report = data.reports.find(r => r.id === id);

            if (report) {
                return sendJSON(res, 200, { success: true, report });
            } else {
                return sendJSON(res, 404, { success: false, message: 'Report not found' });
            }
        }

        // POST /api/reports
        if (pathname === '/api/reports' && req.method === 'POST') {
            return parseBody(req, (err, body) => {
                if (err) {
                    return sendJSON(res, 400, { success: false, message: 'Invalid JSON' });
                }

                const { reporterName, reporterEmail, title, category, location, description, image } = body;

                if (!reporterName || !reporterEmail || !title || !category || !location || !description) {
                    return sendJSON(res, 400, {
                        success: false,
                        message: 'Missing required fields'
                    });
                }

                const data = readReports();

                const newReport = {
                    id: 'report-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                    reporterName,
                    reporterEmail,
                    title,
                    category,
                    location,
                    description,
                    image: image || null,
                    status: 'Pending',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    comments: []
                };

                data.reports.push(newReport);
                data.stats = updateStats(data.reports);

                if (writeReports(data)) {
                    return sendJSON(res, 201, {
                        success: true,
                        message: 'Report submitted successfully',
                        report: newReport,
                        stats: data.stats
                    });
                } else {
                    return sendJSON(res, 500, { success: false, message: 'Error saving report' });
                }
            });
        }

        // PUT /api/reports/:id/status
        if (pathname.includes('/api/reports/') && pathname.includes('/status') && req.method === 'PUT') {
            return parseBody(req, (err, body) => {
                if (err) {
                    return sendJSON(res, 400, { success: false, message: 'Invalid JSON' });
                }

                const id = pathname.split('/')[3];
                const { status } = body;
                const validStatuses = ['Pending', 'Reviewing', 'Resolved'];

                if (!validStatuses.includes(status)) {
                    return sendJSON(res, 400, { success: false, message: 'Invalid status' });
                }

                const data = readReports();
                const report = data.reports.find(r => r.id === id);

                if (report) {
                    report.status = status;
                    report.updatedAt = new Date().toISOString();
                    data.stats = updateStats(data.reports);

                    if (writeReports(data)) {
                        return sendJSON(res, 200, {
                            success: true,
                            message: 'Report status updated',
                            report,
                            stats: data.stats
                        });
                    } else {
                        return sendJSON(res, 500, { success: false, message: 'Error updating report' });
                    }
                } else {
                    return sendJSON(res, 404, { success: false, message: 'Report not found' });
                }
            });
        }

        // DELETE /api/reports/:id
        if (pathname.startsWith('/api/reports/') && req.method === 'DELETE' && !pathname.includes('/comments') && !pathname.includes('/status')) {
            const id = pathname.split('/')[3];
            const data = readReports();
            const index = data.reports.findIndex(r => r.id === id);

            if (index > -1) {
                data.reports.splice(index, 1);
                data.stats = updateStats(data.reports);

                if (writeReports(data)) {
                    return sendJSON(res, 200, {
                        success: true,
                        message: 'Report deleted successfully',
                        stats: data.stats
                    });
                } else {
                    return sendJSON(res, 500, { success: false, message: 'Error deleting report' });
                }
            } else {
                return sendJSON(res, 404, { success: false, message: 'Report not found' });
            }
        }

        // POST /api/reports/:id/comments
        if (pathname.includes('/api/reports/') && pathname.includes('/comments') && req.method === 'POST') {
            return parseBody(req, (err, body) => {
                if (err) {
                    return sendJSON(res, 400, { success: false, message: 'Invalid JSON' });
                }

                const id = pathname.split('/')[3];
                const { comment, author } = body;

                if (!comment || !author) {
                    return sendJSON(res, 400, { success: false, message: 'Missing required fields' });
                }

                const data = readReports();
                const report = data.reports.find(r => r.id === id);

                if (report) {
                    const newComment = {
                        id: 'comment-' + Date.now(),
                        author,
                        text: comment,
                        createdAt: new Date().toISOString()
                    };

                    report.comments.push(newComment);
                    report.updatedAt = new Date().toISOString();

                    if (writeReports(data)) {
                        return sendJSON(res, 201, {
                            success: true,
                            message: 'Comment added',
                            comment: newComment,
                            report
                        });
                    } else {
                        return sendJSON(res, 500, { success: false, message: 'Error adding comment' });
                    }
                } else {
                    return sendJSON(res, 404, { success: false, message: 'Report not found' });
                }
            });
        }

        // GET /api/stats
        if (pathname === '/api/stats' && req.method === 'GET') {
            const data = readReports();
            return sendJSON(res, 200, {
                success: true,
                stats: updateStats(data.reports)
            });
        }

        // 404
        sendJSON(res, 404, { success: false, message: 'Endpoint not found' });

    } catch (error) {
        console.error('Server error:', error);
        sendJSON(res, 500, { success: false, message: 'Server error' });
    }
});

server.listen(PORT, () => {
    console.log('\n✅ Community Report System Backend is running!');
    console.log('📡 Server: http://localhost:' + PORT);
    console.log('📁 Database: ' + reportsFile);
    console.log('\n🎯 API Endpoints:');
    console.log('  GET    http://localhost:' + PORT + '/api/reports');
    console.log('  GET    http://localhost:' + PORT + '/api/reports/filter?category=Infrastructure&status=Pending');
    console.log('  GET    http://localhost:' + PORT + '/api/reports/:id');
    console.log('  POST   http://localhost:' + PORT + '/api/reports');
    console.log('  PUT    http://localhost:' + PORT + '/api/reports/:id/status');
    console.log('  DELETE http://localhost:' + PORT + '/api/reports/:id');
    console.log('  POST   http://localhost:' + PORT + '/api/reports/:id/comments');
    console.log('  GET    http://localhost:' + PORT + '/api/stats');
    console.log('\n🌐 Frontend: file://' + path.join(__dirname, 'client-example.html').replace(/\\/g, '/'));
    console.log('\n⏱️  Press Ctrl+C to stop the server\n');
});