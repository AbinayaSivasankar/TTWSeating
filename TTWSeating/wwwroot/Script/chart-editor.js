/* Seating chart editor - loaded from Index.razor with:
 *   const m = await JS.InvokeAsync<IJSObjectReference>("import", "./js/chart-editor.js");
 *   await m.InvokeVoidAsync("init", new { title, chartJson, email, initial, demo });
 * Save/Copy/Cancel/Logout buttons belong to Blazor; it calls getData() / markSaved() / canLeave() / toast().
 */
let api = null;
export function init(opts) { if (api) api.dispose(); api = boot(opts || {}) }
export const getData = () => api.getData();
export const validate = () => !api || api.validate();
export const toast = m => api && api.toast(m);
export const markSaved = () => api && api.markSaved();
export const isDirty = () => !!api && api.isDirty();
export const canLeave = () => !api || api.canLeave();
export const setTitle = t => api && api.setTitle(t);
export function dispose() { if (api) { api.dispose(); api = null } }

function boot(opts) {
    const offs = []; let dirty = false;
    const listen = (t, f) => { addEventListener(t, f); offs.push(() => removeEventListener(t, f)) };
    listen('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); $('#save').click() } });
    const IC = {
        couch: '<path d="M4 11V8a3 3 0 013-3h10a3 3 0 013 3v3"/><path d="M2 13a2 2 0 014 0v2h12v-2a2 2 0 014 0v5H2z"/><path d="M5 18v2M19 18v2"/>',
        xmark: '<path d="M18 6L6 18M6 6l12 12"/>', copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/>', clone: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/>',
        'floppy-disk': '<path d="M5 3h11l4 4v12a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"/><path d="M7 3v5h8V3M7 21v-7h10v7"/>',
        'arrow-right-from-bracket': '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>',
        'arrow-pointer': '<path d="M5 3l14 7-6 2-2 6z"/>', hand: '<path d="M8 13V5.5a1.5 1.5 0 013 0V11M11 10V4a1.5 1.5 0 013 0v7M14 10V5.5a1.5 1.5 0 013 0V13M17 9.5a1.5 1.5 0 013 0V14a7 7 0 01-7 7h-1a7 7 0 01-5.5-2.7L4 14.5a1.5 1.5 0 012.3-1.9L8 14"/>',
        'grip-lines': '<path d="M4 9h16M4 15h16"/>', list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
        'layer-group': '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 12.5l9 5 9-5"/><path d="M3 17l9 5 9-5"/>',
        circle: '<circle cx="12" cy="12" r="8"/>', square: '<rect x="4" y="4" width="16" height="16" rx="2"/>', font: '<path d="M5 20l7-16 7 16M8 14h8"/>',
        'rotate-left': '<path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8"/><path d="M3 3v5h5"/>',
        'rotate-right': '<path d="M21 12a9 9 0 11-9-9 9 9 0 016.4 2.6L21 8"/><path d="M21 3v5h-5"/>',
        'border-all': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18M12 3v18"/>',
        magnet: '<path d="M5 15V4h4v11a3 3 0 006 0V4h4v11a7 7 0 01-14 0zM5 8h4M15 8h4"/>',
        image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
        download: '<path d="M12 4v11M7 11l5 5 5-5M4 20h16"/>', upload: '<path d="M12 16V5M7 9l5-5 5 5M4 20h16"/>',
        icons: '<circle cx="12" cy="5" r="2"/><path d="M9 9h6v6h-1.5v6h-3v-6H9z"/>', slash: '<path d="M4 20L20 4"/>', chair: '<path d="M7 4h10v7H7z"/><path d="M5 11h14v5H5zM8 16v4M16 16v4"/>', 'chevron-down': '<path d="M6 9l6 6 6-6"/>', pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
        'hand-pointer': '<path d="M9 11V5a2 2 0 014 0v6l5 1a2 2 0 011.6 2.3L18.5 19a3 3 0 01-3 2.5H11a3 3 0 01-2.3-1L4 15l1.3-1.3a1.5 1.5 0 012 0L9 15"/>',
        'trash-can': '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
        'object-group': '<rect x="3" y="3" width="13" height="13" rx="1.5"/><rect x="9" y="9" width="12" height="12" rx="1.5"/>',
        check: '<path d="M5 12.5l4.5 4.5L19 7"/>', crosshairs: '<circle cx="12" cy="12" r="7"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6"/>', 'draw-polygon': '<path d="M4 18L9 6l6 8 5-9"/><circle cx="4" cy="18" r="1.6"/><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="14" r="1.6"/><circle cx="20" cy="5" r="1.6"/>', bullseye: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>', 'triangle-exclamation': '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>', 'magnifying-glass': '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>', tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1"/>'
    };
    function icons() { document.querySelectorAll('i[class*="fa-"]').forEach(el => { if (el.dataset.i && el.querySelector(':scope > svg')) { if (!el.classList.contains('svgi')) el.classList.add('svgi'); return } const n = [...el.classList].map(c => c.replace('fa-', '')).find(c => IC[c]); if (n) { el.dataset.i = 1; el.classList.add('svgi'); el.innerHTML = '<svg viewBox="0 0 24 24">' + IC[n] + '</svg>' } }) }
    const mo = new MutationObserver(icons); mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); icons();
    const RT = ['row', 'multirow', 'segment'], $ = s => document.querySelector(s), NS = 'http://www.w3.org/2000/svg', SP = 26, R = 9, GR = 20;
    /* self-contained UI patches (no Razor change needed) */
    const patchCss = document.createElement('style'); patchCss.id = 'ce-patch';
    patchCss.textContent = 'i.svgi::before,i.svgi::after,i[data-i]::before,i[data-i]::after{content:none!important;display:none!important}i.svgi{font-family:inherit}.accg{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.accg button{height:44px;border:1px solid #e4e8f2;border-radius:10px;background:#fff;display:grid;place-items:center;color:#56617f;cursor:pointer}.accg button svg{width:22px;height:22px}.accg button:hover{background:#f7f8fc}.accg button.on{background:#4f46e5;border-color:#4f46e5;color:#fff}.ce-pi{width:16px;height:16px;vertical-align:-3px;margin-right:8px;color:#6b7694;flex:none}.ck.sub .ce-pi{opacity:.8}.zm button.on{color:#4f46e5;background:#eef0ff;border-radius:8px}#title.ce-err{border-color:#e5484d!important;box-shadow:0 0 0 3px #e5484d33;background:#fff}.ce-ov{position:fixed;inset:0;background:#1e254066;display:grid;place-items:center;z-index:3000}.ce-md{background:#fff;border-radius:14px;padding:20px;width:min(400px,90vw);box-shadow:0 20px 50px #1e254040;font:13.5px/1.4 "Segoe UI",Inter,system-ui,sans-serif;color:#1e2540}.ce-md h3{margin:0 0 6px;font-size:16px}.ce-md p{margin:0 0 12px;color:#6b7694}.ce-bt{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}.ce-md .bt{padding:8px 14px;border-radius:9px;font-weight:600;border:1px solid #e4e8f2;background:#fff;cursor:pointer}.ce-md .bt.pr{background:#4f46e5;border-color:#4f46e5;color:#fff}.ce-md .bt.dgr{background:#e5484d;border-color:#e5484d}.ce-md input{width:100%;padding:8px 10px;border:1px solid #e4e8f2;border-radius:8px;font:inherit}input[type=color]{-webkit-appearance:none;appearance:none;overflow:hidden;background:none}input[type=color]::-webkit-color-swatch-wrapper{padding:0}input[type=color]::-webkit-color-swatch{border:0;border-radius:50%}input[type=color]::-moz-color-swatch{border:0;border-radius:50%}#icColor::-webkit-color-swatch,#lnC::-webkit-color-swatch,#xC::-webkit-color-swatch{border-radius:6px}#icColor::-moz-color-swatch,#lnC::-moz-color-swatch,#xC::-moz-color-swatch{border-radius:6px}#icColor,#lnC,#xC{border-radius:8px}.ct input[type=color]{flex:none;border-radius:50%}.fc-btns{display:flex;gap:8px;margin:12px 0 4px}.fc-btns button{flex:1;height:34px;border:1px solid #e4e8f2;border-radius:10px;background:#fff;color:#1e2540;font-weight:600;font-size:12px;cursor:pointer}.fc-btns button:hover{background:#f7f8fc}#fcDel:hover{color:#e5484d;border-color:#e5484d}.fc-note{margin:6px 0 0;font-size:11.5px;line-height:1.45;color:#6b7694}#fBest{width:100%}';
    document.head.appendChild(patchCss);
    if (!$('#pMulti')) {
        const mp = document.createElement('div'); mp.id = 'pMulti'; mp.style.display = 'none';
        mp.innerHTML = '<div class="f" id="mCurveF"><label>Curve (all rows) <span id="mcv" style="float:right"></span></label><input type="range" id="mCurve" min="-150" max="150" step="5"></div><div class="f"><label>Rotation (whole selection) <span id="mrv" style="float:right"></span></label><input type="range" id="mRot" min="-180" max="180" step="5" value="0"></div>';
        const fr = $('#fRot'); fr.parentNode.insertBefore(mp, fr)
    }
    if (!$('#pFocal')) {
        const fp = document.createElement('div'); fp.id = 'pFocal'; fp.style.display = 'none';
        fp.innerHTML = '<div class="f"><label>Glow size <span id="fcv" style="float:right"></span></label><input type="range" id="fRad" min="40" max="600" step="10" value="120"></div>'
            + '<div class="f"><label>Preview best seats</label><input type="number" id="fBest" min="0" max="200" value="10"></div>'
            + '<div class="fc-btns"><button type="button" id="fcStage">Centre on stage</button><button type="button" id="fcDel">Remove</button></div>'
            + '<p class="fc-note">Best seats are the ones closest to this point, so place it on the stage. The closest seats are outlined in gold. Set the preview to 0 to hide them.</p>';
        const fr = $('#fRot'); fr.parentNode.insertBefore(fp, fr);
        $('#fRad').addEventListener('pointerdown', () => snap());
        $('#fRad').oninput = e => { const f = one(); if (f && f.type === 'focal') { f.r = +e.target.value; $('#fcv').textContent = f.r; render() } };
        $('#fBest').oninput = e => { bestN = Math.max(0, Math.min(200, +e.target.value || 0)); render() };
        $('#fcDel').onclick = () => del();
        $('#fcStage').onclick = () => { const f = one(); if (!f || f.type !== 'focal') return; const st = shapes.find(x => x.type === 'rect' && /stage|scene|screen|pitch|field|court|arena/i.test(x.label || '')) || shapes.find(x => x.type === 'rect'); if (!st) return toast('Draw a stage block first'); snap(); const c = ctr(st); f.x = c.x; f.y = c.y; all() };
    }
    if (!$('#xC') && $('#pText')) { const cf = document.createElement('div'); cf.className = 'f'; cf.innerHTML = '<label>Text colour</label><input type="color" id="xC" value="#1e2540" style="width:100%;height:34px;border-radius:8px;border:1px solid var(--line);padding:2px">'; $('#pText').appendChild(cf) }
    let cats = [], bestN = 10;
    let shapes = [], sel = new Set(), ss = new Set(), lastRow = 'row', tool = 'select', aCat = 2, uid = 1, view = { x: 90, y: 110, k: 1 }, U = [], Rd = [], snapOn = true, clip = [], bg = null;
    const H = { icon: 'Pick an icon on the right, then click the chart to place it', line: 'Drag to draw a line · choose solid, dashed, dotted or arrow in the menu on the left', seat: 'Click a seat to select it · Shift-click or drag a box for many · edit it on the right', select: 'Click to select · Shift-click or drag a box for many · drag to move', pan: 'Drag to pan the canvas', row: 'Drag to draw a row · click the end seat of a row to continue it', multirow: 'Drag a box to create several rows', general: 'Drag a box for a general admission area', table: 'Click to place a table · choose round or rectangle on the left', segment: 'Click to add points along the row · double-click or Enter to finish', focal: 'Click the stage to set the focal point · the best seats are the ones closest to it · drag it to move', rect: 'Drag a box for a stage / decorative block', text: 'Click to place a text label' };
    function modal(o) {
        return new Promise(res => {
            const ov = document.createElement('div'); ov.className = 'ce-ov';
            ov.innerHTML = '<div class="ce-md" role="dialog" aria-modal="true"><h3></h3><p></p>' + (o.input != null ? '<input class="ce-in">' : '') + '<div class="ce-bt"><button class="bt" data-r="0"></button><button class="bt pr' + (o.danger ? ' dgr' : '') + '" data-r="1"></button></div></div>';
            const q = x => ov.querySelector(x), inp = q('.ce-in'), b0 = q('[data-r="0"]'), b1 = q('[data-r="1"]');
            q('h3').textContent = o.title || ''; q('p').textContent = o.msg || ''; b0.textContent = o.cancel || 'Cancel'; b1.textContent = o.ok || 'OK'; if (inp) inp.value = o.input;
            const done = ok => { ov.remove(); res(o.input != null ? (ok ? inp.value : null) : ok) };
            b0.onclick = () => done(false); b1.onclick = () => done(true); ov.onmousedown = e => { if (e.target === ov) done(false) };
            ov.onkeydown = e => { e.stopPropagation(); if (e.key === 'Escape') done(false); else if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') { e.preventDefault(); done(true) } };
            document.body.appendChild(ov); (inp || b1).focus(); if (inp) inp.select()
        })
    }
    const ensureCat = () => { if (!cats.length) { const id = Date.now(); cats.push({ id, name: 'Category 1', color: '#4f46e5' }); aCat = id } else if (!cats.some(c => c.id === aCat)) aCat = cats[0].id };
    const cat = id => cats.find(c => c.id === id) || { color: '#888', name: '—' }, sn = v => snapOn ? Math.round(v / GR) * GR : v;
    const L = i => { let s = '', n = i; do { s = String.fromCharCode(65 + n % 26) + s; n = Math.floor(n / 26) - 1 } while (n >= 0); return s };
    /* unique labels across rows / tables / general areas (case-insensitive) */
    const lblKeys = () => { const o = new Set(); shapes.forEach(s => { if (!['row', 'table', 'general'].includes(s.type)) return; const l = (s.label || '').trim().toLowerCase(); if (l) o.add(l) }); return o };
    const freeRow = i0 => { const u = lblKeys(); let i = i0; while (u.has(L(i).toLowerCase())) i++; return L(i) };
    const uniqLbl = b => { b = String(b || '').trim() || 'Area'; const u = lblKeys(); let l = b, k = 2; while (u.has(l.toLowerCase())) l = b + ' ' + k++; return l };
    const seatNo = (st, k) => { st = String(st == null ? '1' : st).trim() || '1'; let m = /^(.*?)(\d+)$/.exec(st); if (m) return m[1] + String(+m[2] + k).padStart(m[2].length > 1 && m[2][0] === '0' ? m[2].length : 0, '0'); return nxt(st, k) };
    const nxt = (f, i) => /^\d+$/.test(f) ? String(+f + i) : f.slice(0, -1) + String.fromCharCode(f.toUpperCase().charCodeAt(f.length - 1) + i);
    const one = () => sel.size === 1 ? shapes.find(s => s.id === [...sel][0]) : null;

    const snap = () => { dirty = true; U.push(JSON.stringify({ shapes, cats })); if (U.length > 80) U.shift(); Rd = []; hs() };
    const hs = () => { $('#undo').disabled = !U.length; $('#redo').disabled = !Rd.length };
    const load = j => { dirty = true; const o = JSON.parse(j); shapes = o.shapes; cats = o.cats; sel.clear(); ss.clear(); all() };
    $('#undo').onclick = () => { if (U.length) { Rd.push(JSON.stringify({ shapes, cats })); load(U.pop()); hs() } };
    $('#redo').onclick = () => { if (Rd.length) { U.push(JSON.stringify({ shapes, cats })); load(Rd.pop()); hs() } };
    const all = () => { render(); rcats(); list(); props(); foot(); icons() };

    function seats(s) {
        if (s.pts) { const n = s.count, o = polySeats(s.pts, n).map((c, i) => ({ x: c.x, y: c.y, l: seatNo(s.start, s.dir === 'rtl' ? n - 1 - i : i) })); return { p: o, cx: 0, cy: 0 } }
        const dx = s.x2 - s.x1, dy = s.y2 - s.y1, len = Math.hypot(dx, dy) || 1, mx = (s.x1 + s.x2) / 2 + (-dy / len) * s.curve * 2, my = (s.y1 + s.y2) / 2 + (dx / len) * s.curve * 2, o = [];
        for (let i = 0; i < s.count; i++) {
            const t = s.count > 1 ? i / (s.count - 1) : 0, u = 1 - t, k = s.dir === 'rtl' ? s.count - 1 - i : i;
            o.push({ x: u * u * s.x1 + 2 * u * t * mx + t * t * s.x2, y: u * u * s.y1 + 2 * u * t * my + t * t * s.y2, l: seatNo(s.start, k) });
        }
        return { p: o, cx: mx, cy: my }
    }
    function bb(s) {
        if (s.type === 'line') return { x: Math.min(s.x1, s.x2) - 6, y: Math.min(s.y1, s.y2) - 6, w: Math.abs(s.x2 - s.x1) + 12, h: Math.abs(s.y2 - s.y1) + 12 }; if (s.type === 'icon') return { x: s.x - s.size / 2, y: s.y - s.size / 2, w: s.size, h: s.size }; if (s.type === 'row') { const a = seats(s).p, xs = a.map(p => p.x), ys = a.map(p => p.y); return { x: Math.min(...xs) - R - 24, y: Math.min(...ys) - R, w: Math.max(...xs) - Math.min(...xs) + 2 * R + 24, h: Math.max(...ys) - Math.min(...ys) + 2 * R } }
        if (s.type === 'table') { if (s.shape === 'rect') return { x: s.x - s.w / 2 - R - 8, y: s.y - s.h / 2 - R - 8, w: s.w + 2 * R + 16, h: s.h + 2 * R + 16 }; const r = s.r + R + 8; return { x: s.x - r, y: s.y - r, w: 2 * r, h: 2 * r } } if (s.type === 'focal') return { x: s.x - 20, y: s.y - 20, w: 40, h: 40 }; if (s.pts && s.type !== 'row') { const xs = s.pts.map(q => q.x), ys = s.pts.map(q => q.y); return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) } }
        if (s.type === 'text') return { x: s.x, y: s.y - s.size, w: s.text.length * s.size * .6, h: s.size * 1.3 }; return { x: s.x, y: s.y, w: s.w, h: s.h }
    }
    const ctr = s => { const b = bb(s); return { x: b.x + b.w / 2, y: b.y + b.h / 2 } };
    function mv(s, dx, dy) { if (s.type === 'row' || s.type === 'line') { s.x1 += dx; s.x2 += dx; s.y1 += dy; s.y2 += dy } else { s.x += dx; s.y += dy } if (s.pts) s.pts.forEach(q => { q.x += dx; q.y += dy }) }
    const pt = e => { const r = $('#st').getBoundingClientRect(); return { x: (e.clientX - r.left - view.x) / view.k, y: (e.clientY - r.top - view.y) / view.k } };
    let tblMode = 'round', areaMode = 'rect', lineMode = 'lsolid', poly = null, mOpen = false;
    const MS = { lsolid: ['Solid line', '<path d="M3 12h18"/>'], ldash: ['Dashed line', '<path d="M3 12h4M10 12h4M17 12h4"/>'], ldot: ['Dotted line', '<path d="M4 12h.01M8 12h.01M12 12h.01M16 12h.01M20 12h.01"/>'], larrow: ['Arrow', '<path d="M3 12h16M14 7l5 5-5 5"/>'], row: ['Single row', '<path d="M3 12h18"/><circle cx="6" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="18" cy="12" r="1.8"/>'], multirow: ['Multiple rows', '<path d="M3 6h18M3 12h18M3 18h18"/><circle cx="7" cy="6" r="1.5"/><circle cx="7" cy="12" r="1.5"/><circle cx="7" cy="18" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="15" cy="18" r="1.5"/>'], segment: ['By segments', '<path d="M4 18L9 6l6 8 5-9"/><circle cx="4" cy="18" r="1.6"/><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="14" r="1.6"/><circle cx="20" cy="5" r="1.6"/>'], round: ['Round', '<circle cx="12" cy="12" r="8"/>'], rect: ['Rectangle', '<rect x="3" y="6" width="18" height="12" rx="2"/>'], circle: ['Circle', '<circle cx="12" cy="12" r="8"/>'], poly: ['Polygon', '<path d="M4 18l3-12 9-2 4 9-6 7z"/>'] };
    function modes() {
        const el = $('#modes'), ls = tool === 'table' ? ['round', 'rect'] : tool === 'line' ? ['lsolid', 'ldash', 'ldot', 'larrow'] : RT.includes(tool) ? RT : (tool === 'rect' || tool === 'general') ? ['rect', 'circle', 'poly'] : null;
        if (!ls || !mOpen) { el.style.display = 'none'; return } el.style.display = 'flex'; const cur = tool === 'table' ? tblMode : tool === 'line' ? lineMode : RT.includes(tool) ? tool : areaMode;
        el.innerHTML = '<h6>' + (tool === 'table' ? 'Table shape' : RT.includes(tool) ? 'Row type' : tool === 'line' ? 'Line type' : 'Shape') + '</h6>' + ls.map(m => `<button class="md${m === cur ? ' on' : ''}" data-m="${m}"><svg viewBox="0 0 24 24">${MS[m][1]}</svg><span>${MS[m][0]}</span></button>`).join('')
    }
    $('#modes').onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; if (RT.includes(tool)) { setTool(b.dataset.m); return } if (tool === 'line') { lineMode = b.dataset.m; setTool('line'); return } if (tool === 'table') tblMode = b.dataset.m; else areaMode = b.dataset.m; setTool(tool) };
    $('#tShape').onchange = () => { const r = $('#tShape').value === 'rect'; $('#tR').parentElement.style.display = r ? 'none' : 'block'; $('#tWH').style.display = r ? 'grid' : 'none' };
    function polySeats(pts, n) {
        const sg = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); sg.push(l); tot += l }
        const cnt = n ?? Math.floor(tot / SP) + 1, out = []; let si = 0, acc = 0;
        for (let i = 0; i < cnt; i++) {
            const d = i * SP; while (si < sg.length - 1 && d > acc + sg[si]) { acc += sg[si]; si++ }
            const a = pts[si], b = pts[si + 1] || pts[si], l = sg[si] || 1, t = (d - acc) / l; out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
        } return out
    }
    function tseats(s) {
        const o = []; if (s.shape === 'rect') {
            const top = Math.ceil(s.count / 2), bot = s.count - top;
            [[top, -1], [bot, 1]].forEach(([m, sd]) => { for (let i = 0; i < m; i++)o.push({ x: s.x - s.w / 2 + (i + .5) * s.w / m, y: s.y + sd * (s.h / 2 + R + 4) }) })
        }
        else for (let i = 0; i < s.count; i++) { const a = i / s.count * Math.PI * 2; o.push({ x: s.x + Math.cos(a) * (s.r + R + 4), y: s.y + Math.sin(a) * (s.r + R + 4) }) } return o
    }
    function polyClick(p) {
        const q = { x: sn(p.x), y: sn(p.y) }; if (!poly) poly = { kind: tool === 'segment' ? 'seg' : 'area', pts: [] };
        if (poly.kind === 'area' && poly.pts.length >= 3 && Math.hypot(q.x - poly.pts[0].x, q.y - poly.pts[0].y) < 14 / view.k) { finishPoly(); return }
        const l = poly.pts[poly.pts.length - 1]; if (l && l.x === q.x && l.y === q.y) return; poly.pts.push(q); polyPrev(p)
    }
    function polyPrev(p) {
        if (!poly) return; const c = { x: sn(p.x), y: sn(p.y) }, q = poly.pts.concat([c]), pp = q.map(o => o.x + ',' + o.y).join(' '); pv && pv.remove();
        if (poly.kind === 'seg') {
            const it = polySeats(q).map((o, i) => ({ k: i, x: o.x, y: o.y, l: seatNo('1', i) })); pv = E('polyline', { points: pp, fill: 'none', stroke: '#4f46e5', 'stroke-width': 1.5, 'stroke-dasharray': '5 4', opacity: .6, 'pointer-events': 'none' });
            prev(it, 'Segment row · ' + it.length + ' seats · double-click to finish', c.x, c.y)
        }
        else {
            pv = E('polygon', { points: pp, fill: '#4f46e51a', stroke: '#4f46e5', 'stroke-width': 1.5, 'stroke-dasharray': '6 4', 'pointer-events': 'none' });
            prev([{ k: 's', x: poly.pts[0].x, y: poly.pts[0].y }], poly.pts.length + ' point' + (poly.pts.length > 1 ? 's' : '') + ' · double-click to finish', c.x, c.y)
        }
    }
    function cancelPoly() { if (poly) { poly = null; pv && pv.remove(); pv = null; clearPrev() } }
    function finishPoly() {
        const P = poly; if (!P) return; const pts = []; P.pts.forEach(q => { const l = pts[pts.length - 1]; if (!l || Math.hypot(q.x - l.x, q.y - l.y) > 4) pts.push({ x: q.x, y: q.y }) });
        if (P.kind === 'seg') {
            if (pts.length < 2) return toast('Add at least 2 points'); ensureCat();
            const n = polySeats(pts).length; if (n < 2) return toast('Path is too short'); cancelPoly(); snap(); const e = polySeats(pts, n), r = { id: uid++, type: 'row', pts, x1: e[0].x, y1: e[0].y, x2: e[n - 1].x, y2: e[n - 1].y, count: n, curve: 0, cat: aCat, label: freeRow(shapes.filter(q => q.type === 'row').length), start: '1', dir: 'ltr', rot: 0 }; shapes.push(r); sel = new Set([r.id]); fresh = new Set([r.id]); setTimeout(() => fresh.clear(), 900)
        }
        else { if (pts.length < 3) return toast('A polygon needs at least 3 points'); if (tool !== 'rect') ensureCat(); cancelPoly(); snap(); const xs = pts.map(q => q.x), ys = pts.map(q => q.y), x = Math.min(...xs), y = Math.min(...ys), a = { id: uid++, type: tool, shape: 'poly', pts, x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y, cat: aCat, label: tool === 'rect' ? 'Zone' : 'General admission', cap: 100, rot: 0 }; shapes.push(a); sel = new Set([a.id]) }
        setTool('select'); all()
    }
    $('#st').addEventListener('dblclick', e => { if (poly) { finishPoly(); return } if (tool === 'select') { const c = e.target.closest('[data-seat]'); if (c) { const key = c.parentNode.dataset.id + ':' + c.dataset.seat; setTool('seat'); ss = new Set([key]); all() } } });
    const applyView = () => { $('#w').setAttribute('transform', `translate(${view.x} ${view.y}) scale(${view.k})`); const c = $('#cv'); c.style.backgroundSize = GR * view.k + 'px ' + GR * view.k + 'px'; c.style.backgroundPosition = view.x + 'px ' + view.y + 'px'; $('#zl').textContent = Math.round(view.k * 100) + '%' };
    (function () {
        const j = $('#joy'), k = $('#knob'); let vx = 0, vy = 0, act = false, raf = 0;
        const loop = () => { if (!act) return; if (vx || vy) { view.x -= vx * 12; view.y -= vy * 12; applyView() } raf = requestAnimationFrame(loop) };
        function mk(e) { const r = j.getBoundingClientRect(), dx0 = e.clientX - (r.left + r.width / 2), dy0 = e.clientY - (r.top + r.height / 2), mx = (r.width || 86) / 2 - 19, m = Math.hypot(dx0, dy0) || 1, f = m > mx ? mx / m : 1, dx = dx0 * f, dy = dy0 * f; k.style.transform = `translate(${dx}px,${dy}px)`; vx = dx / mx; vy = dy / mx }
        j.addEventListener('pointerdown', e => { act = true; try { j.setPointerCapture(e.pointerId) } catch { } mk(e); cancelAnimationFrame(raf); loop() });
        j.addEventListener('pointermove', e => { if (act) mk(e) });
        const end = () => { act = false; vx = vy = 0; k.style.transform = ''; cancelAnimationFrame(raf) }; j.addEventListener('pointerup', end); j.addEventListener('pointercancel', end);
    })();
    function fit() {
        const ids = new Set(sel); ss.forEach(k => ids.add(+k.split(':')[0])); const ls = ids.size ? shapes.filter(s => ids.has(s.id)) : shapes; if (!ls.length) return; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        ls.forEach(s => { const b = bb(s); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h) });
        const r = $('#st').getBoundingClientRect(), w = Math.max(x1 - x0, 60), h = Math.max(y1 - y0, 60), k = Math.min(2, Math.max(.25, Math.min(r.width / (w + 120), r.height / (h + 160))));
        view.k = k; view.x = r.width / 2 - (x0 + w / 2) * k; view.y = r.height / 2 - (y0 + h / 2) * k + 10; render()
    }
    const cap = s => s.type === 'row' || s.type === 'table' ? s.count : s.type === 'general' ? s.cap : 0;
    function sumry() {
        const el = $('#sum'); if (sel.size) { el.style.display = 'none'; return } el.style.display = 'block';
        const tot = shapes.reduce((n, s) => n + cap(s), 0), ty = ['row', 'general', 'table'], unl = shapes.filter(s => ty.includes(s.type) && !String(s.label || '').trim()), unc = shapes.filter(s => ty.includes(s.type) && !cats.some(c => c.id === s.cat)), fo = shapes.find(s => s.type === 'focal'), pl = n => n + ' object' + (n > 1 ? 's' : '');
        const it = [{ ok: 1, big: 1, t: tot + ' places', ids: [] }, { ok: !unl.length, t: unl.length ? pl(unl.length) + ' unlabeled' : 'All objects labeled', ids: unl.map(s => s.id) }, { ok: !unc.length, t: unc.length ? pl(unc.length) + ' uncategorized' : 'All objects categorized', ids: unc.map(s => s.id) }, { ok: !!fo, t: fo ? 'Focal point is set' : 'No focal point yet', ids: fo ? [fo.id] : [] }];
        el.innerHTML = '<h5 style="margin:16px 0 4px">Chart summary</h5>' + it.map((o, i) => `<div class="sm ${o.ok ? 'ok' : 'bad'}"><i class="fa-${o.big ? 'tag' : o.ok ? 'check' : 'triangle-exclamation'}"></i><span>${o.t}</span>${o.ids.length ? '<i class="fa-magnifying-glass"></i>' : ''}</div>`).join('');
        el.querySelectorAll('.sm').forEach((r, i) => { if (it[i].ids.length) r.onclick = () => { sel = new Set(it[i].ids); all() } })
    }
    const icF = d => `<path fill="currentColor" d="${d}"/>`, icS = d => `<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="${d}"/>`, icC = (x, y, r) => `<circle fill="currentColor" cx="${x}" cy="${y}" r="${r}"/>`;
    const ICONS = {
        restroom: icC(6.5, 4, 2) + icF('M4 8h5v7H7.5v6h-2v-6H4z') + icC(17.5, 4, 2) + icF('M17.5 8l3.5 8h-2v5h-3v-5h-2z') + icS('M12 3v18'),
        man: icC(12, 4, 2.4) + icF('M8.5 8h7v7h-2v7h-3v-7h-2z'), woman: icC(12, 4, 2.4) + icF('M12 8l4.5 9H14v5h-4v-5H7.5z'),
        stage: icF('M8 4h8l3 11H5zM4 17h16v3H4z'), entrance: icS('M14 4h5v16h-5M4 12h10M10 8l4 4-4 4'), exit: icS('M10 4H5v16h5M10 12h10M16 8l4 4-4 4'),
        stairs: icS('M3 20h5v-5h5v-5h5V5h3'), dining: icS('M7 3v18M4 3v6a3 3 0 006 0V3M17 21V3c-2 1-3 4-3 8h3'), bar: icS('M4 4h16l-8 9zM12 13v7M8 20h8'),
        beer: icS('M6 6h9v14H6zM15 9h3a2 2 0 012 2v3a2 2 0 01-2 2h-3'), coffee: icS('M4 9h12v6a4 4 0 01-4 4H8a4 4 0 01-4-4zM16 11h2a2 2 0 010 4h-2M8 3v3M12 3v3'),
        warning: icS('M12 3l10 18H2zM12 10v5M12 18v.01'), wheelchair: icC(10, 4, 2) + icS('M10 8v6h5l2 5M7 11a5 5 0 105 8'), info: icS('M12 3a9 9 0 100 18 9 9 0 000-18zM12 11v6M12 7.5v.01'), lift: icS('M5 3h14v18H5zM9 10l3-3 3 3M9 14l3 3 3-3')
    };
    const SI = {
        none: icS('M12 3a9 9 0 100 18 9 9 0 000-18zM5.6 5.6l12.8 12.8'),
        wheelchair: ICONS.wheelchair,
        companion: icC(8, 5, 2.2) + icS('M4 20v-6a4 4 0 018 0v6') + icC(17, 8, 2) + icS('M14 20v-4a3 3 0 016 0v4'),
        accessible: icC(12, 4, 2.2) + icS('M12 8v7M7 11h10M12 15l-3 6M12 15l3 6'),
        hear: icS('M7 9a5 5 0 0110 0c0 3-3 4-3 7a2.5 2.5 0 01-5 0M9.5 9a2.5 2.5 0 015 0'),
        cart: icS('M4 6h16v12H4zM8 11h3M13 11h3M8 15h8'),
        sign: icS('M8 13V5.5a1.5 1.5 0 013 0V11M11 10V4a1.5 1.5 0 013 0v7M14 10V5.5a1.5 1.5 0 013 0V13M17 9.5a1.5 1.5 0 013 0V14a7 7 0 01-7 7h-1a7 7 0 01-5.5-2.7L4 14.5'),
        res: icS('M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM3 3l18 18') + icC(12, 12, 2.4),
        ver: icS('M3 21h5v-5h5v-5h5V6M20 9v6M17.5 12.5l2.5 2.5 2.5-2.5'),
        leg: icS('M7 3v10h8l2 8M4 21h16'),
        arm: icS('M5 20v-6h14v6M7 14V9M17 14V9M12 4v5M9 6.5l3-3 3 3')
    };
    const SN = { wheelchair: 'Wheelchair space', companion: 'Companion seat', accessible: 'Accessible seat', hear: 'Hearing impaired', cart: 'CART services', sign: 'Sign language interpretation', res: 'Restricted view', ver: 'Not suitable for vertigo sufferers', leg: 'Limited legroom', arm: 'Lift-up armrests' };
    const FLAGS = ['hear', 'res', 'ver', 'leg', 'arm'];
    const seatTip = sd => [sd.acc && SN[sd.acc]].concat(FLAGS.filter(k => sd[k]).map(k => SN[k]), sd.hear && sd.cart ? [SN.cart] : [], sd.hear && sd.sign ? [SN.sign] : []).flat().filter(Boolean).join('\n');
    const dIco = { ic: 'restroom', size: 44, color: '#1e2540' }, dLine = { w: 3, color: '#1e2540' };
    const icoT = () => { const s = one(); return s && s.type === 'icon' ? s : null }, linT = () => { const s = one(); return s && s.type === 'line' ? s : null };
    function fillIco(s) {
        const t = s || dIco; $('#icGrid').innerHTML = Object.keys(ICONS).map(k => `<button class="ig${k === t.ic ? ' on' : ''}" data-k="${k}" title="${k}"><svg viewBox="0 0 24 24">${ICONS[k]}</svg></button>`).join('');
        $('#icSize').value = t.size; $('#icColor').value = t.color; $('#icRot').value = s ? s.rot || 0 : 0; $('#icRot').parentElement.style.display = s ? 'block' : 'none'; $('#icRv').textContent = (s ? s.rot || 0 : 0) + '°'; $('#icDup').parentElement.style.display = s ? 'flex' : 'none'
    }
    $('#icGrid').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; const t = icoT(); if (t) { snap(); t.ic = b.dataset.k; all() } else { dIco.ic = b.dataset.k; fillIco(null) } };
    $('#icSize').onchange = () => { const v = Math.max(12, Math.min(400, +$('#icSize').value || 44)), t = icoT(); if (t) { snap(); t.size = v; all() } else dIco.size = v };
    $('#icColor').onchange = () => { const t = icoT(); if (t) { snap(); t.color = $('#icColor').value; all() } else dIco.color = $('#icColor').value };
    $('#icRot').addEventListener('pointerdown', () => snap());
    $('#icRot').oninput = e => { const t = icoT(); if (t) { t.rot = +e.target.value; $('#icRv').textContent = t.rot + '°'; render() } };
    $('#icDup').onclick = () => dupe(); $('#icDel').onclick = () => del(); $('#lnDup').onclick = () => dupe(); $('#lnDel').onclick = () => del();
    const lnDash = m => m === 'ldash' ? '8 6' : m === 'ldot' ? '2 6' : '';
    function fillLine(s) {
        if (s) { $('#lnW').value = s.w; $('#lnC').value = s.color; $('#lnT').value = s.dash === '8 6' ? 'ldash' : s.dash === '2 6' ? 'ldot' : 'lsolid'; $('#lnA').checked = !!s.arrow }
        else { $('#lnW').value = dLine.w; $('#lnC').value = dLine.color; $('#lnT').value = lineMode === 'larrow' ? 'lsolid' : lineMode; $('#lnA').checked = lineMode === 'larrow' }
        $('#lnDup').parentElement.style.display = s ? 'flex' : 'none'
    }
    $('#lnW').onchange = () => { const v = Math.max(1, Math.min(30, +$('#lnW').value || 3)), t = linT(); if (t) { snap(); t.w = v; all() } else dLine.w = v };
    $('#lnC').onchange = () => { const t = linT(); if (t) { snap(); t.color = $('#lnC').value; all() } else dLine.color = $('#lnC').value };
    $('#lnT').onchange = () => { const v = $('#lnT').value, t = linT(); if (t) { snap(); t.dash = lnDash(v); all() } else { lineMode = $('#lnA').checked ? 'larrow' : v; modes() } };
    $('#lnA').onchange = () => { const t = linT(); if (t) { snap(); t.arrow = $('#lnA').checked; all() } else { lineMode = $('#lnA').checked ? 'larrow' : $('#lnT').value; modes() } };
    const NONE0 = $('#none').innerHTML, NONE1 = '<i class="fa-regular fa-hand-pointer"></i>Click a seat to edit it.<br>Shift-click or drag a box to select many seats.';
    function seatPos(s) { const q = seats(s).p, c = ctr(s), a = (s.rot || 0) * Math.PI / 180; return q.map((o, i) => { const dx = o.x - c.x, dy = o.y - c.y; return { i, x: c.x + dx * Math.cos(a) - dy * Math.sin(a), y: c.y + dx * Math.sin(a) + dy * Math.cos(a) } }) }
    function allSeatPts() { const o = []; shapes.forEach(s => { if (s.type === 'row') seatPos(s).forEach(q => o.push({ x: q.x, y: q.y })); else if (s.type === 'table') { const c = ctr(s), a = (s.rot || 0) * Math.PI / 180; tseats(s).forEach(q => { const dx = q.x - c.x, dy = q.y - c.y; o.push({ x: c.x + dx * Math.cos(a) - dy * Math.sin(a), y: c.y + dx * Math.sin(a) + dy * Math.cos(a) }) }) } }); return o }
    function bestSeatList(f, n) { return allSeatPts().map(q => ({ x: q.x, y: q.y, d: Math.hypot(q.x - f.x, q.y - f.y) })).sort((a, b) => a.d - b.d).slice(0, n) }
    function selSeats() { const o = []; ss.forEach(k => { const [id, i] = k.split(':').map(Number), r = shapes.find(x => x.id === id); if (r) o.push({ r, i }) }); return o }
    const sdv = o => (o.r.sd && o.r.sd[o.i]) || {};
    function seatLabel(r, i) { const q = seats(r).p[i]; return (r.sd && r.sd[i] && r.sd[i].label) || (q ? String(q.l) : '') }
    function fillSeat() {
        const A = selSeats(), n = A.length; $('#ssN').textContent = n > 1 ? '· ' + n + ' selected' : '';
        const cm = (k, df) => { const v = A.map(o => sdv(o)[k] ?? df); return v.every(x => x === v[0]) ? v[0] : undefined };
        const cs = $('#ssCat'), vals = A.map(o => sdv(o).cat ?? o.r.cat), same = vals.every(v => v === vals[0]);
        cs.innerHTML = (same ? '' : '<option value="" selected>Mixed</option>') + cats.map(c => '<option value="' + c.id + '"></option>').join('');
        [...cs.options].filter(o => o.value !== '').forEach((o, i) => o.textContent = cats[i].name); if (same) cs.value = vals[0];
        $('#ssLbl').disabled = n > 1; $('#ssLbl').value = n === 1 ? seatLabel(A[0].r, A[0].i) : ''; $('#ssLbl').placeholder = n > 1 ? 'Multiple seats' : '';
        $('#ssAcc').value = cm('acc', '') ?? ''; { const av = cm('acc', ''); accG.querySelectorAll('button').forEach(b => b.classList.toggle('on', av !== undefined && b.dataset.v === (av || ''))) }
        [['#ssHear', 'hear'], ['#ssCart', 'cart'], ['#ssSign', 'sign'], ['#ssRes', 'res'], ['#ssVer', 'ver'], ['#ssLeg', 'leg'], ['#ssArm', 'arm']].forEach(([i, k]) => { const v = cm(k, false), e = $(i); e.indeterminate = v === undefined; e.checked = v === true });
        const h = A.some(o => sdv(o).hear); $('#ssCart').closest('.ck').classList.toggle('dis', !h); $('#ssSign').closest('.ck').classList.toggle('dis', !h)
    }
    function sdSet(p) { const A = selSeats(); if (!A.length) return; snap(); A.forEach(o => { o.r.sd = o.r.sd || {}; o.r.sd[o.i] = Object.assign(o.r.sd[o.i] || {}, p) }); all() }
    $('#ssCat').onchange = () => { const v = $('#ssCat').value; if (v !== '') sdSet({ cat: +v }) };
    $('#ssLbl').onchange = () => sdSet({ label: $('#ssLbl').value.trim() });
    $('#ssAcc').onchange = () => sdSet({ acc: $('#ssAcc').value });
    document.querySelectorAll('.accg,.ce-pi').forEach(x => x.remove());
    const accG = document.createElement('div'); accG.className = 'accg';
    accG.innerHTML = [['', 'None', 'none'], ['wheelchair', SN.wheelchair, 'wheelchair'], ['companion', SN.companion, 'companion'], ['accessible', SN.accessible, 'accessible']].map(([v, t, k]) => `<button type="button" class="ab" data-v="${v}" title="${t}"><svg viewBox="0 0 24 24">${SI[k]}</svg></button>`).join('');
    $('#ssAcc').style.display = 'none'; $('#ssAcc').parentNode.appendChild(accG);
    accG.onclick = e => { const b = e.target.closest('button'); if (b) sdSet({ acc: b.dataset.v }) };
    [['#ssHear', 'hear'], ['#ssCart', 'cart'], ['#ssSign', 'sign'], ['#ssRes', 'res'], ['#ssVer', 'ver'], ['#ssLeg', 'leg'], ['#ssArm', 'arm']].forEach(([i, k]) => { const sp = $(i).closest('.ck').querySelector('span'); sp.insertAdjacentHTML('afterbegin', '<svg class="ce-pi" viewBox="0 0 24 24">' + SI[k] + '</svg>') });
    [['#ssHear', 'hear'], ['#ssCart', 'cart'], ['#ssSign', 'sign'], ['#ssRes', 'res'], ['#ssVer', 'ver'], ['#ssLeg', 'leg'], ['#ssArm', 'arm']].forEach(([i, k]) => $(i).onchange = () => { const p = {}; p[k] = $(i).checked; if (k === 'hear' && !$(i).checked) { p.cart = false; p.sign = false } sdSet(p) });
    function rowExtra(s) { const dx = s.x2 - s.x1, dy = s.y2 - s.y1; $('#fSp').style.display = s.pts ? 'none' : 'block'; $('#rSp').value = s.count > 1 ? Math.round(Math.hypot(dx, dy) / (s.count - 1)) : SP; $('#rSec').value = s.section || ''; $('#rOn').checked = s.lblOn !== false }
    let fresh = new Set(), pg = null, bgr = null, btx = null, hv = null; const pm = new Map();
    function plan(a, b, j) {
        const len = Math.hypot(b.x - a.x, b.y - a.y), u = len ? [(b.x - a.x) / len, (b.y - a.y) / len] : [1, 0], n = j ? Math.floor(len / SP) : Math.floor(len / SP) + 1, o = j ? 1 : 0, r = [];
        for (let i = 0; i < n; i++)r.push({ x: a.x + u[0] * SP * (i + o), y: a.y + u[1] * SP * (i + o) }); return r
    }
    function joinAt(p) {
        let best = null; shapes.forEach(s => {
            if (s.type !== 'row' || !s.count) return; const c = ctr(s), a = (s.rot || 0) * Math.PI / 180, q = seats(s).p;
            [0, s.count - 1].forEach(e => {
                const o = q[e], dx = o.x - c.x, dy = o.y - c.y, x = c.x + dx * Math.cos(a) - dy * Math.sin(a), y = c.y + dx * Math.sin(a) + dy * Math.cos(a), d = Math.hypot(x - p.x, y - p.y);
                if (d < R + 6 && (!best || d < best.d)) best = { row: s, e, x, y, d }
            })
        }); return best
    }
    function prev(items, txt, x, y) {
        if (!pg) { pg = E('g', { 'pointer-events': 'none' }); bgr = E('rect', { rx: 7, height: 22, fill: '#1e2540' }, pg); btx = E('text', { 'font-size': 12, 'font-weight': 600, fill: '#fff' }, pg) }
        const col = cat(aCat).color, keep = new Set(); items.forEach(it => {
            keep.add(it.k); let c = pm.get(it.k); if (!c) { c = E('circle', { r: R, fill: col, stroke: '#fff', 'stroke-width': 1.5, opacity: .85, class: 'pop' }, pg); pm.set(it.k, c) } c.setAttribute('cx', it.x); c.setAttribute('cy', it.y);
            if (it.l != null) { if (!c._t) c._t = E('text', { 'text-anchor': 'middle', 'font-size': 8, 'font-weight': 600, fill: '#fff', 'pointer-events': 'none' }, pg); c._t.setAttribute('x', it.x); c._t.setAttribute('y', it.y + 3); c._t.textContent = it.l }
        });
        pm.forEach((c, k) => { if (!keep.has(k)) { c._t && c._t.remove(); c.remove(); pm.delete(k) } }); btx.textContent = txt; bgr.setAttribute('x', x + 16); bgr.setAttribute('y', y - 34); bgr.setAttribute('width', txt.length * 6.6 + 16); btx.setAttribute('x', x + 24); btx.setAttribute('y', y - 19); pg.appendChild(bgr); pg.appendChild(btx)
    }
    function clearPrev() { pg && pg.remove(); pg = null; pm.clear() }
    function hover(e) { if (poly) { polyPrev(pt(e)); return } if (tool !== 'row') return; const j = joinAt(pt(e)); hv && hv.remove(); hv = j ? E('circle', { cx: j.x, cy: j.y, r: R + 5, fill: 'none', stroke: '#4f46e5', 'stroke-width': 2.5, class: 'pulse', 'pointer-events': 'none' }) : null; $('#st').style.cursor = j ? 'copy' : 'crosshair' }
    const E = (n, a, p) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); (p || $('#w')).appendChild(e); return e };
    function render() {
        const w = $('#w'); w.innerHTML = ''; pg = null; pm.clear(); hv = null; w.setAttribute('transform', `translate(${view.x} ${view.y}) scale(${view.k})`);
        const cv = $('#cv'); cv.style.backgroundSize = GR * view.k + 'px ' + GR * view.k + 'px'; cv.style.backgroundPosition = view.x + 'px ' + view.y + 'px';
        if (bg) E('image', { href: bg, x: 0, y: 0, opacity: .35, 'pointer-events': 'none' });
        shapes.forEach(f => {
            if (f.type !== 'focal') return; const R0 = f.r || 120, fc = sel.has(f.id) ? '#4f46e5' : '#ef4444', gid = 'ceFocal' + f.id, df = E('defs', {}), gr = E('radialGradient', { id: gid }, df);
            [[0, .5], [.45, .3], [.8, .1], [1, 0]].forEach(([o, a]) => E('stop', { offset: o, 'stop-color': fc, 'stop-opacity': a }, gr));
            E('circle', { cx: f.x, cy: f.y, r: R0, fill: 'url(#' + gid + ')', 'pointer-events': 'none' })
        });
        const L0 = E('g', { id: 'ceShapes' });
        shapes.forEach(s => {
            const on = sel.has(s.id), c = cat(s.cat).color, cc = ctr(s), g = E('g', { 'data-id': s.id, transform: `rotate(${s.rot || 0} ${cc.x} ${cc.y})`, style: 'cursor:' + (tool === 'select' ? 'move' : tool === 'seat' ? 'pointer' : 'default') }, L0);
            if (s.type === 'row') {
                const q = seats(s); E('path', { d: s.pts ? 'M' + s.pts.map(o => o.x + ' ' + o.y).join('L') : `M${s.x1} ${s.y1}Q${q.cx} ${q.cy} ${s.x2} ${s.y2}`, fill: 'none', stroke: on ? '#4f46e5' : 'transparent', 'stroke-width': on ? R * 2 + 8 : R * 2 + 6, 'stroke-linecap': 'round', opacity: on ? 0.25 : 1 }, g);
                q.p.forEach((p, i) => {
                    const sd = (s.sd && s.sd[i]) || {}, ks = ss.has(s.id + ':' + i), fk = FLAGS.filter(k => sd[k]), hasAcc = sd.acc && SI[sd.acc]; const ce = E('circle', { 'data-seat': i, cx: p.x, cy: p.y, r: ks ? R + 2 : R, fill: sd.cat ? cat(sd.cat).color : c, stroke: ks ? '#f59e0b' : on ? '#4f46e5' : '#fff', 'stroke-width': ks ? 3 : on ? 1.8 : 1.5, class: fresh.has(s.id) ? 'pop' : '', style: fresh.has(s.id) ? 'animation-delay:' + i * 14 + 'ms' : '' }, g);
                    const tp = seatTip(sd); if (tp) E('title', {}, ce).textContent = tp;
                    if (hasAcc) E('g', { style: 'color:#fff', transform: `translate(${p.x - 7} ${p.y - 7}) scale(${14 / 24})`, 'pointer-events': 'none' }, g).innerHTML = SI[sd.acc];
                    else if (s.count <= 40 || s.pts || sd.label) E('text', { x: p.x, y: p.y + 3, 'text-anchor': 'middle', 'font-size': 8, fill: '#fff', 'pointer-events': 'none', 'font-weight': 600 }, g).textContent = sd.label || p.l;
                    if (fk.length) {
                        const bx = p.x + R - 1, by = p.y - R + 1; E('circle', { cx: bx, cy: by, r: 5.6, fill: '#f59e0b', stroke: '#fff', 'stroke-width': 1.2, 'pointer-events': 'none' }, g);
                        if (fk.length === 1) E('g', { style: 'color:#fff', transform: `translate(${bx - 3.6} ${by - 3.6}) scale(${7.2 / 24})`, 'pointer-events': 'none' }, g).innerHTML = SI[fk[0]];
                        else E('text', { x: bx, y: by + 3, 'text-anchor': 'middle', 'font-size': 8, 'font-weight': 700, fill: '#fff', 'pointer-events': 'none' }, g).textContent = fk.length
                    }
                });
                const l = q.p[0].x <= q.p[q.p.length - 1].x ? q.p[0] : q.p[q.p.length - 1]; if (s.lblOn !== false) E('text', { x: l.x - 22, y: l.y + 4, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#64708f', 'pointer-events': 'none' }, g).textContent = s.label
            }
            else if (s.type === 'table') {
                const st = on ? '#4f46e5' : c, tp = { fill: c + '33', stroke: st, 'stroke-width': on ? 2.5 : 1.5 }; if (s.shape === 'rect') E('rect', Object.assign({ x: s.x - s.w / 2, y: s.y - s.h / 2, width: s.w, height: s.h, rx: 8 }, tp), g); else E('circle', Object.assign({ cx: s.x, cy: s.y, r: s.r }, tp), g);
                tseats(s).forEach((o, i) => { E('circle', { cx: o.x, cy: o.y, r: R, fill: c, stroke: '#fff', 'stroke-width': 1.5 }, g); E('text', { x: o.x, y: o.y + 3, 'text-anchor': 'middle', 'font-size': 8, 'font-weight': 600, fill: '#fff', 'pointer-events': 'none' }, g).textContent = i + 1 }); E('text', { x: s.x, y: s.y + 4, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#1e2540', 'pointer-events': 'none' }, g).textContent = s.label
            }
            else if (s.type === 'focal') {
                const fc = on ? '#4f46e5' : '#ef4444', m = Math.min(3, Math.max(1, .75 / view.k));
                if (on) E('circle', { cx: s.x, cy: s.y, r: s.r || 120, fill: 'none', stroke: fc, 'stroke-width': 1.5, 'stroke-dasharray': '6 5', 'pointer-events': 'none' }, g);
                E('circle', { cx: s.x, cy: s.y, r: 26 * m, fill: 'transparent' }, g);
                const mk = E('g', { transform: `translate(${s.x} ${s.y}) scale(${m})`, 'pointer-events': 'none' }, g);
                E('circle', { r: 17, fill: '#fff', 'fill-opacity': .92, stroke: fc, 'stroke-width': 2.5 }, mk);
                E('circle', { r: 9, fill: 'none', stroke: fc, 'stroke-width': 2 }, mk);
                E('circle', { r: 3.5, fill: fc }, mk);
                [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([u, v]) => E('line', { x1: u * 21, y1: v * 21, x2: u * 30, y2: v * 30, stroke: fc, 'stroke-width': 2.5, 'stroke-linecap': 'round' }, mk));
                E('rect', { x: -38, y: 36, width: 76, height: 20, rx: 10, fill: fc }, mk);
                E('text', { x: 0, y: 50, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: '#fff' }, mk).textContent = 'Focal point'
            }
            else if (s.type === 'line') { const dx = s.x2 - s.x1, dy = s.y2 - s.y1, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, col = on ? '#4f46e5' : s.color, hs = 6 + s.w * 2; E('line', { x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, stroke: 'transparent', 'stroke-width': Math.max(14, s.w + 8) }, g); E('line', { x1: s.x1, y1: s.y1, x2: s.arrow ? s.x2 - ux * hs * .6 : s.x2, y2: s.arrow ? s.y2 - uy * hs * .6 : s.y2, stroke: col, 'stroke-width': s.w, 'stroke-dasharray': s.dash || '0', 'stroke-linecap': s.dash === '2 6' ? 'round' : 'butt', 'pointer-events': 'none' }, g); if (s.arrow) E('polygon', { points: `${s.x2},${s.y2} ${s.x2 - ux * hs - uy * hs * .5},${s.y2 - uy * hs + ux * hs * .5} ${s.x2 - ux * hs + uy * hs * .5},${s.y2 - uy * hs - ux * hs * .5}`, fill: col, 'pointer-events': 'none' }, g) }
            else if (s.type === 'icon') { E('rect', { x: s.x - s.size / 2, y: s.y - s.size / 2, width: s.size, height: s.size, fill: 'transparent', stroke: on ? '#4f46e5' : 'none', 'stroke-dasharray': '4 3', 'stroke-width': 1.5, rx: 6 }, g); const ig = E('g', { style: 'color:' + s.color, transform: `translate(${s.x - s.size / 2} ${s.y - s.size / 2}) scale(${s.size / 24})`, 'pointer-events': 'none' }, g); ig.innerHTML = ICONS[s.ic] || '' }
            else if (s.type === 'text') { E('text', { x: s.x, y: s.y, 'font-size': s.size, 'font-weight': 600, fill: s.color || '#1e2540' }, g).textContent = s.text; if (on) E('rect', { x: s.x - 4, y: s.y - s.size, width: s.text.length * s.size * .6 + 8, height: s.size * 1.3, fill: 'none', stroke: '#4f46e5', 'stroke-dasharray': '4 3' }, g) }
            else { E((s.shape || 'rect') === 'poly' ? 'polygon' : s.shape === 'circle' ? 'ellipse' : 'rect', Object.assign(s.shape === 'poly' ? { points: s.pts.map(o => o.x + ',' + o.y).join(' ') } : s.shape === 'circle' ? { cx: s.x + s.w / 2, cy: s.y + s.h / 2, rx: s.w / 2, ry: s.h / 2 } : { x: s.x, y: s.y, width: s.w, height: s.h, rx: 10 }, { fill: s.type === 'rect' ? '#e6e9f4' : c + '2a', stroke: on ? '#4f46e5' : (s.type === 'rect' ? '#b9c1da' : c), 'stroke-width': on ? 2.5 : 1.5, 'stroke-dasharray': s.type === 'general' ? '7 5' : '0' }), g); E('text', { x: s.x + s.w / 2, y: s.y + s.h / 2, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 600, fill: '#1e2540', 'pointer-events': 'none' }, g).textContent = s.label || ''; if (s.type === 'general') E('text', { x: s.x + s.w / 2, y: s.y + s.h / 2 + 18, 'text-anchor': 'middle', 'font-size': 11, fill: '#7a85a6', 'pointer-events': 'none' }, g).textContent = s.cap + ' capacity' }
        });
        const fo = shapes.find(x => x.type === 'focal');
        if (fo && sel.has(fo.id) && bestN > 0) { const bg2 = E('g', { id: 'ceBest', 'pointer-events': 'none' }); bestSeatList(fo, bestN).forEach(q => E('circle', { cx: q.x, cy: q.y, r: R + 3.5, fill: 'none', stroke: '#f59e0b', 'stroke-width': 2.5 }, bg2)) }
        $('#zl').textContent = Math.round(view.k * 100) + '%'
    }
    function setTool(t) { const was = tool; cancelPoly(); tool = t; mOpen = false; if (RT.includes(t)) lastRow = t; if (t !== 'seat') ss.clear(); document.querySelectorAll('.tl').forEach(b => b.classList.toggle('on', b.dataset.t === t || (b.dataset.t === 'row' && RT.includes(t)))); $('#hint').textContent = (areaMode === 'poly' && (t === 'rect' || t === 'general')) ? 'Click to add polygon points · double-click, Enter or click the first point to finish' : H[t]; modes(); $('#multiNm').style.display = t === 'multirow' ? 'block' : 'none'; $('#st').style.cursor = t === 'select' ? 'default' : t === 'pan' ? 'grab' : t === 'seat' ? 'pointer' : 'crosshair'; if ((t !== 'select' && sel.size) || t === 'seat' || was === 'seat' || t === 'icon' || t === 'line' || was === 'icon' || was === 'line') { sel.clear(); all() } }
    const HASMENU = ['row', 'line', 'table', 'rect', 'general'];
    $('#rib').onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; const t = b.dataset.t, same = t === 'row' ? RT.includes(tool) : tool === t, was = mOpen; setTool(t === 'row' ? lastRow : t); mOpen = HASMENU.includes(t) && !(same && was); modes() };
    listen('pointerdown', e => { if (mOpen && !(e.target.closest && e.target.closest('#modes,#rib'))) { mOpen = false; modes() } });
    let d = null, pv = null, spc = false;
    $('#st').addEventListener('pointerdown', e => { if (e.button === 1 || spc || tool === 'pan') { d = { k: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y }; return } const p = pt(e); $('#st').setPointerCapture(e.pointerId); if (tool === 'seat') { const c = e.target.closest('[data-seat]'); if (c) { const key = c.parentNode.dataset.id + ':' + c.dataset.seat; if (e.shiftKey) { ss.has(key) ? ss.delete(key) : ss.add(key) } else ss = new Set([key]); all(); return } if (!e.shiftKey) ss.clear(); d = { k: 'sbox', p0: p, base: new Set(ss) }; all(); return } if (tool === 'select') { const g = e.target.closest('[data-id]'); if (g) { const id = +g.dataset.id; if (e.shiftKey) { sel.has(id) ? sel.delete(id) : sel.add(id) } else if (!sel.has(id)) { sel = new Set([id]) } d = { k: 'move', p0: p, o: JSON.stringify(shapes), m: false }; all() } else { if (!e.shiftKey) sel.clear(); d = { k: 'box', p0: p, base: new Set(sel) }; all() } } else if (tool === 'table') { ensureCat(); snap(); const s = { id: uid++, type: 'table', x: sn(p.x), y: sn(p.y), r: 34, w: 140, h: 56, shape: tblMode, count: 8, cat: aCat, label: 'T' + (shapes.filter(x => x.type === 'table').length + 1), rot: 0 }; shapes.push(s); sel = new Set([s.id]); setTool('select'); all() } else if (tool === 'icon') { snap(); const s = { id: uid++, type: 'icon', x: sn(p.x), y: sn(p.y), ic: dIco.ic, size: dIco.size, color: dIco.color, rot: 0 }; shapes.push(s); sel = new Set([s.id]); setTool('select'); all() } else if (tool === 'text') { snap(); const s = { id: uid++, type: 'text', x: sn(p.x), y: sn(p.y), text: 'Text', size: 18, color: '#1e2540', rot: 0 }; shapes.push(s); sel = new Set([s.id]); setTool('select'); all() } else if (tool === 'focal') { snap(); const old = shapes.find(q => q.type === 'focal'); shapes = shapes.filter(q => q.type !== 'focal'); const f = { id: uid++, type: 'focal', x: sn(p.x), y: sn(p.y), r: old ? old.r : 120, rot: 0 }; shapes.push(f); sel = new Set([f.id]); setTool('select'); all(); toast('Focal point set') } else if (tool === 'segment' || (areaMode === 'poly' && (tool === 'rect' || tool === 'general'))) polyClick(p); else { const j = tool === 'row' ? joinAt(p) : null; d = { k: 'draw', p0: j ? { x: j.x, y: j.y } : { x: sn(p.x), y: sn(p.y) }, join: j } } });
    $('#st').addEventListener('pointermove', e => { if (!d) { hover(e); return } if (d.k === 'pan') { view.x = d.vx + e.clientX - d.sx; view.y = d.vy + e.clientY - d.sy; render(); return } const p = pt(e); if (d.k === 'sbox') { const a = d.p0, x = Math.min(a.x, p.x), y = Math.min(a.y, p.y), w = Math.abs(p.x - a.x), h = Math.abs(p.y - a.y); ss = new Set(d.base); shapes.forEach(s => { if (s.type === 'row') seatPos(s).forEach(q => { if (q.x >= x && q.x <= x + w && q.y >= y && q.y <= y + h) ss.add(s.id + ':' + q.i) }) }); render(); return } if (d.k === 'move') { const dx = sn(p.x - d.p0.x), dy = sn(p.y - d.p0.y); if (!d.m && (dx || dy)) { d.m = true; U.push(JSON.stringify({ shapes: JSON.parse(d.o), cats })); Rd = []; hs() } if (d.m) { const o = JSON.parse(d.o); shapes.forEach((s, i) => { if (sel.has(s.id)) { Object.assign(s, o[i]); mv(s, dx, dy) } }); render() } return } if (d.k === 'box') { const a = d.p0, x = Math.min(a.x, p.x), y = Math.min(a.y, p.y), w = Math.abs(p.x - a.x), h = Math.abs(p.y - a.y); sel = new Set(d.base); shapes.forEach(s => { const b = bb(s); if (b.x < x + w && b.x + b.w > x && b.y < y + h && b.y + b.h > y) sel.add(s.id) }); render(); return } if (d.k === 'draw') { const a = d.p0, b = d.join ? p : { x: sn(p.x), y: sn(p.y) }; d.p1 = b; pv && pv.remove(); pv = null; if (tool === 'row') { const pts = plan(a, b, d.join), lab = d.join ? 'Continue row ' + d.join.row.label : 'Row ' + L(shapes.filter(q => q.type === 'row').length); prev(pts.map((q, i) => ({ k: i, x: q.x, y: q.y })), lab + ' · ' + pts.length + ' seat' + (pts.length === 1 ? '' : 's'), b.x, b.y) } else if (tool === 'line') { pv = E('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#4f46e5', 'stroke-width': 2.5, 'stroke-dasharray': '6 4', 'pointer-events': 'none' }) } else if (tool === 'multirow') { const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), rows = Math.floor(Math.abs(b.y - a.y) / 30) + 1, n = Math.floor(Math.abs(b.x - a.x) / SP) + 1, it = []; if (rows * n <= 3000) for (let r = 0; r < rows; r++)for (let c = 0; c < n; c++)it.push({ k: r + '_' + c, x: x + c * SP, y: y + r * 30 }); prev(it, rows + ' row' + (rows > 1 ? 's' : '') + ' × ' + n + ' seats', b.x, b.y) } else { const x0 = Math.min(a.x, b.x), y0 = Math.min(a.y, b.y), w0 = Math.abs(b.x - a.x), h0 = Math.abs(b.y - a.y), st = { fill: '#4f46e51a', stroke: '#4f46e5', 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }; pv = areaMode === 'circle' && tool === 'general' ? E('ellipse', Object.assign({ cx: x0 + w0 / 2, cy: y0 + h0 / 2, rx: w0 / 2, ry: h0 / 2 }, st)) : E('rect', Object.assign({ x: x0, y: y0, width: w0, height: h0, rx: 10 }, st)) } } });
    listen('pointerup', () => { if (!d) return; const k = d; d = null; pv && pv.remove(); pv = null; clearPrev(); if (k.k === 'draw' && k.p1) make(k.p0, k.p1, k.join); else if (k.k === 'move' || k.k === 'box' || k.k === 'sbox') { list(); props(); foot(); render() } });
    function make(a, b, j) { const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y), made = []; let s; if (tool !== 'rect' && tool !== 'line') ensureCat(); if (tool === 'line') { if (Math.hypot(w, h) < 10) return; snap(); s = { id: uid++, type: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y, w: dLine.w, color: dLine.color, dash: lnDash(lineMode), arrow: lineMode === 'larrow', rot: 0 }; shapes.push(s) } else if (tool === 'row') { const pts = plan(a, b, j), n = pts.length; if (n < (j ? 1 : 2)) return; snap(); let lab = freeRow(shapes.filter(q => q.type === 'row').length), st = '1', dr = 'ltr', ct = aCat; if (j) { const r = j.row, m = r.count, l = (+r.start || 0) + (r.dir === 'rtl' ? m - 1 - j.e : j.e), isMax = r.dir === 'rtl' ? j.e === 0 : j.e === m - 1; lab = r.label; ct = r.cat; if (isMax) st = String(l + 1); else { st = String(l - n); dr = 'rtl' } } s = { id: uid++, type: 'row', x1: pts[0].x, y1: pts[0].y, x2: pts[n - 1].x, y2: pts[n - 1].y, count: n, curve: 0, cat: ct, label: lab, start: st, dir: dr, rot: 0 }; shapes.push(s); made.push(s.id); if (j) toast('Row ' + lab + ' continued') } else if (tool === 'multirow') { if (w < SP || h < SP) return; snap(); const rows = Math.floor(h / 30) + 1, n = Math.floor(w / SP) + 1, f = $('#cRow').value.trim(), base = shapes.filter(q => q.type === 'row').length; for (let r = 0; r < rows; r++) { s = { id: uid++, type: 'row', x1: x, y1: y + r * 30, x2: x + (n - 1) * SP, y2: y + r * 30, count: n, curve: 0, cat: aCat, label: f ? uniqLbl(nxt(f, r)) : freeRow(base + r), start: '1', dir: 'ltr', rot: 0 }; shapes.push(s); made.push(s.id) } } else { if (w < 40 || h < 30) return; snap(); s = { id: uid++, type: tool, shape: tool === 'rect' ? 'rect' : areaMode, x, y, w, h, cat: aCat, label: tool === 'rect' ? 'Stage' : 'General admission', cap: 100, rot: 0 }; shapes.push(s) } sel = new Set([s.id]); fresh = new Set(made); setTimeout(() => fresh.clear(), 900); setTool('select'); all() }
    const zoom = (f, cx, cy) => { const r = $('#st').getBoundingClientRect(); cx ??= r.width / 2; cy ??= r.height / 2; const k = Math.min(3, Math.max(.25, view.k * f)); view.x = cx - (cx - view.x) * k / view.k; view.y = cy - (cy - view.y) * k / view.k; view.k = k; render() };
    $('#zi').onclick = () => zoom(1.2); $('#zo').onclick = () => zoom(1 / 1.2); $('#zr').onclick = () => { view = { x: 90, y: 110, k: 1 }; render() };
    $('#st').addEventListener('wheel', e => { e.preventDefault(); const r = $('#st').getBoundingClientRect(); zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - r.left, e.clientY - r.top) }, { passive: false });
    function rcats() {
        const b = $('#cats'); b.innerHTML = ''; if (!cats.length) b.innerHTML = '<div class="em"><i class="fa-solid fa-tag"></i>No categories yet</div>';
        cats.forEach(c => {
            const n = shapes.filter(s => s.cat === c.id).reduce((t, s) => t + cap(s), 0), r = document.createElement('div'); r.className = 'ct' + (c.id === aCat ? ' a' : ''); r.innerHTML = '<input type="color"><input type="text"><span class="n">' + n + '</span><button title="Delete"><i class="fa-regular fa-trash-can"></i></button>';
            const [ic, it] = r.querySelectorAll('input'); ic.value = c.color; it.value = c.name; r.onclick = e => { if (e.target.closest('button') || e.target === ic || e.target === it) return; aCat = c.id; rcats() }; it.onfocus = () => { aCat = c.id }; ic.oninput = () => { c.color = ic.value; render(); foot(); list() }; it.onchange = () => { c.name = it.value.trim() || c.name; rcats(); foot() }; r.querySelector('button').onclick = () => { if (shapes.some(s => s.cat === c.id)) return er('#ce', '"' + c.name + '" is in use – reassign its objects first.'); snap(); cats = cats.filter(x => x !== c); if (aCat === c.id) aCat = cats[0]?.id; all() }; b.appendChild(r)
        });
        $('#sCat').innerHTML = cats.map(c => `<option value="${c.id}"></option>`).join('');[...$('#sCat').options].forEach((o, i) => o.textContent = cats[i].name)
    }
    $('#addCat').onclick = () => { snap(); const p = ['#f5a623', '#a3e635', '#ec4899', '#14b8a6', '#f97316'], id = Date.now(); cats.push({ id, name: 'Category ' + (cats.length + 1), color: p[cats.length % 5] }); aCat = id; all() };
    const ic = { icon: 'fa-icons', line: 'fa-slash', row: 'fa-grip-lines', general: 'fa-layer-group', rect: 'fa-square', table: 'fa-circle', text: 'fa-font', focal: 'fa-crosshairs' };
    function list() { const b = $('#objs'); b.innerHTML = ''; $('#oc').textContent = shapes.length; shapes.slice().reverse().forEach(s => { const r = document.createElement('div'); r.className = 'ob' + (sel.has(s.id) ? ' sel' : ''); const nm = s.type === 'row' ? `Row ${s.label} <small>${s.count}</small>` : s.type === 'text' ? s.text : s.type === 'focal' ? 'Focal point' : `${s.label || s.type} <small>${cap(s) || ''}</small>`; r.innerHTML = `<i class="fa-${s.type === 'rect' ? 'regular' : 'solid'} ${ic[s.type]}"></i><span>${nm}</span>` + (!['rect', 'text', 'focal', 'icon', 'line'].includes(s.type) ? `<span class="d" style="background:${cat(s.cat).color}"></span>` : ''); r.onclick = e => { if (e.shiftKey) { sel.has(s.id) ? sel.delete(s.id) : sel.add(s.id) } else sel = new Set([s.id]); all() }; b.appendChild(r) }) }
    function foot() { const t = shapes.reduce((n, s) => n + cap(s), 0); $('#bot').innerHTML = `<span>Total capacity <b>${t}</b></span><span>Objects <b>${shapes.length}</b></span><span>Selected <b>${sel.size + ss.size}</b></span>` + cats.map(c => `<span class="chip" data-c="${c.id}"><i style="background:${c.color}"></i>${c.name} <b>${shapes.filter(s => s.cat === c.id).reduce((n, s) => n + cap(s), 0)}</b></span>`).join(''); document.querySelectorAll('.chip').forEach(c => c.onclick = () => { sel = new Set(shapes.filter(s => s.cat === +c.dataset.c).map(s => s.id)); all() }) }
    const show = (i, v) => $(i).style.display = v ? 'block' : 'none';
    function props() {
        const s = one(), m = sel.size > 1; if (ss.size || tool === 'seat') { show('#none', !ss.size); $('#none').innerHTML = NONE1; show('#box', 0); $('#sum').style.display = 'none'; show('#icoBox', 0); show('#lineBox', 0); show('#seatBox', ss.size); if (ss.size) fillSeat(); return } $('#none').innerHTML = NONE0; show('#seatBox', 0); const t0 = s && s.type, ti = t0 === 'icon' || (tool === 'icon' && !sel.size), tl = t0 === 'line' || (tool === 'line' && !sel.size); show('#icoBox', ti); show('#lineBox', tl); if (ti || tl) { show('#none', 0); show('#box', 0); $('#sum').style.display = 'none'; if (ti) fillIco(t0 === 'icon' ? s : null); else fillLine(t0 === 'line' ? s : null); return } show('#none', !sel.size); sumry(); show('#box', sel.size); $('#se').style.display = 'none'; if (!sel.size) return; const t = s?.type; show('#fCat', m || (t && t !== 'rect' && t !== 'text' && t !== 'focal')); show('#pRow', t === 'row'); show('#pArea', t === 'general' || t === 'rect'); show('#pTable', t === 'table'); show('#pText', t === 'text'); show('#fCap', t === 'general'); show('#fRot', !!s && t !== 'focal'); show('#pFocal', t === 'focal'); if (t === 'focal') { $('#fRad').value = s.r || 120; $('#fcv').textContent = s.r || 120; $('#fBest').value = bestN } $('#apply').style.display = 'none'; show('#pMulti', m); if (m) { const rw = shapes.filter(x => sel.has(x.id) && x.type === 'row' && !x.pts); show('#mCurveF', rw.length); if (rw.length) { const sm = rw.every(x => x.curve === rw[0].curve), c0 = sm ? rw[0].curve : 0; $('#mCurve').value = c0; $('#mcv').textContent = sm ? c0 : 'mixed' } $('#mRot').value = 0; lastV = 0; gr = null; $('#mrv').textContent = '0°' }
        if (m) { const cs = shapes.filter(x => sel.has(x.id) && !['rect', 'text', 'focal', 'icon', 'line'].includes(x.type)), v = cs.map(x => x.cat), same = v.length > 0 && v.every(x => x === v[0]), o = $('#sCat'); show('#fCat', cs.length);[...o.querySelectorAll('option[value=""]')].forEach(x => x.remove()); if (!same) { const op = document.createElement('option'); op.value = ''; op.textContent = cs.length ? 'Mixed' : '-'; o.insertBefore(op, o.firstChild); o.value = '' } else o.value = v[0] }
        if (!s) { if (!m) $('#sCat').value = aCat; return } $('#sCat').value = s.cat; $('#sRot').value = s.rot || 0; $('#rv').textContent = (s.rot || 0) + '°'; if (t === 'row') { $('#sCurve').parentElement.style.display = s.pts ? 'none' : 'block'; $('#rLbl').value = s.label; $('#sStart').value = s.start; $('#sDir').value = s.dir; $('#sCnt').value = s.count; $('#sCurve').value = s.curve; $('#cv2').textContent = s.curve; rowExtra(s) } if (t === 'general' || t === 'rect') { $('#aLbl').value = s.label; $('#lA').textContent = t === 'rect' ? 'Label' : 'Area label'; $('#wh').style.display = s.shape === 'poly' ? 'none' : 'grid'; $('#aW').value = Math.round(s.w); $('#aH').value = Math.round(s.h); $('#aCap').value = s.cap || 0 } if (t === 'table') { $('#tCnt').value = s.count; $('#tR').value = s.r; $('#tLbl').value = s.label; $('#tShape').value = s.shape || 'round'; $('#tW').value = s.w || 140; $('#tH').value = s.h || 56; $('#tShape').onchange() } if (t === 'text') { $('#xT').value = s.text; $('#xS').value = s.size; $('#xC').value = s.color || '#1e2540' }
    }
    $('#cm').onclick = () => { $('#aCap').value = Math.max(0, +$('#aCap').value - 1); applyProps(true) }; $('#cp').onclick = () => { $('#aCap').value = +$('#aCap').value + 1; applyProps(true) };
    const applyProps = quiet => { const s = one(); if (!s) return; if (s.type === 'row' && !$('#rLbl').value.trim()) return er('#se', 'Row label is required.'); if (s.type !== 'rect' && s.type !== 'text' && !$('#sCat').value) return er('#se', 'Please select a category.'); snap(); if (s.type !== 'rect' && s.type !== 'text') s.cat = +$('#sCat').value; if (s.type === 'row') { s.label = $('#rLbl').value.trim(); s.start = $('#sStart').value || '1'; s.dir = $('#sDir').value; const n = Math.max(1, Math.min(200, +$('#sCnt').value || s.count)), sp = Math.max(14, Math.min(80, +$('#rSp').value || SP)); s.section = $('#rSec').value.trim(); s.lblOn = $('#rOn').checked; if (s.pts) s.count = n; else { const dx = s.x2 - s.x1, dy = s.y2 - s.y1, len = Math.hypot(dx, dy), ux = len ? dx / len : 1, uy = len ? dy / len : 0; if (n !== s.count || Math.abs(sp - len / (s.count - 1)) > .6) { s.count = n; s.x2 = s.x1 + ux * sp * (n - 1); s.y2 = s.y1 + uy * sp * (n - 1) } } } else if (s.type === 'table') { s.count = Math.max(2, +$('#tCnt').value || 8); s.r = +$('#tR').value || 34; s.shape = $('#tShape').value; s.w = Math.max(60, +$('#tW').value || 140); s.h = Math.max(30, +$('#tH').value || 56); s.label = $('#tLbl').value } else if (s.type === 'text') { s.text = $('#xT').value || 'Text'; s.size = +$('#xS').value || 18; s.color = $('#xC').value || '#1e2540' } else { s.label = $('#aLbl').value; if (s.shape !== 'poly') { s.w = Math.max(40, +$('#aW').value); s.h = Math.max(30, +$('#aH').value) } if (s.type === 'general') s.cap = +$('#aCap').value || 0 } all(); if (!quiet) toast('Applied') };
    $('#apply').onclick = () => applyProps();
    ['#rLbl', '#sStart', '#sDir', '#sCnt', '#rSp', '#rSec', '#rOn', '#aLbl', '#aW', '#aH', '#aCap', '#tShape', '#tCnt', '#tR', '#tW', '#tH', '#tLbl', '#xT', '#xS', '#xC'].forEach(i => $(i).addEventListener('change', () => applyProps(true)));
    $('#sCat').onchange = () => { if (!$('#sCat').value) return; if (sel.size > 1) { snap(); const cv = +$('#sCat').value; shapes.forEach(s => { if (sel.has(s.id) && !['rect', 'text', 'focal', 'icon', 'line'].includes(s.type)) { s.cat = cv; if (s.sd) Object.keys(s.sd).forEach(k => { delete s.sd[k].cat }) } }); all() } else if (one()) { snap(); one().cat = +$('#sCat').value; all() } };
    $('#sCurve').oninput = e => { const s = one(); if (s) { s.curve = +e.target.value; $('#cv2').textContent = s.curve; render() } }; $('#sCurve').onchange = () => { };
    $('#sRot').oninput = e => { const s = one(); if (s) { s.rot = +e.target.value; $('#rv').textContent = s.rot + '°'; render() } };['#sCurve', '#sRot'].forEach(i => $(i).addEventListener('pointerdown', () => snap()));
    let gr = null, lastV = 0;
    function grpStart() { const ls = shapes.filter(x => sel.has(x.id)); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; ls.forEach(x => { const b = bb(x); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h) }); gr = { c: { x: (x0 + x1) / 2, y: (y0 + y1) / 2 }, o: JSON.stringify(ls), v0: lastV } }
    $('#mRot').addEventListener('pointerdown', () => { snap(); grpStart() });
    $('#mRot').oninput = e => {
        if (sel.size < 2) return; if (!gr) { snap(); grpStart() } const v = +e.target.value, th = v - gr.v0, a = th * Math.PI / 180, co = Math.cos(a), si = Math.sin(a), C = gr.c; lastV = v;
        JSON.parse(gr.o).forEach(b => {
            const t = shapes.find(x => x.id === b.id); if (!t) return; Object.assign(t, b);
            const rp = (x, y) => ({ x: C.x + (x - C.x) * co - (y - C.y) * si, y: C.y + (x - C.x) * si + (y - C.y) * co });
            if (t.type === 'line') { const p = rp(t.x1, t.y1), q = rp(t.x2, t.y2); t.x1 = p.x; t.y1 = p.y; t.x2 = q.x; t.y2 = q.y }
            else { const c = ctr(t), n = rp(c.x, c.y); mv(t, n.x - c.x, n.y - c.y); if (t.type !== 'focal') t.rot = (((b.rot || 0) + th) % 360 + 360) % 360 }
        });
        $('#mrv').textContent = v + '°'; render()
    };
    $('#mRot').onchange = () => { gr = null };
    $('#mCurve').addEventListener('pointerdown', () => snap());
    $('#mCurve').oninput = e => { const v = +e.target.value; let n = 0; shapes.forEach(x => { if (sel.has(x.id) && x.type === 'row' && !x.pts) { x.curve = v; n++ } }); if (n) { $('#mcv').textContent = v; render() } };
    $('#rot90').onclick = () => { if (!sel.size) return; snap(); shapes.forEach(s => { if (sel.has(s.id)) s.rot = ((s.rot || 0) + 90) % 360 }); all() };
    $('#dup').onclick = dupe; $('#del').onclick = del;
    $('#selCatAll').onclick = () => { const s = one() || shapes.find(x => sel.has(x.id)); if (!s || s.cat == null) return; sel = new Set(shapes.filter(x => x.cat === s.cat).map(x => x.id)); all() };
    function dupe() { if (!sel.size) return; snap(); const n = []; shapes.filter(s => sel.has(s.id)).forEach(s => { const c = JSON.parse(JSON.stringify(s)); c.id = uid++; mv(c, 30, 30); if (c.type === 'row') c.label = freeRow(shapes.filter(q => q.type === 'row').length); else if (c.type === 'table' || c.type === 'general') c.label = uniqLbl(c.label); shapes.push(c); n.push(c) }); sel = new Set(n.map(s => s.id)); all() }
    function del() { if (!sel.size) return toast('Select something to delete'); snap(); shapes = shapes.filter(s => !sel.has(s.id)); sel.clear(); all() }
    listen('keydown', e => { if (/INPUT|SELECT/.test(e.target.tagName)) return; const k = e.key.toLowerCase(), c = e.ctrlKey || e.metaKey; if (e.code === 'Space') { spc = true; e.preventDefault(); return } if (c && k === 'z') { e.preventDefault(); $('#undo').click() } else if (c && k === 'y') { e.preventDefault(); $('#redo').click() } else if (c && k === 'd') { e.preventDefault(); dupe() } else if (c && k === 'a') { e.preventDefault(); sel = new Set(shapes.map(s => s.id)); all() } else if (c && k === 'c') { clip = JSON.parse(JSON.stringify(shapes.filter(s => sel.has(s.id)))); toast('Copied') } else if (c && k === 'v' && clip.length) { snap(); const n = clip.map(s => { const o = JSON.parse(JSON.stringify(s)); o.id = uid++; mv(o, 40, 40); if (o.type === 'row') o.label = freeRow(shapes.filter(q => q.type === 'row').length); else if (o.type === 'table' || o.type === 'general') o.label = uniqLbl(o.label); shapes.push(o); return o }); clip = JSON.parse(JSON.stringify(n)); sel = new Set(n.map(s => s.id)); all() } else if (k === 'enter') { if (poly) finishPoly() } else if (k === 'delete' || k === 'backspace') del(); else if (k === 'escape') { sel.clear(); setTool('select'); all() } else if (k.startsWith('arrow') && sel.size) { e.preventDefault(); snap(); const st = e.shiftKey ? 10 : 1, [dx, dy] = { arrowleft: [-st, 0], arrowright: [st, 0], arrowup: [0, -st], arrowdown: [0, st] }[k]; shapes.forEach(s => sel.has(s.id) && mv(s, dx, dy)); render() } else { const m = { v: 'select', h: 'pan', r: 'row', m: 'multirow', s: 'segment', g: 'general', b: 'table', a: 'rect', t: 'text', p: 'focal', e: 'seat', i: 'icon', l: 'line' }; if (m[k] && !c) setTool(m[k]) } });
    listen('keyup', e => { if (e.code === 'Space') spc = false });
    $('#tGrid').onclick = e => { e.currentTarget.classList.toggle('on'); $('#cv').classList.toggle('nogrid') };
    $('#tSnap').onclick = e => { e.currentTarget.classList.toggle('on'); snapOn = !snapOn };
    $('#bgBtn').onclick = () => bg ? (bg = null, render(), toast('Background removed')) : $('#fBg').click();
    $('#fBg').onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { bg = r.result; render() }; r.readAsDataURL(f); e.target.value = '' };
    $('#expBtn').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ title: $('#title').value, cats, shapes }, null, 1)], { type: 'application/json' })); a.download = ($('#title').value || 'chart') + '.json'; a.click() };
    $('#impBtn').onclick = () => $('#fImp').click();
    $('#fImp').onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const o = JSON.parse(r.result); snap(); cats = o.cats; shapes = o.shapes; uid = Math.max(0, ...shapes.map(s => s.id)) + 1; $('#title').value = o.title || 'Imported'; aCat = cats[0]?.id; all(); toast('Imported') } catch { toast('Invalid file') } }; r.readAsText(f); e.target.value = '' };
    $('#av').onclick = e => { if (e.target.closest('#mn')) return; e.stopPropagation(); $('#mn').classList.toggle('show') }; listen('click', () => $('#mn').classList.remove('show'));
    const er = (i, m) => { const e = $(i); e.textContent = m; e.style.display = 'block'; setTimeout(() => e.style.display = 'none', 3500) };
    function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(t.h); t.h = setTimeout(() => t.classList.remove('show'), 1700) }
    /* ---------- boot: load saved chart (or start empty / demo) ---------- */
    const T = $('#title'); T.value = opts.title && opts.title !== 'Untitled chart' ? opts.title : ''; T.maxLength = 100; T.placeholder = 'Enter chart name';
    T.addEventListener('input', () => T.classList.remove('ce-err')); T.addEventListener('focus', () => T.select());
    T.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); T.blur() } else if (e.key === 'Escape') { T.blur() } });
    T.addEventListener('keyup', e => e.stopPropagation());
    if (!T.value) setTimeout(() => T.focus(), 60);
    /* account card - same content as the Home page (name, email, public / secret key) */
    (function () {
        const ini = (opts.initial || '?').slice(0, 1).toUpperCase(), pub = opts.publicKey || '', sec = opts.secretKey || '', IC = { copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="13" height="13" rx="2"></rect><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"></path></svg>', ok: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>', eye: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-8 10-8 10 8 10 8-3.5 8-10 8S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>', off: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.9 17.9A10.1 10.1 0 0 1 12 20c-7 0-10-8-10-8a17.7 17.7 0 0 1 4.1-5.4M9.9 4.2A9.7 9.7 0 0 1 12 4c7 0 10 8 10 8a17.8 17.8 0 0 1-2.2 3.2M1 1l22 22M14.1 14.1a3 3 0 1 1-4.2-4.2"></path></svg>' };
        let vis = false;
        const mask = k => !k || k.length < 9 ? '\u2022'.repeat(12) : k.slice(0, 4) + '\u2022'.repeat(12) + k.slice(-4);
        const showSec = () => { $('#pkSec').textContent = vis ? sec : mask(sec); $('#pkSec').title = vis ? sec : 'Hidden'; $('#pkEye').innerHTML = vis ? IC.off : IC.eye; $('#pkEye').title = (vis ? 'Hide' : 'Show') + ' secret key' };
        const copy = async (t, b) => { if (!t) return; try { await navigator.clipboard.writeText(t) } catch { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove() } b.innerHTML = IC.ok; setTimeout(() => { b.innerHTML = IC.copy }, 2000) };
        $('#av').firstChild.nodeValue = ini; $('#pmAv').textContent = ini;
        $('#pmName').textContent = (opts.name || '').trim() || 'My account'; $('#pmEmail').textContent = opts.email || '';
        $('#pkPub').textContent = pub; $('#pkPub').title = pub; showSec();
        $('#pkEye').onclick = () => { vis = !vis; showSec() };
        $('#pkPubCp').onclick = e => copy(pub, e.currentTarget); $('#pkSecCp').onclick = e => copy(sec, e.currentTarget);
        $('#av').addEventListener('click', () => { vis = false; showSec() });
    })();
    $('#title').addEventListener('input', () => { dirty = true });
    let loaded = false;
    if (opts.chartJson) {
        try {
            const o = JSON.parse(opts.chartJson);
            if (Array.isArray(o.shapes)) { cats = Array.isArray(o.cats) ? o.cats : []; shapes = o.shapes; uid = Math.max(0, ...shapes.map(s => s.id), ...cats.map(c => c.id)) + 1; aCat = cats[0] && cats[0].id; if (o.view) view = o.view; loaded = true }
            else toast('This chart was saved in an older format - starting with an empty canvas')
        }
        catch (e) { toast('Could not read the saved chart') }
    }
    if (!loaded && opts.demo) {
        cats = [{ id: 1, name: 'VIP', color: '#ff5d6c' }, { id: 2, name: 'Standard', color: '#4f46e5' }, { id: 3, name: 'Economy', color: '#22d3ee' }]; aCat = 2; shapes.push({ id: uid++, type: 'rect', x: 140, y: 0, w: 400, h: 50, label: 'STAGE', rot: 0 });
        for (let r = 0; r < 5; r++)shapes.push({ id: uid++, type: 'row', x1: 120, y1: 120 + r * 34, x2: 120 + 15 * SP, y2: 120 + r * 34, count: 16, curve: r * -6, cat: r < 1 ? 1 : 2, label: L(r), start: '1', dir: 'ltr', rot: 0 });
        shapes.push({ id: uid++, type: 'general', x: 140, y: 320, w: 380, h: 80, cat: 3, label: 'Standing area', cap: 150, rot: 0 });
        shapes.push({ id: uid++, type: 'table', x: 640, y: 200, r: 36, count: 8, cat: 1, label: 'T1', rot: 0 });
        setTool('select'); all(); hs();
    }
    setTool('select'); all(); hs();
    if (loaded && !(opts.chartJson && /"view"/.test(opts.chartJson))) fit();
    dirty = false;
    const ldr = $('#ceLoader'); if (ldr) { ldr.classList.add('done'); setTimeout(() => ldr.remove(), 300) }

    /* ---------- save payload ---------- */
    function seatRows() {
        const out = [], used = new Set(), bad = new Set(); let renamed = 0;
        const uniq = (n, fallback, rn) => {
            n = String(n).trim().slice(0, 100); let u = n, k = 2;
            if (used.has(u.toLowerCase()) && fallback) { u = (fallback + '-' + n).slice(0, 100) }
            while (used.has(u.toLowerCase())) { u = (n + '~' + k++).slice(0, 100) }
            if (u !== n) { renamed++; rn && bad.add(rn) } used.add(u.toLowerCase()); return u
        };
        const add = (row, name, catId, extra) => out.push(Object.assign({ row: String(row).slice(0, 100), seat: name, cat: cat(catId).name }, extra || {}));
        shapes.forEach(s => {
            if (s.type === 'row') {
                const rl = (s.label || '').trim() || ('R' + s.id);
                seats(s).p.forEach((p, i) => {
                    const sd = (s.sd && s.sd[i]) || {}, lbl = (sd.label || String(p.l)).trim();
                    add(rl, uniq(rl + '-' + lbl, s.section && s.section.trim(), rl), sd.cat || s.cat, { kind: 'seat' })
                })
            }
            else if (s.type === 'table') {
                const tl = (s.label || '').trim() || ('T' + s.id);
                for (let i = 0; i < s.count; i++)add(tl, uniq(tl + '-' + (i + 1), null, tl), s.cat, { kind: 'seat' })
            }
            else if (s.type === 'general') {
                const gl = (s.label || '').trim() || ('GA' + s.id);
                for (let i = 0; i < (+s.cap || 0); i++)add(gl, uniq(gl + '-' + (i + 1), null, gl), s.cat, { kind: 'ga' })
            }
        });
        return { rows: out, renamed, bad: [...bad] }
    }
    function getData() {
        if (!validate()) throw new Error('Enter a chart name');
        const { rows, renamed, bad } = seatRows();
        const objects = rows.filter(r => r.kind === 'seat').map(r => ({ seatId: r.seat, rowName: r.row, category: r.cat, seatStatus: 'available' }));
        const chartJson = JSON.stringify({ v: 2, cats, shapes, view, objects });
        const catName = JSON.stringify(cats.map(c => ({ id: c.id, category: c.name, color: c.color })));
        const seatsJson = JSON.stringify(rows.map(r => ({ row: r.row, seat: r.seat, cat: r.cat })));
        if (renamed) toast(renamed + ' duplicate seat name' + (renamed > 1 ? 's were' : ' was') + ' renamed in: ' + bad.slice(0, 5).join(', ') + (bad.length > 5 ? '...' : '') + ' - give each row a unique label');
        return { title: ($('#title').value || '').trim(), chartJson, catName, seatsJson, seatCount: rows.length }
    }
    function validate() { const T = $('#title'); if (!(T.value || '').trim()) { T.classList.add('ce-err'); T.focus(); toast('Enter a chart name before saving'); return false } return true }
    return {
        validate, getData, toast, markSaved: () => { dirty = false }, isDirty: () => dirty, canLeave: () => dirty ? modal({ title: 'Unsaved changes', msg: 'You have unsaved changes. If you leave now they will be lost.', ok: 'Leave without saving', cancel: 'Stay', danger: true }) : true,
        setTitle: t => { $('#title').value = t; dirty = true },
        dispose: () => { offs.forEach(f => f()); mo.disconnect(); document.querySelectorAll('i[data-i]').forEach(el => { const v = el.querySelector(':scope > svg'); if (v) v.remove(); el.removeAttribute('data-i'); el.classList.remove('svgi') }); patchCss.remove() }
    };

}