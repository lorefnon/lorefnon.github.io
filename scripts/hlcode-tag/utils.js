const { uniqueId, merge, isString, includes } = require("lodash");

const tagName = "hlcode";

const multiTags = ["fold", "highlight"];

const highlightColorMap = {
    yellow: "#fffacd",
    green: '#dbffc3',
    red: '#ffe1e7',
    violet: '#ffd9ff'
}

function parseArgs(_args) {
    const args = {};
    for (const arg of _args) {
        const [k, v] = parseArg(arg);
        if (includes(multiTags, k)) {
            args[k] = args[k] || [];
            args[k].push(v);
        } else {
            merge(args, { [k]: v });
        }
    }
    if (args.highlight) {
        for (let i = 0; i < args.highlight.length; i++) {
            let highlight = args.highlight[i];
            if (isString(highlight)) {
                highlight = {
                    ranges: highlight,
                };
            }
            if (isString(highlight?.ranges)) {
                highlight.ranges = parseRanges(highlight.ranges);
            }
            highlight.color = highlight.color ? highlightColorMap[highlight.color] : highlightColorMap.yellow;
            args.highlight[i] = highlight;
        }
    }

    if (args.fold) {
        for (let i = 0; i < args.fold.length; i++) {
            let fold = args.fold[i];
            if (isString(fold)) {
                fold = {
                    ranges: fold,
                };
            }
            if (isString(fold?.ranges)) {
                fold.ranges = parseRanges(fold.ranges);
            }
            fold.id = uniqueId('hlcode-fold-');
            args.fold[i] = fold;
        }
    }

    return args;
}

function parseArg(arg) {
    const match = arg.match(/^([a-z0-9_-]+):(.*)$/i);
    if (!match) return null;
    return [match[1], parseArgValue(match[2])];
}

function parseArgValue(argVal) {
    const subArgMatch = argVal.match(/^\((.*)\)$/);
    if (!subArgMatch) return argVal;
    const parsed = {};
    for (const arg of subArgMatch[1].split(";")) {
        const [k, v] = parseArg(arg.trim());
        merge(parsed, { [k]: v });
    }
    return parsed;
}

function parseRanges(rangeStr) {
    return rangeStr
        .split(",")
        .map((t) => t.trim().split("-"))
        .map((t) => {
            if (t.length === 1) {
                return {
                    from: Number(t[0]),
                    to: Number(t[0]),
                };
            } else if (t.length === 2) {
                return {
                    from: Number(t[0]),
                    to: Number(t[1]),
                };
            } else {
                throw new Error(
                    `Malformed highlight argument in ${tagName} tag`
                );
            }
        });
}

// From SystemUICons
const addButton = `
    <svg height="21" viewBox="0 0 21 21" width="21" xmlns="http://www.w3.org/2000/svg">
        <g fill="none" fill-rule="evenodd" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" transform="translate(4 4)">
            <path d="m10.5.5h-8c-1.1045695 0-2 .8954305-2 2v8c0 1.1045695.8954305 2 2 2h8c1.1045695 0 2-.8954305 2-2v-8c0-1.1045695-.8954305-2-2-2z" transform="matrix(0 1 -1 0 13 0)"/>
            <path d="m6.5 3.5v6.056"/>
            <path d="m6.5 3.5v6" transform="matrix(0 1 -1 0 13 0)"/>
        </g>
    </svg>`.trim();

module.exports = {
    tagName,
    addButton,
    parseArgs,
};
