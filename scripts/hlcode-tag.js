const hljs = require("highlight.js");
const { uniqueId } = require("lodash");
const { tagName, addButton, parseArgs } = require("./hlcode-tag/utils");

hexo.extend.tag.register(
    tagName,
    (_args, content) => {
        const args = parseArgs(_args);
        if (!args.lang) {
            throw new Error("lang must be specified in hlcode tag");
        }
        const html = hljs.highlight(args.lang, content).value;
        const lines = html.split("\n").map((line) => ({ line: `${line}\n` }));

        for (const highlight of args.highlight ?? []) {
            for (const range of highlight?.ranges ?? []) {
                for (let i = range.from; i <= range.to; i++) {
                    lines[i - 1].highlight = highlight;
                }
            }
        }

        for (const fold of args.fold ?? []) {
            for (const range of fold?.ranges ?? []) {
                for (let i = range.from; i <= range.to; i++) {
                    lines[i - 1].fold = fold;
                }
            }
        }

        let str = '<pre><code class="hljs"><table class="hlcode-table">';
        let cols = 1;
        if (args.lineNums === 'true') {
            cols += 1;
        }
        lines.forEach(({ line, fold, highlight }, idx) => {
            const startRange = fold?.ranges?.find((r) => r.from - 1 === idx);
            const foldAttr = fold ? `data-fold-id="${fold.id}"` : "";
            if (startRange) {
                str += `<tr style="border:none" class="hlcode-fold-collapsed" ${foldAttr}>`;
                str += `<td style="border:none" colspan="${cols}">`;
                str += `<div class="hlcode-fold-handle" ${foldAttr}>${addButton}`;
                str += `<span class="hlcode-fold-text">${startRange.to - startRange.from} lines collapsed`;
                if (fold.caption) {
                    str += ` (${fold.caption})`;
                }
                str += "</span></div></td></tr>";
            }
            let trStyle = "border:none;";
            if (highlight) trStyle += `background:${highlight.color};`;
            str += `<tr style="${trStyle}" class="hlcode-line ${
                fold ? "hlcode-line-fold hidden" : ""
            } ${highlight ? "hlcode-line-highlight" : ""}" ${foldAttr}>`;
            if (args.lineNums === 'true') {
                str += `<td style="border:none" class="hlcode-lineno-cell">${idx + 1}</td>`;
            }
            str += `<td style="border:none" class="hlcode-code-cell">${line}</td>`;
            str += `</tr>`;
        });
        str += "</table></code></pre>";
        return str;
    },
    { ends: true }
);
