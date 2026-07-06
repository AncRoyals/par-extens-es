window.Facebook = {

    log(message)
    {
        console.log("[Facebook]", message);
    },

    findButtonByTexts(texts)
    {
        console.log("🔍 Procurando botão por textos:", texts);

        const elements = document.querySelectorAll("div, span, a, button");

        for (const element of elements)
        {
            const text = element.innerText?.trim();
            if (!text) continue;

            for (const expected of texts)
            {
                if (text.includes(expected))
                {
                    // Tenta subir até encontrar o container clicável real (role="button")
                    let clickable = element;
                    while (clickable && clickable.getAttribute("role") !== "button" && clickable.tagName !== "BUTTON")
                    {
                        clickable = clickable.parentElement;
                        // Não subir demais
                        if (clickable && (clickable.tagName === "BODY" || clickable.tagName === "HTML"))
                        {
                            clickable = null;
                            break;
                        }
                    }

                    const target = clickable || element;

                    console.log("✅ Botão encontrado:", {
                        tag: target.tagName,
                        text: target.innerText?.substring(0, 30),
                        role: target.getAttribute("role"),
                        classes: target.className
                    });

                    return target;
                }
            }
        }

        console.log("❌ Nenhum botão encontrado.");
        return null;
    },

    findCreatePostButton()
    {
        return this.findButtonByTexts(
            Selectors.createPostTexts
        );
    },
    findEditorButton()
    {
        return this.findButtonByTexts(
            Selectors.createPostTexts
        );
    },

    async simulateClick(element)
    {
        console.log("🖱️ Simulando clique robusto...");

        const events = ["mousedown", "mouseup", "click"];

        for (const name of events)
        {
            const event = new MouseEvent(name, {
                bubbles: true,
                cancelable: true,
                view: window
            });
            element.dispatchEvent(event);
            await new Promise(r => setTimeout(r, 50));
        }
    },

    async openEditor()
    {
        console.log("🚀 openEditor() foi chamado!");

        AppState.setStep("OPENING_EDITOR");

        const button = this.findEditorButton();

        if (!button)
        {
            AppState.setStep("BUTTON_NOT_FOUND");
            return false;
        }

        button.scrollIntoView({ behavior: "smooth", block: "center" });
        await new Promise(r => setTimeout(r, 500));

        await this.simulateClick(button);

        AppState.facebook.editorOpen = true;
        AppState.setStep("EDITOR_OPEN");

        return true;
    }

};