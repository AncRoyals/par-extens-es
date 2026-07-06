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

    findEditorInput()
    {
        // No modal do FB, o campo de texto geralmente é um div com role="textbox" ou contenteditable
        const input = document.querySelector("div[role='dialog'] div[role='textbox'], div[role='dialog'] [contenteditable='true']");
        return input;
    },

    async insertText(text)
    {
        console.log("⌨️ Tentando inserir texto...");
        const input = this.findEditorInput();

        if (!input)
        {
            console.log("❌ Campo de texto não encontrado.");
            AppState.setStep("INPUT_NOT_FOUND");
            return false;
        }

        input.focus();
        await new Promise(r => setTimeout(r, 200));

        // Usa execCommand para simular o "colar" do usuário, o que o React do FB aceita melhor
        document.execCommand("insertText", false, text);

        AppState.facebook.textInserted = true;
        AppState.setStep("TEXT_INSERTED");
        return true;
    },

    async waitForPreview()
    {
        console.log("⏳ Aguardando preview do link...");
        AppState.setStep("WAITING_PREVIEW");

        // O preview geralmente aparece como um card com um botão de fechar (X)
        // ou uma imagem/link dentro do modal
        for (let i = 0; i < 20; i++)
        {
            const dialog = document.querySelector("div[role='dialog']");
            if (!dialog) break;

            // Procura por indicadores de que o preview carregou
            // (geralmente aparecem botões de remover preview ou cards de link)
            const hasPreview = dialog.querySelector("[aria-label='Remover'], [aria-label='Remove'], img[src*='external']");

            if (hasPreview)
            {
                console.log("✅ Preview detectado!");
                AppState.facebook.previewLoaded = true;
                AppState.setStep("PREVIEW_LOADED");
                return true;
            }

            await new Promise(r => setTimeout(r, 500));
        }

        console.log("⚠️ Preview não detectado automaticamente.");
        AppState.setStep("PREVIEW_TIMEOUT");
        return false;
    },

    async openEditor()
    {
        console.log("🚀 openEditor() foi chamado!");

        AppState.setStep("OPENING_EDITOR");

        const buttons = this.findEditorButtons();

        // Prioriza botões visíveis
        const visibleButtons = buttons.filter(b => {
            const rect = b.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        });

        const targets = visibleButtons.length > 0 ? visibleButtons : buttons;

        console.log(`Encontrados ${targets.length} candidatos.`);

        if (targets.length === 0)
        {
            AppState.setStep("BUTTON_NOT_FOUND");
            return false;
        }

        for (const button of targets)
        {
            console.log("Tentando clicar no botão:", button.innerText?.substring(0, 30));

            button.scrollIntoView({ behavior: "smooth", block: "center" });
            await new Promise(r => setTimeout(r, 500));

            await this.simulateClick(button);

            // Espera o modal carregar
            for (let i = 0; i < 6; i++)
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