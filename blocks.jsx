/* eslint-disable */
// ClassAtelier — block renderer. ONE renderer drives the edit canvas, the
// preview, and the exported HTML (mode: "edit" | "preview"). Text blocks
// inject <Editable> into the REAL Aula component; structural blocks render
// the real component read-only (edited via the side panel).
//
// Two layers:
//   BlockCore — the inner content of a block, WITHOUT any band wrapper.
//   BlockView — wraps the core: a "topic" becomes one shared band holding its
//               children compactly; full-width structural blocks render their
//               own section; everything else gets its own <Band>.

const {
  LessonHero, Prose, FullBleedSection, Destaque, Atencao, Reflexao, Citacao,
  Sintese, ImagemLegenda, ChapterDivider, FlashCardDeck, Slider, Accordion,
  Columns, CollapsibleSection, SectionSlider,
  Sumario, ProgressBar, LessonComplete, CreditsFooter, ClassAtelierMark, PDFContext, PDFGlossary, usePDF,
} = window;
const {
  Quiz, VideoYouTube, AudioPodcast, ExternalEmbed, CaseCards, FeatureGrid, MateriaisExtras, ReferenciasABNT, PitacoDo, ParallaxImage,
  Tabela, Filmstrip, LinhaDoTempo, TextoImagem,
} = window;

// Vertical-padding band + reading-measure wrapper used by root-level blocks.
function Band({ block, children }) {
  return (
    <FullBleedSection tone={block.bg} py={window.PAD_BY_ID[block.pad] || window.PAD_BY_ID.normal}>
      <Prose>{children}</Prose>
    </FullBleedSection>
  );
}

// Disables pointer events on interactive components while editing so a click
// selects the block instead of flipping a card / opening an accordion.
function PointerGuard({ on, children }) {
  if (!on) return children;
  return <div style={{ pointerEvents: "none" }}>{children}</div>;
}

