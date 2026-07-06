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

            const success = Facebook.openEditor();

            sendResponse({
                success
            });

            break;
    }

    return true;
});