window.Facebook = {

    log(message)
    {
        console.log("[Facebook]", message);
    },

    findButtonByTexts(texts)
    {
        console.log("🔍 Procurando botão por textos prioritários...");

        const elements = Array.from(document.querySelectorAll("button, [role='button'], div, span, a"));

        for (const expected of texts)
        {
            console.log(`Tentando texto: "${expected}"`);

            for (const element of elements)
            {
                // Ignora abas (evita clicar no botão "Discussão" do cabeçalho)
                if (element.getAttribute("role") === "tab") continue;

                const text = element.innerText?.trim();
                const aria = element.getAttribute("aria-label")?.trim();

                if ((text && text === expected) || (text && text.includes(expected)) || (aria && aria.includes(expected)))
                {
                    // Tenta subir até encontrar o container clicável real (role="button")
                    let clickable = element;
                    while (clickable && clickable.getAttribute("role") !== "button" && clickable.tagName !== "BUTTON")
                    {
                        clickable = clickable.parentElement;
                        if (clickable && (clickable.tagName === "BODY" || clickable.tagName === "HTML"))
                        {
                            clickable = null;
                            break;
                        }
                    }

                    const target = clickable || element;

                    // Se for uma aba, ignora e continua procurando
                    if (target.getAttribute("role") === "tab") continue;

                    console.log("✅ Botão encontrado:", {
                        tag: target.tagName,
                        text: target.innerText?.substring(0, 30),
                        role: target.getAttribute("role")
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

        element.focus();

        const events = ["mousedown", "mouseup", "click"];

        for (const name of events)
        {
            const event = new MouseEvent(name, {
                bubbles: true,
                cancelable: true,
                view: window,
                buttons: 1
            });
            element.dispatchEvent(event);
            await new Promise(r => setTimeout(r, 100));
        }

        // Fallback para o clique nativo
        element.click();
    },

    isModalOpen()
    {
        // O Facebook abre um diálogo (role="dialog") para criação de posts
        const dialog = document.querySelector("div[role='dialog']");
        return !!dialog;
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

        // Espera um pouco para o modal carregar
        await new Promise(r => setTimeout(r, 1500));

        if (this.isModalOpen())
        {
            console.log("✅ Modal de postagem detectado!");
            AppState.facebook.editorOpen = true;
            AppState.setStep("EDITOR_OPEN");
            return true;
        }
        else
        {
            console.log("❌ Modal não abriu após o clique.");
            AppState.setStep("MODAL_NOT_OPENED");
            return false;
        }
    }

};