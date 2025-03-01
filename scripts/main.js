// main.js

	window.addEventListener('load', () => {
		const toggleAvatarCheckbox = document.getElementById('toggleAvatarCheckbox');
		if (toggleAvatarCheckbox) {
			toggleAvatarCheckbox.addEventListener('change', toggleShowAvatar);
		}

		const userAvatarFile = document.getElementById('userAvatarFile');
		if (userAvatarFile) {
			userAvatarFile.addEventListener('change', loadUserImg);
		}

		const charAvatarFile = document.getElementById('charAvatarFile');
		if (charAvatarFile) {
			charAvatarFile.addEventListener('change', loadCharImg);
		}

		const userNameInput = document.getElementById('userName');
		if (userNameInput) {
			userNameInput.addEventListener('input', function () {
				user.name = this.value || 'user';
				displayMessages();
			});
		}
	});

	let user = {
		name: 'user',
		avatar: ''
	};
	let character = {
		name: 'bot',
		fullname:'',
		avatar: ''
	};
	let isShowOperation = true;
	let isShowAvatar = true;
	let messages = [
		{
			"id": 0000000000,
			"created_at": "",
			"is_bot": false,
			"message": "Messages will appear here once you open a chat archive (.json)"
		},
		{
			"id": 9999999999,
			"created_at": "",
			"is_bot": true,
			"message": "Messages will appear here once you open a chat archive (.json)"
		}
	];

	const wrapper = document.getElementById('wrapper');
	const panelContainer = document.getElementById('panelContainer');
	const avatarOptions = document.getElementById('avatarOptions');
	const toggleAvatarButton = document.getElementById('toggleAvatarButton');
	const messageArea = document.getElementById('messageArea');
	const jsonFileInput = document.getElementById('jsonFileInput');
	const userNameInput = document.getElementById('userName');

	document.getElementsByName('avatarInputType').forEach(input => {
		input.addEventListener('change', handleAvatarInputChange);
	});
	document.getElementById('userAvatarFile').addEventListener('change', loadUserImg);
	document.getElementById('charAvatarFile').addEventListener('change', loadCharImg);
	jsonFileInput.addEventListener('change', loadJsonFile);
	userNameInput.addEventListener('input', function () {
		user.name = this.value || 'user';
		displayMessages();
	});

	function toggleShowAvatar() {
		isShowAvatar = !isShowAvatar;
		const userAvatarContainer = document.getElementById('userAvatarContainer');
		const charAvatarContainer = document.getElementById('charAvatarContainer');

		// Show or hide the user and character avatar containers
		userAvatarContainer.style.display = isShowAvatar ? 'block' : 'none';
		charAvatarContainer.style.display = isShowAvatar ? 'block' : 'none';

		// Optionally clear messages when toggling visibility
		displayMessages();
	}

	function handleAvatarInputChange() {
		const type = this.value;
		if (type === 'upload') {
			document.getElementById('uploadUser').style.display = 'block';
			document.getElementById('urlUser').style.display = 'none';
			document.getElementById('uploadChar').style.display = 'block';
			document.getElementById('urlChar').style.display = 'none';
		} else {
			document.getElementById('uploadUser').style.display = 'none';
			document.getElementById('urlUser').style.display = 'block';
			document.getElementById('uploadChar').style.display = 'none';
			document.getElementById('urlChar').style.display = 'block';
		}
	}

	document.getElementById('userAvatarUrl').addEventListener('input', function () {
		const url = this.value;
		if (url) {
			user.avatar = url;  
			displayMessages();  // Update the messages to display the new avatar
		}
	});

	document.getElementById('charAvatarUrl').addEventListener('input', function () {
		const url = this.value;
		if (url) {
			character.avatar = url;
			displayMessages();
		}
	});

	function loadUserImg(event) {
		const file = event.target.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = function (e) {
				user.avatar = e.target.result;
				displayMessages();
			};
			reader.readAsDataURL(file);
		}
	}

	function loadCharImg(event) {
		const file = event.target.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = function (e) {
				character.avatar = e.target.result;
				displayMessages();
			};
			reader.readAsDataURL(file);
		}
	}

