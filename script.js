document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('login-screen');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const appContainer = document.getElementById('app-container');
    const chatBox = document.getElementById('chat-box');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const micBtn = document.getElementById('mic-btn');
    const voiceStatus = document.getElementById('voice-status');
    const typingIndicator = document.getElementById('typing-indicator');
    const languageSelect = document.getElementById('language-select');
    const userGreeting = document.getElementById('user-greeting');
    const micWarning = document.getElementById('mic-warning');
    const themeBtn = document.getElementById('theme-btn');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    let recognition = null;
    let isListeningForWakeWord = false;
    let synth = window.speechSynthesis;
    let userName = localStorage.getItem('ai_sathi_user') || null;

    // Check File Protocol for Mic Warning
    if (window.location.protocol === 'file:') {
        if(micWarning) micWarning.classList.remove('hidden');
    }

    // Auth Logic
    if (userName) {
        loginScreen.classList.add('hidden');
        appContainer.classList.remove('hidden');
        userGreeting.textContent = `Hello, ${userName}`;
        initApp();
    }

    googleLoginBtn.addEventListener('click', () => {
        // Mock Google Login
        const mockName = prompt("Simulating Google Login: What is your first name?");
        if (mockName) {
            localStorage.setItem('ai_sathi_user', mockName);
            userName = mockName;
            userGreeting.textContent = `Hello, ${userName}`;
            loginScreen.style.opacity = '0';
            setTimeout(() => {
                loginScreen.classList.add('hidden');
                appContainer.classList.remove('hidden');
                initApp();
                speak(`Welcome back, ${userName}. I am ready to help.`);
            }, 800);
        }
    });

    function initApp() {
        // Initialize Speech Recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = false;
            
            try {
                if (languageSelect.value !== 'auto') recognition.lang = languageSelect.value === 'en-IN' ? 'en-IN' : languageSelect.value;
                recognition.start();
            } catch(e) {}
            
            recognition.onstart = function() {
                isListeningForWakeWord = true;
                micBtn.classList.add('listening');
                if(!micBtn.classList.contains('active-recording')){
                    voiceStatus.textContent = "Listening... Say 'Hey Sathi'";
                }
            };

            recognition.onresult = function(event) {
                const current = event.resultIndex;
                const transcript = event.results[current][0].transcript.trim().toLowerCase();
                
                // Wake word detection
                if (transcript.includes("hey sathi") || transcript.includes("hi sathi") || transcript.includes("hello sathi")) {
                    handleHeySathi();
                    const regex = /(?:hey sathi|hi sathi|hello sathi)\s*(.*)/;
                    const match = transcript.match(regex);
                    if (match && match[1].trim().length > 0) {
                        const command = match[1].trim();
                        setTimeout(() => {
                            chatInput.value = command;
                            processUserInput(command);
                        }, 1000);
                    }
                } else if (micBtn.classList.contains('active-recording')) {
                    chatInput.value = transcript;
                    processUserInput(transcript);
                    toggleManualMic(false);
                }
            };

            recognition.onerror = function(event) {
                if (event.error === 'not-allowed') {
                    voiceStatus.textContent = "Mic access denied.";
                    micBtn.classList.remove('listening', 'active-recording');
                }
            };

            recognition.onend = function() {
                if (isListeningForWakeWord && !appContainer.classList.contains('hidden')) {
                    try { recognition.start(); } catch(e) {}
                } else {
                    micBtn.classList.remove('listening');
                }
            };
        } else {
            voiceStatus.textContent = "Voice not supported here.";
            micBtn.style.display = "none";
        }
    }

    languageSelect.addEventListener('change', (e) => {
        if (recognition) {
            recognition.stop();
            setTimeout(() => {
                if (e.target.value !== 'auto') {
                    recognition.lang = e.target.value === 'en-IN' ? 'en-IN' : e.target.value;
                }
                if(isListeningForWakeWord) recognition.start();
            }, 300);
        }
    });

    function toggleManualMic(forceStop) {
        if (!recognition) return;
        if (micBtn.classList.contains('active-recording') || forceStop) {
            micBtn.classList.remove('active-recording');
            voiceStatus.textContent = "Say 'Hey Sathi' to wake.";
        } else {
            micBtn.classList.add('active-recording');
            voiceStatus.textContent = "Listening to command...";
        }
    }

    micBtn.addEventListener('click', () => toggleManualMic(false));

    sendBtn.addEventListener('click', () => {
        const text = chatInput.value.trim();
        if (text) processUserInput(text);
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const text = chatInput.value.trim();
            if (text) processUserInput(text);
        }
    });

    // Theme Toggle Logic
    themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const icon = themeBtn.querySelector('i');
        if (document.body.classList.contains('light-mode')) {
            icon.classList.replace('fa-sun', 'fa-moon');
            localStorage.setItem('ai_sathi_theme', 'light');
        } else {
            icon.classList.replace('fa-moon', 'fa-sun');
            localStorage.setItem('ai_sathi_theme', 'dark');
        }
    });

    // Load saved theme
    if (localStorage.getItem('ai_sathi_theme') === 'light') {
        document.body.classList.add('light-mode');
        themeBtn.querySelector('i').classList.replace('fa-sun', 'fa-moon');
    }

    // Mobile Sidebar Logic
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.add('open');
            sidebarOverlay.classList.add('show');
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('show');
        });
    }

    // Auto-close sidebar on tool click (mobile)
    const toolButtons = document.querySelectorAll('.tool-btn');
    toolButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.innerWidth <= 950) {
                sidebar.classList.remove('open');
                sidebarOverlay.classList.remove('show');
            }
        });
    });

    async function processUserInput(text) {
        appendMessage(text, 'user');
        chatInput.value = '';
        
        // Show Neural Analysis status
        const statusDiv = document.createElement('div');
        statusDiv.className = 'voice-status';
        statusDiv.style.color = 'var(--accent-primary)';
        statusDiv.style.marginBottom = '10px';
        statusDiv.textContent = '⚡ Analyzing intent: ' + analyzeIntent(text);
        chatBox.appendChild(statusDiv);
        
        showTypingIndicator();

        const responseText = await generateAIResponse(text);
        
        hideTypingIndicator();
        statusDiv.remove(); // Remove analysis status once done
        appendMessage(responseText, 'ai');
        
        if (!responseText.includes('<video') && !responseText.includes('<img')) {
             speak(responseText);
        } else {
             speak("Here is your result.");
        }
    }

    function analyzeIntent(text) {
        const t = text.toLowerCase();
        if (t.includes('image') || t.includes('draw') || t.includes('photo')) return 'Image Generation';
        if (t.includes('video')) return 'Video Simulation';
        if (t.includes('news')) return 'Live Data Retrieval';
        if (t.includes('recipe') || t.includes('cook') || t.includes('food')) return 'Culinary Processing';
        if (t.includes('+') || t.includes('-') || t.includes('*') || t.includes('/')) return 'Mathematical Logic';
        return 'General Intelligence';
    }

    function appendMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}-message`;
        
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerHTML = sender === 'ai' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';

        const content = document.createElement('div');
        content.className = 'content';
        
        if (sender === 'ai' && typeof marked !== 'undefined') {
            content.innerHTML = marked.parse(text);
            const links = content.querySelectorAll('a');
            links.forEach(link => { link.target = '_blank'; link.style.color = 'var(--accent-primary)'; });
        } else {
            content.textContent = text;
        }

        msgDiv.appendChild(avatar);
        msgDiv.appendChild(content);
        chatBox.appendChild(msgDiv);
        chatContainerScroll();
    }

    function showTypingIndicator() {
        chatBox.appendChild(typingIndicator);
        typingIndicator.classList.remove('hidden');
        chatContainerScroll();
    }
    function hideTypingIndicator() { typingIndicator.classList.add('hidden'); }
    function chatContainerScroll() {
        const container = document.querySelector('.chat-container');
        container.scrollTop = container.scrollHeight;
    }

    function handleHeySathi() {
        speak("Yes, I am listening.");
        voiceStatus.textContent = "Sathi is listening...";
        micBtn.classList.add('active-recording');
        setTimeout(() => {
            if(micBtn.classList.contains('active-recording')) toggleManualMic(true);
        }, 6000); 
    }

    function speak(text) {
        if (!synth) return;
        synth.cancel();
        const plainText = text.replace(/<[^>]*>?/gm, '').replace(/[\#\*\_\`\[\]]/g, '');
        // Trim length for speech so it doesn't read massive paragraphs
        const shortText = plainText.length > 200 ? plainText.substring(0, 200) + "..." : plainText;
        
        const utterThis = new SpeechSynthesisUtterance(shortText);
        const langCode = languageSelect.value;
        utterThis.lang = langCode === 'en-IN' ? 'hi-IN' : (langCode === 'auto' ? 'en-US' : langCode);
        
        const voices = synth.getVoices();
        const preferredVoice = voices.find(v => v.lang.startsWith(utterThis.lang.split('-')[0]) || v.lang === utterThis.lang);
        if (preferredVoice) utterThis.voice = preferredVoice;
        
        utterThis.pitch = 1.05;
        utterThis.rate = 1.0;
        synth.speak(utterThis);
    }

    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => synth.getVoices();
    }

    // AI Logic Router
    async function generateAIResponse(input) {
        const lang = languageSelect.value;
        const lowerInput = input.toLowerCase();

        // 1. Image Generation Intercept (Enhanced keywords for better detection)
        const imageKeywords = ['generate image', 'generate an image', 'draw', 'create image', 'make a photo', 'make an image', 'create a photo', 'photo of', 'image of', 'picture of'];
        if (imageKeywords.some(kw => lowerInput.includes(kw))) {
            const cleanPrompt = input.replace(/generate an image of|generate image of|generate an image|generate image|draw me a|draw me|draw a|draw|create an image of|create image of|create image|make a photo of|make an image of|show me a picture of|show a picture of|photo of|image of|picture of/gi, '').trim();
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=800&height=500&nologo=true`;
            
            let html = (lang === 'hi-IN' || lang === 'en-IN') ? `Yeh lijiye aapki image for **"${cleanPrompt}"**:` : `Here is your generated image for **"${cleanPrompt}"**:`;
            html += `<br><img src="${imageUrl}" class="ai-generated-img" alt="Generated Image" style="width:100%; border-radius:12px; margin-top:15px; border:1px solid var(--glass-border); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">`;
            html += `<br><br>` + ((lang === 'hi-IN' || lang === 'en-IN') ? `Aur kuch banana hai?` : `What else would you like to create?`);
            return html;
        }

        // 1.5 Video Generation Intercept (Enhanced keywords)
        const videoKeywords = ['generate video', 'generate a video', 'create video', '60s video', 'make a video', 'show a video', 'video of'];
        if (videoKeywords.some(kw => lowerInput.includes(kw))) {
            const cleanPrompt = input.replace(/generate 60s video of|generate a video of|generate video of|generate a video|generate video|create a video of|create video of|create video|make a video of|show a video of|video of/gi, '').trim();
            try {
                const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(cleanPrompt)}&limit=1`);
                const data = await res.json();
                if(data.data && data.data.length > 0) {
                    const videoUrl = data.data[0].images.original.mp4;
                    const sfxUrl = 'https://actions.google.com/sounds/v1/science_fiction/sci_fi_whoosh.ogg';
                    
                    let response = `Here is your generated 60s video for **"${cleanPrompt}"**:\n\n`;
                    response += `<video autoplay loop muted style="width:100%; border-radius:12px; border:1px solid var(--accent-primary); margin-bottom: 10px;"><source src="${videoUrl}" type="video/mp4"></video>\n`;
                    response += `<audio autoplay src="${sfxUrl}"></audio>\n\n`;
                    response += `*(Simulation based on visual cues. 60s limit applied.)*`;
                    return response;
                }
            } catch(e) {}
            return "I couldn't generate a video for that prompt. Try something else!";
        }

        // 2. Live News Intercept
        if (lowerInput.includes('news') || lowerInput.includes('latest update') || lowerInput.includes('khabar')) {
            try {
                // Using a free public RSS to JSON proxy for Google News India
                const res = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent('https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en'));
                const data = await res.json();
                
                // Parse XML manually since we fetched raw RSS
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(data.contents, "text/xml");
                const items = xmlDoc.querySelectorAll("item");
                
                let newsText = (lang === 'hi-IN' || lang === 'en-IN') ? "Yeh rahi aaj ki taza khabrein:\n\n" : "Here are the top latest news updates:\n\n";
                
                for(let i=0; i<Math.min(3, items.length); i++) {
                    const title = items[i].querySelector("title").textContent;
                    const link = items[i].querySelector("link").textContent;
                    newsText += `• **${title}**\n[Read more](${link})\n\n`;
                }
                return newsText;
            } catch(e) {
                return "I'm sorry, I couldn't fetch the live news right now. Please try again later.";
            }
        }

        // 3. Problem Solving & Knowledge (Pollinations LLM)
        let instruction = `You are AI Sathi, a direct and fast premium AI assistant. The user is ${userName || 'Friend'}. RULE: Identify the question type (Math, Code, Advice, Fact) and reply as FAST and CONCISELY as possible. Use a confident tone. `;
        if (lang === 'en-IN') {
            instruction += "Reply in Hinglish (Hindi + English mix using English letters). Be brief. ";
        } else if (lang === 'hi-IN') {
            instruction += "Reply in Hindi Devanagari script. Be concise. ";
        } else if (lang === 'auto') {
            instruction += "Match the user's language exactly. ";
        }

        const fullPrompt = instruction + "\n\nUser: " + input;
        
        try {
            const url = `https://text.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error("API request failed");
            return await response.text();
        } catch (error) {
            console.error("AI API Error:", error);
            return "I am having trouble connecting to my brain right now. Please try again in a moment!";
        }
    }
});

