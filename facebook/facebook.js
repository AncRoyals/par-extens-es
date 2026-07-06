window.Facebook = {

    log(message)
    {
        console.log("[Facebook]", message);
    },

    findButtonByTexts(texts)
    {
        console.log("🔍 Procurando botão...");

        const elements = document.querySelectorAll("div, span, a, button");

        console.log("Total de elementos:", elements.length);
        for (const element of elements)
        {
            const text = element.innerText?.trim();

            if (!text)
                continue;

            for (const expected of texts)
            {
                if (text.includes(expected))
                {
                    console.log({
                        tag: element.tagName,
                        text: element.innerText,
                        role: element.getAttribute("role"),
                        aria: element.getAttribute("aria-label"),
                        classes: element.className
                    });
                    console.log({
                        parentTag: element.parentElement?.tagName,
                        parentRole: element.parentElement?.getAttribute("role"),
                        parentAria: element.parentElement?.getAttribute("aria-label"),
                        parentClasses: element.parentElement?.className
                    });

                    return element;
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

    openEditor()
    {
        console.log("🚀 openEditor() foi chamado!");

        AppState.setStep("OPENING_EDITOR");

        const button = this.findEditorButton();

        if (!button)
        {
            AppState.setStep("BUTTON_NOT_FOUND");
            return false;
        }
        console.log("Botão encontrado:", button);
        button.click();

        AppState.facebook.editorOpen = true;

        AppState.setStep("EDITOR_OPEN");

        return true;
    }

};