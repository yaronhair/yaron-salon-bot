// server.js - שרת בוט מספרת ירון מלא עם וואטסאפ

const http = require('http');
const url = require('url');
const fs = require('fs');

// מחלקת ניתוח רגשות
class EmotionAnalyzer {
    constructor() {
        this.emotionKeywords = {
            happy: ['שמח', 'מעולה', 'נהדר', 'אהבתי', 'מושלם', 'תודה', 'כיף', 'שמחה', '😊', '😃', '❤️', '💕'],
            frustrated: ['כועס', 'זוועה', 'נוראי', 'מאוכזב', 'גרוע', 'לא טוב', 'בעיה', 'כעס', '😡', '😤'],
            anxious: ['דאגה', 'פחד', 'מתח', 'חרדה', 'מודאג', 'לחוץ', 'בהלה', 'רגש'],
            excited: ['נרגש', 'מתרגש', 'בקושי', 'ממתין', 'לא יכול לחכות', '😍', '🤩'],
            neutral: ['טוב', 'בסדר', 'אוקיי', 'הבנתי']
        };
    }

    analyzeEmotion(text) {
        const lowerText = text.toLowerCase();
        let scores = {};
        let maxScore = 0;
        let dominantEmotion = 'neutral';

        for (let emotion in this.emotionKeywords) {
            scores[emotion] = 0;
            this.emotionKeywords[emotion].forEach(keyword => {
                if (lowerText.includes(keyword)) {
                    scores[emotion]++;
                }
            });

            if (scores[emotion] > maxScore) {
                maxScore = scores[emotion];
                dominantEmotion = emotion;
            }
        }

        return {
            dominantEmotion,
            scores,
            intensity: maxScore > 0 ? Math.min(maxScore * 0.3, 1) : 0.1,
            needsHumanResponse: ['frustrated', 'anxious'].includes(dominantEmotion) && maxScore > 1
        };
    }
}

// מחלקת בוט מספרת ירון
class YaronSalonBot {
    constructor() {
        this.customers = [];
        this.conversationLog = [];
        this.emotionAnalyzer = new EmotionAnalyzer();
        
        this.priceList = {
            "תספורת גבר": 80,
            "תספורת אישה": 120,
            "צבע": 200,
            "גוונים": 250,
            "פן": 150,
            "קרקפת": 100,
            "זקן": 50,
            "עיצוב זקן": 60,
            "שיקום שיער": 300,
            "החלקה": 400,
            "תספורת ילד": 60
        };

        this.responses = {
            greeting: [
                "שלום! ברוכים הבאים למספרת ירון! 💇‍♂️",
                "היי! איך אפשר לעזור לכם היום?",
                "שלום וברוכים הבאים! מה תרצו לדעת?"
            ],
            prices: [
                "הנה המחירון שלנו:",
                "המחירים אצלנו:",
                "ככה זה נראה במחירים:"
            ],
            appointment: [
                "בשמחה! אפשר לקבוע תור בטלפון: 03-1234567",
                "נהדר! התקשרו אלינו: 03-1234567 ונקבע תור",
                "מעולה! הטלפון שלנו: 03-1234567"
            ],
            location: [
                "המספרה נמצאת ברחוב הראשי 123, תל אביב",
                "הכתובת שלנו: רחוב הראשי 123, תל אביב",
                "אנחנו ברחוב הראשי 123, תל אביב"
            ],
            hours: [
                "שעות הפעילות: א'-ה' 9:00-19:00, ו' 9:00-15:00",
                "אנחנו פתוחים: א'-ה' 9:00-19:00, ו' 9:00-15:00",
                "שעות העבודה: א'-ה' 9:00-19:00, ו' 9:00-15:00"
            ]
        };

        this.loadCustomers();
    }

    loadCustomers() {
        try {
            if (fs.existsSync('./customers.csv')) {
                const data = fs.readFileSync('./customers.csv', 'utf8');
                const lines = data.split('\n').slice(1); // Skip header
                this.customers = lines.filter(line => line.trim()).map(line => {
                    const [name, phone, lastVisit, treatments, notes] = line.split(',');
                    return { name, phone, lastVisit, treatments, notes };
                });
            }
        } catch (error) {
            console.log('לא ניתן לטעון קובץ לקוחות, מתחיל עם רשימה ריקה');
            this.customers = [];
        }
    }

