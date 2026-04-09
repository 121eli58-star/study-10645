/**
 * Chatbot — "מועד אלפא"
 * AI study assistant with Firestore chat history (multi-course)
 */
window.Chatbot = {
  messages: [],
  isTyping: false,
  historyLoaded: false,

  // Fixed API key for all users
  API_KEY: 'AIzaSyBtTr3Q6XTiCHWRUrNNfX-r2bM4C5IVpOc',

  _systemPrompt: '',

  /** Build system prompt from active course */
  _updateSystemPrompt() {
    const course = API.getCurrentCourse();
    const topics = course?.chatbot_topics || [];
    const topicList = topics.map((t, i) => `${i + 1}. ${t}`).join('\n');

    this._systemPrompt = [
      `אתה "מועד אלפא", עוזר למידה אישי לקורס ${course?.id || ''} — ${course?.title || 'קורס אקדמי'}.`,
      'תפקידך: לעזור לסטודנטים להבין נושאים בקורס, לתרגל, ולהכין אותם למבחן.',
      '', 'נושאי הקורס:',
      topicList,
      '', 'כללים:',
      '- ענה תמיד בעברית',
      '- השתמש בדוגמאות מעשיות ורלוונטיות לנושאי הקורס',
      '- אם שואלים שאלת בחינה, תן רמז לפני תשובה מלאה',
      '- השתמש באימוג\'ים',
      '- אורך תשובה: 3-6 משפטים'
    ].join('\n');

    // Update greeting
    const greeting = document.getElementById('chatbot-greeting');
    if (greeting && course) {
      greeting.innerHTML = `<div class="bot-name">מועד אלפא</div>
        היי! 👋 אני מועד אלפא, העוזר האישי שלך לקורס ${course.title}. אפשר לשאול אותי על כל נושא בקורס. מה תרצה ללמוד?`;
    }
  },

  _MODELS: ['gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'],

  /** Load chat history from Firestore */
  async loadHistory() {
    if (this.historyLoaded) return;
    this.historyLoaded = true;
    this._updateSystemPrompt();
    try {
      const history = await API.loadChatHistory();
      if (history.length > 0) {
        this.messages = history;
        const container = document.getElementById('chatbot-messages');
        if (!container) return;
        container.innerHTML = '';
        for (const msg of history) {
          if (msg.role === 'user') this._addUserMessage(msg.parts[0].text);
          else this._addBotMessage(msg.parts[0].text);
        }
      }
    } catch (e) { console.warn('Failed to load chat history', e); }
  },

  async send() {
    const input = document.getElementById('chatbot-input-field');
    const text = input?.value?.trim();
    if (!text || this.isTyping) return;
    input.value = '';

    this._addUserMessage(text);
    this.messages.push({ role: 'user', parts: [{ text }] });
    this._showTyping();

    try {
      const response = await this._callGemini(text);
      this._hideTyping();
      this._addBotMessage(response);
      this.messages.push({ role: 'model', parts: [{ text: response }] });
      API.saveChatHistory(this.messages);
    } catch (err) {
      this._hideTyping();
      console.error('Chatbot error:', err);
      if (err.message?.includes('429')) {
        this._addBotMessage('⚠️ המערכת עמוסה כרגע. נסה שוב בעוד דקה.');
      } else {
        this._addBotMessage('⚠️ לא הצלחתי לעבד את הבקשה. נסה שוב.');
      }
    }
  },

  async _callGemini(userMessage) {
    if (!this._systemPrompt) this._updateSystemPrompt();
    const history = this.messages.slice(-10);
    const body = {
      system_instruction: { parts: [{ text: this._systemPrompt }] },
      contents: history.concat([{ role: 'user', parts: [{ text: userMessage }] }]),
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024, topP: 0.9 }
    };
    const payload = JSON.stringify(body);
    let lastErr = null;
    for (const model of this._MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.API_KEY}`;
      try {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
        if (!res.ok) { lastErr = new Error(`${res.status}`); continue; }
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) { lastErr = new Error('Empty response'); continue; }
        return text;
      } catch (e) { lastErr = e; continue; }
    }
    throw lastErr || new Error('All models failed');
  },

  _addUserMessage(text) {
    const c = document.getElementById('chatbot-messages');
    if (!c) return;
    const d = document.createElement('div');
    d.className = 'chat-msg user';
    d.textContent = text;
    c.appendChild(d);
    c.scrollTop = c.scrollHeight;
  },

  _addBotMessage(text) {
    const c = document.getElementById('chatbot-messages');
    if (!c) return;
    const d = document.createElement('div');
    d.className = 'chat-msg bot';
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code style="background:rgba(59,130,246,0.08);padding:2px 6px;border-radius:4px;font-size:12px;">$1</code>')
      .replace(/\n/g, '<br>');
    d.innerHTML = `<div class="bot-name">מועד אלפא</div>${formatted}`;
    c.appendChild(d);
    c.scrollTop = c.scrollHeight;
  },

  _showTyping() {
    this.isTyping = true;
    const c = document.getElementById('chatbot-messages');
    if (!c) return;
    const d = document.createElement('div');
    d.className = 'chat-typing'; d.id = 'chat-typing-indicator';
    d.innerHTML = '<span></span><span></span><span></span>';
    c.appendChild(d); c.scrollTop = c.scrollHeight;
  },

  _hideTyping() {
    this.isTyping = false;
    document.getElementById('chat-typing-indicator')?.remove();
  }
};
