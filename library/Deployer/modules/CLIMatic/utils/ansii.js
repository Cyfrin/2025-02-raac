const onlyFirst = false;
const ST = '(?:\\u0007|\\u001B\\u005C|\\u009C)';
const pattern = [
    `[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?${ST})`,
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))',
].join('|');
const ansiRegex = new RegExp(pattern, onlyFirst ? undefined : 'g');

const emojiRegex = /(?:[\u2700-\u27BF]|(?:\uD83C[\uDC00-\uDFFF]){2}|[\uD800-\uDCFF][\uD800-\uDCFF])[\uFE0F]*/g;

const stripAnsi = (text) => {
    return text.replace(ansiRegex, '');
}

const stripEmoji = (text) => {
    return text.replace(emojiRegex, '');
}

const calculateHiddenTextLength = (text) => {
    let length = 0;

    const matches = text.match(ansiRegex);
    const emojiMatches = text.match(emojiRegex);
    if(matches) {
        for(let i = 0; i < matches.length; i++) {
            length += matches[i].length;
        }
    }
    if(emojiMatches) {
        for(let i = 0; i < emojiMatches.length; i++) {
            length -= emojiMatches[i].length;
        }
    }
    return length; 
}

export { stripAnsi, stripEmoji, calculateHiddenTextLength };