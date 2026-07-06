window.AppState = {

    facebook: {
        groupDetected: false,
        editorOpen: false,
        previewLoaded: false,
        textInserted: false,
        currentGroup: null
    },

    workflow: {
        currentStep: "IDLE"
    },

    setStep(step)
    {
        const previous = this.workflow.currentStep;

        this.workflow.currentStep = step;

        if (window.Overlay)
        {
            Overlay.render();
        }

        console.log(
            `%c[STATE] ${previous} → ${step}`,
            "color:#16a34a;font-weight:bold;"
        );
    }

};