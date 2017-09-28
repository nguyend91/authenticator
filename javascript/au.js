var otp = new KeyUtilities();
var getCode = otp.generate;

chrome.extension.sendMessage({}, function(response) {
	var readyStateCheckInterval = setInterval(function() {
	if (document.readyState === "complete") {
		clearInterval(readyStateCheckInterval);
		if (pageNeedsCode()) {
            chrome.storage.sync.get(processResults);
		}
	}
	}, 10);
});

// Returns if we are on a page that needs the 2factor code
function pageNeedsCode() {
    var onTwoFactor = document.documentURI.indexOf("twofactor") > 0;
    var hasTokenInput = document.getElementById('token') != null;
    console.log("hasTokenInput " + hasTokenInput)
    return onTwoFactor && hasTokenInput;
}

// Note: copied directly from javascript/popup.js
function changeDataSub2Md5(result) {
    var modified = false;
    for (i in result) {
        if (i == result[i].secret) {
            modified = true;
            result[CryptoJS.MD5(i)] = result[i];
            delete result[i];
            chrome.storage.sync.remove(i);
        }
    }
    if (modified) {
        chrome.storage.sync.set(result);
    }
    return result;
}

function processResults(result) {
    if (result && result.secret) {
        result = changeDataForm(result);
    }
    if (!result && !_secret) {
        return false;
    } else {
        result = changeDataSub2Md5(result);
        if (result) {
            _secret = [];
            for (var i in result) {
                if (result[i].encrypted) {
                    if (decodedPhrase) {
                        try {
                            result[i].secret = CryptoJS.AES.decrypt(result[i].secret, decodedPhrase).toString(CryptoJS.enc.Utf8);
                        } catch (e) {
                            result[i].secret = '';
                        }
                    } else {
                        result[i].secret = '';
                    }
                }
                result[i].hash = i;
                _secret.push(result[i]);
            }
            _secret.sort(function (a, b) {
                return a.index - b.index;
            });
        }
        
        if (_secret.length > 0) {
            // For now just take the first secret and fill it.  Could look for specific name in secret if desired.
            var code = getCode(_secret[0].secret);
            var tokenInput = document.getElementById('token');
            if (typeof(token) != 'undefined') {
                tokenInput.value = code;
                tokenInput.form.submit();
            }
        }   
    }
}