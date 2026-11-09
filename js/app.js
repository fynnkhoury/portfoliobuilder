(function(){
const D=window.__D,E=window.Engine;
document.documentElement.lang='nl';
const byId=Object.fromEntries(ASSETS.map(a=>[a.id,a]));
const $=id=>document.getElementById(id);
const MON=['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
const KEY='portfolio-crash-test-v2',OLD='portfolio-crash-test-v1';
let S={h:{sp500:60,tmid:40},cur:'EUR',reb:'year',from:0,preset:'6040',start:10000,monthly:200,scale:'log',years:25,hair:0,rate:null,infl:2.5,view:'real'};

try{let s=JSON.parse(localStorage.getItem(KEY)||'null');const fresh=!s;if(fresh)s=JSON.parse(localStorage.getItem(OLD)||'null');if(s&&s.h&&Object.keys(s.h).every(k=>byId[k])){S=Object.assign(S,s);if(fresh)S.cur='EUR';}}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
const cssv=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const CLSVAR={stock:'--port',bond:'--class-bond',real:'--bench'};
function dateOf(i){const a=E.idxToYM(D,i);return MON[a.m-1]+' '+a.y;}
const nf=(x,d)=>x.toFixed(d).replace('.',',');
const sign=(x,d=1)=>(x<0?'\u2212':'+')+nf(Math.abs(x*100),d)+'%';
const neg=(x,d=1)=>(x<0?'\u2212':'')+nf(Math.abs(x*100),d)+'%';
const sym=()=>S.cur==='EUR'?'\u20ac':'$';
function money(v){const a=Math.abs(v);if(a>=1e6)return sym()+nf(v/1e6,a>=1e7?1:2)+' mln';return sym()+Math.round(v).toLocaleString('nl-NL');}
function dur(m){if(m<12)return m+' mnd';const y=m/12;return (y<10?nf(y,1):Math.round(y))+' jaar';}
const totalW=()=>Object.values(S.h).reduce((a,b)=>a+(+b||0),0);
function weights(){const t=totalW();const w={};if(t<=0)return w;for(const k in S.h)if(+S.h[k]>0)w[k]=S.h[k]/t;return w;}

/* ---------- controls ---------- */
$('presets').innerHTML=TILES.map(t=>`<button type="button" class="tile" data-p="${t.id}" aria-pressed="false"><span class="ico c-soft">${ICONS[t.ic]}</span><b>${t.t}</b><small>${t.d}</small></button>`).join('');
$('presetsMore').innerHTML=PRESETS.filter(p=>!TILES.some(t=>t.id===p.id)).map(p=>`<button type="button" class="chip" data-p="${p.id}" aria-pressed="false">${p.name}</button>`).join('');
document.querySelectorAll('[data-ic]').forEach(e=>{e.innerHTML=ICONS[e.dataset.ic]||'';});
$('cur').innerHTML=['EUR','USD'].map(c=>`<button type="button" class="chip" data-c="${c}" aria-pressed="false">${c==='USD'?'Dollars':'Euro'}</button>`).join('');
$('from').innerHTML='<option value="0">Zo vroeg mogelijk</option>'+[1975,1980,1985,1990,1995,2000,2005,2008,2010,2015,2020].map(y=>`<option value="${y}">Januari ${y}</option>`).join('');
$('filters').innerHTML=[['all','Alles'],['country','Landen'],['stock','Aandelen'],['bond','Obligaties'],['real','Goud en vastgoed'],['mine','Mijn mix']].map(([k,l],i)=>`<button type="button" class="chip" data-f="${k}" aria-pressed="${i===0}">${l}</button>`).join('');
let filter='all',query='';
$('scaleC').innerHTML='<button type="button" class="q" data-term="log" aria-label="Uitleg schaal">?</button>'+[['log','Log-schaal'],['lin','Gewone schaal']].map(([k,l])=>`<button type="button" class="chip" data-s="${k}" aria-pressed="false">${l}</button>`).join('');
$('scaleC').addEventListener('click',e=>{const b=e.target.closest('[data-s]');if(!b)return;S.scale=b.dataset.s;syncControls();draw();save();});
$('fRate').addEventListener('input',e=>{const v=parseFloat(e.target.value);S.rate=isFinite(v)?Math.max(-5,Math.min(30,v)):null;cancelAnimationFrame(fr);fr=requestAnimationFrame(()=>{future();save();});});
const num=(v,lo,hi)=>{v=parseFloat(v);if(!isFinite(v))v=lo;return Math.max(lo,Math.min(hi,v));};
let fr=0;
$('amtStart').addEventListener('input',e=>{S.start=num(e.target.value,0,1e9);schedule();});
$('amtMonth').addEventListener('input',e=>{S.monthly=num(e.target.value,0,1e7);schedule();});
$('fYears').addEventListener('input',e=>{S.years=num(e.target.value,1,50);syncControls();cancelAnimationFrame(fr);fr=requestAnimationFrame(()=>{future();save();});});
$('fInf').addEventListener('input',e=>{S.infl=num(e.target.value,0,10);cancelAnimationFrame(fr);fr=requestAnimationFrame(()=>{future();save();});});
['presets','presetsMore'].forEach(k=>$(k).addEventListener('click',e=>{const b=e.target.closest('[data-p]');if(!b)return;const p=PRESETS.find(x=>x.id===b.dataset.p);S.h=Object.assign({},p.h);S.preset=p.id;structural();}));
$('cur').addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(!b)return;S.cur=b.dataset.c;structural();});
$('reb').addEventListener('change',e=>{S.reb=e.target.value;results();save();});
$('from').addEventListener('change',e=>{S.from=+e.target.value;results();save();});
$('filters').addEventListener('click',e=>{const b=e.target.closest('[data-f]');if(!b)return;filter=b.dataset.f;[...$('filters').children].forEach(x=>x.setAttribute('aria-pressed',x===b));library();});
$('q').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();library();});
$('scale').addEventListener('click',()=>{const t=totalW();if(t<=0)return;let acc=0;const ks=Object.keys(S.h);ks.forEach((k,i)=>{let v=i===ks.length-1?Math.round((100-acc)*2)/2:Math.round(S.h[k]/t*200)/2;acc+=v;S.h[k]=v;});S.preset=null;structural();});
$('clear').addEventListener('click',()=>{S.h={};S.preset=null;structural();});