// The INNER content of a block — no band, no measure wrapper. Safe to render
// both at root (BlockView adds the band) and inside a topic (compact, shared
// band). Never receives a "topic" here.
function BlockCore({ block, mode, renderNestedList }) {
  const isEdit = mode === "edit";
  const onChange = block.onChange || (() => {});
  const p = block.props;
  const set = (k, v) => onChange({ ...p, [k]: v });
  const renderNestedContent = (children) => (children || []).length ? <div className="aula-embedded-blocks">{children.map((child)=><div key={child.id} className="aula-embedded-block" data-type={child.type}><BlockCore block={{...child,onChange:()=>{}}} mode={mode}/></div>)}</div> : null;

  const E = (key, opts = {}) =>
    React.createElement(window.Editable, {
      mode, tag: opts.tag || (opts.single ? "span" : "div"), single: opts.single,
      className: opts.className, style: opts.style,
      html: p[key], placeholder: opts.placeholder || "",
      onChange: (v) => set(key, v),
    });
  const LE = (arrayKey, index, key, opts = {}) => React.createElement(window.Editable, {
    mode, tag: opts.tag || "span", single: !!opts.single, html: (p[arrayKey] || [])[index]?.[key] || "", placeholder: opts.placeholder || "",
    onChange: (v) => set(arrayKey, (p[arrayKey] || []).map((item, i) => i === index ? { ...item, [key]: v } : item)),
  });
  const NestedE = (arrayKey, index, key, opts = {}) => React.createElement(window.Editable, {
    mode, tag: opts.tag || "span", single: !!opts.single,
    html: (p[arrayKey] || [])[index]?.[key] || "", placeholder: opts.placeholder || "",
    onChange: (v) => set(arrayKey, (p[arrayKey] || []).map((item, i) => i === index ? { ...item, [key]: v } : item)),
  });
  const MatrixE = (arrayKey, row, col, opts = {}) => React.createElement(window.Editable, {
    mode, tag: opts.tag || "span", single: !!opts.single,
    html: (p[arrayKey] || [])[row]?.[col] || "", placeholder: opts.placeholder || "",
    onChange: (v) => set(arrayKey, (p[arrayKey] || []).map((line, ri) => ri === row ? line.map((cell, ci) => ci === col ? v : cell) : line)),
  });

  switch (block.type) {
    // ───── Estrutura (full-width, own section) ─────
    case "hero":
      return (
        <LessonHero
          eyebrow={E("eyebrow", { single: true, placeholder: "Sobrelinha" })}
          title={E("title", { single: true, placeholder: "Título da aula" })}
          lead={E("lead", { single: true, placeholder: "Linha de abertura." })}
          author={p.author} authorImage={p.authorImage} readTime={p.readTime} date={p.date}
        />
      );
    case "divider":
      return <ChapterDivider label={E("label", { single: true, placeholder: "Rótulo" })} />;
    case "pagebreak":
      if (!isEdit) return <div className="aula-pagebreak-before aula-pagebreak-marker" aria-hidden="true" />;
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px max(24px, var(--page-pad))", color: "var(--tool-ink-2)", background: "var(--tool-surface)" }}>
          <span style={{ flex: 1, borderTop: "1.5px dashed var(--tool-line-2)" }} />
          <span style={{ fontFamily: "var(--tool-sans)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Quebra de página no PDF</span>
          <span style={{ flex: 1, borderTop: "1.5px dashed var(--tool-line-2)" }} />
        </div>
      );
    case "collapsebreak":
      return <div className="aula-collapsebreak">Conteúdo recolhido abaixo deste ponto</div>;
    case "sintese":
      return (
        <Sintese
          eyebrow={E("eyebrow", { single: true, placeholder: "Síntese" })}
          title={E("title", { single: true, placeholder: "A ideia que fecha a aula." })}
          tocLabel={(p.eyebrow || "").replace(/<[^>]+>/g, "")}
        >
          {E("body", { placeholder: "Recapitulação curta." })}
        </Sintese>
      );

    // ───── Título de seção ─────
    case "titulo": {
      const Tag = p.level === "h3" ? "h3" : "h2";
      return E("text", { single: true, tag: Tag, placeholder: "Título da seção", style: { margin: 0 } });
    }

    case "referencias":
      if (isEdit) return <section className="aula-refs is-open"><div className="aula-refs__head"><span className="aula-refs__head-left"><i className="fa-solid fa-book"/><span className="aula-refs__title">{E("title",{single:true,placeholder:"Referências"})}</span><span className="aula-refs__count">{(p.items||[]).length}</span></span></div><div className="aula-refs__bodywrap"><div className="aula-refs__clip"><ol className="aula-refs__list">{(p.items||[]).map((r,i)=><li className="aula-refs__ref" key={i}>{React.createElement(window.Editable,{mode,tag:"div",html:r,placeholder:"Referência",onChange:(v)=>set("items",p.items.map((x,j)=>j===i?v:x))})}</li>)}</ol></div></div></section>;
      return <ReferenciasABNT title={p.title} items={p.items} defaultOpen={true} />;

    // ───── Texto ─────
    case "prose": {
      const dc = p.dropcap ? ("dropcap" + (p.dropcapTone && p.dropcapTone !== "terracotta" ? " dropcap-" + p.dropcapTone : "")) : undefined;
      const video = p.inlineVideo && p.inlineVideo.id ? p.inlineVideo : null;
      const setInlineVideo = (key, value) => set("inlineVideo", { ...(p.inlineVideo || {}), [key]: value });
      if (!video) return E("body", { placeholder: "Escreva o corpo do texto…", className: dc });
      const inlineVideo = video ? (isEdit
        ? <figure className="aula-video aula-video--inline"><div className="aula-video__frame"><div className="aula-video__poster" style={{ pointerEvents: "none" }}><span className="aula-video__scrim"/><span className="aula-video__play"><i className="fa-solid fa-play"/></span><span className="aula-video__poster-title" style={{ pointerEvents: "auto" }}>{React.createElement(window.Editable, { mode, tag: "span", single: true, html: video.title || "", placeholder: "Título do vídeo", onChange: (value) => setInlineVideo("title", value) })}</span></div></div><figcaption className="aula-media-cap">{React.createElement(window.Editable, { mode, tag: "span", single: true, html: video.caption || "", placeholder: "Legenda do vídeo", onChange: (value) => setInlineVideo("caption", value) })}<span className="aula-media-credit"> — {React.createElement(window.Editable, { mode, tag: "span", single: true, html: video.credit || "", placeholder: "Crédito / fonte", onChange: (value) => setInlineVideo("credit", value) })}</span></figcaption></figure>
        : <VideoYouTube id={video.id} title={video.title} caption={video.caption} credit={video.credit} start={video.start} />) : null;
      return <><div className={dc}>{E("body", { placeholder: "Escreva o corpo do texto…" })}</div><div className="aula-prose-inline-video">{inlineVideo}</div></>;
    }
    case "eyebrow":
      return <Eyebrow icon={p.icon}>{E("text", { single: true, placeholder: "Sobrelinha" })}</Eyebrow>;
    case "citacao":
      return (
        <Citacao
          quote={E("quote", { placeholder: "A citação…" })}
          author={E("author", { single: true, placeholder: "Autor" })}
          source={E("source", { single: true, placeholder: "Fonte" })}
          showAttribution={p.showAttribution !== false}
        />
      );

    case "forum":
      return (
        <Forum
          editing={isEdit}
          storageKey={block.id}
          title={isEdit ? E("title", { single: true, placeholder: "Título do fórum" }) : p.title}
          prompt={isEdit ? E("prompt", { placeholder: "Escreva a pergunta ou o tema da discussão" }) : <div dangerouslySetInnerHTML={{ __html: p.prompt || "" }} />}
          dueInitial={p.dueInitial} dueReplies={p.dueReplies}
          dueInitialNode={E("dueInitial", { single: true, placeholder: "ex.: até 12/11" })}
          dueRepliesNode={E("dueReplies", { single: true, placeholder: "ex.: até 19/11" })}
          rules={p.rules}
          showCriteria={!!p.showCriteria}
          criteria={isEdit ? E("criteria", { placeholder: "Como a participação será avaliada" }) : <div dangerouslySetInnerHTML={{ __html: p.criteria || "" }} />}
          href={p.href} buttonLabel={p.buttonLabel} showDraft={p.showDraft !== false}
        />
      );

    case "equacao":
      return (
        <Equacao
          latex={p.latex}
          number={E("number", { single: true, placeholder: "(1)" })}
          numberText={p.number}
          showNumber={p.showNumber !== false}
          ariaLabel={p.ariaLabel}
        />
      );

    // ───── Destaques ─────
    case "destaque":
      return (
        <Destaque title={E("title", { single: true, placeholder: "Veja bem" })} tone={p.tone} icon={p.icon}>
          {E("body", { placeholder: "O conceito-chave." })}
        </Destaque>
      );
    case "atencao":
      return (
        <Atencao title={E("title", { single: true, placeholder: "Atenção" })} tone={p.tone} icon={p.icon}>
          {E("body", { placeholder: "Um alerta importante." })}
        </Atencao>
      );
    case "reflexao":
      return (
        <Reflexao
          title={E("title", { single: true, placeholder: "Para refletir" })}
          question={E("question", { single: true, placeholder: "A pergunta…" })}
          tone={p.tone} icon={p.icon}
        >
          {(isEdit || (p.body && p.body !== "<p></p>")) ? E("body", { placeholder: "Texto de apoio (opcional)." }) : null}
        </Reflexao>
      );
    case "pitaco":
      return (
        <PitacoDo kicker={isEdit ? E("kicker",{single:true,placeholder:"Identificação do comentário"}) : p.kicker} name={p.name} gender={p.gender} role={isEdit ? E("role",{single:true,placeholder:"Cargo / papel"}) : p.role} tone={p.tone} src={p.src} slotId={p.slotId || block.id}>
          {E("body", { placeholder: "A observação do personagem." })}
        </PitacoDo>
      );

    // ───── Mídia ─────
    case "imagem":
      return (
        <ImagemLegenda
          src={p.src} slotId={p.slotId || block.id} ratio={p.ratio} alt={p.alt} decorative={p.decorative}
          caption={E("caption", { single: true, placeholder: "Legenda" })}
          credit={isEdit ? E("credit", { single: true, placeholder: "Crédito / fonte" }) : p.credit}
        />
      );
    case "parallax":
      return (
        <ParallaxImage
          src={p.src} slotId={p.slotId || block.id} height={p.height || "70vh"} alt={p.alt} decorative={p.decorative}
          overlayTitle={E("overlayTitle", { single: true, placeholder: "Título sobre a imagem (opcional)" })}
          caption={E("caption", { single: true, placeholder: "Legenda" })}
          credit={isEdit ? E("credit", { single: true, placeholder: "Crédito / fonte" }) : p.credit}
        />
      );
    case "video":
      if (isEdit) return <figure className="aula-video"><div className="aula-video__frame"><div className="aula-video__poster" style={{pointerEvents:"none"}}><span className="aula-video__scrim"/><span className="aula-video__play"><i className="fa-solid fa-play"/></span><span className="aula-video__poster-title" style={{pointerEvents:"auto"}}>{E("title",{single:true,placeholder:"Título do vídeo"})}</span></div></div><figcaption className="aula-media-cap">{E("caption",{single:true,placeholder:"Legenda do vídeo"})}<span className="aula-media-credit"> — {E("credit",{single:true,placeholder:"Crédito / fonte"})}</span></figcaption></figure>;
      return <VideoYouTube id={p.id} title={p.title} caption={p.caption} credit={p.credit} start={p.start} />;
    case "audio":
      if (isEdit) return <div className="aula-audio"><div className="aula-audio__cover"><div className="aula-audio__cover-art"><i className="fa-solid fa-headphones"/></div></div><div className="aula-audio__body"><div className="aula-audio__kicker">{E("show",{single:true,placeholder:"Programa / podcast"})}</div><h3 className="aula-audio__title">{E("title",{single:true,placeholder:"Título do episódio"})}</h3><div className="aula-audio__desc">{E("description",{placeholder:"Descrição"})}</div><div className="aula-audio__player" aria-hidden="true" style={{pointerEvents:"none"}}><span className="aula-audio__play"><i className="fa-solid fa-play"/></span><span className="aula-audio__track"/><span className="aula-audio__time">{p.duration || "—"}</span></div></div></div>;
      return <AudioPodcast spotify={p.spotify} src={p.src} title={p.title} show={p.show} description={p.description} duration={p.duration} slotId={block.id} />;
    case "externalembed":
      return <div>{isEdit && <h3 style={{marginTop:0}}>{E("title",{single:true,placeholder:"Título do conteúdo incorporado"})}</h3>}<PointerGuard on={isEdit}><ExternalEmbed embed={p.embed} title={p.title} responsive={p.responsive} useEmbedDimensions={p.useEmbedDimensions} width={p.width} height={p.height} /></PointerGuard></div>;
    case "cases":
      return <CaseCards title={isEdit ? E("title", {single:true,placeholder:"Título da seção"}) : p.title} intro={isEdit ? E("intro", {placeholder:"Introdução opcional"}) : p.intro} columns={p.columns} layout={p.layout} cards={(p.cards || []).map((c, i) => ({ ...c, tag:isEdit?LE("cards",i,"tag",{single:true,placeholder:"Etiqueta"}):c.tag, title:isEdit?LE("cards",i,"title",{single:true,placeholder:"Título"}):c.title, text:isEdit?LE("cards",i,"text",{placeholder:"Texto"}):c.text, slotId: c.slotId || block.id + "-" + i }))} />;
    case "textoimagem":
      return (
        <TextoImagem
          ordem={p.ordem} largura={p.largura} sangria={p.sangria}
          src={p.src} slotId={p.slotId || block.id} fonte={p.fonte} alt={p.alt} decorative={p.decorative}
          legenda={E("legenda", { single: true, placeholder: "Legenda da figura" })}
        >
          {E("body", { placeholder: "Escreva o texto que contorna a imagem…" })}
        </TextoImagem>
      );
    case "filmstrip":
      if (isEdit) return <div className="aula-filmstrip"><div className="aula-fs-head"><span className="aula-fs-label aula-kicker">{E("label",{single:true,placeholder:"Rótulo da galeria"})}</span></div><div className="aula-fs-print-grid">{(p.items||[]).map((it,i)=><figure key={i} className="aula-fs-print-item"><div className="aula-fs-print-img" style={{aspectRatio:p.ratio||"3/2"}}><image-slot id={it.slotId||block.id+"-"+i} shape="rect" placeholder="Imagem" style={{width:"100%",height:"100%"}}/></div><figcaption>{LE("items",i,"tag",{single:true,placeholder:"Etiqueta"})}{LE("items",i,"title",{single:true,placeholder:"Título"})}{LE("items",i,"text",{placeholder:"Texto"})}{LE("items",i,"back",{placeholder:"Verso / detalhe opcional"})}</figcaption></figure>)}</div></div>;
      return <Filmstrip mode={p.mode} label={p.label} ratio={p.ratio} items={(p.items || []).map((it, i) => ({ ...it, slotId: it.slotId || block.id + "-" + i }))} />;
    case "tabela":
      if (isEdit) return <figure className="aula-tabela-wrap"><table className="aula-tabela"><caption className="aula-tabela-caption">{E("caption",{single:true,placeholder:"Título da tabela"})}</caption><thead><tr>{(p.headers||[]).map((_,i)=><th key={i}>{React.createElement(window.Editable,{mode,tag:"span",single:true,html:p.headers[i],placeholder:"Cabeçalho",onChange:(v)=>set("headers",p.headers.map((h,j)=>j===i?v:h))})}</th>)}</tr></thead><tbody>{(p.rows||[]).map((r,ri)=><tr key={ri}>{r.map((_,ci)=><td key={ci}>{MatrixE("rows",ri,ci,{single:true,placeholder:"Célula"})}</td>)}</tr>)}</tbody></table><figcaption className="aula-tabela-fonte">{E("fonte",{single:true,placeholder:"Fonte"})}</figcaption></figure>;
      return <Tabela caption={p.caption} fonte={p.fonte} headers={p.headers} rows={p.rows} striped={p.striped} destacarPrimeira={p.destacarPrimeira} compact={p.compact} />;

    // ───── Interativos ─────
    case "linhadotempo":
      if (isEdit) return <div className="aula-timeline"><h3 className="aula-tl-toptitle">{E("title",{single:true,placeholder:"Título da linha do tempo"})}</h3>{(p.eras||[]).map((era,ei)=><section className="aula-tl-era" key={ei}><header className="aula-tl-era-head">{React.createElement(window.Editable,{mode,tag:"span",single:true,html:era.label,placeholder:"Período",onChange:(v)=>set("eras",p.eras.map((x,i)=>i===ei?{...x,label:v}:x))})}{React.createElement(window.Editable,{mode,tag:"span",single:true,html:era.range,placeholder:"Intervalo",onChange:(v)=>set("eras",p.eras.map((x,i)=>i===ei?{...x,range:v}:x))})}</header><ol className="aula-tl-events">{(era.events||[]).map((ev,vi)=><li className="aula-tl-event is-open" key={vi}><div className="aula-tl-marker"><span className="aula-tl-date">{React.createElement(window.Editable,{mode,tag:"span",single:true,html:ev.date,placeholder:"Data",onChange:(v)=>set("eras",p.eras.map((x,i)=>i===ei?{...x,events:x.events.map((y,j)=>j===vi?{...y,date:v}:y)}:x))})}</span><span className="aula-tl-title">{React.createElement(window.Editable,{mode,tag:"span",single:true,html:ev.title,placeholder:"Marco",onChange:(v)=>set("eras",p.eras.map((x,i)=>i===ei?{...x,events:x.events.map((y,j)=>j===vi?{...y,title:v}:y)}:x))})}</span></div><div className="aula-tl-detail">{React.createElement(window.Editable,{mode,tag:"div",html:ev.text,placeholder:"Descrição",onChange:(v)=>set("eras",p.eras.map((x,i)=>i===ei?{...x,events:x.events.map((y,j)=>j===vi?{...y,text:v}:y)}:x))})}{renderNestedList&&renderNestedList(`timeline:${block.id}:${ei}:${vi}`,ev.children||[],"Blocos deste marco")}</div></li>)}</ol></section>)}</div>;
      return <LinhaDoTempo title={p.title} eras={(p.eras || []).map((era, ei) => ({ ...era, events: (era.events || []).map((ev, vi) => ({ ...ev, slotId: ev.slotId || block.id + "-" + ei + "-" + vi })) }))} renderBlocks={renderNestedContent} />;
    case "flashcards":
      if (isEdit) return <div className="aula-deck"><div className="aula-deck__head"><div className="aula-deck__label aula-kicker"><i className="fa-solid fa-layer-group" /><span>{p.label || "Flashcards"}</span></div><span>{(p.cards || []).length} cards</span></div><div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:16 }}>{(p.cards || []).map((card, i) => <div className="aula-card" key={i} style={{ padding:20 }}><span className="aula-kicker">Pergunta {i + 1}</span><window.Editable mode={mode} tag="div" html={card.front} placeholder="Pergunta" onChange={(v) => set("cards", p.cards.map((c,j) => j === i ? { ...c, front:v } : c))} /><hr style={{ border:0, borderTop:"1px solid var(--rule)", margin:"16px 0" }} /><span className="aula-kicker">Resposta</span><window.Editable mode={mode} tag="div" html={card.back} placeholder="Resposta" onChange={(v) => set("cards", p.cards.map((c,j) => j === i ? { ...c, back:v } : c))} /></div>)}</div></div>;
      return <FlashCardDeck label={p.label || "Flashcards"} cards={p.cards} sectionTone={block.bg} />;
    case "slider":
      return <PointerGuard on={false}><Slider label={isEdit?E("label",{single:true,placeholder:"Rótulo"}):p.label} steps={(p.steps||[]).map((s,i)=>({...s,title:isEdit?LE("steps",i,"title",{single:true,placeholder:"Título"}):s.title,body:isEdit?LE("steps",i,"body",{placeholder:"Conteúdo"}):s.body}))} /></PointerGuard>;
    case "accordion":
      if (isEdit) return <div className="aula-accordion">{(p.items||[]).map((it,i)=><div key={i} className="aula-acc__item is-open"><div className="aula-acc__head"><span className="aula-acc__num">{String(i+1).padStart(2,"0")}</span><div className="aula-acc__q">{LE("items",i,"title",{single:true,placeholder:"Título"})}</div><i className="fa-solid fa-chevron-up"/></div><div className="aula-acc__bodywrap"><div className="aula-acc__clip"><div className="aula-acc__body">{LE("items",i,"body",{placeholder:"Conteúdo"})}{renderNestedList&&renderNestedList(`accordion:${block.id}:${i}`,it.children||[],"Blocos desta aba")}</div></div></div></div>)}</div>;
      return <Accordion items={(p.items||[]).map((it)=>({...it,title:it.title||it.q,body:it.body||it.a}))} renderBlocks={renderNestedContent} />;
    case "quiz":
      if (isEdit) return <section className="aula-quiz"><div className="aula-quiz__head"><span className="aula-quiz__kicker aula-kicker">{E("title",{single:true,placeholder:"Título do quiz"})}</span></div><div className="aula-quiz__intro">{E("intro",{placeholder:"Introdução"})}</div><ol className="aula-quiz__list">{(p.questions||[]).map((q,qi)=><li className="aula-quiz__q" key={qi}><div className="aula-quiz__qhead"><span className="aula-quiz__qnum">{qi+1}</span>{React.createElement(window.Editable,{mode,tag:"div",html:q.q,placeholder:"Enunciado",onChange:(v)=>set("questions",p.questions.map((x,i)=>i===qi?{...x,q:v}:x))})}</div><div className="aula-quiz__options">{(q.options||[]).map((opt,oi)=><div className="aula-quiz__opt" key={oi}><span className="aula-quiz__radio"/>{React.createElement(window.Editable,{mode,tag:"span",single:true,html:opt,placeholder:"Alternativa",onChange:(v)=>set("questions",p.questions.map((x,i)=>i===qi?{...x,options:x.options.map((o,j)=>j===oi?v:o)}:x))})}</div>)}</div><div className="aula-quiz__explain">{React.createElement(window.Editable,{mode,tag:"div",html:q.explanation,placeholder:"Explicação / feedback",onChange:(v)=>set("questions",p.questions.map((x,i)=>i===qi?{...x,explanation:v}:x))})}</div></li>)}</ol></section>;
      return <Quiz title={p.title} intro={p.intro} questions={p.questions} avaliativo={p.avaliativo} passMark={p.passMark} />;
    case "materiais":
      return <div onClick={isEdit?(e)=>e.preventDefault():undefined}><MateriaisExtras title={isEdit?E("title",{single:true,placeholder:"Título"}):p.title} items={(p.items||[]).map((it,i)=>({...it,title:isEdit?LE("items",i,"title",{single:true,placeholder:"Título"}):it.title,source:isEdit?LE("items",i,"source",{single:true,placeholder:"Fonte"}):it.source}))} /></div>;
    case "feature":
      return <FeatureGrid title={isEdit?E("title",{single:true,placeholder:"Título da seção"}):p.title} intro={isEdit?E("intro",{placeholder:"Introdução opcional"}):p.intro} align={p.align} columns={p.columns} features={(p.features||[]).map((f,i)=>({...f,title:isEdit?LE("features",i,"title",{single:true,placeholder:"Título"}):f.title,text:isEdit?LE("features",i,"text",{placeholder:"Texto"}):f.text}))} />;
    case "columns":
      return <Columns gap={p.gap} emphasis={p.emphasis} columns={(p.columns||[]).map((c,i)=>({...c,title:c.title?(isEdit?LE("columns",i,"title",{single:true,placeholder:"Título"}):c.title):"",body:c.body?(isEdit?LE("columns",i,"body",{placeholder:"Conteúdo"}):c.body):""}))} renderBlocks={isEdit?(children,i)=>renderNestedList&&renderNestedList(`columns:${block.id}:${i}`,children||[],`Blocos da coluna ${i+1}`):renderNestedContent} />;
    case "collapsible":
      return <CollapsibleSection title={isEdit ? E("title", { single:true, placeholder:"Título" }) : p.title} summary={isEdit ? E("summary", { single:true, placeholder:"Resumo opcional" }) : p.summary} open={isEdit || p.open}>{E("body", { placeholder:"Conteúdo retrátil" })}</CollapsibleSection>;
    case "sectionslider":
      return <PointerGuard on={isEdit}><SectionSlider label={p.label} slides={p.slides} /></PointerGuard>;

    default:
      return <div style={{ color: "var(--ink-mute)" }}>Bloco desconhecido: {block.type}</div>;
  }
}

