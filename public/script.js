const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-btn');
const uploadBtn = document.getElementById('upload-btn');
const micBtn = document.getElementById('mic-btn');
const imageInput = document.getElementById('image-input');
const budgetBtn = document.getElementById('budget-btn');
const budgetModal = document.getElementById('budget-modal');
const closeModal = document.querySelector('.close-modal');
const incomeInput = document.getElementById('income-input');
const budgetResults = document.getElementById('budget-results');
const aiLogo = document.querySelector('.ai-logo');
const aiBudgetTip = document.getElementById('ai-budget-tip');

let isVoiceMode = false;

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW Registered'))
            .catch(err => console.log('SW Failed', err));
    });
}

// Load History on Startup
window.onload = () => {
    const savedHistory = JSON.parse(localStorage.getItem('chat_history') || '[]');
    if (savedHistory.length > 0) {
        chatWindow.innerHTML = '';
        savedHistory.forEach(msg => {
            appendMessage(msg.text, msg.sender, msg.isImage, false, false);
        });
    }
};

function saveToLocal(text, sender, isImage = false) {
    const history = JSON.parse(localStorage.getItem('chat_history') || '[]');
    history.push({ text, sender, isImage });
    localStorage.setItem('chat_history', JSON.stringify(history));
}

// Budget Planner Logic
budgetBtn.onclick = () => budgetModal.style.display = "block";
closeModal.onclick = () => budgetModal.style.display = "none";
window.onclick = (event) => { if (event.target == budgetModal) budgetModal.style.display = "none"; };

const budgetTips = [
    "Zabardast! Is income ke sath aap mahana Rs. {savings} bacha sakte hain. Aik emergency fund zaroor banayein.",
    "Behtareen! 50/30/20 rule aapko financial azadi de sakta hai. Kharchon par nazar rakhein.",
    "Achi aamdani hai! Yaad rakhein, pehle bachat (saving) karein phir kharch.",
    "Smart planning! Kya aapne gold ya kisi aur scheme mein invest karne ka socha hai?"
];

incomeInput.oninput = () => {
    const income = parseFloat(incomeInput.value);
    if (income > 0) {
        budgetResults.style.display = "block";
        aiBudgetTip.style.display = "block";
        const needs = income * 0.5;
        const wants = income * 0.3;
        const savings = income * 0.2;
        
        document.getElementById('val-needs').innerText = `Rs. ${needs.toLocaleString()}`;
        document.getElementById('val-wants').innerText = `Rs. ${wants.toLocaleString()}`;
        document.getElementById('val-savings').innerText = `Rs. ${savings.toLocaleString()}`;
        
        document.getElementById('bar-needs').style.width = "50%";
        document.getElementById('bar-wants').style.width = "30%";
        document.getElementById('bar-savings').style.width = "20%";

        // Show a random smart tip
        const randomTip = budgetTips[Math.floor(Math.random() * budgetTips.length)];
        aiBudgetTip.innerText = `🤖 AI Tip: ${randomTip.replace('{savings}', savings.toLocaleString())}`;
    } else {
        budgetResults.style.display = "none";
        aiBudgetTip.style.display = "none";
    }
};

// Initialize Speech Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'ur-PK';
    recognition.interimResults = false;
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
        micBtn.classList.remove('recording');
        isVoiceMode = true;
        sendMessage();
    };
    recognition.onerror = () => micBtn.classList.remove('recording');
    recognition.onend = () => micBtn.classList.remove('recording');
}

function formatMessage(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}

function speakText(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Clear previous speech
    const cleanText = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/🛑|✅|⚠️/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ur-PK';
    
    // Pulse animation start
    utterance.onstart = () => aiLogo.classList.add('speaking');
    // Pulse animation end
    utterance.onend = () => aiLogo.classList.remove('speaking');
    
    const voices = window.speechSynthesis.getVoices();
    const urduVoice = voices.find(v => v.lang.includes('ur'));
    if (urduVoice) utterance.voice = urduVoice;
    window.speechSynthesis.speak(utterance);
}

function appendMessage(text, sender, isImage = false, shouldSpeak = false, shouldSave = true) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.classList.add(sender === 'user' ? 'user-message' : 'ai-message');
    
    if (isImage) {
        const img = document.createElement('img');
        img.src = text;
        img.style.maxWidth = '100%';
        img.style.borderRadius = '10px';
        img.style.marginTop = '10px';
        msgDiv.appendChild(img);
    } else if (sender === 'ai') {
        msgDiv.innerHTML = formatMessage(text);
        
        const listenBtn = document.createElement('button');
        listenBtn.innerHTML = '🔊 Suniye';
        listenBtn.classList.add('listen-btn');
        listenBtn.onclick = () => speakText(text);
        msgDiv.appendChild(listenBtn);

        if (text.includes('🛑 SCAM')) {
            const reportBtn = document.createElement('a');
            reportBtn.innerText = '🚨 Report Scam';
            reportBtn.href = 'https://complaint.fia.gov.pk/';
            reportBtn.target = '_blank';
            reportBtn.classList.add('report-btn');
            msgDiv.appendChild(reportBtn);
        }

        if (shouldSpeak) speakText(text);
    } else {
        msgDiv.innerText = text;
    }
    
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    if (shouldSave) saveToLocal(text, sender, isImage);
}

async function sendMessage(text = null, imageData = null) {
    const message = text || userInput.value.trim();
    if (!message && !imageData) return;
    if (imageData) {
        appendMessage(imageData, 'user', true);
        appendMessage(message || "Analyze this screenshot for scams.", 'user');
    } else {
        appendMessage(message, 'user');
    }
    userInput.value = '';
    const loadingDiv = document.createElement('div');
    loadingDiv.classList.add('loading');
    loadingDiv.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    chatWindow.appendChild(loadingDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message || "Analyze this screenshot for scams.", image: imageData }),
        });
        const data = await response.json();
        chatWindow.removeChild(loadingDiv);
        if (data.reply) {
            appendMessage(data.reply, 'ai', false, isVoiceMode);
        } else if (data.error) {
            appendMessage(data.error, 'ai');
        }
    } catch (error) {
        if (chatWindow.contains(loadingDiv)) chatWindow.removeChild(loadingDiv);
        appendMessage('Connection error. Try again.', 'ai');
    } finally {
        isVoiceMode = false;
    }
}

async function clearChat() {
    try {
        window.speechSynthesis.cancel();
        localStorage.removeItem('chat_history');
        await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: '___clear_history___' }),
        });
        location.reload();
    } catch (error) {
        console.error('Error clearing chat:', error);
    }
}

micBtn.addEventListener('click', () => {
    if (!recognition) {
        alert("Voice not supported.");
        return;
    }
    micBtn.classList.add('recording');
    recognition.start();
});

uploadBtn.addEventListener('click', () => imageInput.click());

imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
        await sendMessage(null, event.target.result);
    };
    reader.readAsDataURL(file);
    imageInput.value = '';
});

sendBtn.addEventListener('click', () => { isVoiceMode = false; sendMessage(); });
clearBtn.addEventListener('click', clearChat);
userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { isVoiceMode = false; sendMessage(); } });
