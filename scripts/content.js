let capturedData = null;
let button = null;
let readerButton = null;
let downloadButton = null;
let exportButton = null;
let exportMenu = null;
let botFullName = 'Bot';
let capturedUsername = 'user';
let globalUserName = '';

// Inject script
var s = document.createElement('script');
s.src = chrome.runtime.getURL('././injected.js');
s.onload = function () {
    this.remove();
};
(document.head || document.documentElement).appendChild(s);


function waitForUsername() {
    return new Promise((resolve) => {
        const maxAttempts = 10; // Maximum number of attempts
        let attempts = 0;

        const checkForUsername = () => {
            const username = captureUsername(); // for extraction
            if (username && username !== 'user') {
                resolve(username);
                return;
            }

            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(checkForUsername, 200);
            } else {
                resolve('user');
            }
        };

        checkForUsername();
    });
}


async function initializeAfterReload() {
    const pendingAction = localStorage.getItem('pendingAction');
    if (pendingAction) {
        try {
            // Wait for the DOM to be fully loaded
            if (document.readyState !== 'complete') {
                await new Promise(resolve => {
                    window.addEventListener('load', resolve);
                });
            }

            // Wait for dynamic content to load
            await new Promise(resolve => setTimeout(resolve, 500));

            // Capture username first
            const username = await waitForUsername();
            
            // Store the username
            localStorage.setItem('capturedUsername', username);
            globalUserName = username;
            capturedUsername = username;
            
            await waitForData();
            
            // Process the action
            handleExportAction(pendingAction);
            
            // Clear the pending action
            localStorage.removeItem('pendingAction');
        } catch (error) {
            console.error('Error during initialization:', error);
            localStorage.removeItem('pendingAction');
        }
    }
}

function waitForData() {
    return new Promise((resolve) => {
        const checkForData = () => {
            if (capturedData) {
                resolve();
            } else {
                setTimeout(checkForData, 100);
            }
        };
        checkForData();
    });
}

// Helper function to process messages from captured JSON
function processMessages(capturedData) {
    try {
        const data = (typeof capturedData === 'string') ? JSON.parse(capturedData) : capturedData;
        const messages = data.chatMessages || [];
        const botName = data.character?.chat_name || data.character?.name || 'Bot';
        const botFullName = data.character?.name || 'Bot';

        const storedUsername = localStorage.getItem('capturedUsername');
        globalUserName = storedUsername || data.persona_name || capturedUsername || 'user';
        return { messages, botName, botFullName, userName: globalUserName };
    } catch (error) {
        console.error('Error processing captured data:', error);
        return null;
    }
}

