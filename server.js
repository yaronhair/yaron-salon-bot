// server.js - שרת ענן מותאם ל-Render

const http = require('http');
const url = require('url');
const fs = require('fs');

// ייבוא הבוט
const YaronSalonBot = require('./yaron-salon-bot');

class RenderBotServer {
    constructor() {
        this.port = process.env.PORT || 3000;
        
        // אתחול הבוט עם נתוני דוגמה אם אין קובץ לקוחות
        this.initializeBot();
        this.setupServer();
        
        console.log('🌐 Render Bot Server initializing...');
    }

    initializeBot() {
        try {
            // נסיון לטעון קובץ לקוחות קיים
            this.bot = new YaronSalonBot('./customers.csv');
        }
        
        async function loadRecentActivity() {
            try {
                const response = await fetch(API_BASE + '/api/stats');
                const data = await response.json();
                
                let html = '';
                if (data.recentMessages && data.recentMessages.length > 0) {
                    html += '<h4>📱 הודעות אחרונות:</h4>';
                    data.recentMessages.forEach((msg, index) => {
                        const time = new Date(msg.timestamp).toLocaleString('he-IL');
                        html += `<div style="background: #f8f9fa; padding: 10px; margin: 8px 0; border-radius: 8px; border-right: 3px solid #667eea;">
                            <strong>📱 ${msg.phone}:</strong> "${msg.message}"<br>
                            <small>🧠 ${msg.emotion} | 🕐 ${time}</small>
                        </div>`;
                    });
                } else {
                    html = '<p>📭 אין הודעות אחרונות</p>';
                }
                
                document.getElementById('recent-activity').innerHTML = html;
            } catch (error) {
                document.getElementById('recent-activity').innerHTML = '❌ שגיאה בטעינת פעילות';
            }
        }
        
        function downloadLogs() {
            showResult('📥 מכין לוגים להורדה...\\n\\nהתכונה תהיה זמינה בקרוב!');
        }
        
        // פונקציות עזר
        function showResult(text) {
            const result = document.getElementById('result');
            result.style.display = 'block';
            result.textContent = text;
        }
        
        function appendResult(text) {
            const result = document.getElementById('result');
            result.style.display = 'block';
            result.textContent += text;
        }
        
        function showLoading(loading) {
            const buttons = document.querySelectorAll('.btn');
            buttons.forEach(btn => {
                if (loading) {
                    btn.classList.add('loading');
                    btn.disabled = true;
                } else {
                    btn.classList.remove('loading');
                    btn.disabled = false;
                }
            });
        }
        
        // טעינה ראשונית ועדכונים אוטומטיים
        window.addEventListener('load', () => {
            loadStats();
            loadRecentActivity();
            
            // רענון אוטומטי כל 30 שניות
            setInterval(() => {
                loadStats();
                loadRecentActivity();
            }, 30000);
            
            // בדיקת חיבור כל 60 שניות
            setInterval(async () => {
                try {
                    await fetch(API_BASE + '/api/health');
                    document.querySelector('.status').textContent = '🟢 פעיל';
                    document.querySelector('.status').className = 'status pulse';
                } catch (error) {
                    document.querySelector('.status').textContent = '🔴 לא זמין';
                    document.querySelector('.status').className = 'status';
                }
            }, 60000);
        });
    </script>
</body>
</html>
        `;
        
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.writeHead(200);
        res.end(html);
    }

    start() {
        this.server.listen(this.port, () => {
            console.log('☁️ ========================================');
            console.log('🤖 Render Bot Server Started Successfully!');
            console.log(`🌐 Port: ${this.port}`);
            console.log(`🎯 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log('📡 All API endpoints ready');
            console.log('❤️ Health check: /health');
            console.log('☁️ ========================================');
            
            // הצגת סטטיסטיקות ראשוניות
            console.log(`📊 Initial stats: ${this.bot.customers.length} customers loaded`);
        });
        
        // הוספת graceful shutdown
        process.on('SIGTERM', this.gracefulShutdown.bind(this));
        process.on('SIGINT', this.gracefulShutdown.bind(this));
    }
    
    gracefulShutdown() {
        console.log('🛑 Received shutdown signal, closing server gracefully...');
        this.server.close(() => {
            console.log('✅ Server closed successfully');
            process.exit(0);
        });
        
        // כפה סגירה אחרי 10 שניות
        setTimeout(() => {
            console.log('⚠️ Force closing server');
            process.exit(1);
        }, 10000);
    }
}

