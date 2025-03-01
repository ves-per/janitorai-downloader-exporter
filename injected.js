// XHR Request interception
(function (xhr) {

    var XHR = XMLHttpRequest.prototype;

    var open = XHR.open;
    var send = XHR.send;

    XHR.open = function (method, url) {
        this._method = method;
        this._url = url;
        return open.apply(this, arguments);
    };

    XHR.send = function (postData) {
        console.log('injected script xhr request:', this._method, this._url, this.getAllResponseHeaders(), postData);
        this.addEventListener('load', function () {
            try {
                var urlPattern = /^[0-9]+$/;
                var urlSegments = this._url.split('/');
                var fileName = urlSegments[urlSegments.length - 1];

                // Check file name matches
                if (urlPattern.test(fileName)) {
                    console.log('Target XHR file matched:', this._url);
                    var responseData = this.responseText; // Get the full response content

                    // Send response data to content script
                    if (responseData) {
                        window.postMessage({ type: 'xhr', data: responseData }, '*');
                    }
                }

            } catch (err) {
                console.error('Error processing XHR response:', err);
            }
        });
        return send.apply(this, arguments);
    };
})(XMLHttpRequest);

// Fetch interception
const { fetch: origFetch } = window;
window.fetch = async (...args) => {
    const response = await origFetch(...args);
    console.log('injected script fetch request:', args);

    // Clone response to handle it without affecting the original response
    try {
        const responseText = await response.clone().text(); // Get raw response
        console.log('Response text:', responseText);

        if (responseText.trim()) {
            try {
                const data = JSON.parse(responseText);
                window.postMessage({ type: 'fetch', data: data }, '*'); // Send data to content script
            } catch (err) {
                console.log('Response is not valid JSON, skipping...', err);
            }
        }
    } catch (err) {
        console.log('Error reading response body, skipping...', err);
    }
    return response;
};

