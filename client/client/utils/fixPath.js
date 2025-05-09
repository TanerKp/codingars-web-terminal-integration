export function fixPath (p) {
    return p && !p.endsWith('/') ? p + '/' : p;
}