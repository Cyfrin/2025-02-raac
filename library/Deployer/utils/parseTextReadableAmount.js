// Should parse text like "100_000_000" to "100000000" to number
export default function parseTextReadableAmount(amount) {
    return Number(amount.toString().replace(/_/g, ''));
}