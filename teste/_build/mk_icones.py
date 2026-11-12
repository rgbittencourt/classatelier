import yaml, re, json, unicodedata
Y=yaml.safe_load(open('/tmp/fa/node_modules/@fortawesome/fontawesome-free/metadata/icons.yml'))
free={k:v for k,v in Y.items() if 'solid' in v.get('styles',[])}
def norm(s): return ''.join(c for c in unicodedata.normalize('NFD',s.lower()) if unicodedata.category(c)!='Mn')
D={}
for f in ('dict_core.txt','dict_rest.txt'):
    for line in open(f,encoding='utf8'):
        line=line.strip()
        if not line or ':' not in line: continue
        k,v=line.split(':',1); D.setdefault(k.strip(),[]).extend(v.split())
# frases curtas ficam como palavras soltas; sinônimos educacionais que a tradução palavra-a-palavra não alcança
EXTRA={
 'clipboard-list':'prova exame teste avaliação atividade questionário tarefas','file-pen':'redação produção texto atividade prova avaliação','square-check':'prova teste verificação correto marcar','clipboard-question':'prova questionário pergunta avaliação quiz','file-circle-question':'questionário pergunta dúvida','square-poll-vertical':'enquete votação resultado pesquisa','award':'prêmio certificado conquista mérito','certificate':'certificado selo conquista','file-signature':'assinatura documento termo contrato','tv':'televisão tela vídeo aula','display':'tela apresentação projeção','person-chalkboard':'professor aula docente ensino apresentação','person-walking':'caminhada movimento',
 'lightbulb':'ideia dica sugestão inspiração insight','graduation-cap':'educação curso diploma formatura aluno estudante ensino','book-open':'leitura estudo aprender livro aberto',
 'chalkboard-user':'professor aula docente ensino explicar','person-chalkboard':'professor aula docente ensino apresentação','school':'escola colégio educação',
 'file-pen':'redação produção texto atividade','pen-to-square':'editar atividade escrever','list-check':'tarefas checklist verificação atividades','clipboard-check':'avaliação checklist conferido',
 'comments':'fórum debate discussão conversa','comment-dots':'conversa chat mensagem','people-group':'equipe grupo turma comunidade colaboração','users':'equipe grupo turma pessoas',
 'bullseye':'objetivo meta alvo foco','magnifying-glass':'busca pesquisa investigar lupa','microscope':'ciência pesquisa laboratório','flask':'ciência laboratório experimento química',
 'chart-line':'gráfico crescimento dados evolução','chart-column':'gráfico barras dados estatística','chart-pie':'gráfico pizza dados proporção','calendar-days':'calendário prazo data agenda cronograma',
 'clock':'tempo hora prazo duração','hourglass-half':'tempo espera duração','triangle-exclamation':'alerta atenção cuidado risco aviso','circle-info':'informação saiba mais nota','circle-question':'dúvida pergunta ajuda',
 'circle-check':'correto concluído sucesso certo','circle-xmark':'errado erro incorreto','thumbs-up':'curtir aprovado bom joinha','scale-balanced':'justiça lei ética equilíbrio direito','gavel':'lei decisão juiz norma',
 'handshake':'acordo parceria cooperação','shield-halved':'proteção segurança defesa privacidade','lock':'cadeado privacidade segurança restrito','key':'chave acesso senha',
 'laptop-code':'programação código computador tecnologia','code':'código programação desenvolvimento','robot':'inteligência artificial ia robô automação','brain':'cérebro mente cognição pensamento inteligência',
 'universal-access':'acessibilidade inclusão','language':'idioma língua tradução','earth-americas':'mundo planeta global','route':'trilha percurso caminho jornada','diagram-project':'fluxo projeto processo mapa conceitual',
 'sitemap':'organograma hierarquia estrutura mapa','puzzle-piece':'desafio quebra-cabeça peça jogo','trophy':'prêmio conquista vitória ranking','medal':'medalha conquista mérito','star':'estrela favorito destaque avaliação',
 'heart-pulse':'saúde pulso medicina batimento','hand-holding-heart':'cuidado solidariedade apoio','seedling':'crescimento semente começo sustentabilidade','recycle':'reciclagem sustentabilidade meio ambiente',
 'video':'vídeo filme aula gravada','headphones':'áudio podcast fone ouvir','microphone':'microfone voz áudio gravar','camera':'câmera foto','image':'imagem foto figura ilustração','paperclip':'anexo arquivo',
 'download':'baixar download material','upload':'enviar upload entrega','link':'link endereço url conexão','envelope':'email mensagem contato','phone':'telefone contato','location-dot':'local endereço mapa lugar',
 'rocket':'lançamento início foguete inovação','wand-magic-sparkles':'mágica ia criar varinha','sparkles':'ia novidade brilho destaque','gear':'configuração engrenagem ajustes','wrench':'ferramenta manutenção ajuste',
 'quote-left':'citação aspas depoimento','list-ol':'lista numerada passos etapas','list-ul':'lista tópicos marcadores','table':'tabela dados quadro','file-pdf':'pdf documento arquivo','file-lines':'documento texto arquivo',
 'folder-open':'pasta arquivos materiais','box-archive':'arquivo acervo guardar','bookmark':'marcador salvar favorito','pen':'escrever caneta editar','pencil':'lápis escrever editar','eraser':'borracha apagar','highlighter':'destacar marca-texto',
}
out=[]
for name,v in free.items():
    label=str(v.get('label',name))
    core=set(t for t in re.split(r'[\s\-]+',(name+' '+label).lower()) if t)
    terms=set()
    for w in v.get('search',{}).get('terms',[])+[a for a in []]:
        for t in re.split(r'[\s\-]+',str(w).lower()):
            if t and t not in core and not t.isdigit() and len(t)>1: terms.add(t)
    pt_core=[];pt_terms=[]
    for t in sorted(core):
        for p in D.get(t,[]): 
            if p not in pt_core: pt_core.append(p)
    for t in sorted(terms):
        for p in D.get(t,[]):
            if p not in pt_core and p not in pt_terms: pt_terms.append(p)
    if name in EXTRA:
        for p in EXTRA[name].split():
            if p not in pt_core: pt_core.append(p)
    out.append([name,label,' '.join(pt_core),' '.join(sorted(terms)),' '.join(pt_terms)])
# estatística de cobertura
nopt=sum(1 for o in out if not o[2]); print('icones',len(out),'sem pt no nome',nopt)
js='/* Gerado por _build/mk_icones.py — catálogo do Font Awesome Free 6.5.2 (estilo sólido, %d ícones) com termos de busca em inglês (metadados oficiais) e em português (dicionário próprio).\n   Cada item: [nome, rótulo, português do nome, inglês extra, português extra]. Licença dos ícones: CC BY 4.0. */\nwindow.FA_ICONES = %s;\n' % (len(out), json.dumps(out,ensure_ascii=False,separators=(',',':')))
open('/home/claude/aula-studio/icones.js','w',encoding='utf8').write(js)
import os; print(os.path.getsize('/home/claude/aula-studio/icones.js')//1024,'KB')
print([o for o in out if o[0] in ('cat','dog','wrench')])