    handleMessage(phone, message) {
        const timestamp = new Date().toISOString();
        const emotion = this.emotionAnalyzer.analyzeEmotion(message);
        
        // שמירת השיחה
        this.conversationLog.push({
            phone,
            message,
            timestamp,
            emotion: emotion.dominantEmotion
        });

        const lowerMessage = message.toLowerCase();
        let response = "";

        // זיהוי כוונות
        if (this.containsWords(lowerMessage, ['שלום', 'היי', 'בוקר טוב', 'ערב טוב'])) {
            response = this.getRandomResponse('greeting');
        }
        else if (this.containsWords(lowerMessage, ['מחיר', 'עולה', 'כמה', 'מחירון', 'עלות'])) {
            response = this.getPriceInfo(lowerMessage);
        }
        else if (this.containsWords(lowerMessage, ['תור', 'קובע', 'פנוי', 'זמין', 'מתי'])) {
            response = this.getRandomResponse('appointment');
        }
        else if (this.containsWords(lowerMessage, ['איפה', 'כתובת', 'מיקום', 'מקום'])) {
            response = this.getRandomResponse('location');
        }
        else if (this.containsWords(lowerMessage, ['שעות', 'פתוח', 'זמני', 'מתי פתוחים'])) {
            response = this.getRandomResponse('hours');
        }
        else if (this.containsWords(lowerMessage, ['תודה', 'תשובה', 'עזרה'])) {
            response = "בשמחה! יש עוד משהו שאוכל לעזור? 😊";
        }
        else {
            response = "אני כאן לעזור! תוכלו לשאול על מחירים, תורים, מיקום או שעות פתיחה. איך אפשר לעזור?";
        }

        // התייחסות לרגש
        if (emotion.needsHumanResponse) {
            response += "\n\nאני רואה שיש לכם דאגה, אשמח שתתקשרו אלינו ישירות: 03-1234567";
        }

        return response;
    }

    containsWords(text, words) {
        return words.some(word => text.includes(word));
    }

    getRandomResponse(category) {
        const responses = this.responses[category];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    getPriceInfo(message) {
        let response = this.getRandomResponse('prices') + "\n\n";
        
        // חיפוש טיפול ספציפי
        for (let treatment in this.priceList) {
            if (message.includes(treatment.toLowerCase()) || 
                message.includes(treatment.split(' ')[0].toLowerCase())) {
                return `${treatment}: ${this.priceList[treatment]} ₪`;
            }
        }

        // הצגת כל המחירון
        for (let treatment in this.priceList) {
            response += `${treatment}: ${this.priceList[treatment]} ₪\n`;
        }

        return response;
    }

    getAnalytics() {
        const emotionStats = {};
        this.conversationLog.forEach(msg => {
            emotionStats[msg.emotion] = (emotionStats[msg.emotion] || 0) + 1;
        });

        return {
            totalMessages: this.conversationLog.length,
            totalCustomers: this.customers.length,
            emotionStats,
            lastMessage: this.conversationLog[this.conversationLog.length - 1] || null
        };
    }

    start() {
        console.log('🤖 יירון הבוט מוכן לפעולה!');
    }
}

// מחלקת השרת הראשית
class RenderBotServer {
    constructor() {
        this.port = process.env.PORT || 3000;
        this.bot = new YaronSalonBot();
        this.bot.start();
        this.setupServer();
        
        console.log('🌐 Render Bot Server initializing...');
    }

    setupServer() {
        this.server = http.createServer((req, res) => {
            this.handleRequest(req, res);
        });
    }

    handleRequest(req, res) {
        const parsedUrl = url.parse(req.url, true);
        const path = parsedUrl.pathname;
        
        // הגדרת headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
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
            if (mode === 'subscribe' && token === (process.env.VERIFY_TOKEN || 'yaron_salon_webhook_2024')) {
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
                            console.log(`🤖 Bot response: ${response}`);
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
                recentMessages: this.bot.conversationLog.slice(-10)
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
            }
        };