/* ---------- builder ---------- */
function rows(){
  const ids=Object.keys(S.h);
  $('rows').innerHTML=ids.length?ids.map(id=>{const a=byId[id];return `<div class="row"><div class="rowname">${aIcon(id)}<button type="button" class="linkish" data-info="${id}">${a.name}</button></div><input type="range" id="w-${id}" data-id="${id}" min="0" max="100" step="1" value="${S.h[id]}" aria-label="${a.name} percentage"><input type="number" id="n-${id}" data-id="${id}" min="0" max="100" step="0.5" value="${S.h[id]}" aria-label="${a.name} percentage"><button type="button" class="x" data-rm="${id}" aria-label="${a.name} verwijderen">\u00d7</button></div>`;}).join(''):'<p class="empty">Nog niets gekozen. Kies hierboven hoeveel je durft, of voeg hieronder iets toe.</p>';
}
$('rows').addEventListener('input',e=>{const id=e.target.dataset.id;if(!id)return;let v=parseFloat(e.target.value);if(!isFinite(v))v=0;v=Math.max(0,Math.min(100,v));S.h[id]=v;(e.target.type==='range'?$('n-'+id):$('w-'+id)).value=v;S.preset=null;schedule();});
$('rows').addEventListener('click',e=>{const id=e.target.dataset.rm;if(!id)return;delete S.h[id];S.preset=null;structural();});
function totals(){
  const t=totalW(),ok=Math.abs(t-100)<.01;
  $('total').className='total '+(ok?'ok':'off');
  $('total').textContent=ok?'100% verdeeld':(t<100?`nog ${nf(100-t,+(100-t)%1?1:0)}% over`:`${nf(t-100,+(t-100)%1?1:0)}% te veel`);
  $('scale').hidden=ok||t<=0;
  const by={stock:0,bond:0,real:0};for(const k in S.h)by[byId[k].c]+=+S.h[k]||0;
  const tot=t||1;
  $('strip').innerHTML=Object.keys(S.h).filter(k=>+S.h[k]>0).sort((a,b)=>['stock','bond','real'].indexOf(byId[a].c)-['stock','bond','real'].indexOf(byId[b].c)).map(k=>`<i style="flex:${S.h[k]/tot} 0 0;background:var(${CLSVAR[byId[k].c]})"></i>`).join('');
  $('stripKey').innerHTML=Object.keys(by).filter(c=>by[c]>0).map(c=>`<span><b style="background:var(${CLSVAR[c]})"></b>${CLASSES[c]} ${Math.round(by[c]/tot*100)}%</span>`).join('');
}
function structural(){rows();syncControls();library();results();save();}
function syncControls(){
  document.querySelectorAll('[data-p]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.p===S.preset));document.querySelectorAll('.cursym').forEach(e=>{e.textContent=sym();});
  [...$('cur').children].forEach(b=>b.setAttribute('aria-pressed',b.dataset.c===S.cur));
  $('reb').value=S.reb;$('from').value=String(S.from);
  [...$('scaleC').querySelectorAll('[data-s]')].forEach(b=>b.setAttribute('aria-pressed',b.dataset.s===S.scale));
  if(document.activeElement!==$('fRate'))$('fRate').value=(S.rate===null||S.rate===undefined)?'':S.rate;
  if(document.activeElement!==$('amtStart'))$('amtStart').value=S.start;
  if(document.activeElement!==$('amtMonth'))$('amtMonth').value=S.monthly;
  $('fYears').value=S.years;$('fYearsV').textContent=S.years;
  if(document.activeElement!==$('fInf'))$('fInf').value=S.infl;
  const p=PRESETS.find(x=>x.id===S.preset);
  $('presetBy').textContent=p?p.by+'. Dit is een voorbeeld, geen advies.':'Je eigen mix.';
}
let raf=0;function schedule(){cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{syncControls();results();libraryOn();save();});}