function loadJsonFile(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = JSON.parse(e.target.result);

            // Check if JSON contains valid data
            if (data.chatMessages && Array.isArray(data.chatMessages)) {
                // Parse chat_name from JSON and set as bot name
                character.fullname = data.character.name;
                character.name = data.character.chat_name;
                
                // Update user.name from the captured username in JSON
                if (data.username) {
                    user.name = data.username;
                    // Update the input field if it exists
                    const userNameInput = document.getElementById('userName');
                    if (userNameInput) {
                        userNameInput.value = user.name;
                    }
                }
				
				if (data.persona_name) {
                user.name = data.persona_name;
                console.log('Updated user.name to persona_name:', user.name);
                const userNameInput = document.getElementById('userName');
                if (userNameInput) {
                    userNameInput.value = user.name;
                }
            }
                
                if (character.name === null) {
                    character.name = character.fullname;
                }
                console.log('Updated bot full name to:', character.fullname);
                console.log('Updated character name to:', character.name);
                console.log('Updated user name to:', user.name);
                messages = data.chatMessages;
                displayMessages();
            } else {
                alert('Invalid JSON structure.');
            }
        };
        reader.readAsText(file);
    } else {
        alert('Please select a file.');
    }
}

	function displayMessages() {
		messageArea.innerHTML = '';

		// Sort messages by the 'created_at' timestamp in ascending order
		messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

		messages.forEach(msg => {
			const messageContainer = document.createElement('div');
			messageContainer.className = 'message-container ' + getArticleClass(msg);

			if (isShowAvatar) { // Check if avatars should be shown
				const avatar = document.createElement('img');
				avatar.className = 'avatar';
				avatar.src = msg.is_bot ? character.avatar || '' : user.avatar || '';
				avatar.onerror = function () { // no-image case
					const placeholder = document.createElement('div');
					placeholder.className = 'no-image';
					placeholder.textContent = 'No Image';
					this.replaceWith(placeholder);
				};
				messageContainer.appendChild(avatar);
			}

			const messageContent = document.createElement('div');
			messageContent.className = 'message-content';
			const nameElement = document.createElement('h3');
			nameElement.textContent = msg.is_bot ? character.name : user.name;
			messageContent.appendChild(nameElement);

			const messageElement = document.createElement('p');
			const formattedMessage = formatMessage(msg.message);
			messageElement.innerHTML = formattedMessage;
			messageContent.appendChild(messageElement);
			messageContainer.appendChild(messageContent);

			messageArea.appendChild(messageContainer);
		});
	}



        function convertMarkdownToHtml(markdown) {
			
			// underscores wrapped text to italics
			markdown = markdown.replace(/_(.+?)_/g, '<em>$1</em>');
			
			// headers
            markdown = markdown.replace(/^### (.*$)/gim, '<h3>$1</h3>');
            markdown = markdown.replace(/^## (.*$)/gim, '<h2>$1</h2>');
            markdown = markdown.replace(/^# (.*$)/gim, '<h1>$1</h1>');
			
			// line breaks
            markdown = markdown.split('\n').map(line => `<p>${line}</p>`).join('');
			
            // multiline code blocks
            markdown = markdown.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');

            // inline code
            markdown = markdown.replace(/`(.*?)`/gim, '<code>$1</code>');

            // bold italic
            markdown = markdown.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
            markdown = markdown.replace(/\*(.*?)\*/g, '<em>$1</em>'); // Italic

            // links
            markdown = markdown.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>');

            // images
            markdown = markdown.replace(/!\[(.*?)\]\((.*?)\)/gim, '<img alt="$1" src="$2" />');

            // lists
            markdown = markdown.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');

            // horizontal rules
            markdown = markdown.replace(/^\s*([-_*])\1{2,}\s*$/gm, '<hr>');

            return markdown.trim();
        }

        function formatMessage(message) {
            message = convertMarkdownToHtml(message);

            // Replace escaped quotes and placeholders
            return message
                .replace(/\\"/g, '"')
                .replace(/\{\{user\}\}/gi, user.name)
                .replace(/\{\{char\}\}/gi, character.name);
        }

        function getArticleClass(item) {
            return item.is_bot ? 'char-message' : 'user-message';
        }

        // Initialize display
        displayMessages();
		
		const fadeElements = document.querySelectorAll('.fade-in');

		// Add the fade-in animation with delay to each element
		fadeElements.forEach((element, index) => {
			element.style.animationDelay = `${index * 0.5}s`;
			element.classList.add('fade-in');
		});

		//menu controllers
		const menuContent = document.querySelector('.menu-content');
		const menuToggle = document.getElementById('menuToggle');
		const updatesContent = document.getElementById('updates-content');

		// Open/close menu with animation
		menuToggle.addEventListener('click', (e) => {
			e.stopPropagation(); // Prevent click inside from closing
			menuContent.classList.toggle('hide');
		});
		
		// Close updates when clicking outside
		document.addEventListener('click', (e) => {
			if (!updatesContent.contains(e.target)) {
				updatesContent.classList.add('hide');
				console.log("class is hide");  
			}
		});
		

		// Close menu when clicking outside
		document.addEventListener('click', (e) => {
			if (!menuContent.contains(e.target) && !menuToggle.contains(e.target)) {
				menuContent.classList.add('hide');
			}
		});
		
		//export menu controllers
		const exportContent = document.querySelector('.export-content');
		const menuToggle2 = document.getElementById('menuToggle2');

		menuToggle2.addEventListener('click', (e) => {
			e.stopPropagation(); // Prevent click inside from closing
			exportContent.classList.toggle('show');
		});

		// Close the menu when clicking outside 
		document.addEventListener('click', (e) => { 
			// Check if the menu is currently shown
			if (exportContent.classList.contains('show') && 
				!exportContent.contains(e.target) && 
				!menuToggle2.contains(e.target)) { 
				exportContent.classList.remove('show'); 
			} 
		});
//---------export .epub---------
	
document.getElementById('exportEpubButton').addEventListener('click', function () {
        exportToEpub();
	});


async function exportToEpub() {  
    const messageArea = document.getElementById('messageArea');   
    
    // Check if messageArea has content  
    if (!messageArea || !messageArea.innerHTML.trim()) {  
        console.error("Error: messageArea is empty or not found.");  
        return;  
    }  
    
    // Clone the message area to manipulate its content  
    const contentClone = messageArea.cloneNode(true);  
    
    // Remove all <img> elements with the class "avatar" 
    const avatarImages = contentClone.querySelectorAll('img.avatar');  
    avatarImages.forEach(img => img.remove());  
    
    // Remove elements with the class "no-image" 
    const noImageElements = contentClone.querySelectorAll('.no-image');  
    noImageElements.forEach(element => { 
        element.remove(); 
    });  
	
    // Remove all background colors and font colors from all elements
    const elementsWithStyles = contentClone.querySelectorAll('*');
    elementsWithStyles.forEach(element => {
        // Remove color-related styles to allow default EPUB/system styles
        element.style.backgroundColor = '';
        element.style.color = ''; // Clear font color so the system can apply its own
    });

    // Assign the color "#a1a1a1" only to <em> elements
    const italicElements = contentClone.querySelectorAll('em');
    italicElements.forEach(em => {
        em.style.color = '#a1a1a1';
    });
    
    // Add an extra line break between each character's message 
    const messageContainers = contentClone.querySelectorAll('.message');  // Assuming each message has the class 'message' 
    messageContainers.forEach((message, index) => { 
        if (index > 0) {  // Skip the first message 
            const br = document.createElement('br');
            const extraBr = document.createElement('br');  // Create an extra <br> element for spacing 
            message.before(br);  // Insert the first <br> before each message 
            message.before(extraBr); 
        } 
    }); 
    
    console.log("Generating EPUB with the following content:");  
    console.log(contentClone.innerHTML);   
     
    let zip = new JSZip();  
    
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });  
    
    // Get the bot and user names
	const botFullName = character.fullname;
    const userName = user.name;  
    const title = `A Chat with ${botFullName}`;  // Use botName for the title
    
    // Add META-INF/container.xml  
    const containerXml = `<?xml version="1.0" encoding="UTF-8" ?>  
    <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">  
        <rootfiles>  
            <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>  
        </rootfiles>  
    </container>`;  
    zip.folder("META-INF").file("container.xml", containerXml);  
    
    // Create content.opf for EPUB metadata  
    const contentOpf = `<?xml version="1.0" encoding="UTF-8" ?>  
    <package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">  
        <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">  
            <dc:identifier id="book-id">urn:uuid:B9B412F2-CAAD-4A44-B91F-A375068478A0</dc:identifier>  
            <dc:title>${title}</dc:title>   
            <dc:language>en</dc:language>  
            <dc:creator>${userName}</dc:creator>  
        </metadata>  
        <manifest>  
            <item id="content" href="content.xhtml" media-type="application/xhtml+xml" />  
            <item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml" />  
            <item id="css" href="style.css" media-type="text/css" /> <!-- Adding the CSS file -->  
        </manifest>  
        <spine toc="toc">  
            <itemref idref="content" />  
        </spine>  
    </package>`;  
    zip.folder("OEBPS").file("content.opf", contentOpf);  
    
    // Add table of contents (toc.ncx)  
    const tocNcx = `<?xml version="1.0" encoding="UTF-8" ?>  
    <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">  
        <head>  
            <meta name="dtb:uid" content="urn:uuid:B9B412F2-CAAD-4A44-B91F-A375068478A0"/>  
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
    
    // Combine existing CSS with custom CSS  
    const customCss = ` 


		body {
			background:"";
            margin: 0 auto;  
            padding: 10px;  
		}
		
		h3 {
			font-size: 18em;
		}
		
        .message-container {
            margin-bottom: ;
        }
        .message-content {
			font-size: 16em;
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
		
		.user-message em{
			color:#a1a1a1;
			font-style: italic;
		}
		
		.char-message em{
			color:#a1a1a1;
			font-style: italic;
		}

        p, h1, h2, h3, h4, h5, h6 {  
            margin: 0;  
            padding: 0;  
			font-family: 'Segoe UI', sans-serif;
        }
		
		br {
			line-height:1.5em;
		}

        * {  
            box-sizing: border-box;  
        }  
    
    `;  
    
	// Add custom CSS file
    zip.folder("OEBPS").file("style.css", customCss);
	
    // Add the HTML content from messageArea
    const contentXhtml = `<?xml version="1.0" encoding="UTF-8" ?>  
    <html xmlns="http://www.w3.org/1999/xhtml">  
    <head>  
        <meta charset="UTF-8" />  
        <title>${title}</title>  
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />  
        <link rel="stylesheet" type="text/css" href="style.css" />  
    </head>  
    <body>  
        ${contentClone.innerHTML}  
    </body>  
    </html>`;  
    
    // Log the XHTML content to check for any issues  
    console.log("XHTML Content:", contentXhtml);  
    
    zip.folder("OEBPS").file("content.xhtml", contentXhtml);  
    
    // Generate the EPUB as a blob and trigger the download  
    zip.generateAsync({ type: "blob" }).then(function (blob) {  
        const link = document.createElement('a');  
        link.href = URL.createObjectURL(blob);  
        
        const fileName = `${title}.epub`;  
        
        link.download = fileName;  
        link.click();  
    }).catch(function (err) {  
        console.error("Error generating EPUB:", err);  
    });  
}

//---------export .txt---------

function convertJsonToPlainText(json) {
    let text = '';

    // Recursively process the JSON object
    function processObject(obj) {
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                let value = obj[key];
                if (typeof value === 'object') {
                    processObject(value);
                } else {
                    // Only add line breaks where needed
                    if (typeof value === 'string') {
                        // Remove any HTML tags and styling (including line breaks within HTML)
                        value = value.replace(/<\/?[^>]+(>|$)/g, "").replace(/\n+/g, "\n");
                    }
                    text += `${key}: ${value}\n`;
                }
            }
        }
    }

    processObject(json);
    return text;
}

let jsonData = null;

// Function to handle file input and load the JSON data
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.name.endsWith(".json")) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {

                jsonData = JSON.parse(e.target.result);

                alert("JSON file loaded successfully!");
            } catch (error) {
                alert("Error parsing the JSON file. Please make sure it is a valid JSON file.");
            }
        };
        reader.readAsText(file);
    } else {
        alert("Please select a valid JSON file.");
    }
}

// event listener to Export button
document.getElementById('exportTxtButton').addEventListener('click', exportToTxt);
console.log("Export to TXT triggered");


function exportToTxt() { 
    // Format each message before joining them
    const formattedMessages = messages.map(msg => {
        // Remove asterisks around italicized words and add line breaks
		const processedMessage = msg.message.replace(/\{\{[uU]ser\}\}/g, user.name);
        const formattedMessage = processedMessage.replace(/\*(.*?)\*/g, '$1'); // Remove asterisks for italics
        return `${msg.is_bot ? character.name : user.name}:\n${formattedMessage}`; // Add line break after the name
    }).join("\n\n"); // Add an extra line break between messages

    const blob = new Blob([formattedMessages], { type: 'text/plain' });

    const link = document.createElement('a'); 

    const fileName = `A Chat with ${character.fullname}.txt`;

    link.href = URL.createObjectURL(blob); 
    link.download = fileName;

    // Append the link and trigger a click to download the file 
    document.body.appendChild(link); 
    link.click(); 

    document.body.removeChild(link); 
}

// Export button
document.getElementById('exportMarkdownButton').addEventListener('click', exportToMarkdown);


function exportToMarkdown() {
    // Format each message with Markdown syntax
    const formattedMessages = messages.map(msg => {
        let formattedMessage = msg.message;
		
		// Replace {{user}} with the actual user name
        formattedMessage = formattedMessage.replace(/\{\{[uU]ser\}\}/g, user.name);

        // Apply Markdown formatting rules
        formattedMessage = formattedMessage
            .replace(/\*\*\*(.*?)\*\*\*/g, '***$1***') // Bold + Italic
            .replace(/\*\*(.*?)\*\*/g, '**$1**')       // Bold
            .replace(/\*(.*?)\*/g, '*$1*')             // Italic
            .replace(/`(.*?)`/g, '`$1`')               // Inline code
            .replace(/_(.*?)_/g, '_$1_')               // Underscore for italics
            .replace(/!\[(.*?)\]\((.*?)\)/g, '![$1]($2)') // Images
            .replace(/\[(.*?)\]\((.*?)\)/g, '[$1]($2)');  // Links

        const speakerName = msg.is_bot ? character.name : user.name;
        return `#### ${speakerName}\n${formattedMessage}\n`;
    }).join("\n");

    const blob = new Blob([formattedMessages], { type: 'text/markdown' });

    const fileName = `A Chat with ${character.fullname}.md`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
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
    .replace(/\s+/g, ' ')
    .replace(/,(?=[^,]*$)/, '')
    .replace(/(\d+)(?=\s*\d{4})/, '$1,')
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

// SillyTavern conversion function
function convertToSillyTavernFormat() {
    if (!messages || messages.length === 0) {
        alert('Please load a chat archive first.');
        return;
    }

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
            name: character.name,
            is_user: false,
            is_system: false,
            send_date: formatDate(firstCharacterMessage.created_at || new Date()),
            mes: firstCharacterMessage.message.replace(/\{\{[uU]ser\}\}/g, user.name), // Replace {{user}}
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
                name: msg.is_bot ? character.name : user.name,
                is_user: !msg.is_bot,
                is_system: false,
                send_date: formatDate(msg.created_at || new Date()),
                mes: msg.message.replace(/\{\{[uU]ser\}\}/g, user.name), // Replace {{user}}
                extra: {}
            };
            combinedData.push(currentMessage);
        }
    }

    // Handle swipe messages after last user message
    if (lastUserIndex !== -1 && lastUserIndex < messages.length - 1) {
        const buffer = messages.slice(lastUserIndex + 1).filter(msg => msg.is_bot);
        if (buffer.length > 0) {
            const swipeMessage = createCombinedMessage(buffer, character.name);
			swipeMessage.mes = swipeMessage.mes.replace(/\{\{[uU]ser\}\}/g, user.name); // Replace {{user}}
            combinedData.push(swipeMessage);
        }
    }

    // Create and trigger download of the JSONL file
    const jsonlContent = combinedData.map(msg => JSON.stringify(msg)).join('\n');
    const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `A Chat with ${character.fullname}.jsonl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

document.getElementById('exportSillyTavernButton').addEventListener('click', convertToSillyTavernFormat);