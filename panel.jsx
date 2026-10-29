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
function IconPicker({ value, onChange, placeholder }) {
  const [query, setQuery] = useStateP("");
  const q = query.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const matches = FREE_ICONS.filter(([name, words]) => !q || (name + " " + words).normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q)).slice(0, 24);
  return <div>
    <div style={{ display: "flex", gap: 6 }}>
      <span style={{ width: 38, display: "grid", placeItems: "center", border: "1px solid var(--tool-line-2)", borderRadius: 8, background: "#fff", color: "var(--tool-sel)" }}><i className={window.fontAwesomeClass ? window.fontAwesomeClass(value || "icons") : "fa-solid fa-" + (value || "icons")} /></span>
      <input style={ps.input} value={query} placeholder={placeholder || "Busque por ideia, saúde, alerta…"} onChange={(e) => setQuery(e.target.value)} />
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 5, marginTop: 7, maxHeight: 150, overflowY: "auto" }}>
      {matches.map(([name, words]) => <button type="button" key={name} title={name + " · " + words} onClick={() => { onChange(name); setQuery(""); }} style={{ height: 34, borderRadius: 7, cursor: "pointer", background: value === name ? "var(--tool-sel-soft)" : "#fff", color: value === name ? "var(--tool-sel)" : "var(--tool-ink-2)", border: value === name ? "2px solid var(--tool-sel)" : "1px solid var(--tool-line)" }}><i className={window.fontAwesomeClass ? window.fontAwesomeClass(name) : "fa-solid fa-" + name} /></button>)}
    </div>
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
        ref={ref} contentEditable suppressContentEditableWarning spellCheck
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
function PropertiesPanel({ block, update, mergePrev, onRenumberEquations, onInsertEquation }) {
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
        {renderTypeContent(block, p, setP, mergePrev, onRenumberEquations, onInsertEquation)}
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


// ── Equação: fórmula em LaTeX (KaTeX) com atalhos para quem não conhece a sintaxe ──
const EQ_STRUCT = [
  ["a/b", "\\frac{¤}{}", "Fração"], ["√", "\\sqrt{¤}", "Raiz quadrada"], ["ⁿ√", "\\sqrt[¤]{}", "Raiz de índice n"],
  ["xⁿ", "^{¤}", "Potência (expoente)"], ["xₙ", "_{¤}", "Índice (subscrito)"], ["Σ", "\\sum_{i=1}^{n} ¤", "Somatório"],
  ["∫", "\\int_{a}^{b} ¤\\,dx", "Integral"], ["lim", "\\lim_{x \\to ¤}", "Limite"], ["v⃗", "\\vec{¤}", "Vetor"],
  ["x̄", "\\bar{¤}", "Barra (média)"], ["∂", "\\frac{\\partial ¤}{\\partial x}", "Derivada parcial"], ["abc", "\\text{¤}", "Texto dentro da fórmula"],
  ["( )", "\\left( ¤ \\right)", "Parênteses que crescem"],
];
const EQ_SYMS = [
  ["α", "\\alpha "], ["β", "\\beta "], ["γ", "\\gamma "], ["Δ", "\\Delta "], ["θ", "\\theta "], ["λ", "\\lambda "], ["μ", "\\mu "], ["π", "\\pi "],
  ["ρ", "\\rho "], ["σ", "\\sigma "], ["τ", "\\tau "], ["φ", "\\varphi "], ["ω", "\\omega "], ["Ω", "\\Omega "],
  ["±", "\\pm "], ["×", "\\times "], ["·", "\\cdot "], ["÷", "\\div "], ["≤", "\\leq "], ["≥", "\\geq "], ["≠", "\\neq "], ["≈", "\\approx "],
  ["∞", "\\infty "], ["→", "\\rightarrow "], ["⇒", "\\Rightarrow "], ["°", "^{\\circ}"], ["∝", "\\propto "], ["∈", "\\in "],
];
const EQ_SETS = [
  ["∪", "\\cup ", "União"], ["∩", "\\cap ", "Interseção"], ["∖", "\\setminus ", "Diferença (A menos B)"], ["△", "\\triangle ", "Diferença simétrica"],
  ["Ā", "\\overline{¤}", "Complementar (barra)"], ["Aᶜ", "^{c}", "Complementar (expoente c)"], ["∅", "\\emptyset ", "Conjunto vazio"],
  ["∈", "\\in ", "Pertence"], ["∉", "\\notin ", "Não pertence"], ["⊂", "\\subset ", "Contido (próprio)"], ["⊆", "\\subseteq ", "Contido ou igual"],
  ["⊄", "\\not\\subset ", "Não contido"], ["⊃", "\\supset ", "Contém (próprio)"], ["⊇", "\\supseteq ", "Contém ou igual"], ["A×B", "\\times ", "Produto cartesiano"],
  ["{ }", "\\left\\{ ¤ \\right\\}", "Conjunto entre chaves"], ["{x|}", "\\left\\{ x \\mid ¤ \\right\\}", "Conjunto por propriedade"], ["|A|", "\\left| ¤ \\right|", "Cardinalidade"],
  ["⋃", "\\bigcup_{i=1}^{n} ¤", "União de vários conjuntos"], ["⋂", "\\bigcap_{i=1}^{n} ¤", "Interseção de vários conjuntos"], ["𝒫", "\\mathcal{P}(¤)", "Conjunto das partes"],
  ["ℕ", "\\mathbb{N}", "Naturais"], ["ℤ", "\\mathbb{Z}", "Inteiros"], ["ℚ", "\\mathbb{Q}", "Racionais"], ["ℝ", "\\mathbb{R}", "Reais"], ["ℂ", "\\mathbb{C}", "Complexos"],
];
const EQ_LOGIC = [
  ["∧", "\\land ", "E (conjunção)"], ["∨", "\\lor ", "OU (disjunção)"], ["¬", "\\neg ", "Negação"], ["⊕", "\\oplus ", "OU exclusivo (XOR)"],
  ["→", "\\rightarrow ", "Implicação"], ["↔", "\\leftrightarrow ", "Bicondicional"], ["⇒", "\\Rightarrow ", "Implica (⇒)"], ["⇔", "\\Leftrightarrow ", "Se e somente se (⇔)"],
  ["≡", "\\equiv ", "Equivalente"], ["∀", "\\forall ", "Para todo"], ["∃", "\\exists ", "Existe"], ["∄", "\\nexists ", "Não existe"],
  ["⊤", "\\top ", "Verdadeiro"], ["⊥", "\\bot ", "Falso"], ["∴", "\\therefore ", "Portanto"], ["∵", "\\because ", "Pois"],
  ["⊢", "\\vdash ", "Prova (deriva)"], ["⊨", "\\models ", "Satisfaz (modela)"], ["↑", "\\uparrow ", "NAND (barra de Sheffer)"], ["↓", "\\downarrow ", "NOR (seta de Peirce)"],
  ["p̄", "\\overline{¤}", "Negação (barra em cima)"],
];
const EQ_EXAMPLES = [
  ["Teorema de Pitágoras", "a^{2} + b^{2} = c^{2}"],
  ["Fórmula de Bhaskara", "x = \\frac{-b \\pm \\sqrt{b^{2} - 4ac}}{2a}"],
  ["Velocidade média", "v_m = \\frac{\\Delta s}{\\Delta t}"],
  ["2ª lei de Newton", "\\vec{F} = m\\,\\vec{a}"],
  ["Energia cinética", "E_c = \\frac{1}{2}\\, m\\, v^{2}"],
  ["Lei de Ohm", "V = R \\cdot I"],
  ["Gravitação universal", "F = G\\,\\frac{m_1\\, m_2}{r^{2}}"],
  ["Equivalência massa-energia", "E = mc^{2}"],
  ["Derivada (definição)", "\\frac{dy}{dx} = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}"],
  ["Teorema fundamental do cálculo", "\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)"],
  ["Média aritmética", "\\bar{x} = \\frac{1}{n} \\sum_{i=1}^{n} x_i"],
  ["Conjuntos: união e interseção", "\\left| A \\cup B \\right| = \\left| A \\right| + \\left| B \\right| - \\left| A \\cap B \\right|"],
  ["Conjuntos: diferença", "A \\setminus B = \\left\\{ x \\mid x \\in A \\land x \\notin B \\right\\}"],
  ["Conjuntos: De Morgan", "\\overline{A \\cup B} = \\overline{A} \\cap \\overline{B}"],
  ["Lógica: De Morgan", "\\neg (p \\land q) \\equiv \\neg p \\lor \\neg q"],
  ["Lógica: condicional", "p \\rightarrow q \\equiv \\neg p \\lor q"],
  ["Lógica: quantificadores", "\\forall x \\in A,\\ \\exists y \\in B : P(x, y)"],
];
function EquationPanel({ p, setP, onRenumber }) {
  const ref = React.useRef(null);
  const plain = (s) => String(s == null ? "" : s).replace(/<[^>]+>/g, "");
  const insert = (snippet) => {
    const ta = ref.current, cur = p.latex || "";
    const at = ta ? ta.selectionStart : cur.length, end = ta ? ta.selectionEnd : cur.length;
    const mark = snippet.indexOf("¤");
    const text = snippet.replace("¤", ta && end > at ? cur.slice(at, end) : "");
    const next = cur.slice(0, at) + text + cur.slice(end);
    setP({ latex: next });
    const pos = at + (mark >= 0 ? mark + (end > at ? end - at : 0) : text.length);
    setTimeout(() => { if (ta) { ta.focus(); ta.setSelectionRange(pos, pos); } }, 0);
  };
  const btn = { border: "1px solid var(--tool-line-2)", background: "#fff", borderRadius: 7, padding: "5px 0", minWidth: 34, fontSize: 13, cursor: "pointer", color: "var(--tool-ink)", fontFamily: "inherit" };
  const err = (() => { const r = window.renderEquation ? window.renderEquation(p.latex) : null; return r && r.error ? r.error : ""; })();
  return (<>
    <Field label="Fórmula (LaTeX)">
      <textarea ref={ref} spellCheck={false} value={p.latex || ""} onChange={(e) => setP({ latex: e.target.value })} placeholder="Ex.: E = mc^{2}" rows={4}
        style={{ ...ps.area, fontFamily: "var(--font-mono, JetBrains Mono, ui-monospace, Menlo, monospace)", fontSize: 12.5, minHeight: 84 }} />
      {err ? <p style={{ ...hint, color: "#9a2f1b" }}>Erro na fórmula: {err}</p> : <p style={hint}>A fórmula aparece pronta na página. Use os atalhos abaixo ou digite em LaTeX.</p>}
    </Field>
    <Field label="Estruturas">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {EQ_STRUCT.map(([l, s, t]) => <button key={t} type="button" title={t} aria-label={t} onClick={() => insert(s)} style={btn}>{l}</button>)}
      </div>
    </Field>
    <Field label="Símbolos">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {EQ_SYMS.map(([l, s]) => <button key={l} type="button" title={s.trim()} aria-label={"Inserir " + s.trim()} onClick={() => insert(s)} style={btn}>{l}</button>)}
      </div>
    </Field>
    <Field label="Operações de conjuntos">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {EQ_SETS.map(([l, s, t]) => <button key={t} type="button" title={t} aria-label={t} onClick={() => insert(s)} style={btn}>{l}</button>)}
      </div>
    </Field>
    <Field label="Operadores lógicos">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {EQ_LOGIC.map(([l, s, t]) => <button key={t} type="button" title={t} aria-label={t} onClick={() => insert(s)} style={btn}>{l}</button>)}
      </div>
    </Field>
    <Field label="Exemplos prontos">
      <select value="" onChange={(e) => { const ex = EQ_EXAMPLES[Number(e.target.value)]; if (ex) setP({ latex: ex[1] }); }} style={ps.input}>
        <option value="">Substituir por um exemplo…</option>
        {EQ_EXAMPLES.map((ex, i) => <option key={ex[0]} value={i}>{ex[0]}</option>)}
      </select>
    </Field>
    <div style={{ borderTop: "1px solid var(--tool-line)", margin: "4px 0 14px" }} />
    <Field label={"Tamanho da letra da fórmula: " + (Number(p.size) || 100) + "%"}>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {[["Pequena", 75], ["Normal", 100], ["Grande", 130]].map(([l, v]) => <button key={v} type="button" onClick={() => setP({ size: v })} aria-pressed={(Number(p.size) || 100) === v} style={{ ...btn, flex: 1, padding: "6px 4px", fontWeight: (Number(p.size) || 100) === v ? 700 : 400, borderColor: (Number(p.size) || 100) === v ? "var(--tool-accent)" : undefined }}>{l}</button>)}
      </div>
      <input type="range" min="40" max="160" step="5" value={Number(p.size) || 100} onChange={(e) => setP({ size: Number(e.target.value) })} aria-label="Tamanho da letra da fórmula, em porcentagem" style={{ width: "100%" }} />
    </Field>
    <Field><Toggle value={p.framed !== false} onChange={(v) => setP({ framed: v })} label="Mostrar moldura (caixa com borda)" /></Field>
    <Field><Toggle value={p.autoFit !== false} onChange={(v) => setP({ autoFit: v })} label="Reduzir sozinha para caber (sem barra de rolagem)" /></Field>
    <p style={hint}>Com o ajuste ligado, uma fórmula comprida diminui só o necessário para caber na largura da página. Desligue para manter exatamente o tamanho escolhido.</p>
    <Field><Toggle value={p.showNumber !== false} onChange={(v) => setP({ showNumber: v })} label="Mostrar número da equação" /></Field>
    {p.showNumber !== false && (
      <Field label="Número da equação">
        <TextInput value={plain(p.number)} onChange={(v) => setP({ number: v })} placeholder="(1)" />
        <p style={hint}>Escreva no formato que quiser: (1), (1.1), Eq. 1… Também dá para clicar no número, na página, e digitar. Uma equação nova recebe sozinha o número seguinte ao da anterior.</p>
        <button type="button" onClick={onRenumber} style={{ ...btn, width: "100%", marginTop: 8, padding: "7px 10px", fontSize: 12.5 }}>Renumerar todas as equações em sequência</button>
        <p style={hint}>Segue o formato da primeira equação da aula e reescreve o número de todas as outras.</p>
      </Field>
    )}
    <Field label="Descrição para leitores de tela (opcional)">
      <TextInput value={p.ariaLabel || ""} onChange={(v) => setP({ ariaLabel: v })} placeholder="Ex.: Equação de Bhaskara" />
      <p style={hint}>A fórmula já é lida como MathML. Use este campo só se quiser um nome curto para ela.</p>
    </Field>
  </>);
}

function renderTypeContent(block, p, setP, mergePrev, onRenumber, onInsertEquation) {
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
      </>);
    case "audio":
      return (<>
        <Field label="Link/URI do Spotify"><TextInput value={p.spotify} onChange={(v) => setP({ spotify: v })} placeholder="open.spotify.com/episode/… ou spotify:episode:…" /></Field>
        <p style={hint}>Ou um arquivo de áudio:</p>
        <Field label="URL do arquivo (.mp3)"><TextInput value={p.src} onChange={(v) => setP({ src: v })} /></Field>
        <Field label="Programa / show"><TextInput value={p.show} onChange={(v) => setP({ show: v })} /></Field>
        <Field label="Título do episódio"><TextInput value={p.title} onChange={(v) => setP({ title: v })} /></Field>
        <Field label="Descrição"><TextArea value={p.description} onChange={(v) => setP({ description: v })} /></Field>
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