// Topic = ONE shared band holding its children compactly. `renderChild`, when
// provided (canvas edit mode), draws each child inside its own selectable
// shell; otherwise (preview/export) children render read-only.
function TopicBand({ block, mode, renderChild }) {
  const kids = block.props.children || [];
  const [slide, setSlide] = React.useState(0);
  const pdf = usePDF();
  const editing = !!renderChild;
  const item = (c, i) => renderChild ? renderChild(c, i) : <div key={c.id} className="aula-topic-item" data-type={c.type}><BlockCore block={{ ...c, onChange: () => {} }} mode={mode} /></div>;
  const items = kids.map(item);
  let content = <div className="aula-topic">{items}</div>;
  if (block.type === "topic-collapsible") {
    const marker = kids.findIndex((c) => c.type === "collapsebreak");
    const before = marker >= 0 ? kids.slice(0, marker) : [];
    const after = marker >= 0 ? kids.slice(marker + 1) : kids;
    if (editing) content = <div className="aula-topic">{items}</div>;
    else if (pdf) content = <div className="aula-topic">{items.filter((_, i) => kids[i].type !== "collapsebreak")}</div>;
    else content = <><div className="aula-topic">{before.map((c) => item(c, kids.indexOf(c)))}</div><details className="aula-topic-collapsible" open={block.props.defaultOpen === true}><summary><span>{block.props.triggerLabel || "Clique para expandir"}</span><i className="fa-solid fa-chevron-down" /></summary><div className="aula-topic">{after.map((c) => item(c, kids.indexOf(c)))}</div></details></>;
  }
  if (block.type === "topic-slider") {
    const count = kids.reduce((m,c) => Math.max(m,Number(c.slide)||0),0) + 1;
    if (pdf) {
      content = <div className="aula-topic-slider is-print">{Array.from({ length: count }, (_, slideIndex) => <section className="aula-topic-slider__print-slide" key={slideIndex}><div className="aula-topic">{kids.map((c, i) => ({ c, i })).filter(({ c }) => (Number(c.slide) || 0) === slideIndex).map(({ c, i }) => item(c, i))}</div></section>)}</div>;
    } else {
      const current = editing ? Math.min(Number(block.props.editSlide)||0,count-1) : Math.min(slide,count-1);
      const visible = kids.map((c,i)=>({c,i})).filter(({c}) => (Number(c.slide)||0) === current);
      const go = (delta) => { const next = block.props.loop === false ? Math.max(0,Math.min(count-1,current+delta)) : (current+delta+count)%count; if (editing) block.onChange({ ...block.props, editSlide:next }); else setSlide(next); };
      content = <div className={"aula-topic-slider"+(editing?" is-editing":"")}><div className="aula-topic-slider__viewport"><div className="aula-topic">{visible.map(({c,i})=>item(c,i))}</div></div>{count>1&&<><button className="aula-topic-slider__arrow is-prev" disabled={block.props.loop===false&&current===0} onClick={(e)=>{e.stopPropagation();go(-1);}} aria-label="Slide anterior">←</button><button className="aula-topic-slider__arrow is-next" disabled={block.props.loop===false&&current===count-1} onClick={(e)=>{e.stopPropagation();go(1);}} aria-label="Próximo slide">→</button><div className="aula-topic-slider__nav"><div>{Array.from({length:count},(_,i)=><button key={i} className={i===current?"is-active":""} onClick={(e)=>{e.stopPropagation(); if(editing) block.onChange({...block.props,editSlide:i});else setSlide(i);}} aria-label={`Ir para slide ${i+1}`} />)}</div><span>{current+1} / {count}</span></div></>}</div>;
    }
  }
  return (
    <FullBleedSection tone={block.bg} py={window.PAD_BY_ID[block.pad] || window.PAD_BY_ID.normal}>
      <Prose>
        {content}
      </Prose>
    </FullBleedSection>
  );
}

