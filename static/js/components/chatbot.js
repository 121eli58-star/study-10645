/**
 * Chatbot Component — "מועד אלפא"
 * AI-powered study assistant for Course 10645
 * Uses Gemini API for responses
 */
window.Chatbot = {
  messages: [],
  isTyping: false,
  apiKey: null,

  /** System prompt defining the chatbot personality */
  SYSTEM_PROMPT: [
    'אתה "מועד אלפא", עוזר למידה אישי לקורס 10645 — תכנון ועיצוב מערכות מידע.',
    'תפקידך: לעזור לסטודנטים להבין נושאים בקורס, לתרגל, ולהכין אותם למבחן.',
    '',
    'נושאי הקורס:',
    '1. מבוא למערכות מידע ומחזור החיים של פיתוח מערכות (SDLC)',
    '2. ניתוח דרישות ואפיון מערכת',
    '3. מודלים ישויות-קשרים (ERD) — ישויות, תכונות, קשרים, עוצמות',
    '4. נרמול (Normalization) — 1NF, 2NF, 3NF, BCNF',
    '5. תרשימי זרימת נתונים (DFD) — רמה 0, רמה 1, רמה 2',
    '6. תרשימי מחלקות UML (Class Diagrams)',
    '7. חקר ישימות — טכנית, כלכלית, תפעולית, לוח זמנים',
    '8. ניתוח עלות-תועלת ותוחלת תועלת',
    '9. ממשק משתמש ועיצוב אינטראקציה',
    '10. אבטחת מערכות מידע',
    '',
    'כללים:',
    '- ענה תמיד בעברית',
    '- השתמש בדוגמאות מעשיות כשאתה מסביר',
    '- אם שואלים שאלת בחינה, תן רמז לפני שאתה נותן תשובה מלאה',
    '- השתמש באימוג\'ים כדי להפוך את ההסברים לידידותיים',
    '- אם שואלים משהו לא קשור לקורס, הפנה בעדינות בחזרה לנושאי הקורס',
    '- אורך תשובה אידיאלי: 3-6 משפטים, אלא אם מבקשים הסבר מפורט'
  ].join('\n'),

  /** Initialize API key from localStorage or prompt */
  _ensureApiKey() {
    if (this.apiKey) return true;
    this.apiKey = localStorage.getItem('dbstudy_gemini_api_key');
    if (this.apiKey) return true;

    // Ask user for API key
    const key = prompt('🔑 הזן מפתח API של Gemini כדי להפעיל את מועד אלפא:');
    if (key && key.trim().length > 10) {
      this.apiKey = key.trim();
      localStorage.setItem('dbstudy_gemini_api_key', this.apiKey);
      return true;
    }

    this._addBotMessage('כדי להשתמש בי, צריך מפתח API של Gemini. אפשר לקבל אחד בחינם מ-<a href="https://aistudio.google.com/apikey" target="_blank" style="color:var(--warm-peach);text-decoration:underline;">Google AI Studio</a>. (ניתן לרענן את העמוד כדי לנסות שוב).');
    return false;
  },

  /** Send a user message */
  async send() {
    const input = document.getElementById('chatbot-input-field');
    const text = input?.value?.trim();
    if (!text || this.isTyping) return;

    input.value = '';

    // Add user message
    this._addUserMessage(text);
    this.messages.push({ role: 'user', parts: [{ text }] });

    // Check API key
    if (!this._ensureApiKey()) return;

    // Show typing indicator
    this._showTyping();

    try {
      const response = await this._callGemini(text);
      this._hideTyping();
      this._addBotMessage(response);
      this.messages.push({ role: 'model', parts: [{ text: response }] });
    } catch (err) {
      this._hideTyping();
      console.error('Chatbot error:', err);

      if (err.message?.includes('API_KEY') || err.message?.includes('401') || err.message?.includes('403')) {
        localStorage.removeItem('dbstudy_gemini_api_key');
        this.apiKey = null;
        this._addBotMessage('❌ מפתח ה-API לא תקין. לחץ שוב כדי להזין מפתח חדש.');
      } else if (err.message?.includes('429')) {
        localStorage.removeItem('dbstudy_gemini_api_key');
        this.apiKey = null;
        this._addBotMessage('⚠️ המפתח שהזנת חרג ממכסת השימוש החינמית של גוגל למודל (Quota Exceeded). המפתח אופס. רענן את העמוד, והזן מפתח API חדש.');
      } else {
        this._addBotMessage('⚠️ לא הצלחתי לעבד את הבקשה. (שגיאה מהשרת).');
      }
    }
  },

  /** Models to try in order (each has its own quota bucket) */
  _MODELS: [
    'gemini-2.5-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash'
  ],

  /** Call Gemini API with automatic model fallback */
  async _callGemini(userMessage) {
    const history = this.messages.slice(-10);

    const body = {
      system_instruction: {
        parts: [{ text: this.SYSTEM_PROMPT }]
      },
      contents: history.concat([
        { role: 'user', parts: [{ text: userMessage }] }
      ]),
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
        topP: 0.9
      }
    };

    const payload = JSON.stringify(body);
    let lastErr = null;

    for (const model of this._MODELS) {
      const url = 'https://generativelanguage.googleapis.com/v1beta/models/'
        + model + ':generateContent?key=' + this.apiKey;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload
        });

        if (!res.ok) {
          const errText = await res.text();
          console.warn(model + ' failed (' + res.status + '), trying next...');
          lastErr = new Error(res.status + ': ' + errText);
          continue;
        }

        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) { lastErr = new Error('Empty response from ' + model); continue; }

        return text;
      } catch (e) {
        lastErr = e;
        continue;
      }
    }

    throw lastErr || new Error('All models failed');
  },

  /** DOM helpers */
  _addUserMessage(text) {
    const container = document.getElementById('chatbot-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'chat-msg user';
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  _addBotMessage(text) {
    const container = document.getElementById('chatbot-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'chat-msg bot';

    // Format basic markdown: **bold**, `code`, newlines
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code style="background:rgba(253,252,240,0.1);padding:2px 6px;border-radius:4px;font-size:12px;">$1</code>')
      .replace(/\n/g, '<br>');

    div.innerHTML = `<div class="bot-name">מועד אלפא</div>${formatted}`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  _showTyping() {
    this.isTyping = true;
    const container = document.getElementById('chatbot-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'chat-typing';
    div.id = 'chat-typing-indicator';
    div.innerHTML = '<span></span><span></span><span></span>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  _hideTyping() {
    this.isTyping = false;
    const el = document.getElementById('chat-typing-indicator');
    if (el) el.remove();
  }
};
