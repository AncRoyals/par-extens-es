window.Utils = {

    sleep(ms)
    {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    async waitForFacebookTab(groupUrl)
    {
        while (true)
        {
            const tabs = await chrome.tabs.query({});

            const tab = tabs.find(
                t => t.url && t.url.startsWith(groupUrl)
            );

            if (tab)
            {
                // espera a página respirar
                await this.sleep(1500);

                return tab;
            }

            await this.sleep(200);
        }
    },
    async waitForContent(tab)
    {
        while (true)
        {
            try
            {
                const response = await chrome.tabs.sendMessage(tab.id, {
                    action: "PING"
                });

                if (response?.success)
                {
                    console.log("✅ Content conectado.");
                    return;
                }
            }
            catch(e)
            {
                // ainda não carregou
            }

            await this.sleep(300);
        }
    },
    async sendCommand(tab, action, data = {})
    {
        return chrome.tabs.sendMessage(tab.id, {
            action,
            ...data
        });
    }

};