// Global functions for Video Call
let userStream = null;
let callRecognition = null;
let isCallActive = false;
let callSynth = window.speechSynthesis;

async function startVideoCall() {
    const overlay = document.getElementById('video-call-overlay');
    const userWebcam = document.getElementById('user-webcam');
    const statusText = document.getElementById('call-status');
    
    overlay.classList.remove('hidden');
    isCallActive = true;
    
    try {
        // Request user webcam
        userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        userWebcam.srcObject = userStream;
    } catch (e) {
        console.error("Webcam access denied or unavailable.");
    }

    // Setup Live Agent Voice Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        callRecognition = new SpeechRecognition();
        callRecognition.continuous = false; 
        callRecognition.interimResults = false;
        
        callRecognition.onresult = async function(event) {
            if(!isCallActive) return;
            const transcript = event.results[0][0].transcript;
            statusText.textContent = "You: " + transcript;
            
            statusText.textContent = "AI is thinking...";
            const response = await generateCallResponse(transcript);
            
            statusText.textContent = "AI is speaking...";
            speakCallResponse(response);
        };
        
        callRecognition.onerror = function(e) {
            if(isCallActive) statusText.textContent = "Listening... (Please speak)";
        };

        callRecognition.onend = function() {
            if (isCallActive && !callSynth.speaking) {
                try { callRecognition.start(); } catch(e){}
                statusText.textContent = "Listening...";
            }
        };
    }

    speakCallResponse("Hello. I am your live AI Agent. What would you like to discuss today?");
}

