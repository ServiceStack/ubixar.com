export function formatDate(value, time = false) {
    // The API stores UTC dates; timestamps without an offset are still UTC.
    const utc =
        typeof value === 'string' &&
        /^\d{4}-\d\d-\d\dT/.test(value) &&
        !/(Z|[+-]\d\d:\d\d)$/i.test(value)
            ? value + 'Z'
            : value
    const date = new Date(utc)
    return value && !Number.isNaN(date.getTime())
        ? new Intl.DateTimeFormat(undefined, {
              dateStyle: 'medium',
              ...(time ? { timeStyle: 'short' } : {}),
          }).format(date)
        : 'Unknown date'
}
export function count(value, noun) {
    const length =
        typeof value === 'number' ? value : Object.keys(value || {}).length
    return `${length} ${noun}${length === 1 ? '' : 's'}`
}
