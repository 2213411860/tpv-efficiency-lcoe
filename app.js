/* TPV Lab: buildless; all numerical data stay in the browser. */
(function(){
  'use strict';
  const D=globalThis.TPVDataset, M=globalThis.TPVMath;
  const $=id=>document.getElementById(id), esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const defaults=()=>({lcoh:1,cf:1,cpa:{...D.default_cpa},customEnabled:true,
    custom:{cpa:.2,power:1,heat:4}});
  const pointColors={model:'#287d75',custom:'#ae4868'};
  const colorOf=r=>pointColors[r.kind]||D.colors[r.cell_type];
  let state=defaults(), selected='lin-model', current=[], customError='';
  const controls=new Map(), storageKey='tpv-lab-settings-v2';
  const fmt=(n,d=3)=>Number.isFinite(n)?Number(n.toPrecision(d)).toLocaleString('en-US',{maximumFractionDigits:8}):'—';
  try {
    const saved=JSON.parse(localStorage.getItem(storageKey)||localStorage.getItem('tpv-lab-settings-v1')||'null');
    if(saved){
      const candidate={...defaults(),...saved,cpa:{...D.default_cpa,...saved.cpa},custom:{...defaults().custom,...saved.custom}};
      // Preserve the performance of a previously saved efficiency-mode cell.
      if(candidate.custom.mode==='efficiency')candidate.custom.heat=100*candidate.custom.power/candidate.custom.eta;
      candidate.custom={cpa:candidate.custom.cpa,power:candidate.custom.power,heat:candidate.custom.heat};
      D.records.forEach(r=>M.cost(r,candidate));
      if(Object.values(candidate.custom).some(v=>!Number.isFinite(Number(v))||Number(v)<0||Number(v)>1000000))throw new RangeError('Invalid saved custom inputs');
      state=candidate;
    }
  }catch(_){/* Storage is optional, including file:// and private browsing. */}
  function save(){try{localStorage.setItem(storageKey,JSON.stringify(state));}catch(_){}}
  function calculate(){
    current=D.records.map(r=>M.cost(r,state)); customError='';
    if(state.customEnabled){try{current.push(M.cost(M.customRow(state.custom),state));}catch(e){customError=e.message;}}
    if(!current.some(r=>r.id===selected))selected='lin-model';
  }
  function update(){calculate();save();if(document.body.dataset.page==='data'){renderTable();return;}renderChart();renderSelection();renderDerived();}
  function control(host,config){
    const {id,label,unit='',min=0,max,step=.01,log=false,color,get,set}=config;
    const wrap=document.createElement('div'); wrap.className='slider-control';wrap.dataset.control=id;
    wrap.innerHTML=`<div class="control-top"><label class="control-label" for="${id}-number">${color?`<i class="material-dot" style="background:${color}"></i>`:''}${esc(label)}</label><div class="control-value"><input id="${id}-number" type="number" min="${min}" max="1000000" step="${step}" inputmode="decimal" aria-label="${esc(label)} value"><span>${unit}</span></div></div><input id="${id}-range" type="range" aria-label="${esc(label)} slider"><div class="range-limits"><span>${min}</span><span class="range-max">${max}</span></div>`;
    host.append(wrap); const number=$(id+'-number'),range=$(id+'-range');
    const sync=(keepNumber=false)=>{
      if(!keepNumber)number.value=get(); number.setAttribute('aria-invalid','false');number.classList.remove('input-error');
      const end=Math.max(max,Number(get())),start=log?Math.log10(min):min;
      range.min=start;range.max=log?Math.log10(end):end;range.step=log?.001:step;
      range.value=log?Math.log10(get()):get();wrap.querySelector('.range-max').textContent=fmt(end,4);
      range.setAttribute('aria-valuetext',String(get()));
    };
    const change=(v,fromNumber)=>{
      const value=Number(v),allowedMax=id==='cf'?1:1000000;
      if(v===''||!Number.isFinite(value)||value<min||value>allowedMax){
        if(fromNumber){number.setAttribute('aria-invalid','true');number.classList.add('input-error');}return;
      }
      set(value);sync(fromNumber);update();
    };
    number.addEventListener('input',()=>change(number.value,true));
    number.addEventListener('change',()=>{if(number.getAttribute('aria-invalid')==='true'){sync();toast('Enter a value within the allowed range.');}});
    range.addEventListener('input',()=>change(log?Number(Math.pow(10,Number(range.value)).toPrecision(7)):range.value,false));
    sync();controls.set(id,{sync,wrap,number,range});
  }
  function initControls(){
    control($('economic-controls'),{id:'lcoh',label:'Heat cost, LCOH',unit:'¢/kWh<sub>th</sub>',min:0,max:20,step:.01,get:()=>state.lcoh,set:v=>state.lcoh=v});
    control($('economic-controls'),{id:'cf',label:'Capacity factor, CF',min:.01,max:1,step:.01,get:()=>state.cf,set:v=>state.cf=v});
    M.materials.forEach((material,i)=>control($('cpa-controls'),{id:'cpa-'+i,label:material,min:0,max:material==='Si'?2:100,step:material==='Si'?.01:.1,color:D.colors[material],get:()=>state.cpa[material],set:v=>state.cpa[material]=v}));
    const configs=[['cpa','Cell area cost, CPA','$/cm²',0,100,.01,false],
      ['power','Output power, Pout','W/cm²',0,10,.001,false],['heat','Absorbed heat, Qabs','W/cm²',0,50,.001,false]];
    configs.forEach(([key,label,unit,min,max,step,log])=>control($('custom-controls'),{id:'custom-'+key,label,unit,min,max,step,log,get:()=>state.custom[key],set:v=>state.custom[key]=v}));
    $('custom-enabled').addEventListener('change',e=>{state.customEnabled=e.target.checked;syncAll();update();});
    document.querySelectorAll('[data-heat]').forEach(b=>b.addEventListener('click',()=>{state.lcoh=Number(b.dataset.heat);controls.get('lcoh').sync();update();}));
    $('reset').addEventListener('click',()=>{state=defaults();selected='lin-model';syncAll();update();toast('Default settings restored.');});
    $('export-svg').addEventListener('click',()=>{
      const svg=$('chart').cloneNode(true);svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.setAttribute('width','1380');svg.setAttribute('height','878');
      svg.querySelectorAll('[tabindex]').forEach(n=>n.removeAttribute('tabindex'));
      download(new XMLSerializer().serializeToString(svg),'tpv_interactive_chart.svg','image/svg+xml;charset=utf-8');
    });syncAll();
  }
  function syncAll(){
    controls.forEach(c=>c.sync());$('custom-enabled').checked=state.customEnabled;
    $('custom-fields').classList.toggle('disabled',!state.customEnabled);
    $('custom-fields').querySelectorAll('input,select').forEach(el=>el.disabled=!state.customEnabled);
  }
  function renderDerived(){
    $('custom-error').textContent=customError;
    const row=current.find(r=>r.id==='custom');
    $('custom-derived').innerHTML=row?`<span>η <strong>${fmt(row.eta_pair_pct,5)}%</strong></span><span>LCOE <strong>$${fmt(row.lcoe_dollar_kwh,5)}</strong> /kWh<sub>e</sub></span>`:(state.customEnabled?'Correct the inputs to show the custom cell.':'Custom cell hidden.');
  }
  const badge=r=>r.kind==='model'?'Prediction':r.kind==='custom'?'Custom':'Literature';
  function renderSelection(){
    const r=current.find(r=>r.id===selected);
    const cellInfo=r.kind==='custom'?'':`<span>${esc(r.cell_type)} · ${fmt(r.emitter_temperature_K,6)} K</span>`;
    $('selection').innerHTML=`<div class="selection-head"><strong>${esc(r.work)}</strong><span class="badge ${r.kind}">${badge(r)}</span>${cellInfo}</div><div class="selection-values"><span><b>${fmt(r.eta_pair_pct,4)}%</b>η</span><span><b>${fmt(r.p_out_W_cm2,4)}</b>W/cm²</span><span><b>$${fmt(r.lcoe_dollar_kwh,4)}</b>/kWh<sub>e</sub></span><span>Cell $${fmt(r.lcoe_cell_dollar_kwh,3)} + heat $${fmt(r.lcoe_heat_dollar_kwh,3)}</span></div><div class="selection-source">${r.kind==='model'?'Si HJT TPV prediction in this work; fixed at 1600 K.':r.kind==='custom'?'':esc(r.source_title||'')} ${r.source_url?`<a href="${esc(r.source_url)}" target="_blank" rel="noopener noreferrer">Original publication ↗</a>`:''}</div>`;
  }
  function renderChart(){
    $('heat-readout').textContent=fmt(state.lcoh,5);$('cf-readout').textContent=state.cf.toFixed(2);$('point-count').textContent=current.length+' points';
    const x0=83,y0=34,w=605,h=442;
    const highestEfficiency=Math.max(...current.map(r=>r.eta_pair_pct));
    const xmax=highestEfficiency<=42?45:Math.ceil((highestEfficiency+3)/10)*10;
    const ymin=Math.min(.045,Math.min(...current.map(r=>r.p_out_W_cm2))*.55),ymax=Math.max(13,Math.max(...current.map(r=>r.p_out_W_cm2))*1.7);
    const x=n=>x0+n/xmax*w,y=n=>y0+h-(Math.log10(n)-Math.log10(ymin))/(Math.log10(ymax)-Math.log10(ymin))*h;
    const radius=n=>Math.sqrt(M.bubbleArea(n,D.bubble_scale))/2*96/72;
    const parts=[`<title>TPV efficiency and electrical power density</title><desc>Bubble size decreases as LCOE increases. Heat price ${state.lcoh} cents per kWh thermal; capacity factor ${state.cf}.</desc><rect width="920" height="585" fill="white"/><g fill="#111" stroke="none" font-family="'Times New Roman',serif" font-weight="bold"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="none" stroke="#171717" stroke-width="1.2"/>`];
    const xstep=xmax<=50?10:20;
    for(let t=0;t<=xmax;t+=xstep)parts.push(`<path d="M${x(t)},${y0+h}v6" stroke="#111" stroke-width="1.1"/><text x="${x(t)}" y="${y0+h+25}" text-anchor="middle" font-size="16">${t}</text>`);
    for(let p=Math.ceil(Math.log10(ymin));p<=Math.floor(Math.log10(ymax));p++)parts.push(`<path d="M${x0-6},${y(10**p)}h6" stroke="#111" stroke-width="1.1"/><text x="${x0-13}" y="${y(10**p)+5}" text-anchor="end" font-size="16">10<tspan baseline-shift="super" font-size="11">${p}</tspan></text>`);
    parts.push(`<text x="${x0+w/2}" y="539" text-anchor="middle" font-size="21">TPV efficiency, <tspan font-style="italic">η</tspan> (%)</text><text transform="translate(25,${y0+h/2}) rotate(-90)" text-anchor="middle" font-size="20">Electrical power density (W cm<tspan baseline-shift="super" font-size="12">−2</tspan>)</text>`);
    const ordered=[...current].sort((a,b)=>a.lcoe_dollar_kwh-b.lcoe_dollar_kwh);
    ordered.forEach(r=>{
      const color=colorOf(r),px=x(r.eta_pair_pct),py=y(r.p_out_W_cm2),rad=radius(r.lcoe_dollar_kwh);
      parts.push(`<g class="bubble-point" data-id="${esc(r.id)}" tabindex="0" role="button" aria-label="${esc(r.work)}, efficiency ${fmt(r.eta_pair_pct,4)} percent, output ${fmt(r.p_out_W_cm2,4)} watts per square centimetre, LCOE ${fmt(r.lcoe_dollar_kwh,4)} dollars per kilowatt-hour"><title>${esc(r.work)} · $${fmt(r.lcoe_dollar_kwh,4)}/kWh</title><circle cx="${px}" cy="${py}" r="${rad}" fill="${color}" fill-opacity=".14" stroke="${color}" stroke-opacity=".58" stroke-width=".9"/><circle class="center-dot" cx="${px}" cy="${py}" r="${r.id===selected?3.2:2.5}" fill="${color}" stroke="#111" stroke-width="${r.id===selected?1.2:.5}"/><circle cx="${px}" cy="${py}" r="${Math.max(7,rad)}" fill="transparent" stroke="none"/></g>`);
    });
    current.forEach(r=>{
      let dx=8,dy=-16;
      if(r.id==='lin-model') {dx=10;dy=20;}
      if(r.id==='custom'){dx=10;dy=-17;}
      parts.push(`<text x="${x(r.eta_pair_pct)+dx}" y="${y(r.p_out_W_cm2)+dy}" font-size="${r.kind==='literature'?12:13}" fill="${r.kind==='literature'?'#111':colorOf(r)}" pointer-events="none">${esc(r.label)}</text>`);
    });
    M.materials.forEach((m,i)=>parts.push(`<circle cx="748" cy="${61+i*32}" r="4.3" fill="${D.colors[m]}" stroke="#111" stroke-width=".5"/><text x="763" y="${66+i*32}" font-size="14">${esc(m==='III-V multijunction'?'III-V multi-junction':m)}</text>`));
    [{kind:'model',label:'Si HJT cell'},{kind:'custom',label:'Custom'}].forEach((item,i)=>{
      if(item.kind==='custom'&&!state.customEnabled)return;
      const cy=item.kind==='model'?253:303;
      parts.push(`<circle cx="748" cy="${cy}" r="4.3" fill="${pointColors[item.kind]}" stroke="#111" stroke-width=".5"/><text x="763" y="${cy+5}" font-size="14">${item.label}${item.kind==='model'?'<tspan x="763" dy="17" font-size="13">(this work)</tspan>':''}</text>`);
    });
    parts.push('<text x="737" y="352" font-size="16">LCOE ($ kWh<tspan baseline-shift="super" font-size="10">−1</tspan><tspan baseline-shift="sub" font-size="10">e</tspan>)</text>');
    const values=[.16,1.1,5.4],cx=770,bottom=443,radii=values.map(radius);let last=-Infinity;
    values.forEach((cost,i)=>{
      const r=radii[i],top=bottom-2*r,ly=Math.max(top,last+18);last=ly;
      parts.push(`<circle cx="${cx}" cy="${bottom-r}" r="${r}" fill="none" stroke="#777" stroke-width=".9"/><path d="M${cx},${top}H${cx+radii[0]+8}L846,${ly}" fill="none" stroke="#8a8a8a" stroke-width=".7"/><text x="853" y="${ly+4}" font-size="14">${cost}</text>`);
    });
    parts.push('<text x="739" y="482" font-size="11" fill="#82818a" font-weight="normal">Larger bubble = lower LCOE</text></g>');$('chart').innerHTML=parts.join('');
    const outside=current.filter(r=>r.lcoe_dollar_kwh<D.bubble_scale.min_lcoe_dollar_kwh||r.lcoe_dollar_kwh>D.bubble_scale.max_lcoe_dollar_kwh).length;
    $('scale-note').textContent=outside?`${outside} point(s) exceed the fixed bubble scale; numerical LCOE values are unchanged.`:'';
    $('chart').querySelectorAll('.bubble-point').forEach(node=>{
      const row=current.find(r=>r.id===node.dataset.id);
      node.addEventListener('click',()=>{selected=row.id;renderChart();renderSelection();});
      node.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selected=row.id;renderChart();renderSelection();$('selection').scrollIntoView({block:'nearest'});}});
      node.addEventListener('pointerenter',event=>showTooltip(row,event));node.addEventListener('pointermove',moveTooltip);
      node.addEventListener('pointerleave',()=>{$('tooltip').hidden=true;});
    });
  }
  function showTooltip(r,e){
    $('tooltip').innerHTML=`<strong>${esc(r.work)}</strong>${r.kind==='custom'?'':`<div>${esc(r.cell_type)} · ${badge(r)}</div>`}<div class="tooltip-cost">$${fmt(r.lcoe_dollar_kwh,5)} <small>/kWh<sub>e</sub></small></div><div>η ${fmt(r.eta_pair_pct,4)}% · Pout ${fmt(r.p_out_W_cm2,4)} W/cm²</div><div>Qabs ${fmt(r.p_abs_W_cm2,4)} W/cm²</div><div>Cell $${fmt(r.lcoe_cell_dollar_kwh,4)} + heat $${fmt(r.lcoe_heat_dollar_kwh,4)}</div><div>CPA $${fmt(r.CPA_dollar_cm2,4)}/cm²${r.kind==='custom'?'':` · ${fmt(r.emitter_temperature_K,5)} K`}</div><div>Select for details</div>`;
    $('tooltip').hidden=false;moveTooltip(e);
  }
  function moveTooltip(e){const tip=$('tooltip');tip.style.left=Math.max(8,Math.min(e.clientX+15,innerWidth-tip.offsetWidth-12))+'px';tip.style.top=Math.max(8,Math.min(e.clientY+14,innerHeight-tip.offsetHeight-12))+'px';}
  function download(content,name,type){const url=URL.createObjectURL(new Blob([content],{type})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function toast(text){$('toast').textContent=text;$('toast').hidden=false;setTimeout(()=>$('toast').hidden=true,2500);}
  function initData(){
    $('search').addEventListener('input',renderTable);$('download-current').addEventListener('click',()=>download(M.csv(current),'tpv_current_scenario.csv','text/csv;charset=utf-8'));
    const lin=D.records.find(r=>r.id==='lin-model');
    $('lin-description').innerHTML=`<p><strong>${fmt(lin.emitter_temperature_K,6)} K</strong> · η <strong>${fmt(lin.eta_pair_pct,5)}%</strong> · Pout <strong>${fmt(lin.p_out_W_cm2,6)} W/cm²</strong>.</p><p>Baseline LCOE: <strong>$${fmt(lin.reference_lcoe_dollar_kwh,7)}/kWh<sub>e</sub></strong>.</p>`;
    $('sources').innerHTML=D.sources.map(s=>`<div class="source-item"><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a><p>${esc(s.note)}</p></div>`).join('');
  }
  function renderTable(){
    const term=$('search').value.toLocaleLowerCase();const shown=current.filter(r=>[r.label,r.work,r.cell_type,badge(r)].join(' ').toLocaleLowerCase().includes(term));
    $('data-scenario').textContent=`LCOH ${fmt(state.lcoh,5)} ¢/kWh_th · CF ${fmt(state.cf,4)} · CRF 0.074`;
    $('data-table').querySelector('tbody').innerHTML=shown.map(r=>`<tr class="${r.kind==='model'?'model-row':r.kind==='custom'?'custom-row':''}"><td>${esc(r.label)}</td><td>${esc(r.work)}</td><td><i class="material-dot" style="background:${colorOf(r)}"></i> ${r.kind==='custom'?'—':esc(r.cell_type)}</td><td>${fmt(r.emitter_temperature_K,7)}</td><td>${fmt(r.eta_pair_pct,6)}</td><td>${fmt(r.p_out_W_cm2,7)}</td><td>${fmt(r.CPA_dollar_cm2,6)}</td><td><strong>${fmt(r.lcoe_dollar_kwh,7)}</strong></td><td>${r.source_url?`<a href="${esc(r.source_url)}" title="${esc(r.source_title)}. ${esc(r.source_note)}" target="_blank" rel="noopener noreferrer">${esc(new URL(r.source_url).hostname.replace(/^www\./,''))} ↗</a>`:'User input'}</td></tr>`).join('')||'<tr><td colspan="9">No matching records.</td></tr>';
    $('table-count').textContent=`${shown.length} / ${current.length} records.${customError?' Invalid custom cell omitted.':''}`;
  }
  document.querySelectorAll('[data-latex]').forEach(node=>globalThis.katex.render(node.dataset.latex,node,{displayMode:true,throwOnError:true,trust:false}));
  if(document.body.dataset.page==='data')initData();else initControls();update();
  addEventListener('storage',e=>{if(e.key===storageKey){try{const s=JSON.parse(e.newValue);if(s){D.records.forEach(r=>M.cost(r,s));state=s;if(document.body.dataset.page!=='data')syncAll();update();}}catch(_){}}});
})();