// הפעלת השרת
if (require.main === module) {
    const server = new RenderBotServer();
    server.start();
}

module.exports = RenderBotServer; catch (error) {
            console.log('📋 No customers file found, creating sample data...');
            this.createSampleData();
            this.bot = new YaronSalonBot('./customers.csv');
        }
        
        this.bot.start();
        console.log('✅ Bot initialized successfully');
    }

    createSampleData() {
        // יצירת נתוני דוגמה אם אין קובץ לקוחות
        const sampleData = `שם,טלפון,ביקור אחרון,טיפולים,הערות
דוגמה ראשונה,0501234567,2024-01-15,תספורת גבר,לקוח VIP
דוגמה שנייה,0527654321,2024-02-10,קרקפת ושיקום,בעיות קרקפת
דוגמה שלישית,0503456789,2024-01-20,גוונים וצבע,אוהבת גוונים חמים`;
        
        try {
            fs.writeFileSync('./customers.csv', sampleData);
            console.log('📝 Sample customer data created');
        } catch (error) {
            console.log('⚠️ Could not create sample data, using empty dataset');
        }
    }

    setupServer() {
        this.server = http.createServer((req, res) => {
            this.handleRequest(req, res);
        });
    }

    handleRequest(req, res) {
        const parsedUrl = url.parse(req.url, true);
        const path = parsedUrl.pathname;
        
        // הגדרת headers לבטיחות וCORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        try {
            if (path === '/') {
                this.serveDashboard(req, res);
            } else if (path === '/api/message' && req.method === 'POST') {
                this.handleMessage(req, res);
            } else if (path === '/api/webhook' && req.method === 'POST') {
                this.handleWebhook(req, res);
            } else if (path === '/api/stats') {
                this.handleStats(res);
            } else if (path === '/health' || path === '/api/health') {
                this.handleHealth(res);
            } else if (path === '/api/prices') {
                this.handlePrices(res);
            } else {
                this.handle404(res);
            }
        } catch (error) {
            console.error('🚨 Server error:', error);
            this.handleError(res, error);
        }
    }

    handleMessage(req, res) {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { phone, message } = data;

                if (!phone || !message) {
                    this.sendResponse(res, 400, { error: 'Missing phone or message' });
                    return;
                }

                console.log(`📱 [${new Date().toISOString()}] ${phone}: "${message}"`);

                const response = this.bot.handleMessage(phone, message);
                const emotion = this.bot.emotionAnalyzer.analyzeEmotion(message);

                const result = {
                    success: true,
                    response: response,
                    emotion: emotion.dominantEmotion,
                    intensity: emotion.intensity,
                    needsHuman: emotion.needsHumanResponse,
                    timestamp: new Date().toISOString(),
                    server: 'render-cloud',
                    messageId: Date.now().toString()
                };

                this.sendResponse(res, 200, result);

            } catch (error) {
                console.error('❌ Message handling error:', error);
                this.sendResponse(res, 400, { 
                    error: 'Invalid request format',
                    details: error.message 
                });
            }
        });

        req.on('error', (error) => {
            console.error('❌ Request error:', error);
            this.sendResponse(res, 500, { error: 'Request processing failed' });
        });
    }

    handleWebhook(req, res) {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const webhookData = JSON.parse(body);
                console.log('📥 Webhook received:', {
                    timestamp: new Date().toISOString(),
                    data: webhookData
                });

                // עיבוד webhook data
                if (webhookData.phone && webhookData.message) {
                    const response = this.bot.handleMessage(webhookData.phone, webhookData.message);
                    
                    this.sendResponse(res, 200, {
                        success: true,
                        response: response,
                        timestamp: new Date().toISOString(),
                        processed: true
                    });
                } else {
                    // אישור קבלה גם אם אין נתונים מלאים
                    this.sendResponse(res, 200, { 
                        received: true,
                        timestamp: new Date().toISOString()
                    });
                }

            } catch (error) {
                console.error('❌ Webhook error:', error);
                this.sendResponse(res, 200, { 
                    received: true,
                    error: 'Invalid format',
                    timestamp: new Date().toISOString()
                });
            }
        });
    }

    handleStats(res) {
        try {
            const stats = this.bot.getAnalytics();
            const serverStats = {
                ...stats,
                server: {
                    platform: 'render',
                    uptime: Math.floor(process.uptime()),
                    uptimeFormatted: this.formatUptime(process.uptime()),
                    memory: {
                        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
                    },
                    nodeVersion: process.version,
                    timestamp: new Date().toISOString(),
                    environment: process.env.NODE_ENV || 'development'
                },
                recentMessages: this.bot.conversationLog.slice(-10).map(msg => ({
                    ...msg,
                    message: msg.message.substring(0, 100) // הגבלת אורך להצגה
                }))
            };

            this.sendResponse(res, 200, serverStats);
        } catch (error) {
            console.error('❌ Stats error:', error);
            this.sendResponse(res, 500, { error: 'Failed to get stats' });
        }
    }

    handleHealth(res) {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
            version: '1.0.0',
            platform: 'render',
            bot: {
                customers: this.bot.customers.length,
                messages: this.bot.conversationLog.length,
                status: 'operational'
            },
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
            }
        };

        this.sendResponse(res, 200, health);
    }

    handlePrices(res) {
        try {
            const prices = {
                ...this.bot.priceList,
                lastUpdated: new Date().toISOString(),
                currency: 'ILS'
            };
            this.sendResponse(res, 200, prices);
        } catch (error) {
            this.sendResponse(res, 500, { error: 'Failed to get prices' });
        }
    }

    handle404(res) {
        const notFound = {
            error: 'Not Found',
            message: 'API endpoint not found',
            availableEndpoints: [
                'GET /',
                'POST /api/message',
                'POST /api/webhook', 
                'GET /api/stats',
                'GET /api/health',
                'GET /api/prices'
            ],
            timestamp: new Date().toISOString()
        };
        
        this.sendResponse(res, 404, notFound);
    }

    handleError(res, error) {
        this.sendResponse(res, 500, {
            error: 'Internal Server Error',
            message: 'Something went wrong',
            timestamp: new Date().toISOString()
        });
    }

    sendResponse(res, statusCode, data) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(statusCode);
        res.end(JSON.stringify(data, null, 2));
    }

    formatUptime(uptimeSeconds) {
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        return `${hours}ש ${minutes}ד`;
    }

    serveDashboard(req, res) {
        const appUrl = req.headers.host ? `https://${req.headers.host}` : 'http://localhost:3000';
        
        const html = `
<!DOCTYPE html>
<html dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>בוט מספרת ירון - Render Cloud</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🤖</text></svg>">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { 
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            padding: 30px;
            border-radius: 20px;
            text-align: center;
            margin-bottom: 30px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        .badge {
            display: inline-block;
            background: linear-gradient(45deg, #4CAF50, #45a049);
            color: white;
            padding: 8px 16px;
            border-radius: 25px;
            font-size: 0.9em;
            margin: 5px;
            font-weight: 500;
        }
        .status { color: #4CAF50; font-weight: bold; }
        .grid { 
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 25px;
        }
        .card { 
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            padding: 25px;
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        .card:hover { transform: translateY(-5px); }
        .card h3 { 
            color: #333;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #667eea;
        }
        .btn { 
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 12px;
            cursor: pointer;
            margin: 5px;
            font-size: 1em;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        .btn:hover { 
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        .btn-success { background: linear-gradient(45deg, #4CAF50, #45a049); }
        .btn-info { background: linear-gradient(45deg, #2196F3, #1976D2); }
        .btn-warning { background: linear-gradient(45deg, #ff9800, #f57c00); }
        input, textarea { 
            width: 100%;
            padding: 15px;
            margin: 10px 0;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            font-size: 1em;
            transition: border-color 0.3s ease;
        }
        input:focus, textarea:focus { 
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        .result { 
            background: linear-gradient(45deg, #e3f2fd, #bbdefb);
            padding: 20px;
            margin: 15px 0;
            border-radius: 12px;
            white-space: pre-wrap;
            font-family: 'Courier New', monospace;
            border-right: 4px solid #2196F3;
            display: none;
        }
        .webhook-url {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 12px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            word-break: break-all;
            border: 2px dashed #667eea;
        }
        .loading {
            opacity: 0.6;
            pointer-events: none;
        }
        .stat-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .stat-card {
            text-align: center;
            background: rgba(102, 126, 234, 0.1);
            padding: 15px;
            border-radius: 12px;
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }
        .pulse {
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 בוט מספרת ירון - ענן</h1>
            <p style="margin: 15px 0;">
                <span class="badge">☁️ Render Cloud</span>
                <span class="badge">🔄 24/7 זמין</span>
                <span class="badge">⚡ עדכונים אוטומטיים</span>
            </p>
            <div style="margin-top: 20px;">
                <span class="status pulse">🟢 פעיל</span>
                <span style="margin: 0 20px;">|</span>
                <span id="uptime">⏱️ טוען...</span>
                <span style="margin: 0 20px;">|</span>
                <span id="memory">💾 טוען...</span>
            </div>
        </div>

        <div class="grid">
            <!-- בדיקת הודעות -->
            <div class="card">
                <h3>💬 בדיקת הודעות בענן</h3>
                <input type="text" id="phone" placeholder="מספר טלפון (לדוגמה: 0501234567)" value="0501234567">
                <textarea id="message" placeholder="הכנס הודעה לבדיקה..." rows="3">שלום, כמה עולה תספורת?</textarea>
                <button class="btn" onclick="testMessage()">🧪 בדוק הודעה</button>
                <button class="btn btn-success" onclick="testEmotions()">🎭 בדוק רגשות</button>
                <button class="btn btn-info" onclick="testPredefined()">⚡ בדיקות מהירות</button>
                <div id="result" class="result"></div>
            </div>

            <!-- סטטיסטיקות ענן -->
            <div class="card">
                <h3>📊 סטטיסטיקות ענן</h3>
                <div class="stat-grid">
                    <div class="stat-card">
                        <div class="stat-number" id="totalMessages">-</div>
                        <div>הודעות</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" id="totalCustomers">-</div>
                        <div>לקוחות</div>
                    </div>
                </div>
                <div id="emotion-stats"></div>
                <button class="btn" onclick="loadStats()">🔄 רענן נתונים</button>
                <button class="btn btn-warning" onclick="loadServerStats()">🖥️ מידע שרת</button>
            </div>

            <!-- חיבור חיצוני -->
            <div class="card">
                <h3>🔗 API & Webhook</h3>
                <p><strong>Webhook URL:</strong></p>
                <div class="webhook-url" id="webhook-url">${appUrl}/api/webhook</div>
                <p style="margin: 10px 0;"><strong>API URL:</strong></p>
                <div class="webhook-url">${appUrl}/api/message</div>
                <button class="btn" onclick="copyWebhookUrl()">📋 העתק Webhook</button>
                <button class="btn btn-info" onclick="testWebhook()">🧪 בדוק Webhook</button>
                <button class="btn btn-success" onclick="viewApiDocs()">📖 תיעוד API</button>
            </div>

            <!-- הודעות אחרונות -->
            <div class="card">
                <h3>📝 פעילות אחרונה</h3>
                <div id="recent-activity">טוען פעילות...</div>
                <button class="btn" onclick="loadRecentActivity()">🔄 רענן פעילות</button>
                <button class="btn btn-info" onclick="downloadLogs()">📥 הורד לוגים</button>
            </div>
        </div>
    </div>

    <script>
        const API_BASE = '${appUrl}';
        
        // פונקציות בדיקה
        async function testMessage() {
            const phone = document.getElementById('phone').value;
            const message = document.getElementById('message').value;
            
            if (!phone || !message) {
                showResult('❌ אנא מלא את כל השדות');
                return;
            }
            
            showLoading(true);
            
            try {
                const response = await fetch(API_BASE + '/api/message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone, message })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showResult(
                        '✅ הודעה נשלחה בהצלחה!\\n\\n' +
                        '📱 הודעה: "' + message + '"\\n' +
                        '🧠 רגש זוהה: ' + data.emotion + ' (עוצמה: ' + data.intensity + ')\\n' +
                        '☁️ שרת: ' + data.server + '\\n' +
                        '🆔 ID: ' + data.messageId + '\\n' +
                        '💬 מענה אנושי נדרש: ' + (data.needsHuman ? 'כן' : 'לא') + '\\n\\n' +
                        '🤖 תשובת הבוט:\\n' + data.response
                    );
                } else {
                    showResult('❌ שגיאה: ' + (data.error || 'Unknown error'));
                }
                
                setTimeout(loadStats, 500);
            } catch (error) {
                showResult('❌ שגיאת רשת: ' + error.message);
            } finally {
                showLoading(false);
            }
        }
        
        async function testEmotions() {
            const tests = [
                { msg: 'אני כל כך מאוכזבת! זה זוועה!', emotion: 'frustrated' },
                { msg: 'איזה כיף! נרגשת מאוד! 😍💕', emotion: 'excited' },
                { msg: 'אני מודאגת לגבי השיער שלי... פוחדת', emotion: 'anxious' },
                { msg: 'תודה רבה! השירות מעולה! אהבתי! 😊', emotion: 'happy' }
            ];
            
            showResult('🧪 מריץ בדיקות רגש מתקדמות...\\n\\n');
            showLoading(true);
            
            for (let i = 0; i < tests.length; i++) {
                try {
                    const response = await fetch(API_BASE + '/api/message', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            phone: '05011111' + (i + 10), 
                            message: tests[i].msg 
                        })
                    });
                    
                    const data = await response.json();
                    appendResult(
                        '📱 "' + tests[i].msg + '"\\n' +
                        '🎯 צפוי: ' + tests[i].emotion + ' | 🤖 זוהה: ' + data.emotion + 
                        ' (' + (data.emotion === tests[i].emotion ? '✅' : '❌') + ')\\n\\n'
                    );
                    
                    // הפסקה קצרה בין בדיקות
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                } catch (error) {
                    appendResult('❌ שגיאה בבדיקה ' + (i + 1) + ': ' + error.message + '\\n\\n');
                }
            }
            
            appendResult('✅ בדיקות רגש הושלמו!');
            showLoading(false);
            setTimeout(loadStats, 1000);
        }
        
        async function testPredefined() {
            const tests = [
                'כמה עולה תספורת גבר?',
                'איפה המספרה?',
                'רוצה לקבוע תור לגוונים',
                'מתי אתם פתוחים?'
            ];
            
            const randomTest = tests[Math.floor(Math.random() * tests.length)];
            document.getElementById('message').value = randomTest;
            await testMessage();
        }
        
        // פונקציות סטטיסטיקות
        async function loadStats() {
            try {
                const response = await fetch(API_BASE + '/api/stats');
                const data = await response.json();
                
                document.getElementById('totalMessages').textContent = data.totalMessages || 0;
                document.getElementById('totalCustomers').textContent = data.totalCustomers || 0;
                
                if (data.server) {
                    document.getElementById('uptime').textContent = 
                        '⏱️ ' + (data.server.uptimeFormatted || (Math.floor(data.server.uptime / 3600) + 'ש'));
                    document.getElementById('memory').textContent = 
                        '💾 ' + (data.server.memory ? data.server.memory.used + 'MB' : 'N/A');
                }
                
                // הצגת סטטיסטיקות רגש
                if (data.emotionStats && Object.keys(data.emotionStats).length > 0) {
                    let emotionHTML = '<h4 style="margin: 15px 0 10px 0;">🎭 פילוח רגשות:</h4>';
                    Object.entries(data.emotionStats).forEach(([emotion, count]) => {
                        emotionHTML += '<div style="display: flex; justify-content: space-between; margin: 5px 0;">';
                        emotionHTML += '<span>' + emotion + ':</span><strong>' + count + '</strong></div>';
                    });
                    document.getElementById('emotion-stats').innerHTML = emotionHTML;
                }
                
            } catch (error) {
                console.error('Error loading stats:', error);
                document.getElementById('totalMessages').textContent = '?';
                document.getElementById('totalCustomers').textContent = '?';
            }
        }
        
        async function loadServerStats() {
            try {
                const response = await fetch(API_BASE + '/api/stats');
                const data = await response.json();
                
                if (data.server) {
                    let html = '<h4>🖥️ מידע שרת:</h4>';
                    html += '<p>🏷️ פלטפורמה: ' + data.server.platform + '</p>';
                    html += '<p>⚡ Node.js: ' + data.server.nodeVersion + '</p>';
                    html += '<p>🌍 סביבה: ' + data.server.environment + '</p>';
                    html += '<p>⏱️ זמן הפעלה: ' + data.server.uptimeFormatted + '</p>';
                    html += '<p>💾 זיכרון: ' + data.server.memory.used + '/' + data.server.memory.total + ' MB</p>';
                    
                    document.getElementById('emotion-stats').innerHTML = html;
                }
            } catch (error) {
                console.error('Error loading server stats:', error);
            }
        }
        
        // פונקציות webhook
        function copyWebhookUrl() {
            const url = document.getElementById('webhook-url').textContent;
            navigator.clipboard.writeText(url).then(() => {
                alert('✅ Webhook URL הועתק לזיכרון!');
            }).catch(() => {
                alert('❌ לא ניתן להעתיק. URL: ' + url);
            });
        }
        
        async function testWebhook() {
            showLoading(true);
            try {
                const response = await fetch(API_BASE + '/api/webhook', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phone: '0501234567',
                        message: 'בדיקת webhook מהדשבורד הענן 🚀'
                    })
                });
                
                const data = await response.json();
                showResult('🔗 בדיקת Webhook הצליחה!\\n\\n' + JSON.stringify(data, null, 2));
            } catch (error) {
                showResult('❌ שגיאה ב-webhook: ' + error.message);
            } finally {
                showLoading(false);
            }
        }
        
        function viewApiDocs() {
            showResult(`📖 תיעוד API:

🔗 Endpoints זמינים:

POST ${API_BASE}/api/message
Content-Type: application/json
Body: {"phone": "0501234567", "message": "הודעה"}

POST ${API_BASE}/api/webhook  
Content-Type: application/json
Body: {"phone": "0501234567", "message": "הודעה"}

GET ${API_BASE}/api/stats
Response: סטטיסטיקות מלאות

GET ${API_BASE}/api/health
Response: בדיקת בריאות השרת

GET ${API_BASE}/api/prices
Response: מחירון עדכני

📝 דוגמאות שימוש:
- curl -X POST ${API_BASE}/api/message -H "Content-Type: application/json" -d '{"phone":"0501234567","message":"שלום"}'
- fetch('${API_BASE}/api/message', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({phone:'0501234567',message:'שלום'})})`);