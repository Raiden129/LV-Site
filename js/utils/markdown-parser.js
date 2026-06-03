export const MarkdownParser = {
  




  parse(text) {
    if (!text) return "";
    let processed = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    processed = processed.replace(/\\([^\w\s])/g, "$1");
    processed = this.escapeHtml(processed);
    processed = processed.replace(
      /&lt;center&gt;([\s\S]*?)&lt;\/center&gt;/gi,
      '<div style="text-align: center;">$1</div>',
    );
    const key = Date.now().toString(36);
    processed = processed.replace(/^### (.*$)/gm, "<h3>$1</h3>");
    processed = processed.replace(/^## (.*$)/gm, "<h2>$1</h2>");
    processed = processed.replace(/^# (.*$)/gm, "<h1>$1</h1>");
    processed = processed.replace(
      /^(\*{3,}|-{3,})$/gm,
      '<hr class="scene-break">',
    );
    processed = processed.replace(/^> (.*$)/gm, "<blockquote>$1</blockquote>");
    processed = processed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    processed = processed.replace(/\*(.*?)\*/g, "<em>$1</em>");
    const blocks = processed.split(/\n\n+/);

    const htmlBlocks = blocks.map((block) => {
      block = block.trim();
      if (!block) return "";
      if (block.match(/^<(h[1-6]|hr|blockquote|div)/)) {
        return block;
      }
      return `<p>${block.replace(/\n/g, "<br>")}</p>`;
    });

    return htmlBlocks.join("\n");
  },

  escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },
};
