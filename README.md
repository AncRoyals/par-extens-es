# Organizador de Grupos - Divulgação

Extensão para Chrome e Brave que te ajuda a organizar a divulgação manual em grupos do Facebook: guarda a lista de links, evita que você poste duas vezes no mesmo grupo por engano, e controla o ritmo com um cooldown entre grupos.

**Importante:** esta extensão NÃO posta nada automaticamente por você. Ela só organiza a fila, abre os links e controla o tempo. Compartilhar a publicação e clicar em "Postar" dentro do grupo continua sendo feito manualmente por você, do mesmo jeito que você já faz hoje.

## Como instalar (Chrome ou Brave)

1. Baixe/extraia esta pasta (`extensao-grupos`) em algum lugar do seu computador.
2. Abra o navegador e vá em:
   - **Chrome:** `chrome://extensions`
   - **Brave:** `brave://extensions`
3. Ative o **"Modo do desenvolvedor"** (canto superior direito).
4. Clique em **"Carregar sem compactação"** (ou "Load unpacked").
5. Selecione a pasta `extensao-grupos`.
6. Pronto! O ícone da extensão vai aparecer na barra do navegador. Fixe ele clicando no ícone de pin (📌) no menu de extensões pra facilitar o acesso.

## Como usar

### 1. Cadastrar seus grupos
- Clique no ícone da extensão → aba **Lista**
- Cole seus links, um por linha. Você pode nomear cada grupo assim:
  ```
  Grupo Pokémon Divulgação SP | https://www.facebook.com/groups/123456
  https://www.facebook.com/groups/789012
  ```
  (se não colocar nome, ela numera automaticamente)
- Clique em **"Adicionar à lista"**
- Links duplicados são detectados e ignorados automaticamente

### 2. Configurar o ritmo (aba Config)
- **Cooldown entre grupos:** quantos minutos esperar antes de liberar o botão de avançar pro próximo grupo
- **Janela de alerta de duplicidade:** se um grupo já recebeu post há menos desse tanto de horas, a extensão avisa antes de você postar de novo ali

### 3. Divulgar (aba Postar)
- Cole o **link da publicação/reels** que você quer divulgar no campo do topo e clique em **"Copiar"**
- A extensão mostra o grupo atual da fila
- Clique em **"Abrir grupo no Facebook"** → abre o grupo numa nova aba
- Dentro do Facebook: abra o campo "Escreva algo...", cole o link com **Ctrl+V**, aguarde o preview carregar, e clique em **Postar** (tudo manual, como você já faz)
- Volte na janela da extensão e clique em **"Marcar como postado e avançar"**
- Se o cooldown estiver ativo, o botão fica bloqueado até o tempo passar
- Se preferir não postar num grupo específico, use **"Pular este grupo"**

### Sobre a janela da extensão
Ao clicar no ícone, a extensão abre em uma **janela separada e fixa** (não é o balão padrão). Isso é proposital: assim ela não fecha quando você troca de aba para ir ao grupo do Facebook. Você pode deixá-la aberta ao lado da janela do navegador o tempo todo enquanto divulga.

### 4. Backup
Na aba Lista você pode **exportar** sua lista e histórico num arquivo `.json`, e **importar** de volta depois (útil se trocar de computador ou reinstalar).

## Onde ficam os dados
Tudo é salvo localmente no seu navegador (`chrome.storage.local`). Nada é enviado para nenhum servidor externo.

## Aviso
Use com bom senso quanto ao volume e frequência de divulgação em grupos de terceiros — cada grupo tem suas próprias regras, e o Facebook pode agir sobre contas com atividade que ele julgue excessiva, independente da ferramenta usada.
