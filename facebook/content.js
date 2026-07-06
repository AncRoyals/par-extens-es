console.log("🚀 Ancient Social Manager iniciado!");

function initialize()
{
    Overlay.create();

    console.log("Página atual:", window.location.href);

    if (window.location.pathname.startsWith("/groups/"))
    {
        AppState.facebook.groupDetected = true;
        AppState.facebook.currentGroup = window.location.href;

        AppState.setStep("GROUP_DETECTED");

        console.log("✅ Grupo detectado!");

        const button = Facebook.findCreatePostButton();

        if (button)
        {
            AppState.setStep("BUTTON_FOUND");

            console.log("🎉 Botão encontrado!");
        }
        else
        {
            AppState.setStep("BUTTON_NOT_FOUND");

            console.log("❌ Botão não encontrado.");
        }
    }
    else
    {
        AppState.setStep("NOT_A_GROUP");
    }
}

initialize();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    switch (message.action)
    {
        case "PING":
            sendResponse({ success: true });
            break;

        case "OPEN_EDITOR":
            Facebook.openEditor().then(success => {
                sendResponse({ success });
            });
            return true;

        case "INSERT_TEXT":
            Facebook.insertText(message.text).then(success => {
                sendResponse({ success });
            });
            return true;

        case "WAIT_FOR_PREVIEW":
            Facebook.waitForPreview().then(success => {
                sendResponse({ success });
            });
            return true;

        case "CLEAR_TEXT":
            Facebook.clearText().then(success => {
                sendResponse({ success });
            });
            return true;

        case "WAIT_FOR_MODAL":
            Facebook.waitForModal(message.timeout).then(success => {
                sendResponse({ success });
            });
            return true;

        case "WAIT_FOR_POST_SUCCESS":
            Facebook.waitForPostSuccess(message.timeout).then(success => {
                sendResponse({ success });
            });
            return true;
    }

    return true;
});