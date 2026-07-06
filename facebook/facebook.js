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

        // Dispara eventos de ponteiro primeiro (comuns em React moderno)
        const pointerEvents = ["pointerdown", "pointerup"];
        for (const name of pointerEvents)
        {
            element.dispatchEvent(new PointerEvent(name, {
                bubbles: true,
                cancelable: true,
                view: window,
                isPrimary: true,
                pointerId: 1,
                buttons: 1
            }));
            await new Promise(r => setTimeout(r, 50));
        }

        const mouseEvents = ["mousedown", "mouseup", "click"];

        for (const name of mouseEvents)
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

        // Delay antes do fallback final
        await new Promise(r => setTimeout(r, 100));
        element.click();
    },

    isModalOpen()
    {
        // O Facebook abre um diálogo (role="dialog") para criação de posts
        const dialogs = document.querySelectorAll("div[role='dialog']");

        for (const dialog of dialogs)
        {
            const text = dialog.innerText || "";
            // Verifica se o modal parece ser o de criação de post
            if (text.includes("Criar publicação") ||
                text.includes("Create post") ||
                text.includes("No que você está pensando") ||
                text.includes("What's on your mind") ||
                text.includes("Postar") ||
                text.includes("Post"))
            {
                return true;
            }
        }
        return false;
    },

    async openEditor()
    {
        console.log("🚀 openEditor() foi chamado!");

        AppState.setStep("OPENING_EDITOR");

        for (let attempt = 1; attempt <= 2; attempt++)
        {
            console.log(`Tentativa ${attempt} de abrir o editor...`);
            const button = this.findEditorButton();

            if (!button)
            {
                console.log("❌ Botão não encontrado nesta tentativa.");
                if (attempt === 2)
                {
                    AppState.setStep("BUTTON_NOT_FOUND");
                    return false;
                }
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            button.scrollIntoView({ behavior: "smooth", block: "center" });
            await new Promise(r => setTimeout(r, 500));

            await this.simulateClick(button);

            // Espera um pouco para o modal carregar
            await new Promise(r => setTimeout(r, 2000));

            if (this.isModalOpen())
            {
                console.log("✅ Modal de postagem detectado!");
                AppState.facebook.editorOpen = true;
                AppState.setStep("EDITOR_OPEN");
                return true;
            }

            console.log("⚠️ Modal não abriu na tentativa", attempt);
            if (attempt === 1)
            {
                console.log("Retentando em 1.5s...");
                await new Promise(r => setTimeout(r, 1500));
            }
        }

        console.log("❌ Falha em todas as tentativas de abrir o modal.");
        AppState.setStep("MODAL_NOT_OPENED");
        return false;
    }

};