/* ---------- catalogue ---------- */
let cardStats={},statsCur=null;
function riskOf(id){const l=+Object.keys(RISK).find(k=>RISK[k].includes(id));return [['','']][0]&&[{1:'Laag',2:'Gemiddeld',3:'Hoog',4:'Zeer hoog'}[l],'r'+l,RISK_WHY[l]];}
function ensureCardStats(){
  if(statsCur===S.cur)return;statsCur=S.cur;
  ASSETS.forEach(a=>{const o={cur:S.cur,rebalance:'never'};const r=E.simulate(D,{[a.id]:1},o);const s=E.stats(D,r,o);cardStats[a.id]={c:s.cagr,d:s.worst?s.worst.depth:0,since:dateOf(r.s),end:dateOf(r.e),mult:r.V[r.N]};});
}
function namesOf(id){const h=HOLD[id];if(!h)return '';if(h.n)return h.n.slice(0,3).map(x=>x[0]).join(', ');if(h.list&&id==='psh')return h.list.slice(0,3).join(', ');return '';}
function ic(n){return ICONS[n]||'';}
function aIcon(id){const a=byId[id];if(FLAGS[id])return `<span class="ico flag"><img src="${FLAGS[id]}" alt=""></span>`;return `<span class="ico c-${a.c}">${ic(AICON[id])}</span>`;}
function meter(rk){const lvl=+rk[1].slice(1);return `<div class="meter ${rk[1]}"><span>${[1,2,3,4].map(i=>`<i class="${i<=lvl?'on':''}"></i>`).join('')}</span>Risico ${rk[0].toLowerCase()}</div>`;}
function firstSentence(t){const m=t.match(/^.*?[.!?](\s|$)/);return m?m[0].trim():t;}
function library(){
  ensureCardStats();
  const match=a=>(filter==='all'||(filter==='mine'?S.h[a.id]!==undefined:(filter==='country'?a.g==='country':a.c===filter)))&&(!query||(a.name+' '+a.what+' '+a.role+' '+a.risk+' '+namesOf(a.id)).toLowerCase().includes(query));
  const html=GROUPS.map(([g,l])=>{const items=ASSETS.filter(a=>a.g===g&&match(a));if(!items.length)return '';
    return `<div class="shelf"><span class="lab">${l}</span><div class="cards">${items.map(a=>{const st=cardStats[a.id],on=S.h[a.id]!==undefined,rk=riskOf(a.id);return `<article class="card${on?' on':''}" data-card="${a.id}">
      <div class="card-top">${aIcon(a.id)}<h3><button type="button" class="linkish" data-info="${a.id}">${a.name}</button></h3></div>
      <p>${firstSentence(a.what)}</p>
      ${meter(rk)}
      <div class="card-foot"><button type="button" class="more" data-info="${a.id}">Meer info</button><button type="button" class="btn${on?'':' solid'}" data-t="${a.id}">${on?'Verwijderen':'+ Toevoegen'}</button></div>
    </article>`;}).join('')}</div></div>`;}).join('');
  $('shelves').innerHTML=html||'<p class="empty">Niets gevonden. Probeer een ander woord.</p>';
}
function holdingsHTML(id){
  const h=HOLD[id];if(!h)return '';
  if(h.n){const top=h.n[0][1],sum=h.n.reduce((t,x)=>t+x[1],0);
    return `<div class="dlg-sec"><span class="lab">De grootste bedrijven in dit fonds</span><ul class="bars">${h.n.map(x=>`<li><span>${x[0]}</span><span>${nf(x[1],1)}%</span><i style="width:${(x[1]/top*100).toFixed(1)}%"></i></li>`).join('')}</ul><p class="small">Samen ${nf(sum,0)}% van het fonds, dat in totaal ${h.c.toLocaleString('nl-NL')} posities heeft. Stand van ${h.d}, fonds ${h.f}.</p></div>`;}
  if(h.list)return `<div class="dlg-sec"><span class="lab">Wat zit erin</span><p>${h.list.join(', ')}.</p><p class="small">${h.note}</p></div>`;
  return `<div class="dlg-sec"><span class="lab">Wat zit erin</span><p>${h.text}</p></div>`;
}
function openDlg(){const d=$('info');try{if(!d.open)d.showModal();}catch(e){d.setAttribute('open','');}d.scrollTop=0;}
function openInfo(id){
  ensureCardStats();
  const a=byId[id],st=cardStats[id],on=S.h[id]!==undefined,rk=riskOf(id);
  $('infoBody').innerHTML=`<div class="dlg-top"><div class="dlg-head">${aIcon(id)}<div style="display:grid;gap:2px"><span class="lab">${CLASSES[a.c]}</span><h2>${a.name}</h2></div></div><button type="button" class="x" data-close aria-label="Sluiten">×</button></div>
  <p style="margin:0">${a.what}</p>
  <div class="dlg-figs"><div><strong>${sign(st.c)}</strong><small>rendement per jaar</small></div><div><strong class="neg">${neg(st.d,0)}</strong><small>grootste daling</small></div><div>${meter(rk)}<small>${rk[2]} <button type="button" class="q" data-term="risico" aria-label="Uitleg risico">?</button></small></div></div>
  <p class="span" style="margin:0">${sym()}1.000 in ${st.since} was in ${st.end} ${money(1000*st.mult)} waard, voor belasting. Dat is het verleden, geen belofte.</p>
  ${holdingsHTML(id)}
  <div class="dlg-sec"><span class="lab"><span class="ico-s" style="color:var(--up)">${ic('thumbs-up')}</span>Waarom mensen dit kopen</span><p>${a.role}</p></div>
  <div class="dlg-sec"><span class="lab"><span class="ico-s" style="color:var(--crash)">${ic('triangle-alert')}</span>Waar je op moet letten</span><p>${a.risk}</p>${S.cur==='EUR'&&/\d+%/.test(a.risk)?'<p class="small">Dit percentage is in dollars gemeten. In euro kan het anders uitvallen, zoals het cijfer bovenaan laat zien.</p>':''}</div>
  <div class="dlg-sec"><span class="lab"><span class="ico-s" style="color:var(--port)">${ic('search')}</span>Waar koop je dit?</span><p>Zoek bij je broker <button type="button" class="q" data-term="broker" aria-label="Wat is een broker?">?</button> op: <strong>${a.buy}</strong>. ${a.g==='sector'&&(id==='brk'||id==='psh')?'Dit is één aandeel, geen fonds.':'Zo’n fonds heet een ETF <button type="button" class="q" data-term="etf" aria-label="Wat is een ETF?">?</button>, en UCITS <button type="button" class="q" data-term="ucits" aria-label="Wat is UCITS?">?</button> betekent dat je het in Nederland kunt kopen.'}</p></div>
  <p class="small" style="margin:0">Herkomst van de cijfers: ${a.hist}.</p>
  <div class="dlg-act"><button type="button" class="btn${on?'':' solid'}" data-dt="${id}">${on?'Verwijderen uit portefeuille':'Toevoegen aan portefeuille'}</button><button type="button" class="btn" data-close>Sluiten</button></div>`;
  openDlg();
}
function openTerm(k){const t=TERMS[k];if(!t)return;$('infoBody').innerHTML=`<div class="dlg-top"><h2>${t[0]}</h2><button type="button" class="x" data-close aria-label="Sluiten">×</button></div><p style="margin:0">${t[1]}</p><div class="dlg-act"><button type="button" class="btn" data-close>Begrepen</button></div>`;openDlg();}
function addOrRemove(id){if(S.h[id]!==undefined){delete S.h[id];}else{const left=Math.max(0,100-totalW());S.h[id]=left>0?Math.min(left,left>=20?20:left):10;}S.preset=null;structural();}
document.addEventListener('click',e=>{
  const q=e.target.closest('[data-term]');if(q){e.preventDefault();e.stopPropagation();openTerm(q.dataset.term);return;}
  const b=e.target.closest('[data-info]');if(b){openInfo(b.dataset.info);return;}
  if(e.target.closest('[data-close]')){$('info').close();return;}
  const dt=e.target.closest('[data-dt]');if(dt){addOrRemove(dt.dataset.dt);openInfo(dt.dataset.dt);return;}
  if(e.target===$('info')){$('info').close();}
});
$('gloss').innerHTML=Object.values(TERMS).map(t=>`<div><dt>${t[0]}</dt><dd>${t[1]}</dd></div>`).join('');
function libraryOn(){}
$('shelves').addEventListener('click',e=>{const id=e.target.dataset.t;if(!id)return;addOrRemove(id);});

