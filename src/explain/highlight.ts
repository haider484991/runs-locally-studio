/** A tiny syntax colourer: enough for the short Python / shell lines a lesson shows. It colours, it never changes the text. */
export type Span = { text: string; color: string };
const KW = new Set(['from', 'import', 'as', 'def', 'return', 'if', 'elif', 'else', 'for', 'in', 'while', 'with', 'class', 'try', 'except', 'finally', 'lambda', 'and', 'or', 'not', 'is', 'pass', 'raise', 'yield', 'await', 'async', 'const', 'let', 'var', 'function']);
const CONST = new Set(['True', 'False', 'None', 'null', 'true', 'false']);
export const COL = { kw: '#FF7AB6', str: '#A3E635', num: '#FBBF24', com: '#7C8599', call: '#7DD3FC', cst: '#FBBF24', def: '#F5F7FF', punct: '#B7BED1' };

export const highlight = (line: string, lang: string): Span[] => {
  if (lang === 'text') return [{ text: line, color: COL.def }];
  const out: Span[] = [];
  let i = 0;
  const push = (text: string, color: string) => { if (text) out.push({ text, color }); };
  while (i < line.length) {
    const ch = line[i];
    if ((lang === 'python' || lang === 'bash') && ch === '#') { push(line.slice(i), COL.com); break; }
    if (lang === 'js' && line.startsWith('//', i)) { push(line.slice(i), COL.com); break; }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < line.length && line[j] !== ch) j += line[j] === '\\' ? 2 : 1;
      push(line.slice(i, j + 1), COL.str); i = j + 1; continue;
    }
    if (/[0-9]/.test(ch)) { let j = i; while (j < line.length && /[0-9._]/.test(line[j])) j++; push(line.slice(i, j), COL.num); i = j; continue; }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i; while (j < line.length && /[A-Za-z0-9_]/.test(line[j])) j++;
      const w = line.slice(i, j);
      const next = line.slice(j).match(/^\s*\(/);
      push(w, KW.has(w) ? COL.kw : CONST.has(w) ? COL.cst : next ? COL.call : COL.def); i = j; continue;
    }
    if (/[()[\]{}.,:=+\-*/<>!%]/.test(ch)) { push(ch, COL.punct); i++; continue; }
    push(ch, COL.def); i++;
  }
  return out;
};
