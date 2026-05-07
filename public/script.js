const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-btn');

function formatMessage(text) {
    // Basic Markdown support for bold text (**text**)
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
               .replace(/\n/g, '<br>');
}

function appendMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.classList.add(sender === 'user' ? 'user-message' : 'ai-message');
    
    if (sender === 'ai') {
        msgDiv.innerHTML = formatMessage(text);
    } else {
        msgDiv.innerText = text;
    }
    
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    appendMessage(message, 'user');
    userInput.value = '';

    const loadingDiv = document.createElement('div');
    loadingDiv.classList.add('loading');
    loadingDiv.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    chatWindow.appendChild(loadingDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
        });

        const data = await response.json();
        chatWindow.removeChild(loadingDiv);

        if (data.reply) {
            appendMessage(data.reply, 'ai');
        } else if (data.error) {
            appendMessage(data.error, 'ai');
        } else {
            appendMessage('Maaf kijiyega, koi masla hogaya hai.', 'ai');
        }
    } catch (error) {
        chatWindow.removeChild(loadingDiv);
        appendMessage('Connection ka masla hai. Phir se koshish karein.', 'ai');
        console.error('Error:', error);
    }
}

async function clearChat() {
    try {
        await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: '___clear_history___' }),
        });
        
        // Clear UI except the first welcome message
        const welcomeMsg = chatWindow.firstElementChild.outerHTML;
        chatWindow.innerHTML = welcomeMsg;
    } catch (error) {
        console.error('Error clearing chat:', error);
    }
}

sendBtn.addEventListener('click', sendMessage);
clearBtn.addEventListener('click', clearChat);

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