/* ---------- results ---------- */
const EVENTS=[['1973-01','1975-03','Oliecrisis en hoge inflatie 1973–74'],['1980-01','1982-12','Renteschok begin jaren 80'],['1987-08','1988-03','Beurscrash 1987 (Black Monday)'],['1990-06','1990-12','Recessie 1990'],['1998-06','1998-12','Rusland- en LTCM-crisis 1998'],['2000-01','2003-04','Dotcomcrash'],['2007-06','2009-06','Kredietcrisis 2008'],['2011-04','2011-12','Eurocrisis 2011'],['2015-05','2016-03','Daling door olie en China 2015–16'],['2018-09','2018-12','Verkoopgolf eind 2018'],['2020-01','2020-06','Coronacrash'],['2022-01','2023-10','Inflatie- en renteschok 2022'],['2025-02','2025-05','Invoerheffingen 2025']];
function eventName(tr,len){if(len>36)return 'Lange, langzame daling';const l=E.label(D,tr);const e=EVENTS.find(x=>l>=x[0]&&l<=x[1]);return e?e[2]:'Kleinere terugval';}
let cur=null;
function results(){
  totals();
  const w=weights(),ids=Object.keys(w),has=ids.length>0;
  $('out').style.opacity=has?1:.35;
  if(!has){['rCagr','rDD','mGrow','mYear','mUnder','mVol','mLoss','f50','f10','f90'].forEach(i=>$(i).textContent='\u2013');['rCagrSub','rDDSub','mGrowS','mYearS','mVolS','span','divLine','mLossS','fExplain','futSmall','fHow','r10','r50','r90','barFutL','barFutR','barPaidL','barEnd','barFrom','barLowL'].forEach(i=>$(i).textContent='');$('crashTop').innerHTML='';$('barPaid').style.width='0';$('barLow').style.width='0';$('fan').innerHTML='';$('fanLegend').innerHTML='';$('futWarn').hidden=true;$('crashes').innerHTML='';$('pairs').innerHTML='';$('years').innerHTML='';$('plot').innerHTML='';$('legend').innerHTML='';$('warn').hidden=true;$('dockL').textContent='Voeg beleggingen toe';$('dockR').textContent='';cur=null;return;}
  const opt={cur:S.cur,rebalance:S.reb,fromYear:S.from||0};
  const R=E.simulate(D,w,opt),T=E.stats(D,R,opt);
  const onlySP=ids.length===1&&ids[0]==='sp500';
  let B=null,BT=null;
  if(!onlySP){const o=Object.assign({},opt);B=simWindow({sp500:1},R.s,o);BT=E.stats(D,B,o);}
  const amt=amounts(),Acc=E.account(R.V,amt.start,amt.c),BAcc=B?E.account(B.V,amt.start,amt.c):null;
  cur={R,T,B,BT,amt,Acc,BAcc};
  const W=T.worst,s=R.s,N=R.N;
  $('rCagr').textContent=sign(T.cagr);
  $('rCagrSub').textContent=B?`Ter vergelijking, de S&P 500: ${sign(BT.cagr)} per jaar`:'Goede en slechte jaren meegeteld';
  $('barPaid').style.width=Math.max(2,Math.min(100,Acc.paid[N]/Math.max(Acc.A[N],Acc.paid[N])*100)).toFixed(1)+'%';$('barPaidL').textContent=`Ingelegd ${money(Acc.paid[N])}`;$('barEnd').textContent=`Eindwaarde ${money(Acc.A[N])}`;
  if(W){
    $('rDD').textContent=neg(W.depth);
    const low=Math.round((1+W.depth)*10000);
    $('rDDSub').textContent=`Laagste punt: ${dateOf(s+W.tr)}. `+(W.rec===null?'Nog niet helemaal hersteld.':`Weer terug na ${dur(W.rec-W.pk)}.`);
    $('barLow').style.width=((1+W.depth)*100).toFixed(1)+'%';$('barFrom').textContent=`${sym()}10.000 daalde naar`;$('barLowL').textContent=`${sym()}${low.toLocaleString('nl-NL')}`;
  }else{$('rDD').textContent='0%';$('rDDSub').textContent='Geen enkele daling aan het einde van een maand.';$('barLow').style.width='100%';$('barFrom').textContent='';$('barLowL').textContent='';}
  $('mGrowL').textContent=amt.c>0?`${money(amt.start)} + ${money(amt.c)} per maand werd`:`${money(amt.start)} werd`;$('mGrow').textContent=money(Acc.A[N]);
  $('mGrowS').textContent=amt.c>0?`Ingelegd: ${money(Acc.paid[N])}. Je geld groeide ${sign(Acc.irr)} per jaar, voor belasting`:`in ${nf(T.yrs,1)} jaar, voor belasting`;
  $('mLoss').textContent=Acc.drop>0?'−'+money(Acc.drop):money(0);$('mLossS').textContent=Acc.drop>0?`In ${dateOf(s+Acc.dropAt)}, vanaf het vorige hoogste punt`:'Nooit gedaald aan het einde van een maand';
  if(T.wy){$('mYear').textContent=neg(T.wy.r);$('mYear').className='neg';$('mYearS').textContent=String(T.wy.y);}else{$('mYear').textContent='–';$('mYearS').textContent='';}
  $('mUnder').textContent=dur(T.maxUnder);
  $('mVol').textContent='±'+nf(T.vol*100,1)+'%';$('mVolS').textContent=B?`S&P 500: ±${nf(BT.vol*100,1)}%`:'Hoe hoger, hoe onrustiger';
  $('dockL').innerHTML=`<b>${sign(T.cagr)}</b> per jaar`;$('dockR').innerHTML=`<b>${W?neg(W.depth,0):'0%'}</b> grootste daling`;
  const limName=R.lim==='__fx'?'de euro-wisselkoers':(R.lim==='__user'?null:(byId[R.lim]?byId[R.lim].name:null));
  let span=`Getest over ${nf(T.yrs,0)} jaar, van ${dateOf(R.lim==='__user'?s+1:s)} tot ${dateOf(R.e)}.`;
  if(R.lim==='__user')span+=' Deze startdatum heb je zelf gekozen.';else if(R.s>0&&limName)span+=` Eerder kan niet, omdat er voor ${limName} pas cijfers zijn vanaf ${dateOf(R.s)}.`;
  const t=totalW();if(Math.abs(t-100)>=.01)span+=` Je percentages tellen op tot ${nf(t,1)}%. Voor deze test zijn ze omgerekend naar 100%.`;
  $('span').textContent=span;
  const w2008=2007*12+9-(1970*12);
  const miss=R.s>w2008;
  if(miss){$('warn').hidden=false;$('warn').textContent=`Deze test begint na de crash van 2008, dus de grootste daling hier is waarschijnlijk milder dan een echt slechtste geval.${R.lim!=='__user'?' Beleggingen met een langere geschiedenis geven een eerlijker beeld.':' Kies een eerdere startdatum om die crash mee te nemen.'}`;}
  else if(T.yrs<15){$('warn').hidden=false;$('warn').textContent='Minder dan 15 jaar aan cijfers. Wees extra voorzichtig met deze uitkomsten.';}
  else $('warn').hidden=true;
  if(S.from>0&&R.lim!=='__user'&&limName){$('warn').hidden=false;$('warn').textContent=`Je koos januari ${S.from}, maar voor ${limName} zijn pas cijfers vanaf ${dateOf(R.s)}. De test begint daarom dan, en ook je inleg telt pas vanaf dat moment.`+(miss?' De crash van 2008 zit er dus niet in.':'');}
  const eps=T.eps.filter(e=>e.depth<=-.05).slice(0,6);
  $('crashTop').innerHTML=eps.length?eps.slice(0,3).map(e=>{const max=Math.abs(eps[0].depth);return `<li><b>${eventName(s+e.tr,e.tr-e.pk)}</b><strong>${neg(e.depth,0)}</strong><i style="width:${(Math.abs(e.depth)/Math.max(max,.5)*100).toFixed(1)}%"></i><small>${e.rec===null?'Nog niet helemaal hersteld':'Weer terug na '+dur(e.rec-e.pk)}</small></li>`;}).join(''):'<li>Geen daling van 5% of meer in deze periode.</li>';
  $('crashes').innerHTML=eps.length?`<thead><tr><th>Wat er gebeurde</th><th class="n">Daling</th><th>Van hoog naar laag</th><th>Weer terug</th>${B?'<th class="n">S&amp;P 500 toen</th>':''}</tr></thead><tbody>`+eps.map(e=>{
    const ev=eventName(s+e.tr,e.tr-e.pk);
    let bench='';if(B){let m=1;for(let i=e.pk+1;i<=e.tr;i++)m*=B.V[i]/B.V[i-1];bench=`<td class="n">${sign(m-1,0)}</td>`;}
    return `<tr><td>${ev}</td><td class="n neg">${neg(e.depth)}</td><td>${dateOf(s+e.pk)} → ${dateOf(s+e.tr)}</td><td>${e.rec===null?'Nog niet':dateOf(s+e.rec)+' <span style="color:var(--ink3)">('+dur(e.rec-e.pk)+')</span>'}</td>${bench}</tr>`;}).join('')+'</tbody>':'<tbody><tr><td>Geen daling van 5% of meer in deze periode.</td></tr></tbody>';
  if(ids.length<2){$('divLine').textContent='Je hebt nu één belegging, dus er valt nog niets te vergelijken. Voeg een tweede toe om te zien hoeveel ze op elkaar lijken.';$('pairs').innerHTML='';}
  else{
    let avg=0;ids.forEach(id=>{let m=0,q=0,n=0;for(let i=R.s;i<R.e;i++){const r=E.ret(D,id,i);m+=r;q+=r*r;n++;}m/=n;q=q/n-m*m;avg+=w[id]*Math.sqrt(Math.max(q,0))*Math.sqrt(12);});
    const us=E.simulate(D,w,{cur:'USD',rebalance:S.reb,fromYear:S.from||0}),off=R.s-us.s;let um=0,uq=0,un=0;for(let i=off+1;i<us.V.length;i++){const r=us.V[i]/us.V[i-1]-1;um+=r;uq+=r*r;un++;}um/=un;uq=uq/un-um*um;
    const cut=1-Math.sqrt(Math.max(uq,0))*Math.sqrt(12)/avg;
    $('divLine').textContent=`Door te mengen schommelde deze portefeuille ${Math.max(0,Math.round(cut*100))}% minder dan het gemiddelde van de onderdelen. Dat is het voordeel van spreiden.`;
    const p=[];for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const c=E.correlation(D,ids[i],ids[j],R.s,R.e);if(c!==null)p.push({a:ids[i],b:ids[j],c});}
    p.sort((x,y)=>y.c-x.c);
    const top=p.slice(0,1).concat(p.length>1?[p[p.length-1]]:[]);
    $('pairs').innerHTML=top.map((x,i)=>{const note=x.c>=.8?'Die bewegen grotendeels samen, dus de tweede beschermt weinig extra.':x.c>=.5?'Die hangen samen, maar bewegen deels los van elkaar.':x.c>=.15?'Die bewegen grotendeels onafhankelijk.':'Die hebben weinig met elkaar te maken. Precies wat een crash opvangt.';return `<li><span class="v">${nf(x.c,2)}</span><span>${top.length>1?(i===0?'Meest vergelijkbaar: ':'Meest verschillend: '):''}<strong>${byId[x.a].name}</strong> en <strong>${byId[x.b].name}</strong>. ${note}</span></li>`;}).join('');
  }
  $('years').innerHTML=T.years.slice().reverse().map(y=>`<div><span>${y.y}${y.ytd?' t/m nu':(!y.full?' deels':'')}</span><span class="${y.r<0?'neg':''}">${sign(y.r)}</span></div>`).join('');
  draw();
  future();
}
function amounts(){return (S.start>0||S.monthly>0)?{start:S.start,c:S.monthly}:{start:10000,c:0};}
function simWindow(w,s,o){ // benchmark over exactly the portfolio's window
  const r=E.simulate(D,w,Object.assign({},o,{rebalance:'never',fromYear:0}));
  const off=s-r.s,V=[];const b=r.V[off];for(let i=off;i<r.V.length;i++)V.push(r.V[i]/b);
  return {s,e:r.e,N:V.length-1,V,ids:r.ids,lim:null};
}
/* ---------- chart ---------- */
function niceLin(hi){const raw=hi/5,p=Math.pow(10,Math.floor(Math.log10(raw))),st=[1,2,2.5,5,10].map(x=>x*p).find(x=>x>=raw);const t=[];for(let v=0;v<=hi+1e-6;v+=st)t.push(v);return t;}
const fmtT=v=>sym()+(v>=1e6?String(+(v/1e6).toFixed(1)).replace('.',',')+' mln':(v>=1e3?+(v/1e3).toFixed(0)+'k':Math.round(v)));
function draw(){
  if(!cur)return;
  const {R,T,B,BT,Acc,BAcc,amt}=cur,box=$('plot'),A=Acc.A,BA=BAcc&&BAcc.A,P=Acc.paid;
  const W=Math.max(300,box.clientWidth||700),phone=W<520;
  const L=phone?46:58,Rm=phone?10:74,G=phone?230:290,gap=30,DH=phone?120:150,Tp=16,Bt=24;
  const H=Tp+G+gap+DH+Bt,N=R.N,iw=W-L-Rm;
  const x=n=>L+n/N*iw;
  const log=S.scale==='log';
  let lo=Infinity,hi=-Infinity;[A,BA,P].filter(Boolean).forEach(v=>v.forEach(a=>{if(a>0)lo=Math.min(lo,a);hi=Math.max(hi,a);}));
  let yMin,yMax,ly;
  if(log){yMin=lo*.94;yMax=hi*1.06;ly=v=>Tp+G-(Math.log(Math.max(v,yMin))-Math.log(yMin))/(Math.log(yMax)-Math.log(yMin))*G;}
  else{yMin=0;yMax=hi*1.04;ly=v=>Tp+G-(v/yMax)*G;}
  let tv=[];
  if(log){for(let e=1;e<=9;e++)[1,2,5].forEach(m=>{const v=m*Math.pow(10,e);if(v>=yMin&&v<=yMax)tv.push(v);});if(tv.length>6)tv=tv.filter(v=>String(v)[0]==='1');if(tv.length<2)tv=[yMin*1.06,yMax/1.06];}
  else tv=niceLin(yMax);
  const a0=E.idxToYM(D,R.s).y,a1=E.idxToYM(D,R.e).y;
  let step=[1,2,5,10,20].find(s=>(a1-a0)/s<=iw/(phone?58:76))||20;
  const xt=[];for(let n=0;n<=N;n++){const a=E.idxToYM(D,R.s+n);if(a.m===1&&a.y%step===0)xt.push([n,a.y]);}
  const path=(arr,f)=>arr.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+f(v).toFixed(1)).join('');
  const dtop=Tp+G+gap;
  let dmin=Math.min(...T.dd);if(BT)dmin=Math.min(dmin,...BT.dd);dmin=Math.min(dmin,-.05);
  const dstep=[.05,.1,.2,.25].find(s=>-dmin/s<=4)||.25;
  const dbot=Math.floor(dmin/dstep)*dstep;
  const dy=v=>dtop+(v/dbot)*DH;
  const dt=[];for(let v=0;v>=dbot-1e-9;v-=dstep)dt.push(v);
  let g='';
  tv.forEach(v=>{g+=`<line class="grid" x1="${L}" x2="${W-Rm}" y1="${ly(v).toFixed(1)}" y2="${ly(v).toFixed(1)}"/><text class="tick" x="${L-7}" y="${(ly(v)+4).toFixed(1)}" text-anchor="end">${fmtT(v)}</text>`;});
  dt.forEach(v=>{g+=`<line class="grid" x1="${L}" x2="${W-Rm}" y1="${dy(v).toFixed(1)}" y2="${dy(v).toFixed(1)}"/><text class="tick" x="${L-7}" y="${(dy(v)+4).toFixed(1)}" text-anchor="end">${v===0?'0%':'−'+Math.round(-v*100)+'%'}</text>`;});
  xt.forEach(([n,y])=>{g+=`<text class="tick" x="${x(n).toFixed(1)}" y="${H-6}" text-anchor="middle">${y}</text>`;});
  const w=T.worst;
  if(w){const x0=x(w.pk),x1=x(w.rec===null?N:w.rec);g+=`<rect x="${x0.toFixed(1)}" y="${Tp}" width="${Math.max(1,x1-x0).toFixed(1)}" height="${(G+gap+DH).toFixed(1)}" fill="var(--crash-wash)"/>`;
    if(x1-x0>72){g+=`<text class="panel-label" x="${(x0+5).toFixed(1)}" y="${Tp+13}">Grootste daling</text>`;}}
  g+=`<text class="panel-label" x="${L}" y="${dtop-9}">Daling vanaf het vorige hoogste punt</text>`;
  if(amt.c>0)g+=`<path d="${path(P,ly)}" fill="none" stroke="var(--ink3)" stroke-width="1.5" stroke-linejoin="round"/>`;
  if(BA)g+=`<path d="${path(BA,ly)}" fill="none" stroke="var(--bench)" stroke-width="1.5" stroke-linejoin="round"/>`;
  g+=`<path d="${path(A,ly)}" fill="none" stroke="var(--port)" stroke-width="2" stroke-linejoin="round"/>`;
  if(!phone){const yP=ly(A[N]);let yB=BA?ly(BA[N]):0;let py=yP,by=yB;if(BA&&Math.abs(py-by)<16){if(py<by){by=py+16;}else{py=by+16;}}
    g+=`<text class="mark-label" x="${W-Rm+7}" y="${(py+4).toFixed(1)}">Jij</text>`;if(BA)g+=`<text class="panel-label" x="${W-Rm+7}" y="${(by+4).toFixed(1)}">S&amp;P 500</text>`;
    if(amt.c>0){let pp=ly(P[N]);if(Math.abs(pp-py)<16)pp=py+16;if(BA&&Math.abs(pp-by)<16)pp=by+16;g+=`<text class="panel-label" x="${W-Rm+7}" y="${(pp+4).toFixed(1)}">Ingelegd</text>`;}}
  const areaP=path(T.dd,dy)+` L${x(N).toFixed(1)} ${dy(0).toFixed(1)} L${x(0).toFixed(1)} ${dy(0).toFixed(1)}Z`;
  g+=`<path d="${areaP}" fill="var(--crash-wash)"/>`;
  if(BT)g+=`<path d="${path(BT.dd,dy)}" fill="none" stroke="var(--bench)" stroke-width="1.25" stroke-linejoin="round" opacity=".85"/>`;
  g+=`<path d="${path(T.dd,dy)}" fill="none" stroke="var(--crash)" stroke-width="2" stroke-linejoin="round"/>`;
  if(w){const xx=x(w.tr),yy=dy(w.depth),right=xx<W/2;g+=`<circle cx="${xx.toFixed(1)}" cy="${yy.toFixed(1)}" r="4" fill="var(--crash)" stroke="var(--sheet)" stroke-width="2"/><text class="mark-label" x="${(xx+(right?9:-9)).toFixed(1)}" y="${(Math.min(yy+4,dtop+DH-2)).toFixed(1)}" text-anchor="${right?'start':'end'}">${neg(w.depth)}</text>`;}
  g+=`<g id="cross" visibility="hidden"><line id="crossL" y1="${Tp}" y2="${dtop+DH}" stroke="var(--ink3)" stroke-width="1"/><circle id="cP" r="4" fill="var(--port)" stroke="var(--sheet)" stroke-width="2"/>${BA?'<circle id="cB" r="3.5" fill="var(--bench)" stroke="var(--sheet)" stroke-width="2"/>':''}<circle id="cD" r="4" fill="var(--crash)" stroke="var(--sheet)" stroke-width="2"/></g>`;
  g+=`<rect id="hit" x="${L}" y="${Tp}" width="${iw}" height="${dtop+DH-Tp}" fill="transparent"/>`;
  box.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Waarde van je rekening en daling vanaf het vorige hoogste punt, ${dateOf(R.s)} to ${dateOf(R.e)}. Grootste daling ${w?neg(w.depth):'none'}.">${g}</svg><div id="tip" hidden></div>`;
  $('legend').innerHTML=`<span><i style="background:var(--port)"></i>Jouw portefeuille</span>${BA?'<span><i style="background:var(--bench)"></i>S&amp;P 500, zelfde inleg</span>':''}${amt.c>0?'<span><i style="background:var(--ink3)"></i>Ingelegd</span>':''}<span><i style="background:var(--crash)"></i>Daling vanaf hoogste punt</span>`;
  const svg=box.firstChild,tip=$('tip'),cross=$('cross');
  function move(ev){
    const r=svg.getBoundingClientRect(),sx=W/r.width;
    const px=(ev.clientX-r.left)*sx;
    const n=Math.max(0,Math.min(N,Math.round((px-L)/iw*N)));
    const xx=x(n);
    cross.setAttribute('visibility','visible');
    $('crossL').setAttribute('x1',xx);$('crossL').setAttribute('x2',xx);
    $('cP').setAttribute('cx',xx);$('cP').setAttribute('cy',ly(A[n]));
    $('cD').setAttribute('cx',xx);$('cD').setAttribute('cy',dy(T.dd[n]));
    if(BA){$('cB').setAttribute('cx',xx);$('cB').setAttribute('cy',ly(BA[n]));}
    tip.hidden=false;
    tip.innerHTML=`<strong>${dateOf(R.s+n)}</strong><br>Jij ${money(A[n])} (${neg(T.dd[n])} vanaf top)${BA?`<br>S&amp;P 500 ${money(BA[n])} (${neg(BT.dd[n])})`:''}${amt.c>0?`<br>Ingelegd ${money(P[n])}`:''}`;
    const tw=tip.offsetWidth,bw=box.clientWidth;
    let lx=xx/sx+12;if(lx+tw>bw)lx=xx/sx-12-tw;if(lx<0)lx=0;
    tip.style.left=lx+'px';tip.style.top=Math.max(0,(ev.clientY-r.top)-44)+'px';
  }
  const hit=$('hit');
  hit.addEventListener('pointermove',move);hit.addEventListener('pointerdown',move);
  hit.addEventListener('pointerleave',()=>{cross.setAttribute('visibility','hidden');tip.hidden=true;});
}
function growth(start,c,years,r,inf){
  const real=(1+r)/(1+inf)-1,g=Math.pow(1+Math.max(real,-.99),1/12),pts=[start];let a=start;
  for(let m=1;m<=years*12;m++){a=a*g+c;if(m%12===0)pts.push(a);}
  return pts;
}
function future(){
  if(!cur)return;
  const {R,T,amt}=cur,inf=S.infl/100,own=S.rate!==null&&S.rate!==undefined;
  const base=own?S.rate/100:T.cagr,lo=base-.02,hi=base+.02;
  const L=growth(amt.start,amt.c,S.years,lo,inf),M=growth(amt.start,amt.c,S.years,base,inf),H=growth(amt.start,amt.c,S.years,hi,inf);
  const P=[];for(let y=0;y<=S.years;y++)P.push(amt.start+amt.c*12*y);
  const n=S.years;
  $('f10').textContent=money(L[n]);$('f50').textContent=money(M[n]);$('f90').textContent=money(H[n]);
  $('r10').textContent=sign(lo)+' per jaar';$('r50').textContent=sign(base)+' per jaar';$('r90').textContent=sign(hi)+' per jaar';
  $('t50').textContent=own?'Met jouw rendement':'Zoals in de test';
  const start=dateOf(R.lim==='__user'?R.s+1:R.s),end=dateOf(R.e);
  $('fHow').innerHTML=`<strong>Zo rekenen we:</strong> je begint met ${money(amt.start)}${amt.c>0?` en legt elke maand ${money(amt.c)} in`:''}. Je geld groeit elk jaar ${sign(base)}. `+(own?'Dat rendement heb je zelf ingevuld.':`Dat is het rendement uit je test hierboven (${start} tot ${end}). Kies je een andere mix of startdatum, dan verandert dit getal mee.`);
  const paid=P[n];
  $('barFut').style.width=Math.max(2,Math.min(100,paid/Math.max(M[n],paid)*100)).toFixed(1)+'%';
  $('barFutL').textContent=`Zelf ingelegd ${money(paid)}`;
  $('barFutR').textContent=M[n]>paid?`Groei ${money(M[n]-paid)}`:'Geen groei';
  const buy=Math.round(100/Math.pow(1+inf,S.years));
  $('fExplain').innerHTML=inf>0?`<strong>Dit is wat het echt waard is, in geld van vandaag.</strong> Alles wordt duurder: over ${S.years} jaar koop je voor ${sym()}100 wat je nu voor ${sym()}${buy} koopt. Die ${nf(S.infl,1)}% inflatie per jaar is er al vanaf gehaald.`:'<strong>Je hebt inflatie op 0% gezet.</strong> De bedragen houden geen rekening met stijgende prijzen.';
  $('futSmall').textContent=`In het echt gaat het niet in een rechte lijn. ${T.worst?`Deze mix daalde in de test ooit ${Math.abs(Math.round(T.worst.depth*100))}%, en dat kan weer gebeuren. `:''}Dit is een rekenvoorbeeld, geen voorspelling.`;
  const w2008=2007*12+9-(1970*12),miss=R.s>w2008,fw=$('futWarn');
  if(!own&&miss){fw.hidden=false;fw.textContent=`Dit rendement komt uit maar ${Math.round(T.yrs)} jaar, zonder de crash van 2008. Reken er niet op dat het zo blijft.`;}
  else if(!own&&T.yrs<20){fw.hidden=false;fw.textContent=`Dit rendement komt uit maar ${Math.round(T.yrs)} jaar. Dat is kort, dus wees voorzichtig.`;}
  else fw.hidden=true;
  drawFut(L,M,H,P,own);
}
function drawFut(Lo,Mi,Hi,P,own){
  const box=$('fan'),W=Math.max(300,box.clientWidth||700),phone=W<520;
  const L=phone?46:58,Rm=phone?10:128,H=phone?230:280,Tp=12,Bt=24,G=H-Tp-Bt,iw=W-L-Rm,n=S.years;
  const x=y=>L+y/n*iw;
  let hi=0;[Lo,Mi,Hi,P].forEach(a=>a.forEach(v=>{hi=Math.max(hi,v);}));hi=hi*1.04||1;
  const y=v=>Tp+G-(v/hi)*G;
  const base=new Date().getFullYear();
  let g='';niceLin(hi).forEach(v=>{g+=`<line class="grid" x1="${L}" x2="${W-Rm}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="tick" x="${L-7}" y="${(y(v)+4).toFixed(1)}" text-anchor="end">${fmtT(v)}</text>`;});
  const st=[1,2,5,10].find(s=>n/s<=iw/(phone?48:64))||10;
  for(let t=0;t<=n;t+=st)g+=`<text class="tick" x="${x(t).toFixed(1)}" y="${H-6}" text-anchor="${t===0?'start':'middle'}">${base+t}</text>`;
  const line=a=>a.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join('');
  g+=`<path d="${line(P)}" fill="none" stroke="var(--ink3)" stroke-width="1.5" stroke-linejoin="round"/><path d="${line(Lo)}" fill="none" stroke="var(--bench)" stroke-width="2" stroke-linejoin="round"/><path d="${line(Hi)}" fill="none" stroke="var(--class-bond)" stroke-width="2" stroke-linejoin="round"/><path d="${line(Mi)}" fill="none" stroke="var(--port)" stroke-width="2.5" stroke-linejoin="round"/>`;
  const midName=own?'Jouw rendement':'Zoals in de test';
  if(!phone){let a=[{v:y(Hi[n]),t:'Als het meevalt',c:'panel-label'},{v:y(Mi[n]),t:midName,c:'mark-label'},{v:y(Lo[n]),t:'Als het tegenvalt',c:'panel-label'},{v:y(P[n]),t:'Zelf ingelegd',c:'panel-label'}];for(let i=1;i<a.length;i++)if(a[i].v-a[i-1].v<16)a[i].v=a[i-1].v+16;a.forEach(l=>{g+=`<text class="${l.c}" x="${W-Rm+7}" y="${(l.v+4).toFixed(1)}">${l.t}</text>`;});}
  g+=`<g id="fc" visibility="hidden"><line id="fcL" y1="${Tp}" y2="${Tp+G}" stroke="var(--ink3)" stroke-width="1"/><circle id="fcM" r="4" fill="var(--port)" stroke="var(--sheet)" stroke-width="2"/></g><rect id="fhit" x="${L}" y="${Tp}" width="${iw}" height="${G}" fill="transparent"/>`;
  box.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Rekenvoorbeeld over ${n} jaar">${g}</svg><div id="ftip" hidden></div>`;
  $('fanLegend').innerHTML=`<span><i style="background:var(--port)"></i>${midName}</span><span><i style="background:var(--class-bond)"></i>Als het meevalt</span><span><i style="background:var(--bench)"></i>Als het tegenvalt</span><span><i style="background:var(--ink3)"></i>Zelf ingelegd</span>`;
  const svg=box.firstChild,tip=$('ftip'),hit=$('fhit');
  function move(ev){const r=svg.getBoundingClientRect(),sx=W/r.width,px=(ev.clientX-r.left)*sx,s=Math.max(0,Math.min(n,Math.round((px-L)/iw*n))),xx=x(s);
    $('fc').setAttribute('visibility','visible');$('fcL').setAttribute('x1',xx);$('fcL').setAttribute('x2',xx);$('fcM').setAttribute('cx',xx);$('fcM').setAttribute('cy',y(Mi[s]));
    tip.hidden=false;tip.innerHTML=`<strong>${base+s}, na ${s} jaar</strong><br>${midName}: ${money(Mi[s])}<br>Als het meevalt: ${money(Hi[s])}<br>Als het tegenvalt: ${money(Lo[s])}<br>Zelf ingelegd: ${money(P[s])}`;
    const tw=tip.offsetWidth,bw=box.clientWidth;let lx=xx/sx+12;if(lx+tw>bw)lx=xx/sx-12-tw;if(lx<0)lx=0;tip.style.left=lx+'px';tip.style.top=Math.max(0,(ev.clientY-r.top)-60)+'px';}
  hit.addEventListener('pointermove',move);hit.addEventListener('pointerdown',move);hit.addEventListener('pointerleave',()=>{$('fc').setAttribute('visibility','hidden');tip.hidden=true;});
}
let rt=0;window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{draw();future();},120);});
try{new MutationObserver(()=>{draw();future();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});}catch(e){}
structural();
requestAnimationFrame(draw);
})();
