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
        console.log("🖱️ Simulando clique...");

        element.focus();

        // Eventos de hover básicos
        element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
        element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, buttons: 1 }));

        await new Promise(r => setTimeout(r, 100));

        element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, buttons: 1 }));
        element.click();
    },

    isModalOpen()
    {
        // O Facebook abre um diálogo (role="dialog") para criação de posts
        const dialogs = document.querySelectorAll("div[role='dialog']");

        for (const dialog of dialogs)
        {
            const text = (dialog.innerText || "").toLowerCase();
            const html = dialog.innerHTML.toLowerCase();

            // Verifica se o modal parece ser o de criação de post
            // O texto "Adicionar ao post" é um indicador muito forte do editor
            const matchesKeywords =
                text.includes("adicionar ao post") ||
                text.includes("add to your post") ||
                text.includes("crie um post público") ||
                text.includes("crie um post") ||
                text.includes("criar publicação") ||
                text.includes("criar post") ||
                text.includes("create post") ||
                text.includes("no que você está pensando") ||
                text.includes("what's on your mind");

            if (matchesKeywords)
            {
                // Verifica se o modal é visível
                const rect = dialog.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    return true;
                }
            }
        }
        return false;
    },

    findEditorInput()
    {
        // No modal do FB, o campo de texto geralmente é um div com role="textbox" ou contenteditable
        // Tenta pegar o textbox do último modal aberto (caso haja sobreposição)
        const dialogs = Array.from(document.querySelectorAll("div[role='dialog']")).reverse();

        for (const dialog of dialogs) {
            // Prioriza o que está visível e tem o placeholder clássico
            const inputs = Array.from(dialog.querySelectorAll("div[role='textbox'], [contenteditable='true']"));

            for (const input of inputs) {
                const rect = input.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    return input;
                }
            }
        }

        // Fallback: qualquer um que pareça um editor dentro de um modal
        return document.querySelector("div[role='dialog'] div[role='textbox'], div[role='dialog'] [contenteditable='true']");
    },

    async insertText(text)
    {
        console.log("⌨️ Tentando inserir texto...");

        // Tenta encontrar o input por alguns segundos, caso o modal tenha acabado de abrir
        for (let i = 0; i < 20; i++) {
            const input = this.findEditorInput();

            if (input) {
                console.log("✅ Editor encontrado. Inserindo...");

                // Foca via clique para garantir que o Facebook ative o editor Lexical
                input.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
                input.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
                input.focus();

                await new Promise(r => setTimeout(r, 500));

                // Posiciona o cursor no início/fim para garantir que o execCommand funcione
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(input);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);

                await new Promise(r => setTimeout(r, 500));

                // Tenta execCommand primeiro (mais confiável para o React do FB)
                // Usamos "paste" como fallback se insertText falhar
                let success = document.execCommand("insertText", false, text);

                if (!success) {
                    console.log("⚠️ execCommand(insertText) falhou, tentando fallback de eventos...");
                    input.innerText = text;
                    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
                }

                // Dispara eventos finais para o React notar a mudança e esconder placeholders
                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.dispatchEvent(new Event("change", { bubbles: true }));

                await new Promise(r => setTimeout(r, 300));
                input.dispatchEvent(new Event("blur", { bubbles: true }));

                AppState.facebook.textInserted = true;
                AppState.setStep("TEXT_INSERTED");
                return true;
            }

            await new Promise(r => setTimeout(r, 500));
        }

        console.log("❌ Campo de texto não encontrado.");
        AppState.setStep("INPUT_NOT_FOUND");
        return false;
    },

    async clearText()
    {
        console.log("🧹 Limpando texto do editor...");
        const input = this.findEditorInput();

        if (!input) return false;

        input.focus();

        // Seleção agressiva
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(input);
        selection.removeAllRanges();
        selection.addRange(range);

        await new Promise(r => setTimeout(r, 100));

        document.execCommand("delete", false, null);

        // Fallback se execCommand falhar em limpar tudo
        if (input.innerText.trim().length > 0) {
            input.innerText = "";
        }

        // Notifica o React
        input.dispatchEvent(new InputEvent("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));

        return true;
    },

    async waitForModal(timeoutSeconds = 60)
    {
        console.log(`⏳ Aguardando abertura do modal (timeout ${timeoutSeconds}s)...`);
        AppState.setStep("WAITING_MODAL");

        const start = Date.now();
        while (Date.now() - start < timeoutSeconds * 1000)
        {
            if (this.isModalOpen())
            {
                console.log("✅ Modal detectado!");
                AppState.facebook.editorOpen = true;
                AppState.setStep("EDITOR_OPEN");
                return true;
            }
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log("❌ Timeout aguardando modal.");
        return false;
    },

    async waitForPostSuccess(timeoutSeconds = 30)
    {
        console.log("⏳ Monitorando sucesso da postagem...");
        AppState.setStep("MONITORING_POST");

        const start = Date.now();
        while (Date.now() - start < timeoutSeconds * 1000)
        {
            const text = document.body.innerText.toLowerCase();

            // Mensagens de sucesso comuns no Facebook
            if (text.includes("agradecemos seu post") ||
                text.includes("agradecemos sua publicação") ||
                text.includes("obrigado por compartilhar") ||
                text.includes("post enviado") ||
                text.includes("publicação enviada") ||
                text.includes("enviamos sua publicação") ||
                text.includes("enviamos seu post"))
            {
                console.log("✅ Post detectado com sucesso via mensagem!");
                return true;
            }

            // Se o modal fechar, pode ser um sinal de sucesso em alguns contextos
            if (!this.isModalOpen())
            {
                // Espera um pouco pra ver se a mensagem de sucesso aparece
                await new Promise(r => setTimeout(r, 1500));

                const postSuccessText = document.body.innerText.toLowerCase();
                if (postSuccessText.includes("agradecemos") || postSuccessText.includes("postado") || postSuccessText.includes("publicado"))
                {
                    return true;
                }

                // Se o modal fechou e não há erro visível, consideramos sucesso parcial/provável
                console.log("✅ Modal fechado, assumindo sucesso.");
                return true;
            }

            await new Promise(r => setTimeout(r, 1000));
        }

        console.log("⚠️ Timeout aguardando confirmação de postagem.");
        return false;
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

        if (this.isModalOpen()) {
            console.log("✅ Modal já está aberto, ignorando clique.");
            AppState.facebook.editorOpen = true;
            AppState.setStep("EDITOR_OPEN");
            return true;
        }

        if (this._isClicking) {
            console.log("⏳ Já existe um clique em andamento...");
            return false;
        }

        this._isClicking = true;

        try {
            AppState.setStep("OPENING_EDITOR");

            let buttons = this.findEditorButtons();

            // Tenta usar o seletor "aprendido" para priorizar
            const learnedText = await Storage.get("learned_button_text");
            if (learnedText) {
                console.log("🧠 Usando texto aprendido:", learnedText);
                const priorityMatch = buttons.find(b => b.innerText?.trim() === learnedText);
                if (priorityMatch) {
                    buttons = [priorityMatch, ...buttons.filter(b => b !== priorityMatch)];
                }
            }

            // Prioriza botões visíveis e que NÃO são abas
            const visibleButtons = buttons.filter(b => {
                const rect = b.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 && b.getAttribute("role") !== "tab";
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
                // Se o modal abriu enquanto estávamos trocando de botão, para imediatamente
                if (this.isModalOpen()) break;

                const buttonText = button.innerText?.trim();
                console.log("Tentando clicar no botão:", buttonText?.substring(0, 30));

                button.scrollIntoView({ behavior: "smooth", block: "center" });
                await new Promise(r => setTimeout(r, 1000));

                await this.simulateClick(button);

                // Espera o modal carregar
                for (let i = 0; i < 15; i++)
                {
                    await new Promise(r => setTimeout(r, 400));
                    if (this.isModalOpen())
                    {
                        console.log("✅ Modal de postagem detectado!");

                        // "Aprende" qual texto funcionou
                        if (buttonText) {
                            await Storage.set("learned_button_text", buttonText);
                        }

                        AppState.facebook.editorOpen = true;
                        AppState.setStep("EDITOR_OPEN");

                        // Pequena pausa para garantir que o Facebook processe o modal
                        await new Promise(r => setTimeout(r, 800));
                        return true;
                    }
                }

                console.log("⚠️ Modal não abriu com este botão, tentando próximo...");

                // Se falhou um botão, dá um tempo maior antes de tentar o próximo para evitar confusão no FB
                await new Promise(r => setTimeout(r, 2000));
            }

            console.log("❌ Falha em todos os candidatos.");
            AppState.setStep("MODAL_NOT_OPENED");
            return false;
        } finally {
            this._isClicking = false;
        }
    }

};