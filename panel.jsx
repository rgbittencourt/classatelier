/* eslint-disable */
// ClassAtelier — properties panel for the selected block. Enforces the design
// system: background limited to the Aula tone palette, spacing to presets,
// typography untouched. Structural blocks (lists/quiz) get add/remove/reorder.

const { useRef: useRefP, useEffect: useEffectP, useState: useStateP } = React;

// ── tool controls ──
const ps = {
  group: { padding: "16px 16px 4px", borderBottom: "1px solid var(--tool-line)" },
  groupTitle: { fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--tool-ink-3)", margin: "0 0 12px" },
  label: { display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--tool-ink-2)", margin: "0 0 5px" },
  field: { marginBottom: 14 },
  input: { width: "100%", border: "1px solid var(--tool-line-2)", borderRadius: 8, padding: "8px 10px", fontFamily: "inherit", fontSize: 13, color: "var(--tool-ink)", background: "#fff" },
  area: { width: "100%", border: "1px solid var(--tool-line-2)", borderRadius: 8, padding: "8px 10px", fontFamily: "inherit", fontSize: 13, color: "var(--tool-ink)", background: "#fff", resize: "vertical", minHeight: 56, lineHeight: 1.45 },
};

function Field({ label, children }) {
  return <div style={ps.field}>{label && <label style={ps.label}>{label}</label>}{children}</div>;
}
function TextInput({ value, onChange, placeholder }) {
  return <input style={ps.input} value={value || ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}
function TextArea({ value, onChange, placeholder }) {
  return <textarea style={ps.area} value={value || ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

// Catálogo enxuto do Font Awesome Free com termos de busca em português.
// O nome persistido continua compatível com os projetos antigos.
const FREE_ICONS = [
  ["lightbulb","ideia luz lâmpada dica"],["star","estrela favorito destaque"],["heart","coração saúde amor"],
  ["heart-pulse","saúde pulso medicina"],["brain","cérebro mente inteligência"],["graduation-cap","educação curso diploma"],
  ["book-open","livro leitura aprender"],["book","livro material"],["bookmark","marcador salvar"],["pen","editar escrever lápis"],
  ["check","correto concluído sim"],["check-circle","correto concluído sucesso"],["xmark","fechar erro não"],
  ["triangle-exclamation","alerta atenção risco"],["circle-info","informação ajuda"],["circle-question","dúvida pergunta ajuda"],
  ["shield-halved","proteção segurança defesa"],["lock","cadeado privacidade segurança"],["key","chave acesso"],
  ["user","pessoa usuário"],["users","pessoas equipe grupo"],["user-doctor","médico saúde pessoa"],
  ["comments","conversa chat diálogo"],["comment","comentário fala"],["message","mensagem conversa"],
  ["gear","engrenagem configuração processo"],["gears","engrenagens sistema processo"],["wrench","ferramenta manutenção"],
  ["diagram-project","fluxo projeto conexão"],["sitemap","hierarquia estrutura mapa"],["route","rota caminho jornada"],
  ["arrow-right","seta direita próximo"],["arrows-left-right","troca comparação"],["rotate","ciclo repetir atualizar"],
  ["bolt","energia raio velocidade"],["fire","fogo quente tendência"],["sun","sol claro dia"],["moon","lua noite"],
  ["leaf","folha natureza sustentabilidade"],["seedling","planta crescimento natureza"],["tree","árvore natureza"],
  ["flask","laboratório ciência experimento"],["atom","átomo ciência"],["dna","dna biologia genética"],
  ["chart-line","gráfico crescimento dados"],["chart-pie","gráfico pizza dados"],["table","tabela dados"],
  ["calendar","calendário data agenda"],["clock","relógio tempo"],["location-dot","local mapa ponto"],
  ["globe","mundo internet global"],["link","link conexão url"],["paperclip","anexo arquivo"],
  ["image","imagem foto"],["camera","câmera foto"],["video","vídeo filme"],["headphones","áudio podcast fone"],
  ["microphone","microfone voz áudio"],["play","reproduzir iniciar"],["download","baixar download"],["upload","enviar upload"],
  ["building","prédio organização empresa"],["house","casa início"],["school","escola educação"],
  ["briefcase","trabalho negócios"],["scale-balanced","justiça equilíbrio lei"],["gavel","lei decisão"],
  ["handshake","acordo parceria"],["people-group","equipe comunidade"],["person-chalkboard","professor apresentação"],
  ["magnifying-glass","busca pesquisa lupa"],["filter","filtro organizar"],["list-check","tarefas checklist"],
  ["target","alvo objetivo meta"],["trophy","prêmio conquista"],["medal","medalha conquista"],["flag","bandeira marco meta"],
];
// Busca no catálogo completo do Font Awesome Free (icones.js: 1.392 ícones sólidos, com termos em inglês e em português).
// Sem o catálogo carregado, cai nas sugestões acima. Cada palavra digitada precisa aparecer no começo de alguma palavra do ícone.
const faSemAcento = (s) => String(s || "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[̀-ͯ]/g, "");
let FA_INDEX = null;
function faIndex() {
  const cat = window.FA_ICONES;
  if (!cat) return null;
  if (FA_INDEX && FA_INDEX.n === cat.length) return FA_INDEX;
  const dicas = new Map(FREE_ICONS.map(([name, words]) => [name, faSemAcento(words)]));
  const items = cat.map(([name, label, ptCore, enExtra, ptExtra]) => ({
    name, label,
    forte: (faSemAcento(name.replace(/-/g, " ")) + " " + faSemAcento(label) + " " + faSemAcento(ptCore) + " " + (dicas.get(name) || "")).split(/\s+/).filter(Boolean),
    fraco: (faSemAcento(enExtra) + " " + faSemAcento(ptExtra)).split(/\s+/).filter(Boolean),
  }));
  FA_INDEX = { n: cat.length, items };
  return FA_INDEX;
}
function faBuscar(consulta) {
  const idx = faIndex();
  const toks = faSemAcento(consulta).split(/[\s,;]+/).filter(Boolean).map((w) => (w.length > 3 ? w.replace(/(es|s)$/, "") : w));
  if (!idx) {
    if (!toks.length) return { lista: FREE_ICONS.map(([name, words]) => ({ name, label: words })), total: FREE_ICONS.length, sugestoes: true };
    const lista = FREE_ICONS.filter(([name, words]) => toks.every((w) => faSemAcento(name + " " + words).includes(w))).map(([name, words]) => ({ name, label: words }));
    return { lista, total: lista.length };
  }
  if (!toks.length) return { lista: FREE_ICONS.map(([name, words]) => ({ name, label: words })), total: idx.n, sugestoes: true };
  const achados = [];
  idx.items.forEach((it) => {
    let pontos = 0;
    for (const w of toks) {
      let melhor = 0;
      for (const x of it.forte) { if (x === w) { melhor = 6; break; } if (x.startsWith(w)) melhor = Math.max(melhor, 4); }
      if (!melhor) for (const x of it.fraco) { if (x === w) { melhor = 2; break; } if (x.startsWith(w)) melhor = Math.max(melhor, 1); }
      if (!melhor) { pontos = 0; return; }
      pontos += melhor;
    }
    if (faSemAcento(it.name) === toks.join("-")) pontos += 10;
    achados.push({ it, pontos });
  });
  achados.sort((a, b) => b.pontos - a.pontos || a.it.name.length - b.it.name.length || (a.it.name < b.it.name ? -1 : 1));
  return { lista: achados.map(({ it }) => ({ name: it.name, label: it.label })), total: achados.length };
}
window.faBuscar = faBuscar;
function IconPicker({ value, onChange, placeholder }) {
  const [query, setQuery] = useStateP("");
  const [limite, setLimite] = useStateP(48);
  const [, setPronto] = useStateP(0);
  useEffectP(() => { if (!window.FA_ICONES) { const t = setInterval(() => { if (window.FA_ICONES) { clearInterval(t); setPronto(1); } }, 400); return () => clearInterval(t); } }, []);
  const { lista, total, sugestoes } = faBuscar(query);
  const mostra = lista.slice(0, limite);
  const cls = (name) => (window.fontAwesomeClass ? window.fontAwesomeClass(name) : "fa-solid fa-" + name);
  return <div>
    <div style={{ display: "flex", gap: 6 }}>
      <span style={{ width: 38, display: "grid", placeItems: "center", border: "1px solid var(--tool-line-2)", borderRadius: 8, background: "#fff", color: "var(--tool-sel)" }}><i className={cls(value || "icons")} /></span>
      <input style={ps.input} value={query} placeholder={placeholder || "Busque em português ou inglês: saúde, gato, prova, graph…"} onChange={(e) => { setQuery(e.target.value); setLimite(48); }} />
    </div>
    {value && <div style={{ fontSize: 11, color: "var(--tool-ink-3)", margin: "5px 0 0" }}>Ícone atual: <code>{value}</code></div>}
    <div style={{ fontSize: 11, color: "var(--tool-ink-3)", margin: "6px 0 4px" }}>{sugestoes ? `Sugestões · digite para buscar entre ${total.toLocaleString("pt-BR")} ícones` : total ? `${total.toLocaleString("pt-BR")} ${total === 1 ? "ícone" : "ícones"}` : "Nenhum ícone com essas palavras."}</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 5, maxHeight: 210, overflowY: "auto" }}>
      {mostra.map(({ name, label }) => <button type="button" key={name} title={name + (label ? " · " + label : "")} onClick={() => { onChange(name); setQuery(""); setLimite(48); }} style={{ height: 34, borderRadius: 7, cursor: "pointer", background: value === name ? "var(--tool-sel-soft)" : "#fff", color: value === name ? "var(--tool-sel)" : "var(--tool-ink-2)", border: value === name ? "2px solid var(--tool-sel)" : "1px solid var(--tool-line)" }}><i className={cls(name)} /></button>)}
    </div>
    {lista.length > limite && <button type="button" onClick={() => setLimite(limite + 72)} style={{ ...miniBtn, marginTop: 6 }}>Mostrar mais ({lista.length - limite})</button>}
    {!lista.length && query.trim() && <button type="button" onClick={() => { onChange(query.trim().toLowerCase().replace(/\s+/g, "-")); setQuery(""); }} style={{ ...miniBtn, marginTop: 6 }}>Usar «{query.trim().toLowerCase().replace(/\s+/g, "-")}» como nome do ícone</button>}
    {value && <button type="button" onClick={() => onChange("")} style={{ ...miniBtn, marginTop: 6 }}>Usar ícone padrão</button>}
  </div>;
}
function RichTextArea({ value, onChange, placeholder, single = false }) {
  const ref = useRefP(null);
  useEffectP(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) ref.current.innerHTML = value || "";
  }, [value]);
  const command = (cmd) => {
    document.execCommand(cmd, false, null);
    if (ref.current) onChange(ref.current.innerHTML);
  };
  return (
    <div style={{ border: "1px solid var(--tool-line-2)", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
      <div style={{ display: "flex", gap: 3, padding: "5px 6px", borderBottom: "1px solid var(--tool-line)", background: "var(--tool-surface)" }}>
        <button type="button" title="Negrito" aria-label="Negrito" onMouseDown={(e) => e.preventDefault()} onClick={() => command("bold")} style={{ ...richBtn, fontWeight: 800 }}>B</button>
        <button type="button" title="Itálico" aria-label="Itálico" onMouseDown={(e) => e.preventDefault()} onClick={() => command("italic")} style={{ ...richBtn, fontFamily: "var(--font-serif)", fontStyle: "italic" }}>i</button>
      </div>
      <div
        ref={ref} contentEditable suppressContentEditableWarning spellCheck={!!(window.Corretor && !window.Corretor.supported)}
        data-placeholder={placeholder || ""}
        onFocus={() => { try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch (e) {} }}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onPaste={(e) => { e.preventDefault(); document.execCommand("insertText", false, (e.clipboardData || window.clipboardData).getData("text/plain")); }}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          if (!single) {
            document.execCommand("insertParagraph", false, null);
            if (ref.current) onChange(ref.current.innerHTML);
          }
        }}
        style={{ minHeight: single ? 36 : 72, padding: "8px 10px", outline: "none", fontFamily: "inherit", fontSize: 13, lineHeight: 1.45, color: "var(--tool-ink)" }}
      />
    </div>
  );
}
const richBtn = { display: "grid", placeItems: "center", width: 26, height: 24, border: "1px solid var(--tool-line-2)", borderRadius: 6, background: "#fff", color: "var(--tool-ink)", cursor: "pointer", fontSize: 13 };
function Toggle({ value, onChange, label }) {
  return (
    <button onClick={() => onChange(!value)} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", background: "none", border: 0, padding: "2px 0", cursor: "pointer", color: "var(--tool-ink)" }}>
      <span style={{ width: 38, height: 22, borderRadius: 999, background: value ? "var(--tool-accent)" : "var(--tool-line-2)", position: "relative", transition: "background 140ms", flexShrink: 0 }}>
        <span style={{ position: "absolute", top: 2, left: value ? 18 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 140ms", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} />
      </span>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
    </button>
  );
}
function Segmented({ value, onChange, options }) {
  return (
    <div style={{ display: "flex", gap: 4, background: "var(--tool-surface)", border: "1px solid var(--tool-line)", borderRadius: 9, padding: 3 }}>
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)} style={{ flex: 1, padding: "6px 4px", border: 0, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", background: value === o.id ? "#fff" : "transparent", color: value === o.id ? "var(--tool-ink)" : "var(--tool-ink-2)", boxShadow: value === o.id ? "0 1px 2px rgba(0,0,0,0.12)" : "none" }}>{o.label}</button>
      ))}
    </div>
  );
}
// Compatibilidade visual para temas que ainda usam a paleta antiga.
const LEGACY_BG_TONE_VAR = {
  paper: "--paper", sand: "--sand", sage: "--sage-soft", lavender: "--lavender-soft",
  coral: "--coral-soft", ocean: "--ocean-soft", marigold: "--marigold-soft",
  ink: "--ink", petrol: "--ocean-deep", "ocean-vivid": "--ocean", terracotta: "--terracotta",
  "terracotta-deep": "--terracotta-deep", "coral-deep": "--coral-deep", "marigold-deep": "--marigold-deep",
  "sage-deep": "--sage-deep", "sage-green": "--sage", "lavender-deep": "--lavender-deep",
};
function bgSwatchColor(t) {
  if (t.value && /^#|^rgb|^hsl|^oklch|^oklab|^color\(/i.test(t.value)) return t.value;
  const v = t.cssVar || LEGACY_BG_TONE_VAR[t.id];
  if (v && typeof getComputedStyle === "function") {
    const c = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
    if (c) return c;
  }
  return t.swatch;
}
function ToneSwatches({ value, onChange }) {
  const theme = window.AULA_ACTIVE_THEME || {};
  const selected = (theme.topicSurfaceAliases && theme.topicSurfaceAliases[value]) || value;
  const groups = window.BG_TONES.reduce((all, tone) => {
    const name = tone.group || "Cores";
    (all[name] || (all[name] = [])).push(tone);
    return all;
  }, {});
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {Object.entries(groups).map(([name, tones]) => (
        <div key={name}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--tool-ink-3)", marginBottom: 5 }}>{name}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
            {tones.map((t) => (
              <button key={t.id} title={t.label} aria-label={t.label} onClick={() => onChange(t.id)}
                style={{ aspectRatio: "1", borderRadius: 7, background: bgSwatchColor(t), cursor: "pointer",
                  border: selected === t.id ? "2.5px solid var(--tool-sel)" : "1px solid rgba(0,0,0,0.12)",
                  boxShadow: selected === t.id ? "0 0 0 2px var(--tool-sel-soft)" : "none" }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Dropcap initial-letter color. Mirrors the .dropcap / .dropcap-* tonal
// variants in colors_and_type.css.
const DROPCAP_TONES = [
  { id: "terracotta", label: "Terracota", swatch: "#D85C3C" },
  { id: "ink",        label: "Tinta",     swatch: "#1B1A17" },
  { id: "ocean",      label: "Oceano",    swatch: "#2C5B7A" },
  { id: "sage",       label: "Sage",      swatch: "#6E8B5C" },
  { id: "lavender",   label: "Lavanda",   swatch: "#7C6BAD" },
  { id: "marigold",   label: "Marigold",  swatch: "#B8821D" },
];
function DropcapTones({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
      {DROPCAP_TONES.map((t) => (
        <button key={t.id} title={t.label} onClick={() => onChange(t.id)}
          style={{ width: 30, height: 30, borderRadius: 7, background: "#fff", cursor: "pointer", display: "grid", placeItems: "center",
            border: value === t.id ? "2.5px solid var(--tool-sel)" : "1px solid var(--tool-line-2)",
            boxShadow: value === t.id ? "0 0 0 2px var(--tool-sel-soft)" : "none" }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 600, lineHeight: 1, color: t.swatch }}>A</span>
        </button>
      ))}
    </div>
  );
}
// Texto alternativo (acessibilidade): descreve a imagem para quem não a enxerga.
function AltFields({ p, setP }) {
  if (!p.src) return null;
  return (<>
    <Field label="Texto alternativo (acessibilidade)">
      <TextArea value={p.alt} onChange={(v) => setP({ alt: v })} placeholder={p.decorative ? "Imagem decorativa: sem descrição" : "Descreva o que a imagem mostra, em uma frase."} />
      <p style={{ fontSize: 11, color: "var(--tool-ink-3)", margin: "5px 0 0", lineHeight: 1.4 }}>Quem usa leitor de tela ouve este texto no lugar da imagem. Descreva a informação, não “imagem de…”.</p>
    </Field>
    <Toggle value={!!p.decorative} onChange={(v) => setP({ decorative: v })} label="Imagem decorativa (só enfeita)" />
    <div style={{ height: 10 }} />
  </>);
}
function ImageField({ src, onChange, label }) {
  const ref = useRefP(null);
  const pick = (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => onChange(String(r.result));
    r.readAsDataURL(f);
  };
  return (
    <Field label={label}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {src
          ? <img src={src} alt="" style={{ width: 56, height: 42, objectFit: "cover", borderRadius: 6, border: "1px solid var(--tool-line-2)" }} />
          : <div style={{ width: 56, height: 42, borderRadius: 6, border: "1px dashed var(--tool-line-2)", display: "grid", placeItems: "center", color: "var(--tool-ink-3)" }}><TIcon name="image" /></div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <button onClick={() => ref.current && ref.current.click()} style={miniBtn}>Enviar imagem</button>
          {src && <button onClick={() => onChange("")} style={{ ...miniBtn, color: "var(--tool-accent)" }}>Remover</button>}
        </div>
        <input ref={ref} type="file" accept="image/*" onChange={pick} style={{ display: "none" }} />
      </div>
      {!src && <p style={{ fontSize: 11, color: "var(--tool-ink-3)", margin: "7px 0 0" }}>Ou arraste uma imagem direto no espaço da página.</p>}
    </Field>
  );
}
const miniBtn = { background: "#fff", border: "1px solid var(--tool-line-2)", borderRadius: 7, padding: "5px 10px", fontSize: 12, fontWeight: 600, color: "var(--tool-ink)", cursor: "pointer", fontFamily: "inherit", textAlign: "left" };

// ── generic array editor (objects with text fields) ──
function ItemList({ items, onChange, fields, label, template }) {
  const add = () => onChange([...(items || []), JSON.parse(JSON.stringify(template))]);
  const remove = (i) => onChange(items.filter((_, j) => j !== i));
  const move = (i, d) => { const a = [...items]; const ni = i + d; if (ni < 0 || ni >= a.length) return; const t = a[i]; a[i] = a[ni]; a[ni] = t; onChange(a); };
  const setF = (i, k, v) => onChange(items.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  return (
    <div>
      {(items || []).map((it, i) => (
        <div key={i} style={{ border: "1px solid var(--tool-line)", borderRadius: 9, padding: 10, marginBottom: 9, background: "var(--tool-surface)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--tool-ink-3)" }}>{label} {i + 1}</span>
            <div style={{ display: "flex", gap: 2 }}>
              <button title="Subir" onClick={() => move(i, -1)} style={iconBtn}><TIcon name="up" size={14} /></button>
              <button title="Descer" onClick={() => move(i, 1)} style={iconBtn}><TIcon name="down" size={14} /></button>
              <button title="Remover" onClick={() => remove(i)} style={{ ...iconBtn, color: "var(--tool-accent)" }}><TIcon name="trash" size={14} /></button>
            </div>
          </div>
          {fields.map((f) => (
            <Field key={f.key} label={f.label}>
              {f.type === "swatch"
                ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {f.options.map((o) => (
                      <button key={o.id} title={o.label} onClick={() => setF(i, f.key, o.id)}
                        style={{ width: 26, height: 26, borderRadius: "50%", background: o.swatch, cursor: "pointer",
                          border: (it[f.key] || f.options[0].id) === o.id ? "2.5px solid var(--tool-sel)" : "1px solid rgba(0,0,0,0.12)",
                          boxShadow: (it[f.key] || f.options[0].id) === o.id ? "0 0 0 2px var(--tool-sel-soft)" : "none" }} />
                    ))}
                  </div>
                : f.type === "select"
                ? <Segmented value={it[f.key] || (f.options[0] && f.options[0].id)} onChange={(v) => setF(i, f.key, v)} options={f.options} />
                : f.type === "image"
                ? <ImageField src={it[f.key]} onChange={(v) => setF(i, f.key, v)} label={null} />
                : f.key === "icon"
                ? <IconPicker value={it[f.key]} onChange={(v) => setF(i, f.key, v)} placeholder="Buscar ícone gratuito…" />
                : f.rich
                ? <RichTextArea value={it[f.key]} placeholder={f.placeholder} single={!!f.single} onChange={(v) => setF(i, f.key, v)} />
                : f.single
                ? <TextInput value={it[f.key]} placeholder={f.placeholder} onChange={(v) => setF(i, f.key, v)} />
                : <TextArea value={it[f.key]} placeholder={f.placeholder} onChange={(v) => setF(i, f.key, v)} />}
              {f.hint && <p style={{ fontSize: 10.5, color: "var(--tool-ink-3)", margin: "4px 2px 0", lineHeight: 1.4 }}>{f.hint}</p>}
            </Field>
          ))}
        </div>
      ))}
      <button onClick={add} style={addBtn}><TIcon name="plus" size={14} /> Adicionar {label.toLowerCase()}</button>
    </div>
  );
}
const iconBtn = { display: "grid", placeItems: "center", width: 26, height: 26, border: "1px solid var(--tool-line-2)", background: "#fff", borderRadius: 6, cursor: "pointer", color: "var(--tool-ink-2)" };
const addBtn = { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "9px", border: "1.5px dashed var(--tool-line-2)", background: "#fff", borderRadius: 9, fontSize: 12.5, fontWeight: 600, color: "var(--tool-ink-2)", cursor: "pointer", fontFamily: "inherit" };

// ── string-array editor (referências) ──
function StringList({ items, onChange, label, placeholder }) {
  const add = () => onChange([...(items || []), ""]);
  const remove = (i) => onChange(items.filter((_, j) => j !== i));
  const move = (i, d) => { const a = [...items]; const ni = i + d; if (ni < 0 || ni >= a.length) return; const t = a[i]; a[i] = a[ni]; a[ni] = t; onChange(a); };
  return (
    <div>
      {(items || []).map((it, i) => (
        <div key={i} style={{ marginBottom: 9 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 2, marginBottom: 3 }}>
            <button onClick={() => move(i, -1)} style={iconBtn}><TIcon name="up" size={13} /></button>
            <button onClick={() => move(i, 1)} style={iconBtn}><TIcon name="down" size={13} /></button>
            <button onClick={() => remove(i)} style={{ ...iconBtn, color: "var(--tool-accent)" }}><TIcon name="trash" size={13} /></button>
          </div>
          <TextArea value={it} placeholder={placeholder} onChange={(v) => onChange(items.map((x, j) => (j === i ? v : x)))} />
        </div>
      ))}
      <button onClick={add} style={addBtn}><TIcon name="plus" size={14} /> Adicionar {label.toLowerCase()}</button>
    </div>
  );
}

// ── quiz editor ──
function QuizEditor({ p, setP }) {
  const setQ = (i, patch) => setP({ questions: p.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) });
  const addQ = () => setP({ questions: [...p.questions, { objective: "", q: "Nova questão?", options: ["Alternativa A", "Alternativa B"], answer: 0, explanation: "" }] });
  const rmQ = (i) => setP({ questions: p.questions.filter((_, j) => j !== i) });
  return (
    <div>
      <Field label="Título"><TextInput value={p.title} onChange={(v) => setP({ title: v })} /></Field>
      <Field label="Introdução (opcional)"><RichTextArea value={p.intro} onChange={(v) => setP({ intro: v })} /></Field>
      <Field><Toggle value={p.avaliativo} onChange={(v) => setP({ avaliativo: v, title: v && p.title === "Diagnóstico inicial" ? "Revisão e avaliação final" : p.title })} label="Avaliação final (registra nota)" /></Field>
      {p.avaliativo && (
        <>
          <p style={{ fontSize: 11.5, color: "var(--tool-ink-3)", margin: "0 0 10px", lineHeight: 1.45 }}>É recomendado associar as questões aos objetivos de aprendizagem. A nota é reportada à plataforma na escala <strong>0–10</strong>.</p>
          <Field label="Nota mínima (0–10)"><TextInput value={String(p.passMark)} onChange={(v) => setP({ passMark: Number(v) || 0 })} /></Field>
        </>
      )}
      {p.questions.map((q, i) => (
        <div key={i} style={{ border: "1px solid var(--tool-line)", borderRadius: 9, padding: 11, marginBottom: 10, background: "var(--tool-surface)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--tool-ink-3)" }}>Questão {i + 1}</span>
            <button onClick={() => rmQ(i)} style={{ ...iconBtn, color: "var(--tool-accent)" }}><TIcon name="trash" size={14} /></button>
          </div>
          {p.avaliativo && <Field label="Objetivo de aprendizagem avaliado (opcional)"><TextInput value={q.objective || ""} onChange={(v) => setQ(i, { objective: v })} placeholder="Ex.: Explicar o papel da membrana plasmática" /></Field>}
          <Field label="Enunciado"><RichTextArea value={q.q} onChange={(v) => setQ(i, { q: v })} /></Field>
          <label style={ps.label}>Alternativas (marque a correta)</label>
          {q.options.map((opt, oi) => (
            <div key={oi} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
              <input type="radio" checked={q.answer === oi} onChange={() => setQ(i, { answer: oi })} style={{ accentColor: "var(--tool-sel)" }} />
              <input style={{ ...ps.input, flex: 1 }} value={opt} onChange={(e) => setQ(i, { options: q.options.map((o, j) => (j === oi ? e.target.value : o)) })} />
              <button onClick={() => setQ(i, { options: q.options.filter((_, j) => j !== oi), answer: Math.max(0, q.answer - (oi <= q.answer ? 1 : 0)) })} style={iconBtn}><TIcon name="trash" size={13} /></button>
            </div>
          ))}
          <button onClick={() => setQ(i, { options: [...q.options, "Nova alternativa"] })} style={{ ...addBtn, marginBottom: 9 }}><TIcon name="plus" size={13} /> Alternativa</button>
          <Field label="Explicação (gabarito)"><RichTextArea value={q.explanation} onChange={(v) => setQ(i, { explanation: v })} /></Field>
        </div>
      ))}
      <button onClick={addQ} style={addBtn}><TIcon name="plus" size={14} /> Adicionar questão</button>
    </div>
  );
}

// ── the panel ──
function PropertiesPanel({ block, update, mergePrev, onRenumberEquations, onInsertEquation, onInsertImage, onInsertCode, onBreakProse, onBreakTopic }) {
  if (!block) {
    return <div style={{ padding: 24, color: "var(--tool-ink-3)", fontSize: 13, lineHeight: 1.5 }}>Selecione um bloco na página para editar suas propriedades, ou arraste um bloco da biblioteca à esquerda.</div>;
  }
  const def = window.BLOCK_BY_TYPE[block.type];
  const p = block.props;
  const setP = (patch) => update({ props: { ...p, ...patch } });
  // Topic children have no band of their own (no bg/pad on the object).
  const isChild = !("bg" in block);

  return (
    <div className="tool-scroll" style={{ overflowY: "auto", height: "100%" }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--tool-line)", display: "flex", alignItems: "center", gap: 9 }}>
        <window.Icon name={def.icon} size={17} stroke={1.9} color="var(--tool-ink-2)" />
        <span style={{ fontSize: 14, fontWeight: 700 }}>{def.label}</span>
      </div>

      {isChild && (
        <div style={ps.group}>
          <p style={{ fontSize: 12, color: "var(--tool-ink-3)", margin: "2px 0 14px", lineHeight: 1.5 }}>Este bloco está dentro de uma <strong>estrutura de conteúdo</strong> — tópico, coluna, aba de accordion ou marco da linha do tempo — e não cria uma faixa própria. O espaçamento é compacto e automático.</p>
        </div>
      )}

      {/* Aparência (apenas para blocos com banda própria — não filhos de tópico) */}
      {!isChild && !def.pdfOnly && !def.bgLocked && (
        <div style={ps.group}>
          <p style={ps.groupTitle}>Fundo da seção</p>
          <Field><ToneSwatches value={block.bg} onChange={(v) => update({ bg: v })} /></Field>
        </div>
      )}
      {!isChild && !def.pdfOnly && def.bgLocked && (
        <div style={ps.group}><p style={{ ...ps.groupTitle, marginBottom: 8 }}>Fundo</p><p style={{ fontSize: 12, color: "var(--tool-ink-3)", margin: "0 0 14px", lineHeight: 1.45 }}>Este bloco tem cor de fundo padronizada pelo design system.</p></div>
      )}

      {!isChild && !def.pdfOnly && (
        <div style={ps.group}>
          <p style={ps.groupTitle}>Espaçamento</p>
          <Field label="Respiro vertical"><Segmented value={block.pad} onChange={(v) => update({ pad: v })} options={window.PAD_PRESETS.map((x) => ({ id: x.id, label: x.label }))} /></Field>
        </div>
      )}

      {/* Conteúdo estrutural por tipo */}
      <div style={ps.group}>
        <p style={ps.groupTitle}>Conteúdo</p>
        {renderTypeContent(block, p, setP, mergePrev, onRenumberEquations, onInsertEquation, { onInsertImage, onInsertCode, onBreakProse, onBreakTopic })}
        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}

// ── tabela editor (headers + 2D rows) ──
// Tons de acento vêm do TEMA ATIVO (themes.js) — não são fixos da marca Aula.
const TL_TONE_LABELS = { ocean: "Oceano", terracotta: "Terracota", sage: "Sage", marigold: "Marigold", lavender: "Lavanda", coral: "Coral" };
function themeTones() {
  const t = (window.AULA_ACTIVE_THEME && window.AULA_ACTIVE_THEME.tones) || {
    ocean: "#2C5B7A", terracotta: "#D85C3C", sage: "#6E8B5C", marigold: "#FFCB47", lavender: "#7C6BAD", coral: "#E89F8E",
  };
  return Object.keys(t).map((id) => ({ id, label: TL_TONE_LABELS[id] || id, swatch: t[id] }));
}
function ToneDots({ value, onChange, size = 26 }) {
  const tones = themeTones();
  const fallback = tones[0] ? tones[0].id : "ocean";
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {tones.map((t) => (
        <button key={t.id} title={t.label} onClick={() => onChange(t.id)}
          style={{ width: size, height: size, borderRadius: "50%", background: t.swatch, cursor: "pointer",
            border: (value || fallback) === t.id ? "2.5px solid var(--tool-sel)" : "1px solid rgba(0,0,0,0.12)",
            boxShadow: (value || fallback) === t.id ? "0 0 0 2px var(--tool-sel-soft)" : "none" }} />
      ))}
    </div>
  );
}
function TableEditor({ p, setP }) {
  const headers = p.headers || [];
  const rows = p.rows || [];
  const setHeader = (ci, v) => setP({ headers: headers.map((h, i) => (i === ci ? v : h)) });
  const addCol = () => setP({ headers: [...headers, "Coluna"], rows: rows.map((r) => [...r, ""]) });
  const rmCol = (ci) => { if (headers.length <= 1) return; setP({ headers: headers.filter((_, i) => i !== ci), rows: rows.map((r) => r.filter((_, j) => j !== ci)) }); };
  const setCell = (ri, ci, v) => setP({ rows: rows.map((r, i) => (i === ri ? r.map((c, j) => (j === ci ? v : c)) : r)) });
  const addRow = () => setP({ rows: [...rows, headers.map(() => "")] });
  const rmRow = (ri) => setP({ rows: rows.filter((_, i) => i !== ri) });
  const moveRow = (ri, d) => { const a = [...rows]; const ni = ri + d; if (ni < 0 || ni >= a.length) return; const t = a[ri]; a[ri] = a[ni]; a[ni] = t; setP({ rows: a }); };
  return (<>
    <Field label="Título da tabela"><TextInput value={p.caption} onChange={(v) => setP({ caption: v })} /></Field>
    <Field label="Fonte (opcional)"><TextInput value={p.fonte} onChange={(v) => setP({ fonte: v })} /></Field>
    <Field><Toggle value={p.striped !== false} onChange={(v) => setP({ striped: v })} label="Listras (zebra)" /></Field>
    <Field><Toggle value={p.destacarPrimeira !== false} onChange={(v) => setP({ destacarPrimeira: v })} label="Destacar a 1ª coluna" /></Field>
    <Field><Toggle value={!!p.compact} onChange={(v) => setP({ compact: v })} label="Compacta" /></Field>
    <label style={ps.label}>Colunas (cabeçalho)</label>
    {headers.map((h, ci) => (
      <div key={ci} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
        <input style={{ ...ps.input, flex: 1 }} value={h} onChange={(e) => setHeader(ci, e.target.value)} />
        <button title="Remover coluna" onClick={() => rmCol(ci)} disabled={headers.length <= 1} style={{ ...iconBtn, opacity: headers.length <= 1 ? 0.4 : 1 }}><TIcon name="trash" size={13} /></button>
      </div>
    ))}
    <button onClick={addCol} style={{ ...addBtn, marginBottom: 14 }}><TIcon name="plus" size={13} /> Coluna</button>
    <label style={ps.label}>Linhas</label>
    {rows.map((r, ri) => (
      <div key={ri} style={{ border: "1px solid var(--tool-line)", borderRadius: 9, padding: 10, marginBottom: 9, background: "var(--tool-surface)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--tool-ink-3)" }}>Linha {ri + 1}</span>
          <div style={{ display: "flex", gap: 2 }}>
            <button onClick={() => moveRow(ri, -1)} style={iconBtn}><TIcon name="up" size={13} /></button>
            <button onClick={() => moveRow(ri, 1)} style={iconBtn}><TIcon name="down" size={13} /></button>
            <button onClick={() => rmRow(ri)} style={{ ...iconBtn, color: "var(--tool-accent)" }}><TIcon name="trash" size={13} /></button>
          </div>
        </div>
        {headers.map((h, ci) => (
          <Field key={ci} label={h || ("Coluna " + (ci + 1))}>
            <TextInput value={r[ci]} onChange={(v) => setCell(ri, ci, v)} />
          </Field>
        ))}
      </div>
    ))}
    <button onClick={addRow} style={addBtn}><TIcon name="plus" size={14} /> Adicionar linha</button>
  </>);
}

// ── filmstrip editor (carrossel hero/cards, imagem por item) ──
function FilmstripEditor({ p, setP }) {
  const items = p.items || [];
  const cards = (p.mode || "hero") === "cards";
  const setItem = (i, patch) => setP({ items: items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  const add = () => setP({ items: [...items, { tag: "", title: "Item", text: "", back: "", tone: "ocean", src: "", slotId: "" }] });
  const rm = (i) => setP({ items: items.filter((_, j) => j !== i) });
  const move = (i, d) => { const a = [...items]; const ni = i + d; if (ni < 0 || ni >= a.length) return; const t = a[i]; a[i] = a[ni]; a[ni] = t; setP({ items: a }); };
  return (<>
    <Field label="Modo"><Segmented value={p.mode || "hero"} onChange={(v) => setP({ mode: v })} options={[{ id: "hero", label: "Hero" }, { id: "cards", label: "Cards (flip)" }]} /></Field>
    <Field label="Rótulo da seção"><TextInput value={p.label} onChange={(v) => setP({ label: v })} /></Field>
    {!cards && <Field label="Proporção das imagens"><Segmented value={p.ratio || "3/2"} onChange={(v) => setP({ ratio: v })} options={[{ id: "3/2", label: "3:2" }, { id: "16/9", label: "16:9" }, { id: "1/1", label: "1:1" }]} /></Field>}
    <p style={hint}>{cards ? "Cartões com imagem + texto; o verso (“ver mais”) aparece ao clicar. Defina a cor do verso em cada card." : "Imagens grandes com título e legenda sobre a imagem. Arraste de lado ou use as setas para navegar."}</p>
    <div style={{ height: 8 }} />
    {items.map((it, i) => (
      <div key={i} style={{ border: "1px solid var(--tool-line)", borderRadius: 9, padding: 10, marginBottom: 9, background: "var(--tool-surface)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--tool-ink-3)" }}>Item {i + 1}</span>
          <div style={{ display: "flex", gap: 2 }}>
            <button onClick={() => move(i, -1)} style={iconBtn}><TIcon name="up" size={13} /></button>
            <button onClick={() => move(i, 1)} style={iconBtn}><TIcon name="down" size={13} /></button>
            <button onClick={() => rm(i)} style={{ ...iconBtn, color: "var(--tool-accent)" }}><TIcon name="trash" size={13} /></button>
          </div>
        </div>
        <ImageField label="Imagem" src={it.src} onChange={(v) => setItem(i, { src: v })} />
        <Field label="Etiqueta (tag)"><TextInput value={it.tag} onChange={(v) => setItem(i, { tag: v })} /></Field>
        <Field label="Título"><TextInput value={it.title} onChange={(v) => setItem(i, { title: v })} /></Field>
        <Field label="Texto"><TextArea value={it.text} onChange={(v) => setItem(i, { text: v })} /></Field>
        {cards && <Field label="Verso (“ver mais”)"><TextArea value={it.back} onChange={(v) => setItem(i, { back: v })} /></Field>}
        {cards && <Field label="Cor do verso"><ToneDots value={it.tone} onChange={(v) => setItem(i, { tone: v })} /></Field>}
      </div>
    ))}
    <button onClick={add} style={addBtn}><TIcon name="plus" size={14} /> Adicionar item</button>
  </>);
}

// ── linha do tempo editor (eras → marcos aninhados) ──
function TimelineEditor({ p, setP }) {
  const eras = p.eras || [];
  const setEra = (ei, patch) => setP({ eras: eras.map((e, j) => (j === ei ? { ...e, ...patch } : e)) });
  const addEra = () => setP({ eras: [...eras, { label: "Novo período", range: "", tone: "ocean", events: [{ date: "Ano", title: "Marco", text: "", src: "", slotId: "", open: false, children: [] }] }] });
  const rmEra = (ei) => setP({ eras: eras.filter((_, j) => j !== ei) });
  const moveEra = (ei, d) => { const a = [...eras]; const ni = ei + d; if (ni < 0 || ni >= a.length) return; const t = a[ei]; a[ei] = a[ni]; a[ni] = t; setP({ eras: a }); };
  return (<>
    <Field label="Título (opcional)"><TextInput value={p.title} onChange={(v) => setP({ title: v })} /></Field>
    {eras.map((era, ei) => {
      const events = era.events || [];
      const setEvents = (evs) => setEra(ei, { events: evs });
      const setEvent = (vi, patch) => setEvents(events.map((ev, k) => (k === vi ? { ...ev, ...patch } : ev)));
      const addEvent = () => setEvents([...events, { date: "Ano", title: "Marco", text: "", src: "", slotId: "", open: false, children: [] }]);
      const rmEvent = (vi) => setEvents(events.filter((_, k) => k !== vi));
      const moveEvent = (vi, d) => { const a = [...events]; const ni = vi + d; if (ni < 0 || ni >= a.length) return; const t = a[vi]; a[vi] = a[ni]; a[ni] = t; setEvents(a); };
      return (
        <div key={ei} style={{ border: "1px solid var(--tool-line-2)", borderRadius: 10, padding: 11, marginBottom: 12, background: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--tool-ink-2)" }}>Período {ei + 1}</span>
            <div style={{ display: "flex", gap: 2 }}>
              <button onClick={() => moveEra(ei, -1)} style={iconBtn}><TIcon name="up" size={13} /></button>
              <button onClick={() => moveEra(ei, 1)} style={iconBtn}><TIcon name="down" size={13} /></button>
              <button onClick={() => rmEra(ei)} style={{ ...iconBtn, color: "var(--tool-accent)" }}><TIcon name="trash" size={13} /></button>
            </div>
          </div>
          <Field label="Rótulo do período"><TextInput value={era.label} onChange={(v) => setEra(ei, { label: v })} /></Field>
          <Field label="Intervalo (ex.: 1997–2004)"><TextInput value={era.range} onChange={(v) => setEra(ei, { range: v })} /></Field>
          <Field label="Cor do período"><ToneDots value={era.tone} onChange={(v) => setEra(ei, { tone: v })} size={24} /></Field>
          <label style={ps.label}>Marcos</label>
          {events.map((ev, vi) => (
            <div key={vi} style={{ border: "1px solid var(--tool-line)", borderRadius: 8, padding: 9, marginBottom: 7, background: "var(--tool-surface)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--tool-ink-3)" }}>Marco {vi + 1}</span>
                <div style={{ display: "flex", gap: 2 }}>
                  <button onClick={() => moveEvent(vi, -1)} style={iconBtn}><TIcon name="up" size={12} /></button>
                  <button onClick={() => moveEvent(vi, 1)} style={iconBtn}><TIcon name="down" size={12} /></button>
                  <button onClick={() => rmEvent(vi)} style={{ ...iconBtn, color: "var(--tool-accent)" }}><TIcon name="trash" size={12} /></button>
                </div>
              </div>
              <Field label="Data"><TextInput value={ev.date} onChange={(v) => setEvent(vi, { date: v })} /></Field>
              <Field label="Título"><TextInput value={ev.title} onChange={(v) => setEvent(vi, { title: v })} /></Field>
              <Field label="Texto"><TextArea value={ev.text} onChange={(v) => setEvent(vi, { text: v })} /></Field>
              <ImageField label="Imagem (opcional)" src={ev.src} onChange={(v) => setEvent(vi, { src: v })} />
              <Field><Toggle value={!!ev.open} onChange={(v) => setEvent(vi, { open: v })} label="Começar aberto" /></Field>
            </div>
          ))}
          <button onClick={addEvent} style={{ ...addBtn, marginBottom: 2 }}><TIcon name="plus" size={13} /> Marco</button>
        </div>
      );
    })}
    <button onClick={addEra} style={addBtn}><TIcon name="plus" size={14} /> Adicionar período</button>
  </>);
}


// ── Equação: fórmula em LaTeX (KaTeX) com duas paletas — «Matemática e Física» e «Química e Bioquímica» ──
// Os catálogos ficam em equacao-catalogo.js (window.EQ) e equacao-quimica.js (window.EQ.CHEM). A fórmula
// continua sendo texto LaTeX (equações antigas abrem e editam como antes); a paleta só ajuda a escrevê-la:
// modelos com campos (Tab pula de campo em campo), busca, prévia e construtores de matriz e de reação.
const EQ_BTN = { border: "1px solid var(--tool-line-2)", background: "#fff", borderRadius: 7, padding: "4px 7px", minWidth: 34, minHeight: 32, fontSize: 13, cursor: "pointer", color: "var(--tool-ink)", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", lineHeight: 1.25, scrollMarginTop: 72, scrollMarginBottom: 12 };
const EQ_TPL_BTN = { ...EQ_BTN, border: "1px dashed var(--tool-accent, #C4553A)", background: "var(--tool-surface, #faf8f3)", paddingRight: 11 };
const EQ_SUBH = { flexBasis: "100%", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--tool-ink-3)", margin: "8px 0 0" };

// Atalhos rápidos: os botões de sempre do painel (estruturas, símbolos, conjuntos e lógica), com o mesmo
// comportamento de antes: um clique insere o trecho no cursor (o «¤» marca onde o cursor fica; um trecho
// selecionado entra ali). Sem campos nem Tab: para isso há as paletas.
const EQ_RAP_STRUCT = [
  ["a/b", "\\frac{¤}{}", "Fração"], ["√", "\\sqrt{¤}", "Raiz quadrada"], ["ⁿ√", "\\sqrt[¤]{}", "Raiz de índice n"],
  ["xⁿ", "^{¤}", "Potência (expoente)"], ["xₙ", "_{¤}", "Índice (subscrito)"], ["Σ", "\\sum_{i=1}^{n} ¤", "Somatório"],
  ["∫", "\\int_{a}^{b} ¤\\,dx", "Integral"], ["lim", "\\lim_{x \\to ¤}", "Limite"], ["vec", "\\vec{¤}", "Vetor (seta em cima)"],
  ["x̄", "\\bar{¤}", "Barra (média)"], ["∂", "\\frac{\\partial ¤}{\\partial x}", "Derivada parcial"], ["abc", "\\text{¤}", "Texto dentro da fórmula"],
  ["( )", "\\left( ¤ \\right)", "Parênteses que crescem"],
];
const EQ_RAP_SYMS = [
  ["±", "\\pm "], ["×", "\\times "], ["·", "\\cdot "], ["÷", "\\div "], ["≤", "\\leq "], ["≥", "\\geq "], ["≠", "\\neq "], ["≈", "\\approx "],
  ["∞", "\\infty "], ["→", "\\rightarrow "], ["⇒", "\\Rightarrow "], ["°", "^{\\circ}"], ["∝", "\\propto "], ["∈", "\\in "],
];
const EQ_RAP_SETS = [
  ["∪", "\\cup ", "União"], ["∩", "\\cap ", "Interseção"], ["∖", "\\setminus ", "Diferença (A menos B)"], ["△", "\\triangle ", "Diferença simétrica"],
  ["Ā", "\\overline{¤}", "Complementar (barra)"], ["Aᶜ", "^{c}", "Complementar (expoente c)"], ["∅", "\\emptyset ", "Conjunto vazio"],
  ["∈", "\\in ", "Pertence"], ["∉", "\\notin ", "Não pertence"], ["⊂", "\\subset ", "Contido (próprio)"], ["⊆", "\\subseteq ", "Contido ou igual"],
  ["⊄", "\\not\\subset ", "Não contido"], ["⊃", "\\supset ", "Contém (próprio)"], ["⊇", "\\supseteq ", "Contém ou igual"], ["A×B", "\\times ", "Produto cartesiano"],
  ["{ }", "\\left\\{ ¤ \\right\\}", "Conjunto entre chaves"], ["{x|}", "\\left\\{ x \\mid ¤ \\right\\}", "Conjunto por propriedade"], ["|A|", "\\left| ¤ \\right|", "Cardinalidade"],
  ["⋃", "\\bigcup_{i=1}^{n} ¤", "União de vários conjuntos"], ["⋂", "\\bigcap_{i=1}^{n} ¤", "Interseção de vários conjuntos"], ["𝒫", "\\mathcal{P}(¤)", "Conjunto das partes"],
  ["ℕ", "\\mathbb{N}", "Naturais"], ["ℤ", "\\mathbb{Z}", "Inteiros"], ["ℚ", "\\mathbb{Q}", "Racionais"], ["ℝ", "\\mathbb{R}", "Reais"], ["ℂ", "\\mathbb{C}", "Complexos"],
];
const EQ_RAP_LOGIC = [
  ["∧", "\\land ", "E (conjunção)"], ["∨", "\\lor ", "OU (disjunção)"], ["¬", "\\neg ", "Negação"], ["⊕", "\\oplus ", "OU exclusivo (XOR)"],
  ["→", "\\rightarrow ", "Implicação"], ["↔", "\\leftrightarrow ", "Bicondicional"], ["⇒", "\\Rightarrow ", "Implica (⇒)"], ["⇔", "\\Leftrightarrow ", "Se e somente se (⇔)"],
  ["≡", "\\equiv ", "Equivalente"], ["∀", "\\forall ", "Para todo"], ["∃", "\\exists ", "Existe"], ["∄", "\\nexists ", "Não existe"],
  ["⊤", "\\top ", "Verdadeiro"], ["⊥", "\\bot ", "Falso"], ["∴", "\\therefore ", "Portanto"], ["∵", "\\because ", "Pois"],
  ["⊢", "\\vdash ", "Prova (deriva)"], ["⊨", "\\models ", "Satisfaz (modela)"], ["↑", "\\uparrow ", "NAND (barra de Sheffer)"], ["↓", "\\downarrow ", "NOR (seta de Peirce)"],
  ["p̄", "\\overline{¤}", "Negação (barra em cima)"],
];
function EqQuick({ onInsert }) {
  const row = (list, withTitle) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {list.map(([l, sn, t]) => <button key={(t || sn) + l} type="button" title={t || sn.trim()} aria-label={t ? t : "Inserir " + sn.trim()} data-eq-quick={t || sn.trim()} onClick={() => onInsert(sn)} style={{ ...EQ_BTN, fontSize: 14 }}>{l}</button>)}
    </div>
  );
  const det = (label, list) => (
    <details data-eq-quick-group={label} style={{ border: "1px solid var(--tool-line)", borderRadius: 9, margin: "0 0 6px", background: "#fff" }}>
      <summary style={{ cursor: "pointer", padding: "7px 10px", fontSize: 12.5, fontWeight: 650 }}>{label}</summary>
      <div style={{ padding: "0 10px 10px" }}>{row(list)}</div>
    </details>
  );
  return (
    <div data-eq="quick" style={{ margin: "0 0 10px" }}>
      <div style={{ ...EQ_SUBH, margin: "0 0 5px" }}>Estruturas</div>
      {row(EQ_RAP_STRUCT)}
      <div style={{ ...EQ_SUBH, margin: "10px 0 5px" }}>Símbolos</div>
      {row(EQ_RAP_SYMS)}
      <div style={{ height: 8 }} />
      {det("Operações de conjuntos", EQ_RAP_SETS)}
      {det("Operadores lógicos", EQ_RAP_LOGIC)}
    </div>
  );
}

function eqKatex(latex) {
  try { return window.katex ? window.katex.renderToString(latex, { throwOnError: true, displayMode: false, output: "html", strict: "ignore", trust: false }) : null; } catch (e) { return null; }
}
// Rosto do botão = a fórmula como ela sairia na página, com letras de exemplo nos campos (a, b, c…)
// em vez de quadradinhos vazios. Alguns modelos têm rosto próprio, mais claro que letras soltas.
const EQ_FACE_OVR = {
  "Expoente (do que vem antes)": "x^{2}", "Subscrito (do que vem antes)": "x_{i}", "Subscrito e expoente (do que vem antes)": "x_{i}^{2}",
};
function eqFace(it) {
  if (EQ_FACE_OVR[it.label]) return EQ_FACE_OVR[it.label];
  const raw = it.ce !== undefined ? "\\ce{" + it.ce + "}" : it.latex;
  // Modelo com campos: o rosto é exatamente o que será inserido (com as letras de exemplo nos campos).
  if (it.kind === "tpl" && (!it.face || it.face.indexOf("\\square") >= 0)) return window.EQ.expand(raw, "", { ph: true }).text;
  let f = it.face || (it.ce !== undefined ? "\\ce{" + it.ce.split("¤").join("$\\square$") + "}" : it.latex);
  return f.split("‹").join("").split("›").join("").split("¤").join("\\square ");
}
function eqCode(it) {
  const raw = it.ce !== undefined ? "\\ce{" + it.ce + "}" : it.latex;
  return window.EQ.expand(raw, "", { ph: true }).text;
}
function EqFace({ html, fallback }) {
  return html ? <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} /> : <span aria-hidden="true" style={{ fontSize: 11 }}>{fallback}</span>;
}
function EqBtn({ it, onInsert, onPreview, tab }) {
  const html = React.useMemo(() => eqKatex(eqFace(it)), [it]);
  const tpl = it.kind === "tpl";
  return (
    <button type="button" data-eq-item={it.label} data-eq-kind={tpl ? "modelo" : "simbolo"} tabIndex={tab}
      aria-label={(tpl ? "Inserir modelo: " : "Inserir símbolo: ") + it.label}
      title={it.label + (tpl ? " (modelo com campos)" : "")}
      onClick={() => onInsert(it)} onMouseEnter={() => onPreview(it)} onFocus={() => onPreview(it)} style={tpl ? EQ_TPL_BTN : EQ_BTN}>
      <EqFace html={html} fallback={it.label} />
      {tpl && <span aria-hidden="true" style={{ position: "absolute", top: 2, right: 3, width: 4, height: 4, borderRadius: 1, background: "var(--tool-accent, #C4553A)" }} />}
    </button>
  );
}
// Grupo recolhível. Uma parada de Tab por grupo; as setas andam entre os botões (grade de ferramentas).
function EqGroup({ group, onInsert, onPreview, forceOpen }) {
  const [active, setActive] = React.useState(0);
  const box = React.useRef(null);
  const onKey = (e) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const bs = Array.from(box.current.querySelectorAll("button[data-eq-item]")); const i = bs.indexOf(document.activeElement);
    if (i < 0) return;
    let n = i;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") n = Math.min(bs.length - 1, i + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = Math.max(0, i - 1);
    else if (e.key === "Home") n = 0; else n = bs.length - 1;
    e.preventDefault(); bs[n].focus(); setActive(n);
  };
  let idx = -1;
  return (
    <details open={forceOpen || group.open || undefined} data-eq-group={group.id} style={{ border: "1px solid var(--tool-line)", borderRadius: 9, margin: "0 0 8px", background: "#fff" }}>
      <summary style={{ cursor: "pointer", padding: "8px 10px", fontSize: 12.5, fontWeight: 650, color: "var(--tool-ink)" }}>{group.label}{group.adv ? <span style={{ fontWeight: 500, color: "var(--tool-ink-3)" }}> · avançado</span> : null}</summary>
      <div ref={box} role="toolbar" aria-label={group.label} onKeyDown={onKey} style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: "0 10px 10px" }}>
        {group.items.map((it, k) => {
          if (it.sub) return <div key={"s" + k} style={EQ_SUBH}>{it.sub}</div>;
          idx++; const my = idx;
          return <EqBtn key={k} it={it} tab={my === active ? 0 : -1} onInsert={(x) => { setActive(my); onInsert(x); }} onPreview={onPreview} />;
        })}
      </div>
    </details>
  );
}

function GreekPicker({ onInsert, onPreview }) {
  const KEY = "classatelier.eq.greekCase";
  const [upper, setUpper] = React.useState(() => { try { return localStorage.getItem(KEY) === "upper"; } catch (e) { return false; } });
  const pick = (v) => { setUpper(v); try { localStorage.setItem(KEY, v ? "upper" : "lower"); } catch (e) { /* sem armazenamento */ } };
  const list = upper ? window.EQ.GREEK_UPPER : window.EQ.GREEK_LOWER;
  const seg = (on) => ({ border: 0, borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 650, cursor: "pointer", fontFamily: "inherit", background: on ? "#fff" : "transparent", color: on ? "var(--tool-ink)" : "var(--tool-ink-3)", boxShadow: on ? "0 1px 2px rgba(0,0,0,.12)" : "none" });
  const item = (r, alt) => ({ kind: "sym", latex: r[1], label: "Letra grega " + (alt ? "alternativa " : upper ? "maiúscula " : "minúscula ") + r[2] + " (" + r[0] + ")", face: r[1], glyph: r[0] });
  const gb = { ...EQ_BTN, fontSize: 15, fontFamily: "'Times New Roman', Georgia, serif" };
  return (
    <details open data-eq-group="gregas" style={{ border: "1px solid var(--tool-line)", borderRadius: 9, margin: "0 0 8px", background: "#fff" }}>
      <summary style={{ cursor: "pointer", padding: "8px 10px", fontSize: 12.5, fontWeight: 650 }}>Gregas</summary>
      <div style={{ padding: "0 10px 10px" }}>
        <div role="radiogroup" aria-label="Maiúsculas ou minúsculas" style={{ display: "inline-flex", gap: 2, padding: 2, borderRadius: 8, background: "var(--tool-surface)", border: "1px solid var(--tool-line)", marginBottom: 7 }}>
          <button type="button" role="radio" aria-checked={!upper} data-eq="greek-lower" onClick={() => pick(false)} style={seg(!upper)}>α  minúsculas</button>
          <button type="button" role="radio" aria-checked={upper} data-eq="greek-upper" onClick={() => pick(true)} style={seg(upper)}>Ω  MAIÚSCULAS</button>
        </div>
        <div data-eq="greek-grid" role="group" aria-label={upper ? "Letras gregas maiúsculas" : "Letras gregas minúsculas"} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(34px, 1fr))", gap: 5 }}>
          {list.map((r) => { const it = item(r); return <button key={r[0]} type="button" data-eq-item={it.label} aria-label={"Inserir " + it.label} title={r[2] + " — " + r[1].trim()} onClick={() => onInsert(it)} onMouseEnter={() => onPreview(it)} onFocus={() => onPreview(it)} style={gb}>{r[0]}</button>; })}
        </div>
        <div style={{ ...EQ_SUBH, margin: "10px 0 5px" }}>Formas alternativas</div>
        <div data-eq="greek-alt" role="group" aria-label="Formas alternativas das letras gregas" style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {window.EQ.GREEK_ALT.map((r) => { const it = item(r, true); return (
            <button key={r[0]} type="button" data-eq-item={it.label} aria-label={"Inserir " + it.label} title={r[2] + " — " + r[1].trim()} onClick={() => onInsert(it)} onMouseEnter={() => onPreview(it)} onFocus={() => onPreview(it)} style={{ ...gb, fontSize: 12.5, gap: 6, padding: "3px 8px" }}>
              <span style={{ fontSize: 15 }}>{r[0]}</span><span style={{ fontFamily: "inherit", color: "var(--tool-ink-2)" }}>{r[2]}</span>
            </button>); })}
        </div>
      </div>
    </details>
  );
}

// ── Construtor de matriz, vetor, determinante, sistema, função por partes e equações alinhadas ──
function TableBuilder({ taRef, replaceRange, insertAtCaret, found, setStatus }) {
  const EQ = window.EQ;
  const [tb, setTb] = React.useState(() => EQ.newTable("pmatrix"));
  const t = EQ.tableType(tb.type), rows = tb.cells.length, cols = tb.cells[0] ? tb.cells[0].length : 1;
  const set = (i, j, v) => setTb({ ...tb, cells: tb.cells.map((r, a) => r.map((c, b) => (a === i && b === j ? v : c))) });
  const html = React.useMemo(() => { try { return window.katex ? window.katex.renderToString(EQ.buildTable(tb), { throwOnError: true, displayMode: false, output: "html", strict: "ignore" }) : null; } catch (e) { return null; } }, [tb]);
  const sm = { ...EQ_BTN, minHeight: 28, minWidth: 0, padding: "3px 8px", fontSize: 12, fontWeight: 600 };
  const inp = { width: "100%", boxSizing: "border-box", border: "1px solid var(--tool-line-2)", borderRadius: 6, padding: "4px 5px", fontSize: 12, fontFamily: "var(--font-mono, ui-monospace, Menlo, monospace)", minWidth: 0 };
  const heads = tb.type === "piecewise" ? ["Valor", "Condição"] : tb.type === "aligned" ? ["Antes do sinal", "Sinal e o que vem depois"] : null;
  return (
    <details data-eq-group="tabelas" style={{ border: "1px solid var(--tool-line)", borderRadius: 9, margin: "0 0 8px", background: "#fff" }}>
      <summary style={{ cursor: "pointer", padding: "8px 10px", fontSize: 12.5, fontWeight: 650 }}>Matriz, sistema, função por partes e equações alinhadas</summary>
      <div style={{ padding: "0 10px 10px" }}>
        <select aria-label="Tipo de tabela de fórmulas" data-tb="type" value={tb.type} onChange={(e) => setTb(EQ.changeTableType(tb, e.target.value))} style={{ ...ps.input, marginBottom: 7 }}>
          {EQ.TABLE_TYPES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 7 }}>
          <button type="button" data-tb="add-row" disabled={rows >= t.rows[1]} onClick={() => setTb(EQ.resizeTable(tb, rows + 1, cols))} style={sm}>+ linha</button>
          <button type="button" data-tb="del-row" disabled={rows <= t.rows[0]} onClick={() => setTb(EQ.resizeTable(tb, rows - 1, cols))} style={sm}>− linha</button>
          <button type="button" data-tb="add-col" disabled={cols >= t.cols[1]} onClick={() => setTb(EQ.resizeTable(tb, rows, cols + 1))} style={sm}>+ coluna</button>
          <button type="button" data-tb="del-col" disabled={cols <= t.cols[0]} onClick={() => setTb(EQ.resizeTable(tb, rows, cols - 1))} style={sm}>− coluna</button>
        </div>
        {heads && <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 5, marginBottom: 3, fontSize: 11, color: "var(--tool-ink-3)", fontWeight: 600 }}>{heads.map((h) => <span key={h}>{h}</span>)}</div>}
        <div data-tb="grid" role="group" aria-label="Células" style={{ display: "grid", gridTemplateColumns: "repeat(" + cols + ", minmax(0,1fr))", gap: 5 }}>
          {tb.cells.map((r, i) => r.map((c, j) => <input key={i + "-" + j} value={c} spellCheck={false} aria-label={"Linha " + (i + 1) + ", coluna " + (j + 1)} data-tb-cell={i + "-" + j} onChange={(e) => set(i, j, e.target.value)} style={inp} />))}
        </div>
        {tb.type === "piecewise" && <div style={{ marginTop: 6 }}><Toggle value={tb.se !== false} onChange={(v) => setTb({ ...tb, se: v })} label="Escrever «se» antes de cada condição" /></div>}
        {tb.type === "aligned" && (
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, fontSize: 12 }}>Alinhar em
            <select aria-label="Sinal de alinhamento" data-tb="op" value={tb.op} onChange={(e) => setTb({ ...tb, op: e.target.value })} style={{ ...ps.input, width: "auto" }}>{EQ.ALIGN_OPS.map((o) => <option key={o[0]} value={o[0]}>{o[0]}</option>)}</select>
          </label>
        )}
        <div aria-hidden="true" style={{ margin: "8px 0", padding: "6px 8px", border: "1px solid var(--tool-line)", borderRadius: 7, background: "var(--tool-surface)", overflowX: "auto", minHeight: 30 }} dangerouslySetInnerHTML={{ __html: html || "" }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button type="button" data-tb="insert" onClick={() => insertAtCaret(EQ.buildTable(tb))} style={{ ...sm, borderColor: "var(--tool-accent)", color: "var(--tool-accent)" }}>Inserir no cursor</button>
          <button type="button" data-tb="load" disabled={!found.table} onClick={() => { const tbl = EQ.parseTable(found.table); if (tbl) { setTb(tbl); setStatus("Tabela do cursor carregada no construtor."); } }} style={sm}>Ler a tabela do cursor</button>
          <button type="button" data-tb="update" disabled={!found.table} onClick={() => { replaceRange(found.table.start, found.table.end, EQ.buildTable(tb)); setStatus("Tabela atualizada no texto."); }} style={sm}>Atualizar a tabela do cursor</button>
        </div>
        <p style={hint}>Posicione o cursor dentro de uma matriz, sistema ou função por partes já escrita e use «Ler a tabela do cursor»: dá para acrescentar ou tirar linhas e colunas sem perder as outras células.</p>
      </div>
    </details>
  );
}

// ── Construtor de reação: reagentes, produtos, setas (com anotações) e etapas encadeadas ──
function ReactionBuilder({ replaceRange, insertAtCaret, found, setStatus }) {
  const CH = window.EQ.CHEM;
  const [rx, setRx] = React.useState(() => CH.newReaction());
  const html = React.useMemo(() => eqKatex(CH.buildReaction(rx)), [rx]);
  const sm = { ...EQ_BTN, minHeight: 28, minWidth: 0, padding: "3px 8px", fontSize: 12, fontWeight: 600 };
  const inp = { boxSizing: "border-box", border: "1px solid var(--tool-line-2)", borderRadius: 6, padding: "4px 5px", fontSize: 12, fontFamily: "var(--font-mono, ui-monospace, Menlo, monospace)", minWidth: 0 };
  const setSp = (i, k, patch) => setRx({ ...rx, sides: rx.sides.map((s, a) => (a === i ? s.map((x, b) => (b === k ? { ...x, ...patch } : x)) : s)) });
  const addSp = (i) => setRx({ ...rx, sides: rx.sides.map((s, a) => (a === i ? [...s, CH.newSpecies()] : s)) });
  const delSp = (i, k) => setRx({ ...rx, sides: rx.sides.map((s, a) => (a === i ? s.filter((_, b) => b !== k) : s)) });
  const setAr = (i, patch) => setRx({ ...rx, arrows: rx.arrows.map((x, a) => (a === i ? { ...x, ...patch } : x)) });
  const addStep = () => setRx({ sides: [...rx.sides, [CH.newSpecies()]], arrows: [...rx.arrows, { type: "->", above: "", below: "" }] });
  const delStep = () => setRx({ sides: rx.sides.slice(0, -1), arrows: rx.arrows.slice(0, -1) });
  const sideName = (i) => (i === 0 ? "Reagentes" : i === rx.sides.length - 1 ? "Produtos" : "Etapa " + i);
  return (
    <details data-eq-group="reacao" style={{ border: "1px solid var(--tool-line)", borderRadius: 9, margin: "0 0 8px", background: "#fff" }}>
      <summary style={{ cursor: "pointer", padding: "8px 10px", fontSize: 12.5, fontWeight: 650 }}>Montar uma reação (reagentes, produtos e setas)</summary>
      <div style={{ padding: "0 10px 10px" }} data-rx="root">
        {rx.sides.map((side, i) => (
          <div key={i}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--tool-ink-3)", margin: "8px 0 4px" }}>{sideName(i)}</div>
            {side.map((sp, k) => (
              <div key={k} style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr) 78px 26px", gap: 4, marginBottom: 4 }}>
                <input value={sp.coef} spellCheck={false} placeholder="coef." aria-label={sideName(i) + ", espécie " + (k + 1) + ": coeficiente"} data-rx-coef={i + "-" + k} onChange={(e) => setSp(i, k, { coef: e.target.value })} style={inp} />
                <input value={sp.formula} spellCheck={false} placeholder="fórmula, ex.: SO4^2-" aria-label={sideName(i) + ", espécie " + (k + 1) + ": fórmula"} data-rx-formula={i + "-" + k} onChange={(e) => setSp(i, k, { formula: e.target.value })} style={inp} />
                <select value={sp.state} aria-label={sideName(i) + ", espécie " + (k + 1) + ": estado físico"} data-rx-state={i + "-" + k} onChange={(e) => setSp(i, k, { state: e.target.value })} style={{ ...inp, padding: "3px 2px" }}>{CH.STATES.map((s) => <option key={s[0]} value={s[0]}>{s[1]}</option>)}</select>
                <button type="button" aria-label={"Remover a espécie " + (k + 1) + " de " + sideName(i)} disabled={side.length <= 1} onClick={() => delSp(i, k)} style={{ ...sm, padding: 0, minWidth: 0 }}>−</button>
              </div>
            ))}
            <button type="button" data-rx-add={i} onClick={() => addSp(i)} style={sm}>+ espécie</button>
            {i < rx.arrows.length && (
              <div style={{ margin: "8px 0 2px", padding: "6px 8px", border: "1px dashed var(--tool-line-2)", borderRadius: 8, background: "var(--tool-surface)" }}>
                <select value={rx.arrows[i].type} aria-label={"Seta " + (i + 1) + ": tipo"} data-rx-arrow={i} onChange={(e) => setAr(i, { type: e.target.value })} style={{ ...ps.input, marginBottom: 4 }}>{CH.ARROWS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                  <input value={rx.arrows[i].above} spellCheck={false} placeholder="acima da seta" aria-label={"Seta " + (i + 1) + ": texto acima"} data-rx-above={i} onChange={(e) => setAr(i, { above: e.target.value })} style={inp} />
                  <input value={rx.arrows[i].below} spellCheck={false} placeholder="abaixo da seta" aria-label={"Seta " + (i + 1) + ": texto abaixo"} data-rx-below={i} onChange={(e) => setAr(i, { below: e.target.value })} style={inp} />
                </div>
                <div style={{ display: "flex", gap: 5, marginTop: 4 }}>
                  <button type="button" onClick={() => setAr(i, { above: "$\\Delta$" })} style={sm} title="Calor (Δ) acima da seta">Δ acima</button>
                  <button type="button" onClick={() => setAr(i, { above: "$h\\nu$" })} style={sm} title="Luz (hν) acima da seta">hν acima</button>
                </div>
              </div>
            )}
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, margin: "8px 0" }}>
          <button type="button" data-rx="add-step" onClick={addStep} style={sm}>+ etapa (outra seta)</button>
          <button type="button" data-rx="del-step" disabled={rx.sides.length <= 2} onClick={delStep} style={sm}>− etapa</button>
        </div>
        <div aria-hidden="true" style={{ margin: "0 0 8px", padding: "6px 8px", border: "1px solid var(--tool-line)", borderRadius: 7, background: "var(--tool-surface)", overflowX: "auto", minHeight: 30 }} dangerouslySetInnerHTML={{ __html: html || "" }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button type="button" data-rx="insert" onClick={() => insertAtCaret(CH.buildReaction(rx))} style={{ ...sm, borderColor: "var(--tool-accent)", color: "var(--tool-accent)" }}>Inserir no cursor</button>
          <button type="button" data-rx="load" disabled={!found.ce} onClick={() => { const r = found.ce && CH.parseReaction(found.ce.body); if (r) { setRx(r); setStatus("Reação do cursor carregada no construtor."); } else setStatus("Esse \\ce{…} não é uma reação com seta: edite no campo de fórmula."); }} style={sm}>Ler a reação do cursor</button>
          <button type="button" data-rx="update" disabled={!found.ce} onClick={() => { replaceRange(found.ce.open, found.ce.end + 1, CH.buildReaction(rx)); setStatus("Reação atualizada no texto."); }} style={sm}>Atualizar a reação do cursor</button>
        </div>
        <p style={hint}>Coeficiente, fórmula e estado são campos separados. Cargas e elétrons vão na fórmula: Fe^3+, SO4^2-, e-. Várias setas formam etapas encadeadas (E + S ⇌ ES → E + P).</p>
      </div>
    </details>
  );
}

function EquationPanel({ p, setP, onRenumber }) {
  const EQ = window.EQ, CH = EQ && EQ.CHEM;
  const ref = React.useRef(null), touched = React.useRef(false), sess = React.useRef(null);
  const [mode, setMode] = React.useState(null); // null = paletas fechadas (o painel começa enxuto)
  const [query, setQuery] = React.useState("");
  const [hover, setHover] = React.useState(null);
  const [status, setStatus] = React.useState("");
  const [found, setFound] = React.useState({ table: null, ce: null });
  const [inSession, setInSession] = React.useState(false);
  const plain = (s) => String(s == null ? "" : s).replace(/<[^>]+>/g, "");
  const pickMode = (m) => { setMode(mode === m ? null : m); setQuery(""); setHover(null); };
  if (!EQ || !CH) return <p style={hint}>Paleta de equações indisponível (equacao-catalogo.js não carregou). A fórmula continua editável no campo acima.</p>;

  // Escreve no campo respeitando o histórico (Ctrl+Z, Ctrl+Y e os botões Desfazer/Refazer).
  const writeRange = (from, to, text) => {
    const ta = ref.current; if (!ta) return;
    ta.focus(); ta.setSelectionRange(from, to);
    let done = false;
    try { done = document.execCommand("insertText", false, text); } catch (e) { done = false; }
    if (!done || ta.value.slice(from, from + text.length) !== text) { const cur = ta.value; const next = cur.slice(0, from) + text + cur.slice(to); ta.value = next; setP({ latex: next }); }
  };
  const refreshFound = () => {
    const ta = ref.current; if (!ta) return;
    const pos = ta.selectionStart, text = ta.value;
    const table = EQ.findTable(text, pos);
    const c = EQ.insideCe(text, pos);
    setFound({ table: table && EQ.parseTable(table) ? table : null, ce: c ? { open: c.start - (text.slice(0, c.start).match(/\\ce\s*\{$/) || ["{"])[0].length, end: c.end, body: text.slice(c.start, c.end) } : null });
  };
  const endSession = () => { sess.current = null; setInSession(false); };
  const startSession = (fields, text, from) => {
    const ta = ref.current; if (!ta) return;
    const end = from + text.length, outer = sess.current;
    if (fields.length) {
      const fresh = fields.map((f) => Object.assign({}, f, { a: f.a + from, b: f.b + from }));
      // Modelo inserido dentro de um campo de outro modelo: os campos novos vêm primeiro e, ao terminar, o Tab
      // continua nos campos que faltavam do modelo de fora (frações e raízes aninhadas).
      let all = fresh, ends = [end];
      if (outer) {
        let k = -1;
        outer.fields.forEach((f, i) => { if (f.a <= from && end <= f.b && (k < 0 || f.b - f.a < outer.fields[k].b - outer.fields[k].a)) k = i; });
        if (k >= 0) { all = outer.fields.slice(0, k).concat(fresh, outer.fields.slice(k + 1)); ends = outer.ends.concat([end]).sort((x, y) => x - y); }
      }
      sess.current = { fields: all, ends, last: ta.value }; setInSession(true);
      const f0 = fresh[0]; ta.setSelectionRange(f0.a, f0.b);
    } else if (outer && inSessionRange(outer, from)) {
      ta.setSelectionRange(end, end);   // símbolo solto dentro de um campo: o preenchimento continua
    } else { endSession(); ta.setSelectionRange(end, end); }
    refreshFound();
  };
  const inSessionRange = (s, pos) => {
    const all = s.fields.map((f) => f.a).concat(s.ends), hi = Math.max.apply(null, s.fields.map((f) => f.b).concat(s.ends)), lo = Math.min.apply(null, all);
    return pos >= lo - 1 && pos <= hi;
  };
  const selectionNow = () => {
    const ta = ref.current; const text = ta.value; let a = ta.selectionStart, b = ta.selectionEnd;
    if (!touched.current) { a = b = text.length; }
    return { ta, text, a, b };
  };
  // Trecho selecionado que vira conteúdo do modelo. Se for só a letra de exemplo de um campo que ainda não foi
  // editado (a, b, c…), conta como vazio: o novo modelo entra no lugar dela, com as próprias letras.
  const realSel = (text, a, b) => {
    const t = text.slice(a, b), sc = sess.current;
    if (sc && t && sc.fields.some((f) => f.ph && f.a === a && f.b === b && f.ph === t)) return "";
    return t;
  };
  const insertSnippet = (snippet, opts) => {
    const { text, a, b } = selectionNow();
    const ex = EQ.expand(snippet, opts && opts.noSelection ? "" : realSel(text, a, b), { ph: true });
    writeRange(a, b, ex.text); touched.current = true;
    startSession(ex.fields, ex.text, a);
  };
  const ARROW = /^(<=>>|<<=>|<=>|<->|<-|->)/;
  const insertItem = (it) => {
    const { text, a, b } = selectionNow();
    const inCe = EQ.insideCe(text, a);
    let from = a, to = b, sel = realSel(text, a, b), snippet;
    if (it.ce !== undefined) {
      snippet = inCe ? it.ce : "\\ce{" + it.ce + "}";
      if (inCe && ARROW.test(it.ce) && !/^\[/.test(it.ce.slice(2))) { snippet = (text.charAt(a - 1) === " " || a === inCe.start ? "" : " ") + it.ce + " "; }
    } else {
      snippet = it.latex;
      if (inCe) { from = to = inCe.end + 1; sel = ""; }
    }
    const ex = EQ.expand(snippet, sel, { ph: true });
    writeRange(from, to, ex.text); touched.current = true;
    startSession(ex.fields, ex.text, from);
    setStatus(ex.fields.length ? "Modelo inserido. Preencha os campos: Tab vai para o próximo." : "Inserido.");
  };
  // Atalho rápido (estilo de sempre): insere no cursor; «¤» marca onde o cursor fica e é trocado pelo trecho selecionado.
  const insertQuick = (snippet) => {
    const { text, a, b } = selectionNow();
    const sel = text.slice(a, b), mark = snippet.indexOf("¤");
    const out = snippet.replace("¤", sel);
    writeRange(a, b, out); touched.current = true; endSession();
    const ta = ref.current, pos = a + (mark >= 0 ? mark + sel.length : out.length);
    if (ta) { ta.setSelectionRange(pos, pos); ta.focus(); }
    refreshFound(); setStatus("Inserido.");
  };
  const insertRaw = (latex) => { const { a, b } = selectionNow(); writeRange(a, b, latex); touched.current = true; endSession(); setStatus("Inserido no cursor."); };
  const replaceRange = (from, to, latex) => { writeRange(from, to, latex); endSession(); setTimeout(refreshFound, 0); };

  const onChange = (e) => {
    const v = e.target.value;
    const sc = sess.current;
    if (sc) { sc.fields = EQ.adjustFields(sc.fields, sc.last, v); sc.ends = sc.ends.map((e) => EQ.adjustPos(e, sc.last, v)); sc.last = v; }
    setP({ latex: v });
  };
  // Sai de um nível: vai para o fim do modelo mais interno que contém o cursor.
  const leaveLevel = () => {
    const s = sess.current, ta = ref.current; if (!s) return false;
    const pos = ta.selectionEnd, e = s.ends.filter((x) => x >= pos).sort((x, y) => x - y)[0];
    if (e === undefined) { const q = EQ.exitGroup(ta.value, pos); endSession(); if (q >= 0) { ta.setSelectionRange(q, q); return true; } return false; }
    s.ends = s.ends.filter((x) => x > e); ta.setSelectionRange(e, e);
    if (!s.ends.length) { endSession(); setStatus("Fim do modelo. Continue escrevendo."); } else setStatus("Saiu de uma estrutura; ainda dentro de outra.");
    return true;
  };
  const goField = (dir) => {
    const s = sess.current, ta = ref.current; if (!s) return false;
    const pos = ta.selectionStart, fs = s.fields; let cur = -1;
    for (let i = 0; i < fs.length; i++) if (fs[i].a <= pos && pos <= fs[i].b) { cur = i; break; }
    let target;
    if (dir > 0) target = cur >= 0 ? cur + 1 : fs.findIndex((f) => f.a >= pos);
    else target = cur >= 0 ? cur - 1 : (() => { let t = -1; fs.forEach((f, i) => { if (f.b < pos) t = i; }); return t; })();
    if (dir > 0 && (target < 0 || target >= fs.length)) return leaveLevel();
    if (dir < 0 && target < 0) { endSession(); return false; }
    ta.setSelectionRange(fs[target].a, fs[target].b); setStatus("Campo " + (target + 1) + " de " + fs.length + "."); return true;
  };
  const onKeyDown = (e) => {
    if (e.key === "Tab" && !e.ctrlKey && !e.metaKey && !e.altKey && sess.current) { if (goField(e.shiftKey ? -1 : 1)) e.preventDefault(); return; }
    if (e.key === "Escape" && sess.current) { endSession(); setStatus("Preenchimento encerrado."); return; }
    if (e.altKey && e.key === "ArrowRight") {
      if (sess.current) { if (leaveLevel()) e.preventDefault(); return; }
      const ta = ref.current, q = EQ.exitGroup(ta.value, ta.selectionEnd);
      if (q >= 0) { e.preventDefault(); ta.setSelectionRange(q, q); setStatus("Saiu da estrutura."); }
    }
  };
  const onSel = () => {
    const ta = ref.current; if (!ta) return;
    const s = sess.current;
    if (s && !inSessionRange(s, ta.selectionStart)) endSession();
    refreshFound();
  };
  const hist = (cmd) => { const ta = ref.current; if (!ta) return; ta.focus(); try { document.execCommand(cmd); } catch (e) { /* sem histórico */ } };

  const groups = mode === "mat" ? EQ.GROUPS : CH.GROUPS;
  const results = query.trim() ? EQ.search(query).map((x) => ({ ...x, pal: "mat" })).concat(search_chem(query)) : null;
  function search_chem(q) {
    const norm = EQ.norm, words = norm(q).trim().split(/\s+/);
    const out = [];
    CH.GROUPS.forEach((g) => g.items.forEach((it) => { if (it.sub) return; const hay = norm(it.label + " " + it.tags + " " + g.label) + " " + (it.ce || it.latex || "").toLowerCase(); if (words.every((w) => hay.indexOf(w) >= 0)) out.push({ group: g.id, groupLabel: g.label, item: it, pal: "quim" }); }));
    return out;
  }
  const segBtn = (on) => ({ flex: 1, border: "1px solid " + (on ? "var(--tool-accent, #C4553A)" : "var(--tool-line-2)"), background: on ? "var(--tool-accent-soft, #fbeae4)" : "#fff", color: "var(--tool-ink)", borderRadius: 8, padding: "8px 6px", fontSize: 12.5, fontWeight: on ? 700 : 600, cursor: "pointer", fontFamily: "inherit" });
  const err = (() => { const r = window.renderEquation ? window.renderEquation(p.latex) : null; return r && r.error ? r.error : ""; })();
  const prevHtml = hover ? eqKatex(eqFace(hover)) : null;
  const allExamples = [["Matemática e Física", EQ.EXAMPLES], ["Química e Bioquímica", CH.EXAMPLES]];
  const tbtn = { ...EQ_BTN, minHeight: 28, minWidth: 0, padding: "3px 10px", fontSize: 12, fontWeight: 600 };
  return (<>
    <Field label="Fórmula (LaTeX)">
      <textarea ref={ref} data-eq="latex" spellCheck={false} value={p.latex || ""} onChange={onChange} onKeyDown={onKeyDown} onSelect={onSel} onKeyUp={onSel} onClick={onSel} onFocus={() => { touched.current = true; }} placeholder="Ex.: E = mc^{2}   ou   \ce{H2O}" rows={4} aria-describedby="eq-hint"
        style={{ ...ps.area, fontFamily: "var(--font-mono, JetBrains Mono, ui-monospace, Menlo, monospace)", fontSize: 12.5, minHeight: 84 }} />
      <div style={{ display: "flex", gap: 6, margin: "6px 0 0" }}>
        <button type="button" data-eq="undo" onClick={() => hist("undo")} style={tbtn}>↶ Desfazer</button>
        <button type="button" data-eq="redo" onClick={() => hist("redo")} style={tbtn}>↷ Refazer</button>
      </div>
      {err ? <p style={{ ...hint, color: "#9a2f1b" }} role="alert">Erro na fórmula: {err} Seu texto foi mantido: corrija o trecho acima ou use «Desfazer».</p> : <p id="eq-hint" style={hint}>{inSession ? "Preenchendo o modelo: Tab vai ao próximo campo, Shift+Tab volta, Alt+→ sai da estrutura, Esc encerra." : "A fórmula aparece pronta na página. Clique num modelo para inserir no cursor; com um trecho selecionado, ele entra no primeiro campo."}</p>}
      <div role="status" aria-live="polite" data-eq="status" style={{ ...hint, minHeight: 16 }}>{status}</div>
    </Field>
    <EqQuick onInsert={insertQuick} />
    <div style={{ ...EQ_SUBH, margin: "2px 0 6px" }}>Mais modelos, com campos e busca</div>
    <div role="group" aria-label="Paleta" style={{ display: "flex", gap: 6, margin: "0 0 8px" }}>
      <button type="button" data-eq-mode="mat" aria-pressed={mode === "mat"} aria-expanded={mode === "mat"} onClick={() => pickMode("mat")} style={segBtn(mode === "mat")}>∑  Matemática e Física</button>
      <button type="button" data-eq-mode="quim" aria-pressed={mode === "quim"} aria-expanded={mode === "quim"} onClick={() => pickMode("quim")} style={segBtn(mode === "quim")}>⚗  Química e Bioquímica</button>
    </div>
    {mode && (<>
    <input type="search" data-eq="search" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar na paleta por nome ou símbolo" placeholder="Buscar: derivada parcial, pertence, sigma, norma, ATP…" style={{ ...ps.input, marginBottom: 7 }} />
    <div data-eq="preview" aria-hidden="true" style={{ position: "sticky", top: 0, zIndex: 2, height: 58, boxSizing: "border-box", overflow: "hidden", margin: "0 0 8px", padding: "7px 9px", border: "1px solid var(--tool-line)", borderRadius: 8, background: "var(--tool-surface, #faf8f3)", display: "flex", gap: 10, alignItems: "center" }}>
      {hover ? (<>
        <div style={{ flex: "none", maxWidth: "45%", overflow: "hidden", fontSize: 15 }}><EqFace html={prevHtml} fallback={hover.label} /></div>
        <div style={{ minWidth: 0, fontSize: 11.5, lineHeight: 1.35 }}><b>{hover.label}</b><div style={{ color: "var(--tool-ink-3)", fontFamily: "var(--font-mono, ui-monospace, Menlo, monospace)", overflowWrap: "anywhere" }}>{eqCode(hover).slice(0, 90)}</div></div>
      </>) : <span style={{ fontSize: 11.5, color: "var(--tool-ink-3)" }}>Passe o mouse ou o foco sobre um botão para ver a prévia. Botões com borda tracejada inserem modelos com campos.</span>}
    </div>
    {results ? (
      <div data-eq="results" style={{ marginBottom: 8 }}>
        <p style={hint}>{results.length ? results.length + " resultado(s)" : "Nada encontrado para «" + query + "»."}</p>
        <div role="toolbar" aria-label="Resultados da busca" style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
          {results.slice(0, 80).map((r, i) => <EqBtn key={r.group + i} it={r.item} tab={0} onInsert={insertItem} onPreview={setHover} />)}
        </div>
      </div>
    ) : mode === "mat" ? (<>
      {groups.slice(0, 1).map((g) => <EqGroup key={g.id} group={g} onInsert={insertItem} onPreview={setHover} />)}
      <GreekPicker onInsert={insertItem} onPreview={setHover} />
      {groups.slice(1).map((g) => <EqGroup key={g.id} group={g} onInsert={insertItem} onPreview={setHover} />)}
      <TableBuilder taRef={ref} replaceRange={replaceRange} insertAtCaret={insertRaw} found={found} setStatus={setStatus} />
    </>) : (<>
      <p style={{ ...hint, margin: "0 0 8px" }}>A notação química usa <code>\ce{"{…}"}</code> e funciona dentro de qualquer fórmula: dá para pôr <code>\ce{"{[S]}"}</code> numa fração, por exemplo. Desenho de moléculas (anéis, ramificações, estereoquímica) não faz parte desta paleta.</p>
      {groups.map((g) => (
        <React.Fragment key={g.id}>
          <EqGroup group={g} onInsert={insertItem} onPreview={setHover} />
          {g.id === "q-reacoes" && <ReactionBuilder replaceRange={replaceRange} insertAtCaret={insertRaw} found={found} setStatus={setStatus} />}
        </React.Fragment>
      ))}
    </>)}
    </>)}
    {!mode && <p style={{ ...hint, margin: "0 0 10px" }}>Abra uma paleta para inserir símbolos, estruturas com campos (frações, integrais, matrizes) ou notação química. Dá para escrever direto em LaTeX no campo acima.</p>}
    <Field label="Exemplos prontos">
      <select value="" aria-label="Substituir a fórmula por um exemplo" onChange={(e) => { const [gi, ei] = e.target.value.split(":").map(Number); const ex = allExamples[gi] && allExamples[gi][1][ei]; if (ex) { writeRange(0, (ref.current ? ref.current.value : "").length, ex[1]); endSession(); } }} style={ps.input}>
        <option value="">Substituir por um exemplo…</option>
        {allExamples.map(([lab, list], gi) => <optgroup key={lab} label={lab}>{list.map((ex, i) => <option key={ex[0]} value={gi + ":" + i}>{ex[0]}</option>)}</optgroup>)}
      </select>
    </Field>
    <div style={{ borderTop: "1px solid var(--tool-line)", margin: "4px 0 14px" }} />
    <Field label={"Tamanho da letra da fórmula: " + (Number(p.size) || 100) + "%"}>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {[["Pequena", 75], ["Normal", 100], ["Grande", 130]].map(([l, v]) => <button key={v} type="button" onClick={() => setP({ size: v })} aria-pressed={(Number(p.size) || 100) === v} style={{ ...EQ_BTN, flex: 1, padding: "6px 4px", fontWeight: (Number(p.size) || 100) === v ? 700 : 500 }}>{l}</button>)}
      </div>
      <input type="range" min="40" max="160" step="5" value={Number(p.size) || 100} onChange={(e) => setP({ size: Number(e.target.value) })} aria-label="Tamanho da letra da fórmula, em porcentagem" style={{ width: "100%" }} />
    </Field>
    <Field><Toggle value={p.framed !== false} onChange={(v) => setP({ framed: v })} label="Mostrar moldura (caixa com borda)" /></Field>
    <Field><Toggle value={!!p.compact} onChange={(v) => setP({ compact: v })} label="Fórmula compacta (estilo de linha de texto)" /></Field>
    <p style={hint}>Compacta desenha frações, somatórios e limites como numa frase (menores, com os limites ao lado). Desligada, a fórmula sai em estilo de destaque, em bloco.</p>
    <Field><Toggle value={p.autoFit !== false} onChange={(v) => setP({ autoFit: v })} label="Reduzir sozinha para caber (sem barra de rolagem)" /></Field>
    <p style={hint}>Com o ajuste ligado, uma fórmula comprida diminui só o necessário para caber na largura da página. Desligue para manter exatamente o tamanho escolhido.</p>
    <Field><Toggle value={p.showNumber !== false} onChange={(v) => setP({ showNumber: v })} label="Mostrar número da equação" /></Field>
    {p.showNumber !== false && (
      <Field label="Número da equação">
        <TextInput value={plain(p.number)} onChange={(v) => setP({ number: v })} placeholder="(1)" />
        <p style={hint}>Escreva no formato que quiser: (1), (1.1), Eq. 1… Também dá para clicar no número, na página, e digitar. Uma equação nova recebe sozinha o número seguinte ao da anterior.</p>
        <button type="button" onClick={onRenumber} style={{ ...EQ_BTN, width: "100%", marginTop: 8, padding: "7px 10px", fontSize: 12.5 }}>Renumerar todas as equações em sequência</button>
        <p style={hint}>Segue o formato da primeira equação da aula e reescreve o número de todas as outras.</p>
      </Field>
    )}
    <Field label="Descrição para leitores de tela (opcional)">
      <TextInput value={p.ariaLabel || ""} onChange={(v) => setP({ ariaLabel: v })} placeholder="Ex.: Equação de Bhaskara" />
      <p style={hint}>A fórmula já é lida como MathML. Use este campo só se quiser um nome curto para ela.</p>
    </Field>
  </>);
}

function renderTypeContent(block, p, setP, mergePrev, onRenumber, onInsertEquation, cursorActions = {}) {
  const { onInsertImage, onBreakProse, onBreakTopic } = cursorActions;
  const def = window.BLOCK_BY_TYPE[block.type];
  switch (block.type) {
    case "pagebreak":
      return <p style={hint}>Força o próximo bloco a começar em uma nova página apenas na exportação para PDF. Na aula web e no pacote SCORM, este marcador não aparece.</p>;
    case "topic":
    case "topic-collapsible":
    case "topic-slider":
      return (<>
        <p style={hint}>Este <strong>tópico de conteúdo</strong> agrupa blocos filhos numa única estrutura. Use o botão <strong>＋</strong> dentro do tópico para adicionar e reorganizar recursos.</p>
        {block.type === "topic-collapsible" && <><Field label="Texto do botão"><TextInput value={p.triggerLabel || ""} onChange={(v) => setP({ triggerLabel: v })} /></Field><Toggle value={p.defaultOpen === true} onChange={(v) => setP({ defaultOpen: v })} label="Iniciar expandido" />{!(p.children || []).some((c) => c.type === "collapsebreak") && <button style={{...addBtn,marginTop:12}} onClick={() => setP({ children:[...(p.children||[]), window.newChildBlock("collapsebreak")] })}>Adicionar divisor retrátil</button>}</>}
        {block.type === "topic-slider" && <><Toggle value={p.loop !== false} onChange={(v) => setP({ loop: v })} label="Navegação circular" /><button style={{...addBtn,marginTop:12}} onClick={() => { const slides=(p.children||[]).reduce((m,c)=>Math.max(m,Number(c.slide)||0),-1)+1, t=window.newChildBlock("titulo"), pr=window.newChildBlock("prose"); t.slide=slides; pr.slide=slides; setP({children:[...(p.children||[]),t,pr],editSlide:slides}); }}>Adicionar slide</button></>}
        <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--tool-surface)", border: "1px solid var(--tool-line)", borderRadius: 8, fontSize: 12, color: "var(--tool-ink-2)", lineHeight: 1.5 }}>
          {(p.children || []).length} bloco{(p.children || []).length === 1 ? "" : "s"} neste tópico.
        </div>
        {block.type === "topic" && onBreakTopic && <><button type="button" data-act="break-topic" style={{ ...addBtn, marginTop: 12 }} onClick={onBreakTopic} title="Clique antes, no texto do tópico, no ponto onde ele deve se dividir."><window.Icon name="separator-horizontal" size={14} stroke={1.8} /> Quebrar tópico no cursor</button><p style={hint}>Clique no ponto do texto deste tópico e use o botão: o que vem depois do cursor passa para um novo Tópico de conteúdo, logo abaixo.</p></>}
        {mergePrev && <button style={{ ...addBtn, marginTop: 12 }} onClick={mergePrev} title="Move todos os blocos deste tópico para o final do tópico anterior e remove este tópico vazio; nada é apagado."><TIcon name="plus" size={14} /> Unir ao tópico anterior (sem perder conteúdo)</button>}
      </>);
    case "hero":
      return (<>
        <Field label="Autor"><TextInput value={p.author} onChange={(v) => setP({ author: v })} /></Field>
        <ImageField label="Foto do autor (opcional)" src={p.authorImage} onChange={(v) => setP({ authorImage: v })} />
        <Field label="Tempo de estudo"><TextInput value={p.readTime} onChange={(v) => setP({ readTime: v })} /></Field>
        <Field label="Data / edição"><TextInput value={p.date} onChange={(v) => setP({ date: v })} /></Field>
        <p style={hint}>Sobrelinha, título e linha de abertura são editados direto na página.</p>
      </>);
    case "forum":
      return (<>
        <Field label="Endereço do fórum (Moodle, Padlet, Teams…)"><TextInput value={p.href} onChange={(v) => setP({ href: v })} placeholder="https://" /></Field>
        <Field label="Texto do botão"><TextInput value={p.buttonLabel} onChange={(v) => setP({ buttonLabel: v })} /></Field>
        <p style={hint}>Cole o link do fórum de verdade: o debate acontece lá. Na aula, o botão abre o fórum em nova aba.</p>
        <div style={{ height: 14 }} />
        <Field label="Como participar (uma regra por linha)"><StringList items={p.rules || []} onChange={(v) => setP({ rules: v })} label="Regra" placeholder="Ex.: Responda a, no mínimo, dois colegas." /></Field>
        <Field><Toggle value={!!p.showCriteria} onChange={(v) => setP({ showCriteria: v })} label="Mostrar critérios de avaliação" /></Field>
        <Field><Toggle value={p.showDraft !== false} onChange={(v) => setP({ showDraft: v })} label="Oferecer rascunho da mensagem ao aluno" /></Field>
        <p style={hint}>O rascunho fica salvo só no navegador do aluno e tem botão para copiar e colar no fórum. Título, pergunta, prazos e critérios são editados direto na página.</p>
      </>);
    case "equacao":
      return <EquationPanel p={p} setP={setP} onRenumber={onRenumber} />;
    case "codigo":
      return (<>
        <Field label="Linguagem">
          <select value={p.language || "text"} onChange={(e) => setP({ language: e.target.value })} style={ps.input}>
            {(window.CODE_LANGUAGES || []).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </Field>
        <Field label="Nome do arquivo ou título (opcional)"><TextInput value={p.title || ""} onChange={(v) => setP({ title: v })} placeholder="Ex.: main.py" /></Field>
        <Field><Toggle value={p.showLineNumbers !== false} onChange={(v) => setP({ showLineNumbers: v })} label="Numerar as linhas" /></Field>
        {p.showLineNumbers !== false && (
          <Field label="Primeira linha"><input type="number" min={1} max={99999} value={p.startLine || 1} onChange={(e) => setP({ startLine: Math.max(1, Number(e.target.value) || 1) })} style={ps.input} /></Field>
        )}
        <Field label="Aparência">
          <Segmented value={p.appearance || "claro"} onChange={(v) => setP({ appearance: v })} options={[{ id: "claro", label: "Clara" }, { id: "escuro", label: "Escura" }, { id: "auto", label: "Do aparelho" }]} />
        </Field>
        <Field label="Recuo (Tab)">
          <Segmented value={p.useTabs ? "tab" : String(p.tabSize || 4)} onChange={(v) => setP(v === "tab" ? { useTabs: true } : { useTabs: false, tabSize: Number(v) })} options={[{ id: "2", label: "2 espaços" }, { id: "4", label: "4 espaços" }, { id: "tab", label: "Tabulação" }]} />
        </Field>
        <Field><Toggle value={!!p.wrap} onChange={(v) => setP({ wrap: v })} label="Quebrar linhas longas (sem rolagem lateral)" /></Field>
        <Field label="Descrição para leitor de tela (opcional)"><TextInput value={p.ariaLabel || ""} onChange={(v) => setP({ ariaLabel: v })} placeholder="Ex.: Função que soma dois números em Python" /></Field>
        <p style={hint}>O código é digitado ou colado direto na página. <strong>Tab</strong> recua, <strong>Enter</strong> mantém o recuo, <strong>Shift+Tab</strong> desfaz o recuo e <strong>Ctrl/⌘ + Enter</strong> (ou «Continuar o texto») sai do bloco e abre um parágrafo logo abaixo. O destaque de cores é só visual: o código nunca é executado.</p>
      </>);
    case "citacao":
      return (<>
        <Field><Toggle value={p.showAttribution !== false} onChange={(v) => setP({ showAttribution: v })} label="Mostrar autor e fonte/ano" /></Field>
        <p style={hint}>O texto, autor e fonte são editados direto na página.</p>
      </>);
    case "destaque": case "atencao": case "reflexao":
      return (<>
        <Field label="Cor da caixa"><ToneDots value={p.tone} onChange={(v) => setP({ tone: v })} /></Field>
        <Field label="Ícone (Font Awesome Free)"><IconPicker value={p.icon || ""} onChange={(v) => setP({ icon: v })} /></Field>
        <p style={hint}>Deixe o ícone vazio para usar o padrão. Título e conteúdo são editados direto na página.</p>
      </>);
    case "eyebrow":
      return (<>
        <Field label="Ícone (opcional, Font Awesome Free)"><IconPicker value={p.icon || ""} onChange={(v) => setP({ icon: v })} /></Field>
        <p style={hint}>A sobrelinha é editada direto na página.</p>
      </>);
    case "sintese": case "divider":
      return <p style={hint}>Este bloco é editado direto na página: clique no texto e digite. Selecione trechos para aplicar marca-texto, rabisco ou ênfase.</p>;
    case "titulo":
      return (<>
        <Field label="Nível do título"><Segmented value={p.level || "h2"} onChange={(v) => setP({ level: v })} options={[{ id: "h2", label: "Seção (H2)" }, { id: "h3", label: "Subseção (H3)" }]} /></Field>
        <p style={hint}>O texto é editado direto na página. Títulos <strong>H2</strong> são seções e aparecem no <strong>Sumário</strong>; <strong>H3</strong> são subtítulos dentro de uma seção.</p>
      </>);
    case "prose":
      return (<>
        <p style={hint}>O corpo é editado direto na página: clique e digite. Selecione um trecho para marca-texto, rabisco, ênfase ou para marcar um <strong>termo de glossário</strong>.</p>
        <div style={{ height: 14 }} />
        <Field label="Alinhamento do texto"><Segmented value={p.align || "left"} onChange={(v) => setP({ align: v })} options={[{ id: "left", label: "Esquerda" }, { id: "center", label: "Centro" }, { id: "right", label: "Direita" }, { id: "justify", label: "Justificado" }]} /></Field>
        {p.align === "justify" && <p style={hint}>Justificado deixa a mancha do texto regular, mas cria espaços irregulares entre as palavras, o que pode atrapalhar quem tem dislexia ou baixa visão. Prefira «Esquerda» em textos longos.</p>}
        <Field><Toggle value={!!p.dropcap} onChange={(v) => setP({ dropcap: v })} label="Capitular (letra inicial)" /></Field>
        {p.dropcap && (
          <Field label="Cor da capitular"><DropcapTones value={p.dropcapTone || "terracotta"} onChange={(v) => setP({ dropcapTone: v })} /></Field>
        )}
        <p style={hint}>A capitular eleva a primeira letra do primeiro parágrafo. Use só uma vez, na abertura de um trecho mais longo.</p>
        {onInsertEquation && <>
          <div style={{ height: 14 }} />
          <Field label="Equação no meio do texto">
            <button type="button" onClick={onInsertEquation} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--tool-line, #d8d3c6)", background: "var(--tool-card, #fff)", cursor: "pointer", font: "600 13px var(--font-sans)", color: "var(--tool-ink)" }}>
              <window.Icon name="sigma" size={16} stroke={1.8} /> Inserir equação no cursor
            </button>
          </Field>
          <p style={hint}>Clique no ponto do parágrafo onde a fórmula deve entrar e use o botão: o texto se divide ali e a equação fica no meio, em linha própria.</p>
        </>}
        {cursorActions.onInsertCode && <>
          <div style={{ height: 14 }} />
          <Field label="Código no meio do texto">
            <button type="button" data-act="insert-code" onClick={cursorActions.onInsertCode} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--tool-line, #d8d3c6)", background: "var(--tool-card, #fff)", cursor: "pointer", font: "600 13px var(--font-ui, inherit)", color: "var(--tool-ink, #1b1a17)" }}>
              <span aria-hidden="true" style={{ font: "700 13px ui-monospace, Menlo, monospace", width: 16, textAlign: "center" }}>{"</>"}</span> Inserir bloco de código no cursor
            </button>
          </Field>
          <p style={hint}>Para aulas de programação: o parágrafo se divide no cursor e o bloco de código entra no meio, com destaque de sintaxe e botão de copiar.</p>
        </>}
        {onInsertImage && <>
          <div style={{ height: 14 }} />
          <Field label="Imagem no meio do texto">
            <button type="button" data-act="insert-image" onClick={onInsertImage} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--tool-line, #d8d3c6)", background: "var(--tool-card, #fff)", cursor: "pointer", font: "600 13px var(--font-ui, inherit)", color: "var(--tool-ink)", textAlign: "left" }}>
              <window.Icon name="image" size={16} stroke={1.8} /> Inserir imagem no cursor
            </button>
          </Field>
          <p style={hint}>Escolha um arquivo ou peça à IA que crie a figura na hora. O parágrafo se divide no cursor e a imagem entra no meio.</p>
        </>}
        {(onBreakProse || onBreakTopic) && <>
          <div style={{ height: 14 }} />
          <Field label="Quebra no cursor">
            <div style={{ display: "grid", gap: 8 }}>
              {onBreakProse && <button type="button" data-act="break-prose" onClick={onBreakProse} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--tool-line, #d8d3c6)", background: "var(--tool-card, #fff)", cursor: "pointer", font: "600 13px var(--font-ui, inherit)", color: "var(--tool-ink)", textAlign: "left" }}>
                <window.Icon name="separator-horizontal" size={16} stroke={1.8} /> Quebrar parágrafo aqui
              </button>}
              {onBreakTopic && <button type="button" data-act="break-topic" onClick={onBreakTopic} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--tool-line, #d8d3c6)", background: "var(--tool-card, #fff)", cursor: "pointer", font: "600 13px var(--font-ui, inherit)", color: "var(--tool-ink)", textAlign: "left" }}>
                <window.Icon name="separator-horizontal" size={16} stroke={1.8} /> Quebrar tópico aqui
              </button>}
            </div>
          </Field>
          <p style={hint}>Clique no ponto do texto e use o botão. <strong>Parágrafo</strong>: vira dois parágrafos, para não ficar longo demais. <strong>Tópico</strong>: o Tópico de conteúdo se divide em dois, e o que vem depois do cursor passa para o segundo.</p>
        </>}
      </>);
    case "pitaco":
      return (<>
        <Field label="Texto do cabeçalho"><TextInput value={p.kicker || `Pitaco ${p.gender === "f" ? "da" : "do"} ${p.name || ""}`} onChange={(v) => setP({ kicker: v })} /></Field>
        <Field label="Nome / descrição da pessoa"><TextInput value={p.name} onChange={(v) => setP({ name: v })} /></Field>
        <Field label="Cargo / papel"><TextInput value={p.role} onChange={(v) => setP({ role: v })} /></Field>
        <Field label="Cor de acento"><Segmented value={p.tone} onChange={(v) => setP({ tone: v })} options={[{ id: "coral", label: "Coral" }, { id: "ocean", label: "Oceano" }, { id: "sage", label: "Sage" }]} /></Field>
        <ImageField label="Foto do avatar" src={p.src} onChange={(v) => setP({ src: v })} />
        <p style={hint}>O cabeçalho é livre: escreva, por exemplo, “Comentário da Ana” ou “Nota da curadoria”. O corpo é editado direto na página.</p>
      </>);
    case "imagem":
      return (<>
        <ImageField label="Imagem" src={p.src} onChange={(v) => setP({ src: v })} />
        <AltFields p={p} setP={setP} />
        <Field label="Proporção"><Segmented value={p.ratio} onChange={(v) => setP({ ratio: v })} options={[{ id: "16/9", label: "16:9" }, { id: "4/3", label: "4:3" }, { id: "1/1", label: "1:1" }]} /></Field>
        <Field label="Crédito / fonte"><TextInput value={p.credit} onChange={(v) => setP({ credit: v })} /></Field>
        <p style={hint}>A legenda é editada direto na página.</p>
      </>);
    case "parallax":
      return (<>
        <ImageField label="Imagem de fundo" src={p.src} onChange={(v) => setP({ src: v })} />
        <AltFields p={p} setP={setP} />
        <Field label="Altura do bloco"><Segmented value={p.height || "70vh"} onChange={(v) => setP({ height: v })} options={[{ id: "50vh", label: "Baixa" }, { id: "70vh", label: "Média" }, { id: "85vh", label: "Alta" }]} /></Field>
        <Field label="Crédito / fonte"><TextInput value={p.credit} onChange={(v) => setP({ credit: v })} /></Field>
        <p style={hint}>O título sobreposto e a legenda são editados direto na página. Use imagens horizontais e com boa resolução.</p>
      </>);
    case "textoimagem":
      return (<>
        <ImageField label="Imagem" src={p.src} onChange={(v) => setP({ src: v })} />
        <AltFields p={p} setP={setP} />
        <Field label="Ordem"><Segmented value={p.ordem || "texto-imagem"} onChange={(v) => setP({ ordem: v })} options={[{ id: "texto-imagem", label: "Texto → Img" }, { id: "imagem-texto", label: "Img → Texto" }]} /></Field>
        <Field label="Largura da imagem"><Segmented value={p.largura || "46%"} onChange={(v) => setP({ largura: v })} options={[{ id: "40%", label: "Pequena" }, { id: "46%", label: "Média" }, { id: "54%", label: "Grande" }]} /></Field>
        <Field label="Sangria (vaza para fora)"><Segmented value={p.sangria || "8%"} onChange={(v) => setP({ sangria: v })} options={[{ id: "0%", label: "Nenhuma" }, { id: "8%", label: "Suave" }, { id: "14%", label: "Forte" }]} /></Field>
        <Field label="Fonte / crédito"><TextInput value={p.fonte} onChange={(v) => setP({ fonte: v })} /></Field>
        <p style={hint}>A legenda e o texto são editados direto na página. No celular, texto e imagem empilham automaticamente.</p>
      </>);
    case "filmstrip":
      return <FilmstripEditor p={p} setP={setP} />;
    case "tabela":
      return <TableEditor p={p} setP={setP} />;
    case "linhadotempo":
      return <TimelineEditor p={p} setP={setP} />;
    case "video":
      return (<>
        <Field label="ID do vídeo (YouTube)"><TextInput value={p.id} onChange={(v) => setP({ id: extractYT(v) })} placeholder="dQw4w9WgXcQ ou URL" /></Field>
        <Field label="Legenda"><TextInput value={p.caption} onChange={(v) => setP({ caption: v })} /></Field>
        <Field label="Crédito"><TextInput value={p.credit} onChange={(v) => setP({ credit: v })} /></Field>
        <Field label="Início (segundos)"><TextInput value={p.start} onChange={(v) => setP({ start: v })} /></Field>
        <Toggle value={!!p.captionsOk} onChange={(v) => setP({ captionsOk: v })} label="Conferi: o vídeo tem legendas" />
        {window.AccessBox && <window.AccessBox />}
        {window.CaptionsFetcher && <window.CaptionsFetcher video={p.id} hasText={String(p.transcript || "").trim().length > 0} onFill={(r) => setP({ transcript: r.text, transcriptAuto: !!r.auto, transcriptReviewed: false })} />}
        {window.SubtitleFile && <window.SubtitleFile cues={p.transcriptCues} hasText={String(p.transcript || "").trim().length > 0} onLoad={(r) => setP({ transcriptCues: r.cues, transcript: r.text, transcriptAuto: false, transcriptReviewed: false })} onClear={() => setP({ transcriptCues: [] })} />}
        {window.SummaryBox && <window.SummaryBox value={p.summaryMd} cues={p.transcriptCues} transcript={p.transcript} onChange={(v) => setP({ summaryMd: v })} />}
        <div data-vis="box" style={{ margin: "10px 0", padding: "10px 12px", border: "1px solid var(--tool-line)", borderRadius: 9, background: "var(--tool-surface)" }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, margin: "0 0 2px" }}>O que aparece na aula, junto do vídeo</div>
          <p style={{ ...hint, margin: "0 0 6px" }}>Desligar esconde da aula (HTML, SCORM, pacote e PDF), mas guarda o conteúdo aqui no painel.</p>
          <Toggle value={p.showSubtitle !== false} onChange={(v) => setP({ showSubtitle: v })} label="Faixa de legenda (letras amarelas sob o vídeo)" />
          <Toggle value={p.showSummary !== false} onChange={(v) => setP({ showSummary: v })} label="Resumo do vídeo" />
          <Toggle value={p.showTranscript !== false} onChange={(v) => setP({ showTranscript: v })} label="Transcrição" />
          {p.showTranscript === false && <p style={{ ...hint, margin: "6px 0 0" }}>Com a transcrição desligada, o verificador de acessibilidade deixa de contá-la como alternativa ao vídeo.</p>}
        </div>
        <Field label="Transcrição (texto do vídeo)"><TextArea value={p.transcript} onChange={(v) => setP({ transcript: v })} placeholder="Cole aqui a transcrição. Separe parágrafos com uma linha em branco." /></Field>
        {p.transcriptAuto && <Toggle value={!!p.transcriptReviewed} onChange={(v) => setP({ transcriptReviewed: v })} label="Revisei a transcrição automática" />}
        <Field label="Ou link da transcrição"><TextInput value={p.transcriptUrl} onChange={(v) => setP({ transcriptUrl: v })} placeholder="https://…" /></Field>
        <p style={hint}>A transcrição aparece na aula como “Transcrição”, recolhida. Quem não ouve ou não vê o vídeo lê o texto no lugar. Com um arquivo de legenda (.srt ou .vtt), ela também acompanha o vídeo, em uma faixa de letras amarelas sobre fundo escuro; o texto do campo Transcrição é o que vai para o PDF e para o leitor de tela. O Resumo (tópicos com tempo) aparece antes da transcrição.</p>
      </>);
    case "audio":
      return (<>
        <Field label="Link/URI do Spotify"><TextInput value={p.spotify} onChange={(v) => setP({ spotify: v })} placeholder="open.spotify.com/episode/… ou spotify:episode:…" /></Field>
        <p style={hint}>Ou um arquivo de áudio:</p>
        <Field label="URL do arquivo (.mp3)"><TextInput value={p.src} onChange={(v) => setP({ src: v })} /></Field>
        <Field label="Programa / show"><TextInput value={p.show} onChange={(v) => setP({ show: v })} /></Field>
        <Field label="Título do episódio"><TextInput value={p.title} onChange={(v) => setP({ title: v })} /></Field>
        <Field label="Descrição"><TextArea value={p.description} onChange={(v) => setP({ description: v })} /></Field>
        <Field label="Transcrição (texto do áudio)"><TextArea value={p.transcript} onChange={(v) => setP({ transcript: v })} placeholder="Cole aqui a transcrição. Separe parágrafos com uma linha em branco." /></Field>
        <Field label="Ou link da transcrição"><TextInput value={p.transcriptUrl} onChange={(v) => setP({ transcriptUrl: v })} placeholder="https://…" /></Field>
        <p style={hint}>Quem não ouve precisa de um texto equivalente. A transcrição aparece na aula, recolhida.</p>
      </>);
    case "externalembed":
      return (<>
        <Field label="Título acessível"><TextInput value={p.title} onChange={(v) => setP({ title: v })} /></Field>
        <Field label="URL pública ou código iframe"><TextArea value={p.embed} onChange={(v) => setP({ embed: v })} placeholder="https://... ou <iframe ...>" /></Field>
        <Toggle value={p.responsive !== false} onChange={(v) => setP({ responsive: v })} label="Responsivo na largura" />
        <Toggle value={p.useEmbedDimensions !== false} onChange={(v) => setP({ useEmbedDimensions: v })} label="Herdar dimensões do iframe" />
        <Field label="Largura máxima (px, opcional)"><TextInput value={p.width} onChange={(v) => setP({ width: v })} /></Field>
        <Field label="Altura (px)"><TextInput value={p.height || 600} onChange={(v) => setP({ height: Number(v) || 600 })} /></Field>
        <p style={hint}>Somente URLs HTTP/HTTPS são incorporadas. Alguns sites bloqueiam iframe por política própria.</p>
      </>);
    case "cases":
      return (<>
        <Field label="Título da seção"><TextInput value={p.title} onChange={(v) => setP({ title: v })} /></Field>
        <Field label="Introdução (opcional)"><TextArea value={p.intro} onChange={(v) => setP({ intro: v })} /></Field>
        <Field label="Colunas (desktop)"><Segmented value={String(p.columns || 2)} onChange={(v) => setP({ columns: Number(v) })} options={[{ id: "2", label: "2 colunas" }, { id: "3", label: "3 colunas" }]} /></Field>
        <Field label="Formato do card"><Segmented value={p.layout || "vertical"} onChange={(v) => setP({ layout: v })} options={[{ id: "vertical", label: "Vertical" }, { id: "horizontal", label: "Imagem à esq." }]} /></Field>
        <p style={hint}>No celular os cards ficam sempre 1 por linha. “Imagem à esq.” coloca a capa à esquerda e o texto à direita.</p>
        <ItemList items={p.cards} onChange={(v) => setP({ cards: v })} label="Card" fields={def.itemFields} template={{ mediaType: "image", tag: "Etiqueta", title: "Título", text: "Texto curto.", src: "", slotId: "", icon: "lightbulb" }} />
      </>);
    case "feature":
      return (<>
        <Field label="Título da seção"><TextInput value={p.title} onChange={(v) => setP({ title: v })} /></Field>
        <Field label="Introdução (opcional)"><TextArea value={p.intro} onChange={(v) => setP({ intro: v })} /></Field>
        <Field label="Alinhamento"><Segmented value={p.align || "center"} onChange={(v) => setP({ align: v })} options={[{ id: "center", label: "Centralizado" }, { id: "left", label: "À esquerda" }]} /></Field>
        <Field label="Itens por linha (desktop)"><Segmented value={String(p.columns || 3)} onChange={(v) => setP({ columns: Number(v) })} options={[1,2,3,4].map((n) => ({ id: String(n), label: String(n) }))} /></Field>
        <ItemList items={p.features} onChange={(v) => setP({ features: v })} label="Destaque" fields={def.itemFields} template={{ icon: "star", tone: "ocean", title: "Título", text: "Uma linha de explicação." }} />
        <p style={hint}>Use ícones do <strong>Font Awesome</strong> (estilo sólido) pelo nome — ex.: <em>dna, bolt, flask, leaf, heart-pulse</em>. No celular vira 1 por linha; 2 ou 3 por linha no desktop.</p>
      </>);
    case "flashcards":
      return <><Field label="Rótulo no topo"><TextInput value={p.label || "Flashcards"} onChange={(v) => setP({ label: v })} /></Field><ItemList items={p.cards} onChange={(v) => setP({ cards: v })} label="Card" fields={def.itemFields} template={{ front: "Pergunta", back: "Resposta" }} /></>;
    case "slider":
      return (<>
        <Field label="Título no topo"><TextInput value={p.label || ""} onChange={(v) => setP({ label: v })} placeholder="Ex.: Passo a passo, Sequência, Ideias" /></Field>
        <ItemList items={p.steps} onChange={(v) => setP({ steps: v })} label="Slide" fields={def.itemFields} template={{ marker: "", icon: "", title: "Slide", body: "Descrição." }} />
      </>);
    case "accordion": {
      const items = (p.items || []).map((it) => ({ ...it, title: it.title != null ? it.title : (it.q || ""), body: it.body != null ? it.body : (it.a || "") }));
      return <><ItemList items={items} onChange={(v) => setP({ items: v.map(({ q, a, ...it }) => it) })} label="Item" fields={def.itemFields} template={{ title: "Pergunta?", body: "<p>Resposta.</p>", children: [] }} /><p style={hint}>Adicione e reorganize blocos dentro de cada aba diretamente no canvas.</p></>;
    }
    case "columns": {
      const columns = (p.columns || []).map((column) => ({ ...column, children: Array.isArray(column.children) ? column.children : [] }));
      const resizeColumns = (value) => {
        const count = Math.max(2, Math.min(4, Number(value) || 2));
        const next = columns.slice(0, count);
        while (next.length < count) next.push({ title: "", body: "", children: [] });
        if (columns.length > count) {
          const preserved = [];
          columns.slice(count).forEach((column) => {
            if (column.title) { const title = window.newChildBlock("titulo"); title.props.text = column.title; title.props.level = "h3"; preserved.push(title); }
            if (column.body) { const prose = window.newChildBlock("prose"); prose.props.body = column.body; preserved.push(prose); }
            preserved.push(...(column.children || []));
          });
          next[count - 1] = { ...next[count - 1], children: [...(next[count - 1].children || []), ...preserved] };
        }
        const emphasis = p.emphasis !== "none" && Number(p.emphasis) >= count ? "none" : (p.emphasis || "none");
        setP({ columns: next, emphasis });
      };
      const distribution = [{ id: "none", label: "Iguais" }].concat(columns.map((_, index) => ({ id: String(index), label: `${index + 1}ª maior` })));
      return <>
        <Field label="Quantidade de colunas"><Segmented value={String(Math.max(2, columns.length || 2))} onChange={resizeColumns} options={[2,3,4].map((n) => ({ id:String(n), label:String(n) }))} /></Field>
        <Field label="Distribuição"><Segmented value={p.emphasis || "none"} onChange={(v) => setP({ emphasis: v })} options={distribution} /></Field>
        <Field label="Espaçamento"><Segmented value={p.gap || "normal"} onChange={(v) => setP({ gap: v })} options={[{id:"compact",label:"Compacto"},{id:"normal",label:"Padrão"},{id:"wide",label:"Amplo"}]} /></Field>
        <p style={hint}>Arraste blocos para cada coluna ou use “Adicionar bloco”. A coluna destacada ocupa o dobro da largura das demais; no celular, todas são empilhadas.</p>
      </>;
    }
    case "quiz":
      return <QuizEditor p={p} setP={setP} />;
    case "materiais":
      return (<>
        <Field label="Título da seção"><TextInput value={p.title} onChange={(v) => setP({ title: v })} /></Field>
        <ItemList items={p.items} onChange={(v) => setP({ items: v })} label="Material" fields={def.itemFields} template={{ type: "artigo", title: "Título", source: "Fonte", href: "https://" }} />
      </>);
    case "referencias":
      return (<>
        <Field label="Título"><TextInput value={p.title} onChange={(v) => setP({ title: v })} /></Field>
        {window.ReferencesTool && <window.ReferencesTool items={p.items} onChange={(v) => setP({ items: v })} />}
        <StringList items={p.items} onChange={(v) => setP({ items: v })} label="Referência" placeholder="SOBRENOME, Nome. <strong>Título</strong>. Editora, ano." />
      </>);
    default:
      return null;
  }
}
const hint = { fontSize: 12, color: "var(--tool-ink-3)", lineHeight: 1.5, margin: "4px 0 0" };

function extractYT(v) {
  if (!v) return v;
  const m = v.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : v.trim();
}

Object.assign(window, { PropertiesPanel });
