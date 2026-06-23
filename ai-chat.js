// Matemáticas Activa — AI Chat Widget
(function() {
    'use strict';
    const SUPABASE_URL = 'https://yidrpuizgtqpswefwdaa.supabase.co';
    let conversationHistory = [];
    let currentTopicContext = null;
    let photoUsageInfo = null;

    function getToken() {
        const s = localStorage.getItem('sb-yidrpuizgtqpswefwdaa-auth-token');
        if (!s) return null;
        try { return JSON.parse(s).access_token; } catch(e) { return null; }
    }

    window.toggleAIChat = function() {
        const panel = document.getElementById('ai-chat-panel');
        const fab = document.getElementById('ai-chat-fab');
        if (!panel) return;
        const isOpen = panel.classList.toggle('open');
        fab.classList.toggle('active', isOpen);
        if (isOpen) {
            const token = getToken();
            if (!token) { showLoginPrompt(); }
            else { checkPhotoUsage(); document.getElementById('ai-chat-input')?.focus(); }
        }
    };

    window.closeAIChat = function() {
        const panel = document.getElementById('ai-chat-panel');
        const fab = document.getElementById('ai-chat-fab');
        if (panel) panel.classList.remove('open');
        if (fab) fab.classList.remove('active');
    };

    function showLoginPrompt() {
        const msgs = document.getElementById('ai-chat-messages');
        if (!msgs) return;
        msgs.innerHTML = '<div class="ai-msg ai-msg-bot"><div class="ai-msg-avatar">🤖</div><div class="ai-msg-content"><p>¡Hola! Para usar el asistente de IA necesitás <strong>iniciar sesión</strong>.</p><button onclick="closeAIChat();document.getElementById(\'btn-login\')?.click()" class="ai-action-btn">Iniciar sesión</button></div></div>';
    }

    async function checkPhotoUsage() {
        const token = getToken();
        if (!token) return;
        try {
            const res = await fetch(SUPABASE_URL+'/functions/v1/ai-photo-solve', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json', 'apikey': (typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '') },
                body: JSON.stringify({ check_only: true })
            });
            if (res.ok) { photoUsageInfo = await res.json(); updatePhotoCounter(); }
        } catch(e) { console.error('Photo usage check error:', e); }
    }

    function updatePhotoCounter() {
        const el = document.getElementById('ai-photo-counter');
        if (!el || !photoUsageInfo) return;
        const p = photoUsageInfo;
        if (p.free_per_week > 0) { el.textContent = '📷 '+p.free_remaining+'/'+p.free_per_week+' fotos gratis esta semana'; }
        else { el.textContent = '📷 $'+p.cost_per_extra+' por foto'; }
        el.style.display = 'block';
    }

    window.sendAIMessage = async function() {
        const input = document.getElementById('ai-chat-input');
        if (!input) return;
        const msg = input.value.trim();
        if (!msg) return;
        const token = getToken();
        if (!token) { showLoginPrompt(); return; }
        input.value = '';
        appendMessage('user', msg);
        showTyping();
        try {
            const res = await fetch(SUPABASE_URL+'/functions/v1/ai-chat', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json', 'apikey': (typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '') },
                body: JSON.stringify({ message: msg, topic_context: currentTopicContext, conversation_history: conversationHistory.slice(-10) })
            });
            hideTyping();
            if (!res.ok) { const err = await res.json().catch(()=>({})); appendMessage('bot', err.error || 'Error al conectar con la IA.'); return; }
            const data = await res.json();
            conversationHistory.push({ role: 'user', content: msg });
            conversationHistory.push({ role: 'assistant', content: data.response });
            appendMessage('bot', data.response);
        } catch(e) { hideTyping(); appendMessage('bot', 'Error de conexión. Verificá tu internet.'); }
    };

    window.triggerPhotoUpload = function() {
        const token = getToken();
        if (!token) { showLoginPrompt(); return; }
        if (photoUsageInfo && photoUsageInfo.needs_payment) {
            const cost = photoUsageInfo.cost_per_extra;
            const plan = photoUsageInfo.plan;
            let planMsg = plan === 'gratuito' ? 'Con tu plan gratuito, cada foto cuesta <strong>$'+cost+'</strong>.' : 'Usaste tus fotos gratis. La foto extra cuesta <strong>$'+cost+'</strong>.';
            appendMessage('bot', planMsg+'<br><br>¿Querés continuar?<br><button onclick="document.getElementById(\'ai-photo-input\').click()" class="ai-action-btn" style="margin-top:8px">📷 Sí, subir foto ($'+cost+')</button><button onclick="this.parentElement.parentElement.style.opacity=\'0.5\'" class="ai-action-btn" style="margin-top:8px;background:#94a3b8">Cancelar</button>');
            return;
        }
        document.getElementById('ai-photo-input')?.click();
    };

    window.handlePhotoUpload = async function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const token = getToken();
        if (!token) return;
        if (!file.type.startsWith('image/')) { appendMessage('bot', 'Solo se pueden subir imágenes (JPG, PNG, etc.).'); return; }
        if (file.size > 10*1024*1024) { appendMessage('bot', 'La imagen es demasiado grande. Máximo 10 MB.'); return; }
        const base64 = await new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.readAsDataURL(file); });
        appendMessage('user', '📷 <em>Foto enviada: '+file.name+'</em>');
        showTyping('Analizando ejercicio...');
        try {
            const res = await fetch(SUPABASE_URL+'/functions/v1/ai-photo-solve', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json', 'apikey': (typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '') },
                body: JSON.stringify({ image_base64: base64 })
            });
            hideTyping();
            if (!res.ok) { const err = await res.json().catch(()=>({})); appendMessage('bot', err.error || 'Error al analizar la foto.'); return; }
            const data = await res.json();
            let header = '';
            if (data.cost_charged > 0) { header = '<div style="background:#fef3c7;padding:6px 10px;border-radius:8px;font-size:12px;margin-bottom:8px">💰 Costo: $'+data.cost_charged+' · Fotos gratis restantes: '+data.free_remaining+'</div>'; }
            else if (data.free_remaining !== undefined) { header = '<div style="background:#d1fae5;padding:6px 10px;border-radius:8px;font-size:12px;margin-bottom:8px">✅ Foto gratis · Quedan '+data.free_remaining+' esta semana</div>'; }
            appendMessage('bot', header + data.response);
            checkPhotoUsage();
        } catch(e) { hideTyping(); appendMessage('bot', 'Error de conexión. Verificá tu internet.'); }
        event.target.value = '';
    };

    window.setAITopicContext = function(topicName) {
        currentTopicContext = topicName;
        const badge = document.getElementById('ai-topic-badge');
        if (badge) {
            if (topicName) { badge.textContent = '📚 ' + topicName; badge.style.display = 'block'; }
            else { badge.style.display = 'none'; }
        }
    };

    function appendMessage(type, content) {
        const msgs = document.getElementById('ai-chat-messages');
        if (!msgs) return;
        const div = document.createElement('div');
        div.className = 'ai-msg ai-msg-'+type;
        if (type === 'bot') { div.innerHTML = '<div class="ai-msg-avatar">🤖</div><div class="ai-msg-content">'+content+'</div>'; }
        else { div.innerHTML = '<div class="ai-msg-content">'+content+'</div><div class="ai-msg-avatar">👤</div>'; }
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
    }

    function showTyping(text) {
        const el = document.getElementById('ai-typing');
        if (el) { el.querySelector('.ai-typing-text').textContent = text || 'Pensando...'; el.style.display = 'flex'; }
        const msgs = document.getElementById('ai-chat-messages');
        if (msgs) msgs.scrollTop = msgs.scrollHeight;
    }

    function hideTyping() {
        const el = document.getElementById('ai-typing');
        if (el) el.style.display = 'none';
    }

    window.clearAIChat = function() {
        conversationHistory = [];
        const msgs = document.getElementById('ai-chat-messages');
        if (msgs) {
            msgs.innerHTML = '<div class="ai-msg ai-msg-bot"><div class="ai-msg-avatar">🤖</div><div class="ai-msg-content"><p><strong>¡Hola! Soy tu tutor de matemáticas 🧮</strong></p><p>Podés:</p><p>💬 Preguntarme cualquier duda de matemáticas</p><p>📷 Subir una foto de un ejercicio y lo resuelvo paso a paso</p><p>📚 Pedir que te explique un tema específico</p><p><em>¿En qué te puedo ayudar?</em></p></div></div>';
        }
    };

    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() {
            const msgs = document.getElementById('ai-chat-messages');
            if (msgs && msgs.children.length === 0) { window.clearAIChat(); }
        }, 500);
        const input = document.getElementById('ai-chat-input');
        if (input) {
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAIMessage(); }
            });
        }
    });
})();
