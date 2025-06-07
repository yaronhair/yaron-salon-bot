// server.js - שרת ענן מותאם ל-Render (מתוקן)

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
        } catch (error) {
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
            } else if (path === '/api/webhook' || path === '/webhook') {
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
        // תמיכה ב-GET לאימות webhook
        if (req.method === 'GET') {
            const parsedUrl = url.parse(req.url, true);
            const mode = parsedUrl.query['hub.mode'];
            const token = parsedUrl.query['hub.verify_token'];
            const challenge = parsedUrl.query['hub.challenge'];

            // אימות webhook למטא/וואטסאפ
            if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
                console.log('✅ Webhook verified successfully');
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end(challenge);
                return;
            } else {
                console.log('❌ Webhook verification failed');
                res.writeHead(403);
                res.end('Forbidden');
                return;
            }
        }

        // טיפול ב-POST
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

                // עיבוד WhatsApp webhook format
                if (webhookData.entry && webhookData.entry[0] && webhookData.entry[0].changes) {
                    const changes = webhookData.entry[0].changes[0];
                    if (changes.value && changes.value.messages) {
                        const message = changes.value.messages[0];
                        const phone = message.from;
                        const text = message.text ? message.text.body : '';

                        if (phone && text) {
                            const response = this.bot.handleMessage(phone, text);
                            console.log(`📱 WhatsApp message processed: ${phone} -> ${text}`);
                        }
                    }
                }

                // תמיד להחזיר 200 ל-WhatsApp
                this.sendResponse(res, 200, { 
                    received: true,
                    timestamp: new Date().toISOString()
                });

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
                'GET/POST /api/webhook', 
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
        .webhook-url {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 12px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            word-break: break-all;
            border: 2px dashed #667eea;
            margin: 10px 0;
        }
        .whatsapp-setup {
            background: #e8f5e8;
            padding: 20px;
            border-radius: 12px;
            border-right: 4px solid #25D366;
            margin: 20px 0;
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
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 בוט מספרת ירון - ענן</h1>
            <p style="margin: 15px 0;">
                <span class="badge">☁️ Render Cloud</span>
                <span class="badge">🔄 24/7 זמין</span>
                <span class="badge">⚡ מוכן לוואטסאפ</span>
            </p>
            <div style="margin-top: 20px;">
                <span class="status">🟢 פעיל ומוכן לחיבור וואטסאפ</span>
            </div>
        </div>

        <div class="whatsapp-setup">
            <h3>📱 הגדרות חיבור וואטסאפ</h3>
            
            <h4>🔗 Webhook URL (העתק למטא ביזנס):</h4>
            <div class="webhook-url" id="webhook-url">${appUrl}/api/webhook</div>
            <button class="btn" onclick="copyWebhookUrl()">📋 העתק Webhook URL</button>
            
            <h4 style="margin-top: 20px;">🔑 Verify Token:</h4>
            <p>הגדר במשתני סביבה של Render: <code>VERIFY_TOKEN=your_secret_token</code></p>
            
            <h4 style="margin-top: 20px;">⚙️ שלבי החיבור:</h4>
            <ol style="margin: 10px 0; text-align: right;">
                <li>העתק את ה-Webhook URL למטא ביזנס</li>
                <li>הגדר Verify Token</li>
                <li>אמת את ה-Webhook</li>
                <li>הפעל את ההודעות</li>
            </ol>
        </div>

        <div style="text-align: center; margin-top: 30px;">
            <h3>🎯 הבוט מוכן לקבל הודעות מוואטסאפ!</h3>
            <button class="btn" onclick="testWebhook()">🧪 בדוק חיבור</button>
        </div>
    </div>

    <script>
        function copyWebhookUrl() {
            const url = document.getElementById('webhook-url').textContent;
            navigator.clipboard.writeText(url).then(() => {
                alert('✅ Webhook URL הועתק לזיכרון!\\n\\nהדבק אותו במטא ביזנס > הגדרות Webhook');
            }).catch(() => {
                alert('❌ לא ניתן להעתיק. URL: ' + url);
            });
        }

        async function testWebhook() {
            try {
                const response = await fetch('${appUrl}/api/webhook', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phone: '0501234567',
                        message: 'בדיקת חיבור וואטסאפ 🚀'
                    })
                });
                
                const data = await response.json();
                alert('✅ בדיקת Webhook הצליחה!\\nהבוט מוכן לקבל הודעות מוואטסאפ.');
            } catch (error) {
                alert('❌ שגיאה בבדיקה: ' + error.message);
            }
        }
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
            console.log('💬 WhatsApp webhook ready at: /api/webhook');
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

module.exports = RenderBotServer;