// Decides the band treatment for a block.
const FULLWIDTH_TYPES = ["hero", "divider", "pagebreak", "sintese", "parallax"];
function BlockView({ block, mode, renderChild, renderNestedList }) {
  if (["topic", "topic-collapsible", "topic-slider"].indexOf(block.type) !== -1) return <TopicBand block={block} mode={mode} renderChild={renderChild} />;
  if (FULLWIDTH_TYPES.indexOf(block.type) !== -1) return <BlockCore block={block} mode={mode} renderNestedList={renderNestedList} />;
  return <Band block={block}><BlockCore block={block} mode={mode} renderNestedList={renderNestedList} /></Band>;
}

// ── Full-lesson renderer (preview + exported file) ──
function LessonRenderer({ lesson, mode = "preview", chrome = true }) {
  const blocks = (lesson.blocks || []).map((b) => <BlockView key={b.id} block={{ ...b, onChange: () => {} }} mode={mode} />);
  const pdf = typeof location !== "undefined" && new URLSearchParams(location.search).has("pdf");
  const body = (
    <main id="app">
      {chrome && <ProgressBar />}
      {chrome && <Sumario />}
      {blocks}
      {pdf && <FullBleedSection tone="paper" py="24px"><Prose><PDFGlossary /></Prose></FullBleedSection>}
      {chrome && !pdf && lesson.meta?.showComplete !== false && (
        <FullBleedSection tone="sand" py="clamp(48px,7vw,88px)">
          <Prose><LessonComplete /></Prose>
        </FullBleedSection>
      )}
      {chrome ? (
        <CreditsFooter
          author={lesson.meta?.author} role={lesson.meta?.role} institution={lesson.meta?.institution}
          year={lesson.meta?.year} aiTool={lesson.meta?.aiTool} aiUse={lesson.meta?.aiUse}
          licenseHref={lesson.meta?.license}
        />
      ) : (
        <footer style={{ background: "var(--ink)", color: "var(--paper)", padding: "clamp(40px,6vw,64px) var(--page-pad)" }}>
          <ClassAtelierMark withRule={false} />
        </footer>
      )}
    </main>
  );
  return <PDFContext.Provider value={pdf}>{body}</PDFContext.Provider>;
}

Object.assign(window, { BlockView, BlockCore, TopicBand, LessonRenderer, Band, PointerGuard });