function speakCallResponse(text) {
    if (!callSynth || !isCallActive) return;
    callSynth.cancel();
    
    const plainText = text.replace(/<[^>]*>?/gm, '').replace(/[\#\*\_\`\[\]]/g, '');
    const shortText = plainText.length > 300 ? plainText.substring(0, 300) + "..." : plainText;
    
    const utterThis = new SpeechSynthesisUtterance(shortText);
    utterThis.pitch = 1.05;
    utterThis.rate = 1.05;
    
    utterThis.onend = () => {
        if (isCallActive && callRecognition) {
            try { callRecognition.start(); } catch(e){}
            document.getElementById('call-status').textContent = "Listening...";
        }
    };
    
    callSynth.speak(utterThis);
}

async function generateCallResponse(input) {
    let userName = localStorage.getItem('ai_sathi_user') || 'Friend';
    let instruction = `You are a live voice AI agent inside a futuristic video call. The user's name is ${userName}. CRITICAL RULES: Keep your responses EXTREMELY short (1-3 sentences max). Be conversational, friendly, and human-like. Do not use formatting like bold or lists, as this will be read out loud via text-to-speech.`;
    const fullPrompt = instruction + "\n\nUser: " + input;
    
    try {
        const url = `https://text.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}`;
        const response = await fetch(url);
        return await response.text();
    } catch (e) {
        return "I am having trouble connecting.";
    }
}

function endVideoCall() {
    isCallActive = false;
    const overlay = document.getElementById('video-call-overlay');
    overlay.classList.add('hidden');
    
    if (callRecognition) {
        callRecognition.stop();
    }
    
    if (callSynth) {
        callSynth.cancel();
    }
    
    if (userStream) {
        userStream.getTracks().forEach(track => track.stop());
        userStream = null;
    }
    
    const utter = new SpeechSynthesisUtterance("Call ended. Goodbye.");
    callSynth.speak(utter);
}