        this.sendResponse(res, 200, health);
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
                'GET /api/health'
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
    <title>בוט מספרת ירון - WhatsApp Ready</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #25D366, #128C7E);
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1000px; margin: 0 auto; }
        .header { 
            background: white;
            padding: 30px;
            border-radius: 20px;
            text-align: center;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .whatsapp-ready {
            background: #25D366;
            color: white;
            padding: 20px;
            border-radius: 15px;
            margin: 20px 0;
            text-align: center;
        }
        .webhook-box {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 12px;
            font-family: monospace;
            word-break: break-all;
            border: 2px solid #25D366;
            margin: 15px 0;
        }
        .btn {
            background: #25D366;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            margin: 5px;
            font-weight: 500;
        }
        .btn:hover { background: #128C7E; }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .instructions {
            background: white;
            padding: 25px;
            border-radius: 15px;
            margin: 20px 0;
        }
        .step {
            background: #f0f8f0;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            border-right: 4px solid #25D366;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 בוט מספרת ירון</h1>
            <div class="whatsapp-ready">
                <h2>📱 מוכן לחיבור עם WhatsApp!</h2>
                <p>הבוט פעיל ומחכה לחיבור עם Meta Business</p>
            </div>
        </div>

        <div class="instructions">
            <h3>📋 הוראות חיבור למטא ביזנס:</h3>
            
            <div class="step">
                <strong>1. העתק את ה-Webhook URL:</strong>
                <div class="webhook-box" id="webhook-url">${appUrl}/api/webhook</div>
                <button class="btn" onclick="copyWebhook()">📋 העתק URL</button>
            </div>

            <div class="step">
                <strong>2. הגדר Verify Token:</strong>
                <div class="webhook-box">yaron_salon_webhook_2024</div>
                <button class="btn" onclick="copyToken()">📋 העתק Token</button>
            </div>

            <div class="step">
                <strong>3. במטא ביזנס:</strong>
                <ul style="text-align: right; margin: 10px 0;">
                    <li>לך להגדרות WhatsApp Business API</li>
                    <li>הדבק את ה-Webhook URL</li>
                    <li>הדבק את ה-Verify Token</li>
                    <li>בחר Events: messages, message_deliveries</li>
                    <li>לחץ "אמת Webhook"</li>
                </ul>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <h3>📊 סטטוס</h3>
                <p style="color: #25D366; font-weight: bold;">🟢 פעיל</p>
                <p id="uptime">זמן הפעלה: טוען...</p>
            </div>
            
            <div class="stat-card">
                <h3>💬 הודעות</h3>
                <p style="font-size: 2em; color: #25D366;" id="messageCount">0</p>
                <p>הודעות עובדו</p>
            </div>
            
            <div class="stat-card">
                <h3>🧠 AI</h3>
                <p style="color: #25D366;">ניתוח רגשות פעיל</p>
                <p>זיהוי כוונות מתקדם</p>
            </div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <button class="btn" onclick="testBot()">🧪 בדוק בוט</button>
            <button class="btn" onclick="loadStats()">📊 רענן נתונים</button>
        </div>

        <div id="result" style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; display: none;"></div>
    </div>

    <script>
        function copyWebhook() {
            const url = document.getElementById('webhook-url').textContent;
            navigator.clipboard.writeText(url).then(() => {
                alert('✅ Webhook URL הועתק!\\nהדבק אותו במטא ביזנס');
            });
        }

        function copyToken() {
            navigator.clipboard.writeText('yaron_salon_webhook_2024').then(() => {
                alert('✅ Verify Token הועתק!\\nהדבק אותו במטא ביזנס');
            });
        }

        async function testBot() {
            try {
                const response = await fetch('${appUrl}/api/message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phone: '0501234567',
                        message: 'שלום, כמה עולה תספורת גבר?'
                    })
                });
                
                const data = await response.json();
                document.getElementById('result').style.display = 'block';
                document.getElementById('result').innerHTML = 
                    '<h4>🧪 תוצאת בדיקה:</h4>' +
                    '<p><strong>הודעה:</strong> "שלום, כמה עולה תספורת גבר?"</p>' +
                    '<p><strong>תשובת הבוט:</strong> ' + data.response + '</p>' +
                    '<p><strong>רגש זוהה:</strong> ' + data.emotion + '</p>';
                
                loadStats();
            } catch (error) {
                alert('❌ שגיאה בבדיקה: ' + error.message);
            }
        }

        async function loadStats() {
            try {
                const response = await fetch('${appUrl}/api/stats');
                const data = await response.json();
                
                document.getElementById('messageCount').textContent = data.totalMessages || 0;
                if (data.server) {
                    document.getElementById('uptime').textContent = 
                        'זמן הפעלה: ' + (data.server.uptimeFormatted || 'N/A');
                }
            } catch (error) {
                console.error('שגיאה בטעינת נתונים:', error);
            }
        }

        // טעינה ראשונית
        loadStats();
        setInterval(loadStats, 30000); // רענון כל 30 שניות
    </script>
</body>
</html>`;
        
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.writeHead(200);
        res.end(html);
    }

    start() {
        this.server.listen(this.port, () => {
            console.log('☁️ ========================================');
            console.log('🤖 Yaron Salon Bot Server Started!');
            console.log(`🌐 Port: ${this.port}`);
            console.log('📱 WhatsApp webhook ready at: /api/webhook');
            console.log('❤️ Health check: /health');
            console.log('☁️ ========================================');
        });
        
        process.on('SIGTERM', this.gracefulShutdown.bind(this));
        process.on('SIGINT', this.gracefulShutdown.bind(this));
    }
    
    gracefulShutdown() {
        console.log('🛑 Shutting down gracefully...');
        this.server.close(() => {
            console.log('✅ Server closed');
            process.exit(0);
        });
    }
}

// הפעלת השרת
if (require.main === module) {
    const server = new RenderBotServer();
    server.start();
}

module.exports = RenderBotServer;
