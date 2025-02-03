
export default function prepareBigIntForJSON(obj) {
    console.log({obj});
    return JSON.parse(JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint'
            ? value.toString()
            : value
    ));
} 