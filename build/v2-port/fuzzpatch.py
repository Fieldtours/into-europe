# Carry changes from one Easy Company version (A) to the next (B) over to Into Europe (T):
# every change is applied only where its surrounding code (context) is found exactly once in T.
import difflib, re, sys, json
def toks(s):
    # split into small pieces, keeping separators, so context matching is precise
    return re.findall(r'[^;{}\n>]*[;{}\n>]|[^;{}\n>]+$', s)
def patch(A, B, T, ctx=6, label=''):
    a, b, t = toks(A), toks(B), toks(T)
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    tstr = ''.join(t)
    ok, fail = [], []
    edits = []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == 'equal': continue
        old = ''.join(a[i1:i2]); new = ''.join(b[j1:j2])
        pre = ''.join(a[max(0, i1-ctx):i1]); post = ''.join(a[i2:i2+ctx])
        # try widening/narrowing context until unique
        found = None
        for c1, c2 in [(ctx, ctx), (ctx*2, ctx*2), (ctx, 0), (0, ctx), (3, 3), (ctx*4, ctx*4)]:
            pre = ''.join(a[max(0, i1-c1):i1]); post = ''.join(a[i2:i2+c2])
            key = pre + old + post
            if not key.strip(): continue
            n = tstr.count(key)
            if n == 1:
                found = (key, pre + new + post); break
        if found: edits.append(found); ok.append((old[:80], new[:80]))
        else: fail.append({'old': old, 'new': new, 'pre': ''.join(a[max(0,i1-ctx):i1])[-200:], 'post': ''.join(a[i2:i2+ctx])[:200]})
    out = tstr
    applied = 0
    for key, rep in edits:
        if out.count(key) == 1:
            out = out.replace(key, rep); applied += 1
        else:
            fail.append({'old': key, 'new': rep, 'pre': '(context changed by an earlier edit)', 'post': ''})
    return out, applied, fail
if __name__ == '__main__':
    A, B, T, O, F = sys.argv[1:6]
    out, n, fail = patch(open(A).read(), open(B).read(), open(T).read())
    open(O, 'w').write(out); json.dump(fail, open(F, 'w'), indent=1, ensure_ascii=False)
    print('applied', n, 'failed', len(fail))
