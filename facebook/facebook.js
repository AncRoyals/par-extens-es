window.Facebook = {

    log(message)
    {
        console.log("[Facebook]", message);
    },

    findButtonsByTexts(texts)
    {
        console.log("🔍 Procurando botões por textos prioritários...");

        const elements = Array.from(document.querySelectorAll("button, [role='button'], div, span, a"));
        const candidates = [];
        const seen = new Set();

        for (const expected of texts)
        {
            for (const element of elements)
            {
                // Ignora abas e o que já vimos
                if (element.getAttribute("role") === "tab") continue;
                if (seen.has(element)) continue;

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

                    if (target.getAttribute("role") === "tab") continue;
                    if (seen.has(target)) continue;

                    console.log("✅ Candidato encontrado:", {
                        tag: target.tagName,
                        text: target.innerText?.substring(0, 30),
                        role: target.getAttribute("role")
                    });

                    candidates.push(target);
                    seen.add(target);
                    seen.add(element);
                }
            }
        }

        return candidates;
    },

    findCreatePostButton()
    {
        const candidates = this.findButtonsByTexts(Selectors.createPostTexts);
        return candidates[0] || null;
    },
    findEditorButtons()
    {
        return this.findButtonsByTexts(
            Selectors.createPostTexts
        );
    },

    async simulateClick(element)
    {
        console.log("🖱️ Simulando clique robusto...");

        element.focus();

        // Eventos de entrada
        const hoverEvents = ["mouseenter", "mouseover", "pointerenter", "pointerover"];
        for (const name of hoverEvents)
        {
            element.dispatchEvent(new Event(name, { bubbles: true }));
        }

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

        const buttons = this.findEditorButtons();
        console.log(`Encontrados ${buttons.length} candidatos.`);

        if (buttons.length === 0)
        {
            AppState.setStep("BUTTON_NOT_FOUND");
            return false;
        }

        for (const button of buttons)
        {
            console.log("Tentando clicar no botão:", button.innerText?.substring(0, 30));

            button.scrollIntoView({ behavior: "smooth", block: "center" });
            await new Promise(r => setTimeout(r, 500));

            await this.simulateClick(button);

            // Espera o modal carregar
            for (let i = 0; i < 5; i++)
            {
                await new Promise(r => setTimeout(r, 500));
                if (this.isModalOpen())
                {
                    console.log("✅ Modal de postagem detectado!");
                    AppState.facebook.editorOpen = true;
                    AppState.setStep("EDITOR_OPEN");
                    return true;
                }
            }

            console.log("⚠️ Modal não abriu com este botão, tentando próximo...");
        }

        console.log("❌ Falha em todos os candidatos.");
        AppState.setStep("MODAL_NOT_OPENED");
        return false;
    }

};