function sortMessages(messages) {
    return  messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

function convertMarkdownToHtml(markdown) {
    if (!markdown) return '';

    return markdown
        .replace(/_(.+?)_/g, '<em>$1</em>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
        .replace(/`(.*?)`/gim, '<code>$1</code>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>')
        .replace(/!\[(.*?)\]\((.*?)\)/gim, '<img alt="$1" src="$2" />')
        .replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>')
        .replace(/^\s*([-_*])\1{2,}\s*$/gm, '<hr>')
        .split('\n').map(line => `<p>${line}</p>`).join('');
}

function exportAsEpub() {
    if (!capturedData) {
        console.error("No data captured yet");
        return;
    }

    const data = (typeof capturedData === 'string') ? JSON.parse(capturedData) : capturedData;
	const userName = getPersistedUsername();
    const { messages, botName, botFullName } = processMessages(data);
    const sortedMessages = sortMessages(messages);
    const title = `A Chat with ${botFullName}`;

    const messageContent = sortedMessages.map(msg => {
        const speakerName = msg.is_bot ? botName : userName;
        let messageText = msg.message.replace(/\{\{[uU]ser\}\}/g, userName);
        messageText = convertMarkdownToHtml(messageText);

        return `
            <div class="message-container ${msg.is_bot ? 'char-message' : 'user-message'}">
                <div class="message-content">
                    <h3>${speakerName}</h3>
                    <div class="message-text">${messageText}</div>
                </div>
            </div>`;
    }).join('\n');

    let zip = new JSZip();
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

    const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
    <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
        <rootfiles>
            <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
        </rootfiles>
    </container>`;
    zip.folder("META-INF").file("container.xml", containerXml);

    const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
    <package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
        <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
            <dc:identifier id="book-id">urn:uuid:${Date.now()}</dc:identifier>
            <dc:title>${title}</dc:title>
            <dc:language>en</dc:language>
            <dc:creator>${userName}</dc:creator>
        </metadata>
        <manifest>
            <item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>
            <item id="css" href="style.css" media-type="text/css"/>
            <item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
        </manifest>
        <spine toc="toc">
            <itemref idref="content"/>
        </spine>
    </package>`;
    zip.folder("OEBPS").file("content.opf", contentOpf);

    const contentXhtml = `<?xml version="1.0" encoding="UTF-8"?>
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
        <title>${title}</title>
        <link rel="stylesheet" type="text/css" href="style.css"/>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    </head>
    <body>
        ${messageContent}
    </body>
    </html>`;
    zip.folder("OEBPS").file("content.xhtml", contentXhtml);

    const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
    <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
        <head>
            <meta name="dtb:uid" content="urn:uuid:${Date.now()}"/>
        </head>
        <docTitle>
            <text>${title}</text>
        </docTitle>
        <navMap>
            <navPoint id="navpoint-1" playOrder="1">
                <navLabel>
                    <text>Messages</text>
                </navLabel>
                <content src="content.xhtml#xpointer(/html/body)"/>
            </navPoint>
        </navMap>
    </ncx>`;
    zip.folder("OEBPS").file("toc.ncx", tocNcx);

    const css = `
        body {
            background:"";
            margin: 0 auto;  
            padding: 10px;  
            font-family: 'Segoe UI', sans-serif;
        }
        
        h3 {
            font-size: 18px;
        }
        
        .message-container {
            margin-bottom: 1.5em;
        }

        .message-content {
            font-size: 16px;
        }

        .message-content h3 {
            margin: 0;
            font-size: 18px;
        }

        .message-content p {
            font-size: 16px;
            margin: 5px 0;
            margin-bottom: 12px;
        }
        
        .user-message {
            padding: 10px;
            margin: 10px;
        }

        .char-message {
            padding: 10px;
            margin: 10px;
        }
        
        .user-message em, .char-message em {
            color: #a1a1a1;
            font-style: italic;
        }

        p, h1, h2, h3, h4, h5, h6 {  
            margin: 0;  
            padding: 0;  
        }
        
        br {
            line-height: 1.5em;
        }

        * {  
            box-sizing: border-box;  
        }

        code { 
            background-color: #f5f5f5; 
            padding: 2px 4px; 
            border-radius: 3px; 
            font-family: monospace; 
        }

        pre code { 
            display: block; 
            padding: 10px; 
            white-space: pre-wrap; 
        }
    `;
    zip.folder("OEBPS").file("style.css", css);

    zip.generateAsync({ type: "blob" }).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.epub`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

function exportAsTxt() {
    if (!capturedData) {
        console.error("No data captured yet");
        return;
    }
	
	// Parse the data if it's a string
    const data = (typeof capturedData === 'string') ? JSON.parse(capturedData) : capturedData;
    const messages = data.chatMessages || [];
    const botName = data.character?.chat_name || data.character?.name || 'Bot';
const userName = getPersistedUsername();
    const title = `A Chat with ${data.character?.name || 'Bot'}`;
	
	// Sort messages by creation time  
    const sortedMessages = messages.sort((a, b) =>   
            new Date(a.created_at) - new Date(b.created_at)  
        );  
    const processed = processMessages(capturedData);
    if (!processed) return;
    
    // Format messages
    const formattedMessages = messages.map(msg => {
        const processedMessage = msg.message.replace(/\{\{[uU]ser\}\}/g, userName)
            .replace(/\*(.*?)\*/g, '$1'); // Remove markdown formatting
        return `${msg.is_bot ? botName : userName}:\n${processedMessage}`;
    }).join("\n\n");

    // Download
    const blob = new Blob([formattedMessages], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

function exportAsMarkdown() {
    if (!capturedData) {
        console.error("No data captured yet");
        return;
    }
	
	const data = (typeof capturedData === 'string') ? JSON.parse(capturedData) : capturedData;
    const messages = data.chatMessages || [];
    const botName = data.character?.chat_name || data.character?.name || 'Bot';
const userName = getPersistedUsername();
    const title = `A Chat with ${data.character?.name || 'Bot'}`;
	
	// Sort messages by creation time  
    const sortedMessages = messages.sort((a, b) =>   
            new Date(a.created_at) - new Date(b.created_at)  
        );  

    const processed = processMessages(capturedData);
    if (!processed) return;

    // Format messages with Markdown
    const formattedMessages = messages.map(msg => {
        const processedMessage = msg.message.replace(/\{\{[uU]ser\}\}/g, userName);
        return `#### ${msg.is_bot ? botName : userName}\n${processedMessage}\n`;
    }).join("\n");

    // Download
    const blob = new Blob([formattedMessages], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.md`;
    a.click();
    URL.revokeObjectURL(url);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    })
    .replace(' at ', ' ')
    .replace(/\s+/g, ' ')  // Normalize spaces
    .replace(/,(?=[^,]*$)/, '')  // Remove last comma
    .replace(/(\d+)(?=\s*\d{4})/, '$1,')  // Add comma after day number
    .replace(/\s+/g, ' ')
	.replace(' AM', 'AM')
    .replace(' PM', 'PM')
    .trim();
}

// Helper function to create combined message for swipes
function createCombinedMessage(messages, characterName) {
    const reversedMessages = [...messages].reverse();
    const swipes = messages.map(msg => msg.message);
    const swipeInfo = messages.map(msg => ({
        send_date: formatDate(msg.created_at || new Date()),
        extra: {}
    }));
    return {
        name: characterName,
        is_user: false,
        is_system: false,
        send_date: formatDate(messages[0].created_at || new Date()),
        mes: messages[0].message,
        swipe_id: 0,
        swipes: swipes,
        swipe_info: swipeInfo,
        extra: {}
    };
}

function exportAsSillyTavernFormat() {
    if (!capturedData) {
        console.error("No data captured yet");
        return;
    }

    // Parse the data if it's a string
    const data = (typeof capturedData === 'string') ? JSON.parse(capturedData) : capturedData;
    const messages = data.chatMessages || [];
    const botName = data.character?.chat_name || data.character?.name || 'Bot';
    const botFullName = data.character?.name || 'Bot';
const userName = getPersistedUsername();
	
    const sortedMessages = messages.sort((a, b) =>   
            new Date(a.created_at) - new Date(b.created_at)  
        );  

    const combinedData = [];
    let currentMessage = {
        name: "",
        is_user: false,
        is_system: false,
        send_date: "",
        mes: "",
        extra: {}
    };

    // Find first character message and last user message
    const firstCharacterMessage = messages.find(msg => msg.is_bot);
    const lastUserIndex = messages.findLastIndex(msg => !msg.is_bot);

    // Handle first character message duplication
    if (firstCharacterMessage) {
        const firstMessage = {
            name: botName,
            is_user: false,
            is_system: false,
            send_date: formatDate(firstCharacterMessage.created_at || new Date()),
            mes: firstCharacterMessage.message.replace(/\{\{[uU]ser\}\}/g, userName),
            extra: {}
        };
        
        // Add both original and duplicate of first character message
        combinedData.push(firstMessage);
        combinedData.push({...firstMessage});
    }

    // Add messages up to last user message
    for (let i = 0; i <= lastUserIndex; i++) {
        const msg = messages[i];
        if (msg !== firstCharacterMessage) { // Skip if it's the first character message (already added)
            currentMessage = {
                name: msg.is_bot ? botName : userName,
                is_user: !msg.is_bot,
                is_system: false,
                send_date: formatDate(msg.created_at || new Date()),
                mes: msg.message.replace(/\{\{[uU]ser\}\}/g, userName),
                extra: {}
            };
            combinedData.push(currentMessage);
        }
    }

    // Handle swipe messages after last user message
    if (lastUserIndex !== -1 && lastUserIndex < messages.length - 1) {
        const buffer = messages.slice(lastUserIndex + 1).filter(msg => msg.is_bot);
        if (buffer.length > 0) {
            const swipeMessage = createCombinedMessage(buffer, botName);
            swipeMessage.mes = swipeMessage.mes.replace(/\{\{[uU]ser\}\}/g, userName);
            // Replace {{user}} in all swipes
            swipeMessage.swipes = swipeMessage.swipes.map(msg => 
                msg.replace(/\{\{[uU]ser\}\}/g, userName)
            );
            combinedData.push(swipeMessage);
        }
    }

    // Download
    const jsonlContent = combinedData.map(msg => JSON.stringify(msg)).join('\n');
    const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `A Chat with ${botFullName}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
}

// extracting persona name from page
async function captureUsername() {
    let username = null;
	let globalUserName = null;
    let capturedUsername = null;
    let botName = '';
	let attemptName = '';

    const attemptCapture = () => {
        // Get bot name from header
        const headerElement = document.querySelector('p.chakra-text.css-1nj33dt');
        if (headerElement) {
            botName = headerElement.textContent.replace('Chat with', '').trim();
        } else {
            console.log('Waiting for bot name');
        }

        // Get unique names from username divs
        const usernameDivs = document.querySelectorAll('.css-16u3s6f');
        if (usernameDivs && usernameDivs.length >= 2) {
            const uniqueNames = Array.from(usernameDivs)
                .map(div => div.textContent)
                .filter((name, index, array) => array.indexOf(name) === index);
            if (uniqueNames.length >= 2) {
                if (botName && uniqueNames.includes(botName)) {
                    capturedUsername = uniqueNames.find(name => name !== botName);
					globalUserName = capturedUsername;

                } else {
                    capturedUsername = "user";
                }
                return capturedUsername;
            } else {
                console.log('Method failed: Less than 2 unique names found.');
            }
        } else {
            console.log('Method failed: Less than 2 css elements found.');
        }
        console.log('Could not capture persona name, using default name: user');
        return 'user';
    };

    // Retry Mechanism
    let retries = 0;
    const maxRetries = 10;
    const retryDelay = 500; // Retry every 500ms

    return new Promise((resolve) => {
        const retryInterval = setInterval(() => {
            retries++;
            const username = attemptCapture();
            if (username && username !== 'user') {
                clearInterval(retryInterval);
                resolve(username);
            } else if (retries >= maxRetries) {
                clearInterval(retryInterval);
                resolve('user'); // Default to 'user' after retries
            }
        }, retryDelay);
    });
}

// Capture the JSON data and store it in capturedData
function captureData(data) {
    try {
        const parsedData = (typeof data === 'string') ? JSON.parse(data) : data;

        const currentUsername = captureUsername();
        
        globalUserName = currentUsername;
        capturedUsername = currentUsername;
        localStorage.setItem('capturedUsername', currentUsername);
        capturedData = data;
    } catch (error) {
        console.error('Error processing captured data:', error);
        capturedData = data;
    }
}

// Function to process and download data
function processAndDownloadData() {
    if (!capturedData) {
        console.error('No data to process');
        return;
    }

    try {
        if (capturedData instanceof Blob) {
            capturedData.text()
                .then(text => {
                    processJsonData(text);
                })
                .catch(error => {
                    console.error('Error reading Blob:', error);
                    localStorage.removeItem('downloadPending');
                });
        } else {
            processJsonData(capturedData);
        }
    } catch (error) {
        console.error('Error processing captured data:', error);
        localStorage.removeItem('downloadPending');
    }
}


function processJsonData(jsonString) {
    try {
        const parsedData = JSON.parse(jsonString);
        botFullName = parsedData.character?.name || 'Bot';
        parsedData.persona_name = capturedUsername;
        downloadAsJson(JSON.stringify(parsedData), `A Chat with ${botFullName}.json`);
    } catch (error) {
        console.error('Invalid JSON format:', error);
    }
}

function downloadAsJson(data, filename) {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function handleDownloadClick() {
	localStorage.setItem('pendingAction', 'download');
    location.reload();
}

function addButton() {
    if (downloadButton) return;
    downloadButton = document.createElement('button');
    downloadButton.id = 'downloadButton';
    downloadButton.textContent = 'Download Chat Archive (.json)';
    downloadButton.style.position = 'fixed';
    downloadButton.style.top = '-4px';
    downloadButton.style.left = '50%';
    downloadButton.style.transform = 'translateX(-50%)';
    downloadButton.style.padding = '4px 9px';
    downloadButton.style.backgroundColor = 'rgb(103 103 61)';
    downloadButton.style.color = 'white';
    downloadButton.style.border = 'none';
    downloadButton.style.borderRadius = '5px';
    downloadButton.style.cursor = 'pointer';
    downloadButton.style.zIndex = '9999';
    downloadButton.style.fontSize = '14px';
    downloadButton.style.fontFamily = '"Segoe UI", sans-serif';
	downloadButton.style.transition = 'background-color 0.3s';
    downloadButton.style.boxShadow = '0 10px 20px 0 rgba(0, 0, 0, 0.3), 0 6px 20px 0 rgba(0, 0, 0, 0.19)';

    downloadButton.addEventListener('mouseover', () => {
        downloadButton.style.backgroundColor = '#973ec7';
		downloadButton.style.boxShadow = '0 0px 20px 0 rgb(151 62 199 / 44%), 0 0 0px 0 rgba(0, 0, 0, 0.19)';
    });

    downloadButton.addEventListener('mouseout', () => {
        downloadButton.style.backgroundColor = 'rgb(103 103 61)';
		downloadButton.style.boxShadow = '0 10px 20px 0 rgba(0, 0, 0, 0.3), 0 6px 20px 0 rgba(0, 0, 0, 0.19)';
    });

    downloadButton.addEventListener('click', handleDownloadClick);
    
    document.body.appendChild(downloadButton);
}

function setupObserver() {
    const targetNode = document.body;

    if (!targetNode) {
        console.error('Target node for MutationObserver not found.');
        return;
    }

    const observer = new MutationObserver(() => {
        const usernameDivs = document.querySelectorAll('.css-16u3s6f');
        if (usernameDivs && usernameDivs.length >= 2) {
            capturedUsername = usernameDivs[1].textContent;
			localStorage.setItem('capturedUsername', capturedUsername);//store capturedUsername for use after reload
            observer.disconnect(); // Stop observing once username is captured
        }
    });

    observer.observe(targetNode, { childList: true, subtree: true });
}


window.addEventListener('load', () => {
    initializeAfterReload();
});

window.addEventListener('DOMContentLoaded', () => {
    setupObserver();
    initializeAfterReload();
});

// Call on page load
window.addEventListener('DOMContentLoaded', async () => {
    const username = await captureUsernameAndPersist();
	console.log('Persisted username retrieved:', getPersistedUsername());
});


function persistUsername(username) {
    if (username && username !== 'user') {
        globalUserName = username; // Update global variable
        localStorage.setItem('resolvedUsername', username); // Store in localStorage
    }
}

function getPersistedUsername() {
    const storedUsername = localStorage.getItem('resolvedUsername');
    return storedUsername ? storedUsername : 'user'; // Default to 'user'
}

async function captureUsernameAndPersist() {
    const username = await captureUsername();
    persistUsername(username); // Store the resolved username
    return username;
}

// Receive message from injected script and store data
window.addEventListener('message', function (e) {
    if (e.data.type === 'xhr' || e.data.type === 'fetch') {
        if (e.data.data) {
            captureData(e.data.data);
            
            // Check for pending action after data capture
            const downloadPending = localStorage.getItem('downloadPending');
            if (downloadPending === 'true') {
                localStorage.removeItem('downloadPending');
                processAndDownloadData();
            }
        } else {
            console.log('No data found in the captured response.');
        }
    }
});

function addChatreaderButton() {
    if (readerButton) return;
    readerButton = document.createElement('button');
    readerButton.id = 'chatreaderButton';
    readerButton.textContent = 'Open Chat Archive Reader';
    readerButton.style.position = 'fixed';
    readerButton.style.top = '38px';
    readerButton.style.left = '50%';
    readerButton.style.transform = 'translate(105%, 0)';
    readerButton.style.padding = '1px 8px';
    readerButton.style.backgroundColor = 'rgb(69 127 139)';
    readerButton.style.color = '#FFFFFF';
    readerButton.style.border = 'none';
    readerButton.style.borderRadius = '6px';
    readerButton.style.cursor = 'pointer';
    readerButton.style.zIndex = '9999';
    readerButton.style.fontSize = '14px';
	readerButton.style.transition = 'background-color 0.3s';
    readerButton.style.fontFamily = '"Segoe UI", sans-serif';
    readerButton.style.boxShadow = '0 0px 20px 0 rgb(0 225 255 / 23%), 0 0 0px 0 rgba(0, 0, 0, 0.19)';

    readerButton.addEventListener('mouseover', () => {
        readerButton.style.backgroundColor = '#973ec7';
		readerButton.style.boxShadow = '0 0px 20px 0 rgb(151 62 199 / 77%), 0 0 0px 0 rgba(0, 0, 0, 0.19)';
    });

    readerButton.addEventListener('mouseout', () => {
        readerButton.style.backgroundColor = 'rgb(69 127 139)';
		    readerButton.style.boxShadow = '0 0px 20px 0 rgb(0 225 255 / 23%), 0 0 0px 0 rgba(0, 0, 0, 0.19)';
    });

    readerButton.addEventListener('click', () => {
        window.open(chrome.runtime.getURL('./index.html'), '_blank');
    });

    document.body.appendChild(readerButton);
}

function removeButton() {
    if (downloadButton) {
        downloadButton.remove();
        downloadButton = null;
    }
}

function removeReaderButton() {
    if (readerButton) {
        readerButton.remove();
        readerButton = null;
    }
}

// event listeners for load and mutation observation
document.addEventListener('DOMContentLoaded', () => {
    setupObserver();
    addButton();
    addChatreaderButton();
    addExportButton();
});

// Run the check on initial page load
document.addEventListener('DOMContentLoaded', checkUrlAndToggleButton);

// Listen for URL changes
window.addEventListener('popstate', checkUrlAndToggleButton);
window.addEventListener('hashchange', checkUrlAndToggleButton);
setInterval(checkUrlAndToggleButton, 1000);

function addExportButton() {
    if (exportButton) return;
    exportButton = document.createElement('button');
    exportButton.id = 'exportButton';
    exportButton.textContent = 'Export As';
    exportButton.style.position = 'fixed';
    exportButton.style.top = '-4px';
    exportButton.style.left = '50%';
    exportButton.style.transform = 'translate(-265%, 0)';
    exportButton.style.padding = '4px 9px';
    exportButton.style.backgroundColor = 'rgb(69 127 139)';
    exportButton.style.color = '#FFFFFF';
    exportButton.style.border = 'none';
    exportButton.style.borderRadius = '6px';
    exportButton.style.cursor = 'pointer';
    exportButton.style.zIndex = '9999';
    exportButton.style.fontSize = '14px';
	exportButton.style.transition = 'background-color 0.3s';
    exportButton.style.fontFamily = '"Segoe UI", sans-serif';
    exportButton.style.boxShadow = 'rgba(0, 0, 0, 0.3) 0px 10px 20px 0px, rgba(0, 0, 0, 0.19) 0px 6px 20px 0px';

    exportButton.addEventListener('mouseover', () => {
        exportButton.style.backgroundColor = '#973ec7';
		exportButton.style.boxShadow = '0 0px 20px 0 rgb(151 62 199 / 33%), 0 0 0px 0 rgba(0, 0, 0, 0.19)';
    });

    exportButton.addEventListener('mouseout', () => {
        exportButton.style.backgroundColor = 'rgb(69 127 139)';
		exportButton.style.boxShadow = 'rgba(0, 0, 0, 0.3) 0px 10px 20px 0px, rgba(0, 0, 0, 0.19) 0px 6px 20px 0px';
    });

    exportButton.addEventListener('click', () => {
        toggleExportMenu();
    });

    document.body.appendChild(exportButton);
}

function toggleExportMenu() {
    if (!exportMenu) {
        createExportMenu();
    }
    exportMenu.style.display = exportMenu.style.display === 'none' || exportMenu.style.display === '' ? 'block' : 'none';
}

function createExportMenu() {
    exportMenu = document.createElement('div');
    exportMenu.id = 'exportMenu';
    exportMenu.style.position = 'fixed';
    exportMenu.style.top = '80px';
    exportMenu.style.left = '50%';
	exportMenu.style.fontSize = '14px';
    exportMenu.style.transform = 'translateX(-205%)  translateY(-34%)';
    exportMenu.style.padding = '10px';
    exportMenu.style.backgroundColor = 'rgba(1, 1, 1,0)';
	exportMenu.style.borderRadius = '5px';
    exportMenu.style.zIndex = '9999';
    exportMenu.style.display = 'none';

    const description = document.createElement('p');
    description.textContent = '';
    description.style.marginBottom = '1px';

    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.flexDirection = 'column';

    const formats = ['EPUB', 'TXT', 'MD', 'SillyTavern Chat'];
 formats.forEach((format, index) => {
        const button = document.createElement('button');
        button.textContent = format;
		
		button.style.width = '86px';
		button.style.whiteSpace = 'normal'; 
		button.style.overflow = 'hidden'; 
		button.style.textAlign = 'center'; 
        button.style.margin = '0px';
        button.style.padding = '5px';
		button.style.fontSize = '14px';
        button.style.border = 'none';
        button.style.borderRadius = '3px';
        button.style.backgroundColor = 'rgb(49, 51, 57)';
        button.style.cursor = 'pointer';
        button.style.transition = 'background-color 0.3s';
		button.style.boxShadow = 'rgba(0, 0, 0, 0.6) 0px 10px 10px 0px, rgba(0, 0, 0, 0.19) 0px 16px 20px 0px';

    button.addEventListener('mouseover', () => {
        button.style.backgroundColor = '#973ec7';
		button.style.boxShadow = '0 0px 20px 0 rgb(151 62 199 / 44%), 0 0 0px 0 rgba(0, 0, 0, 0.19)';
    });
        button.addEventListener('mouseleave', () => {
			button.style.boxShadow = 'rgba(0, 0, 0, 0.6) 0px 10px 10px 0px, rgba(0, 0, 0, 0.19) 0px 16px 20px 0px';
            button.style.backgroundColor = 'rgb(49, 51, 57)'; 
            button.style.color = 'white';
        });

        button.addEventListener('click', () => triggerExportFunction(index));
        buttonsContainer.appendChild(button);
    });

    exportMenu.appendChild(description);
    exportMenu.appendChild(buttonsContainer);
    document.body.appendChild(exportMenu);

    // Close menu when clicking outside
    document.addEventListener('click', (event) => {
        if (!exportButton.contains(event.target) && !exportMenu.contains(event.target)) {
            exportMenu.style.display = 'none';
        }
    });
}

function triggerExportFunction(index) {
    let action;
    switch (index) {
        case 0:
            action = 'epub';
            break;
        case 1:
            action = 'txt';
            break;
        case 2:
            action = 'md';
            break;
        case 3:
            action = 'st';
            break;
    }
    exportMenu.style.display = 'none'; // Hide menu after selection
    
    // Only set pendingAction and reload if not already exporting
    if (!window.isExporting) {
        localStorage.setItem('pendingAction', action);
        location.reload();
    }
}

function handleExportAction(action) {
    if (!capturedData) {
        console.error('No data available for export');
        return;
    }

    // Add a flag to prevent double execution
    if (window.isExporting) {
        return;
    }
    
    window.isExporting = true;
	// Ensure globalUserName is updated before export
    const username = captureUsername();
    globalUserName = username;
    
    try {
        const data = (typeof capturedData === 'string') ? JSON.parse(capturedData) : capturedData;

        switch (action) {
            case 'download':
                processAndDownloadData();
                break;
            case 'epub':
                exportAsEpub();
                break;
            case 'txt':
                exportAsTxt();
                break;
            case 'md':
                exportAsMarkdown();
                break;
            case 'st':
                exportAsSillyTavernFormat();
                break;
        }
    } catch (error) {
        console.error('Error processing data for export:', error);
    } finally {
        // Reset the flag after a short delay to ensure download has started
        setTimeout(() => {
            window.isExporting = false;
        }, 1000);
    }
}

function exportData(parsedData) {

    const selectedFormat = getSelectedFormat();
    switch (selectedFormat) {
        case 'EPUB':
            exportAsEpub(parsedData);
            break;
			
        case 'TXT':
            exportAsTxt(parsedData);
            break;
			
        case 'MD':
            exportAsMarkdown(parsedData);
            break;
			
        case 'SillyTavern':
            exportAsSillyTavernFormat(parsedData);
            break;
    }
}

function removeExportButton() {
    if (exportButton) {
        exportButton.remove();
        exportButton = null;
    }
    if (exportMenu) {
        exportMenu.remove();
        exportMenu = null;
    }
}

function checkUrlAndToggleButton() {
    const currentUrl = window.location.href;
    const targetUrlPattern = /^https:\/\/janitorai\.com\/chats\/.+$/;

    if (targetUrlPattern.test(currentUrl)) {
        addButton();
        addChatreaderButton();
		addExportButton()
    } else {
        removeButton();
        removeReaderButton();
		removeExportButton();
    }
}