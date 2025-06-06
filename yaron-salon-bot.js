const XLSX = require('xlsx');
const fs = require('fs');

class EmotionAnalyzer {
    constructor() {
        this.emotionPatterns = {
            happy: {
                keywords: ['שמח', 'מעולה', 'נהדר', 'אהבתי', 'מרוצה', 'מושלם', 'תודה רבה', '😊', '😍', '💕', 'איזה כיף'],
                intensity: 1.0
            },
            frustrated: {
                keywords: ['נמאס', 'עצבני', 'לא מרוצה', 'בעיה', 'זוועה', 'גרוע', 'לא טוב', 'אכזבה', 'בלגן', 'לא בסדר'],
                intensity: 0.8
            },
            urgent: {
                keywords: ['דחוף', 'מהר', 'בהקדם', 'חירום', 'מיידי', 'עכשיו', 'היום', 'לא יכול לחכות', 'צריך עכשיו'],
                intensity: 0.9
            },
            anxious: {
                keywords: ['חוששת', 'מודאגת', 'לא בטוח', 'פחד', 'דאגה', 'מפחדת', 'מתוח', 'לחוץ', 'מלחיץ'],
                intensity: 0.7
            },
            excited: {
                keywords: ['נרגש', 'מתרגש', 'בקרוב', 'סוף סוף', 'יאללה', 'לא יכול לחכות', '💃', '🔥', 'ווואו'],
                intensity: 0.9
            },
            neutral: {
                keywords: ['רגיל', 'בסדר', 'אוקיי', 'טוב', 'סביר'],
                intensity: 0.3
            }
        };
    }

    analyzeEmotion(message) {
        const msg = message.toLowerCase();
        const emotions = {};
        let dominantEmotion = 'neutral';
        let maxScore = 0;

        for (const [emotion, data] of Object.entries(this.emotionPatterns)) {
            let score = 0;
            for (const keyword of data.keywords) {
                if (msg.includes(keyword.toLowerCase())) {
                    score += data.intensity;
                }
            }
            
            emotions[emotion] = score;
            if (score > maxScore) {
                maxScore = score;
                dominantEmotion = emotion;
            }
        }

        return {
            dominantEmotion,
            emotions,
            intensity: maxScore,
            needsHumanResponse: ['frustrated', 'anxious'].includes(dominantEmotion) && maxScore > 0.5
        };
    }
}

class YaronSalonBot {
    constructor(excelPath) {
        this.excelPath = excelPath;
        this.customers = [];
        this.conversationLog = [];
        this.emotionAnalyzer = new EmotionAnalyzer();
        
        this.loadData();
        
        this.priceList = {
            'תספורת גבר': 120,
            'תספורת אישה': 320,
            'צבע שורש': 280,
            'צבע ראש מלא': 380,
            'צבע שטיפה': 250,
            'גוונים': 750,
            'בליאז מלא': 1200,
            'טיפול קרקפת': 250,
            'אבחון קרקפת': 250,
            'שיקום שיער': 400,
            'קרטין': 800,
            'החלקה': 1200
        };

        this.responseTemplates = {
            happy: {
                greeting: ['איזה כיף לשמוע שאת מרוצה! 😊', 'זה נהדר! 💫', 'שמחה לשמוע! ✨'],
                closing: ['נשמח לראות אותך שוב! 💕', 'תמיד בשמחה! 🌟']
            },
            frustrated: {
                greeting: ['אני מבינה את התסכול שלך 😔', 'בואי נפתור את זה ביחד 💪', 'אני כאן לעזור לך 🤗'],
                closing: ['אנחנו נדאג שהכל יהיה בסדר 💯', 'השירות שלנו בראש סדר העדיפויות 🎯']
            },
            neutral: {
                greeting: ['שלום! איך אפשר לעזור? 😊', 'שמחה לעזור! 💫', 'מה נשמע? 🌟'],
                closing: ['נשמח לעזור לך! 😊', 'תמיד כאן בשבילך! 🌟']
            }
        };
    }

    loadData() {
        try {
            if (fs.existsSync(this.excelPath)) {
                const workbook = XLSX.readFile(this.excelPath);
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(worksheet);
                
                this.customers = data.map(row => ({
                    name: row['שם'] || row['Name'] || '',
                    phone: this.cleanPhoneNumber(row['טלפון'] || row['Phone'] || ''),
                    lastVisit: row['ביקור אחרון'] || row['Last Visit'] || '',
                    treatments: row['טיפולים'] || row['Treatments'] || '',
                    notes: row['הערות'] || row['Notes'] || ''
                }));

                console.log(`📊 נטענו ${this.customers.length} לקוחות מהמערכת`);
            } else {
                console.log('📋 לא נמצא קובץ לקוחות, מתחיל עם מערכת ריקה');
                this.customers = [];
            }
        } catch (error) {
            console.log('❌ שגיאה בטעינת נתונים:', error.message);
            this.customers = [];
        }
    }

