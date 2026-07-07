window.Facebook = {

    _isClicking: false,

    log(message)
    {
        console.log("[Facebook]", message);
    },

    /**
     * Busca botões de forma eficiente, evitando travar a UI do Facebook.
     */
    findButtonsByTexts(texts)
    {
        console.log("🔍 Procurando botões...");

        // Prioriza elementos com roles de botão para ser mais rápido
        const elements = document.querySelectorAll("button, [role='button'], a[href='#'], div[tabindex='0']");
        const candidates = [];
        const seen = new Set();
        const lowerTexts = texts.map(t => t.toLowerCase());

        for (let i = 0; i < elements.length; i++) {
            const el = elements[i];

            // textContent é muito mais rápido que innerText
            const text = (el.textContent || "").toLowerCase();
            const aria = (el.getAttribute("aria-label") || "").toLowerCase();

            const match = lowerTexts.some(t => text.includes(t) || aria.includes(t));

            if (match) {
                // Verifica se é realmente visível antes de considerar
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    candidates.push(el);
                    seen.add(el);
                }
            }
        }

        // Fallback: se não achar nada com os seletores otimizados, tenta o método completo porém lento
        if (candidates.length === 0) {
            const all = document.querySelectorAll("div, span, a");
            for (let i = 0; i < all.length; i++) {
                const el = all[i];
                if (seen.has(el)) continue;

                const text = (el.textContent || "").toLowerCase();
                if (lowerTexts.some(t => text === t)) {
                    // Sobe até o pai clicável
                    let clickable = el;
                    while (clickable && clickable.getAttribute("role") !== "button" && clickable.tagName !== "BUTTON") {
                        clickable = clickable.parentElement;
                        if (clickable && (clickable.tagName === "BODY" || clickable.tagName === "HTML")) {
                            clickable = null;
                            break;
                        }
                    }
                    if (clickable && !seen.has(clickable)) {
                        candidates.push(clickable);
                        seen.add(clickable);
                    }
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
        return this.findButtonsByTexts(Selectors.createPostTexts);
    },

    async simulateClick(element)
    {
        console.log("🖱️ Simulando clique...");
        element.focus();
        element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
        element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, buttons: 1 }));
        await new Promise(r => setTimeout(r, 100));
        element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, buttons: 1 }));
        element.click();
    },

    isModalOpen()
    {
        const dialogs = document.querySelectorAll("div[role='dialog']");
        for (const dialog of dialogs)
        {
            const text = (dialog.textContent || "").toLowerCase();
            // "Adicionar ao post" é o indicador mais forte que o editor está aberto e pronto
            if (text.includes("adicionar ao post") || text.includes("add to your post") || text.includes("publicar") || text.includes("postar"))
            {
                const rect = dialog.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) return true;
            }
        }
        return false;
    },

    findEditorInput()
    {
        const dialogs = Array.from(document.querySelectorAll("div[role='dialog']")).reverse();
        for (const dialog of dialogs) {
            const inputs = Array.from(dialog.querySelectorAll("div[role='textbox'], [contenteditable='true']"));
            for (const input of inputs) {
                const rect = input.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) return input;
            }
        }
        return document.querySelector("div[role='dialog'] [contenteditable='true']");
    },

    async insertText(text)
    {
        console.log("⌨️ Inserindo texto...");
        for (let i = 0; i < 20; i++) {
            const input = this.findEditorInput();
            if (input) {
                input.focus();

                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(input);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);

                await new Promise(r => setTimeout(r, 500));
                document.execCommand("insertText", false, text);

                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.dispatchEvent(new Event("change", { bubbles: true }));

                AppState.facebook.textInserted = true;
                AppState.setStep("TEXT_INSERTED");
                return true;
            }
            await new Promise(r => setTimeout(r, 500));
        }
        return false;
    },

    async clearText()
    {
        console.log("🧹 Limpando texto...");
        const input = this.findEditorInput();
        if (!input) return false;

        input.focus();
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(input);
        selection.removeAllRanges();
        selection.addRange(range);

        await new Promise(r => setTimeout(r, 300));
        document.execCommand("delete", false, null);

        // Força limpeza se sobrar algo
        if (input.textContent.trim().length > 0) {
            input.textContent = "";
        }

        input.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
    },

    async waitForModal(timeoutSeconds = 60)
    {
        console.log("⏳ Aguardando modal...");
        const start = Date.now();
        while (Date.now() - start < timeoutSeconds * 1000)
        {
            if (this.isModalOpen()) return true;
            await new Promise(r => setTimeout(r, 1000));
        }
        return false;
    },

    async waitForPostSuccess(timeoutSeconds = 30)
    {
        console.log("⏳ Aguardando sucesso...");
        const start = Date.now();
        while (Date.now() - start < timeoutSeconds * 1000)
        {
            const text = document.body.innerText.toLowerCase();
            if (text.includes("postando") || text.includes("agradecemos seu post") || text.includes("agradecemos sua publicação"))
            {
                return true;
            }
            if (!this.isModalOpen())
            {
                await new Promise(r => setTimeout(r, 2000));
                return true;
            }
            await new Promise(r => setTimeout(r, 1000));
        }
        return false;
    },

    async waitForPreview()
    {
        console.log("⏳ Aguardando preview...");
        for (let i = 0; i < 30; i++)
        {
            const dialog = document.querySelector("div[role='dialog']");
            if (dialog && dialog.querySelector("[aria-label='Remover'], [aria-label='Remove'], img[src*='external']"))
            {
                return true;
            }
            await new Promise(r => setTimeout(r, 500));
        }
        return false;
    },

    async clickPostButton()
    {
        console.log("🖱️ Tentando clicar em 'Postar'...");

        // O botão de postar fica dentro do modal
        const dialog = document.querySelector("div[role='dialog']");
        if (!dialog) return false;

        const postButtons = Array.from(dialog.querySelectorAll("button, [role='button']")).filter(b => {
            const text = (b.textContent || "").toLowerCase();
            return text === "postar" || text === "publicar" || text === "post" || text === "publish";
        });

        if (postButtons.length > 0)
        {
            // Escolhe o último (geralmente o principal de ação no rodapé do modal)
            const btn = postButtons[postButtons.length - 1];
            await this.simulateClick(btn);
            return true;
        }

        return false;
    },

    async openEditor()
    {
        if (this.isModalOpen()) return true;
        if (this._isClicking) return false;
        this._isClicking = true;

        try {
            AppState.setStep("OPENING_EDITOR");
            let buttons = this.findEditorButtons();

            const learnedText = await Storage.get("learned_button_text");
            if (learnedText) {
                const best = buttons.find(b => b.textContent?.trim() === learnedText);
                if (best) buttons = [best, ...buttons.filter(b => b !== best)];
            }

            if (buttons.length === 0) return false;

            for (const button of buttons) {
                if (this.isModalOpen()) break;
                button.scrollIntoView({ behavior: "smooth", block: "center" });
                await new Promise(r => setTimeout(r, 1000));
                await this.simulateClick(button);

                for (let i = 0; i < 10; i++) {
                    await new Promise(r => setTimeout(r, 500));
                    if (this.isModalOpen()) {
                        await Storage.set("learned_button_text", button.textContent?.trim());
                        return true;
                    }
                }
            }
            return false;
        } finally {
            this._isClicking = false;
        }
    }
};