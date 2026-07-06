window.Overlay = {

    panel: null,

    create()
    {
        if (this.panel)
            return;

        this.panel = document.createElement("div");

        this.panel.id = "ancient-social-overlay";

        this.panel.style.position = "fixed";
        this.panel.style.top = "20px";
        this.panel.style.right = "20px";

        this.panel.style.width = "260px";

        this.panel.style.background = "#1f2937";
        this.panel.style.color = "white";

        this.panel.style.padding = "14px";

        this.panel.style.borderRadius = "12px";

        this.panel.style.zIndex = "999999999";

        this.panel.style.fontFamily = "Arial";

        this.panel.style.fontSize = "13px";

        this.panel.style.boxShadow = "0 5px 18px rgba(0,0,0,.35)";

        document.body.appendChild(this.panel);

        this.render();
    },

    render()
    {
        if (!this.panel)
            return;

        this.panel.innerHTML = `
            <b>🤖 Ancient Social Manager</b>
            <hr>

            <div>Grupo:
            ${AppState.facebook.groupDetected ? "🟢" : "⚪"}</div>

            <div>Editor:
            ${AppState.facebook.editorOpen ? "🟢" : "⚪"}</div>

            <div>Preview:
            ${AppState.facebook.previewLoaded ? "🟢" : "⚪"}</div>

            <div>Texto:
            ${AppState.facebook.textInserted ? "🟢" : "⚪"}</div>

            <hr>

            <b>${AppState.workflow.currentStep}</b>
        `;
    }

};