    cleanPhoneNumber(phone) {
        if (!phone) return '';
        
        const cleaned = phone.toString().replace(/\D/g, '');
        
        if (cleaned.startsWith('972')) {
            return cleaned.substring(3);
        }
        if (cleaned.startsWith('0')) {
            return cleaned.substring(1);
        }
        
        return cleaned;
    }

    findCustomerByPhone(phone) {
        const cleanPhone = this.cleanPhoneNumber(phone);
        return this.customers.find(customer => 
            this.cleanPhoneNumber(customer.phone) === cleanPhone
        );
    }

    getRandomFromArray(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    handleMessage(phone, message) {
        try {
            const customer = this.findCustomerByPhone(phone);
            const emotion = this.emotionAnalyzer.analyzeEmotion(message);
            
            console.log(`📱 Message from ${phone}: "${message}"`);
            console.log(`🧠 Emotion: ${emotion.dominantEmotion} (${emotion.intensity})`);
            
            if (customer) {
                console.log(`👤 Customer found: ${customer.name}`);
            } else {
                console.log(`❌ Customer not found for phone: ${phone}`);
            }
            
            let response;
            
            // בדיקה אם צריך מענה אנושי
            if (emotion.needsHumanResponse) {
                response = this.generateHumanResponseMessage(emotion);
            } else if (this.isGreeting(message)) {
                response = this.handleGreeting(message, customer, emotion);
            } else if (this.isPriceInquiry(message)) {
                response = this.handlePriceInquiry(message, emotion);
            } else if (this.isLocationInquiry(message)) {
                response = this.handleLocationInquiry(emotion);
            } else if (this.isAppointmentRequest(message)) {
                response = this.handleAppointmentRequest(emotion);
            } else {
                response = this.generateGeneralResponse(emotion);
            }
            
            // רישום השיחה
            this.logConversation(phone, message, response, emotion);
            
            return response;
            
        } catch (error) {
            console.error('❌ Error in handleMessage:', error);
            return this.generateHumanResponseMessage({ dominantEmotion: 'neutral' });
        }
    }

    generateHumanResponseMessage(emotion) {
        const template = this.responseTemplates[emotion.dominantEmotion] || this.responseTemplates.neutral;
        const greeting = this.getRandomFromArray(template.greeting);
        
        return `${greeting}

המערכת החכמה שלנו העבירה אותך למענה אנושי לטיפול מקצועי ואישי.

🕐 זמן תגובה משוער: עד 4 שעות בשעות הפעילות

📞 לעניין דחוף: 050-7448229
📍 שדרות ירושלים 27, רמת גן

מספרה יוצאת דופן 🌹`;
    }

    handleGreeting(message, customer, emotion) {
        const template = this.responseTemplates[emotion.dominantEmotion] || this.responseTemplates.neutral;
        const greeting = this.getRandomFromArray(template.greeting);
        
        if (customer) {
            return `${greeting}

שלום ${customer.name}! 💫 שמחה לראות אותך שוב במספרה!

איך אפשר לעזור לך היום? 😊

📍 שדרות ירושלים 27, רמת גן | 🕛 פתוחים עד חצות!`;
        } else {
            return `${greeting}

אני העוזרת הדיגיטלית של ירון הרשברג 💫

לפני שנתחיל, איך קוראים לך? 😊

📍 שדרות ירושלים 27, רמת גן | 🕛 פתוחים עד חצות!`;
        }
    }

    handlePriceInquiry(message, emotion) {
        const msg = message.toLowerCase();
        const template = this.responseTemplates[emotion.dominantEmotion] || this.responseTemplates.neutral;
        const greeting = this.getRandomFromArray(template.greeting);
        
        let response = `${greeting}\n\n`;
        
        if (msg.includes('תספורת')) {
            if (msg.includes('גבר')) {
                response += `💇‍♂️ תספורת גבר: ${this.priceList['תספורת גבר']}₪`;
            } else if (msg.includes('אישה')) {
                response += `💇‍♀️ תספורת אישה: ${this.priceList['תספורת אישה']}₪`;
            } else {
                response += `💇‍♀️ תספורות:\n• תספורת גבר - ${this.priceList['תספורת גבר']}₪\n• תספורת אישה - ${this.priceList['תספורת אישה']}₪`;
            }
        } else if (msg.includes('גוונים') || msg.includes('בליאז')) {
            response += `✨ גוונים:\n• גוונים חלקיים - ${this.priceList['גוונים']}₪\n• בליאז' מלא - ${this.priceList['בליאז מלא']}₪`;
        } else {
            response += `💰 מחירון עיקרי:\n\n`;
            Object.entries(this.priceList).forEach(([service, price]) => {
                response += `• ${service} - ${price}₪\n`;
            });
        }
        
        response += `\n\nרוצה לקבוע תור? 📅`;
        return response;
    }

    handleLocationInquiry(emotion) {
        const template = this.responseTemplates[emotion.dominantEmotion] || this.responseTemplates.neutral;
        const greeting = this.getRandomFromArray(template.greeting);
        
        return `${greeting}

📍 **מיקום המספרה:**

🏢 שדרות ירושלים 27, רמת גן
🅿️ חניה בשפע באזור

🕛 **שעות פעילות:**
• ראשון-רביעי: 09:00-22:00
• חמישי: 09:00-24:00  
• שישי: 09:00-15:00
• שבת: סגור

📞 לתיאום תורים: 050-7448229

📸 לתוצאות ועבודות: @yaronhershberg באינסטגרם`;
    }

    handleAppointmentRequest(emotion) {
        const template = this.responseTemplates[emotion.dominantEmotion] || this.responseTemplates.neutral;
        const greeting = this.getRandomFromArray(template.greeting);
        
        return `${greeting}

📅 **קביעת תור:**

לקביעת תור אנא פנה ישירות:
📞 050-7448229

או שלח הודעה עם הפרטים הבאים:
• שם מלא
• יום מועדף
• שעה מועדפת  
• סוג הטיפול

🕛 פתוחים עד חצות בימי חמישי!
📍 שדרות ירושלים 27, רמת גן`;
    }

    generateGeneralResponse(emotion) {
        const template = this.responseTemplates[emotion.dominantEmotion] || this.responseTemplates.neutral;
        const greeting = this.getRandomFromArray(template.greeting);
        const closing = this.getRandomFromArray(template.closing);
        
        return `${greeting}

איך אפשר לעזור לך היום? 😊

אני יכולה לעזור לך עם:
✅ מידע על טיפולים ומחירים
✅ קביעת תורים  
✅ מיקום ושעות פעילות

${closing}

📍 שדרות ירושלים 27, רמת גן | 📞 050-7448229`;
    }

    logConversation(phone, message, response, emotion) {
        const logEntry = {
            phone,
            message,
            response,
            emotion: emotion.dominantEmotion,
            timestamp: new Date()
        };
        
        this.conversationLog.push(logEntry);
        console.log(`📝 Logged conversation from ${phone}`);
    }

    // פונקציות זיהוי כוונות
    isGreeting(message) {
        const greetings = ['שלום', 'היי', 'הי', 'בוקר טוב', 'ערב טוב'];
        return greetings.some(greeting => message.includes(greeting));
    }

    isPriceInquiry(message) {
        const priceTerms = ['כמה', 'מחיר', 'עולה', 'עלות', 'מחירון'];
        return priceTerms.some(term => message.includes(term));
    }

    isLocationInquiry(message) {
        const locationTerms = ['איפה', 'מיקום', 'כתובת', 'מגיעים', 'הגעה'];
        return locationTerms.some(term => message.includes(term));
    }

    isAppointmentRequest(message) {
        const appointmentTerms = ['תור', 'לקבוע', 'לתאם', 'פנוי', 'זמין'];
        return appointmentTerms.some(term => message.includes(term));
    }

    getAnalytics() {
        return {
            totalMessages: this.conversationLog.length,
            totalCustomers: this.customers.length,
            emotionStats: this.getEmotionStats()
        };
    }

    getEmotionStats() {
        const stats = {};
        this.conversationLog.forEach(log => {
            stats[log.emotion] = (stats[log.emotion] || 0) + 1;
        });
        return stats;
    }

    start() {
        console.log('🤖 מערכת AI של מספרת ירון מופעלת!');
        console.log(`📊 ${this.customers.length} לקוחות במערכת`);
        return true;
    }
}

module.exports = YaronSalonBot;