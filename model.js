(function(root) {
  'use strict';
  const materials=['Si','GaSb','InGaAs','GaAs','III-V multijunction','InGaAsSb'];
  function finite(value, label, min, max, exclusiveMin=false) {
    const n=Number(value);
    if (value==='' || !Number.isFinite(n) || (exclusiveMin?n<=min:n<min) || n>max)
      throw new RangeError(label+' is outside the allowed range');
    return n;
  }
  function cost(row,settings) {
    const eta=finite(row.eta_pair_pct,'Efficiency',0,100,true)/100;
    const power=finite(row.p_out_W_cm2,'Output power density',0,1000000,true);
    const cpa=finite(row.kind==='custom'?row.CPA_dollar_cm2:settings.cpa[row.cell_type],'CPA',0,1000000);
    const heat=finite(settings.lcoh,'LCOH',0,1000000);
    const cf=finite(settings.cf,'CF',0,1,true);
    const capital=1000*.074*cpa/(8760*cf*power);
    const thermal=(heat/100)/eta;
    return {...row,CPA_dollar_cm2:cpa,lcoh_cent_per_kwh:heat,capacity_factor:cf,
      p_abs_W_cm2:power/eta,lcoe_cell_dollar_kwh:capital,lcoe_heat_dollar_kwh:thermal,
      lcoe_dollar_kwh:capital+thermal};
  }
  function bubbleArea(value,scale) {
    if (value===0) return scale.max_area_pt2;
    if (!Number.isFinite(value)||value<0) throw new RangeError('Invalid LCOE');
    const low=Math.log10(scale.min_lcoe_dollar_kwh), high=Math.log10(scale.max_lcoe_dollar_kwh);
    const u=Math.max(0,Math.min(1,(high-Math.log10(value))/(high-low)));
    return scale.min_area_pt2+(scale.max_area_pt2-scale.min_area_pt2)*Math.pow(u,scale.exponent);
  }
  function customRow(c) {
    const power=finite(c.power,'Output power density',0,1000000,true);
    let eta=finite(c.eta,'Efficiency',0,100,true);
    if(c.mode==='heat') {
      const q=finite(c.heat,'Absorbed heat density',0,1000000,true);
      if(q<power) throw new RangeError('Absorbed heat Qabs must be at least electrical output Pout');
      eta=100*power/q;
    }
    if(!materials.includes(c.material)) throw new RangeError('Select a valid cell material');
    const t=finite(c.temperature,'Emitter temperature',0,100000);
    return {id:'custom',table_id:null,label:'Custom',work:String(c.name||'Custom cell').slice(0,100),
      cell_type:c.material,emitter_temperature_K:t,emitter_temperature_C:t-273.15,
      eta_pair_pct:eta,p_out_W_cm2:power,CPA_dollar_cm2:finite(c.cpa,'CPA',0,1000000),
      kind:'custom',source_url:'',source_note:'User-defined cell; not a literature experiment.',source_file:'',
      paper_key:'custom',near_field:false,selected_representative:true};
  }
  function csv(rows) {
    const keys=['id','table_id','work','cell_type','kind','emitter_temperature_K','emitter_temperature_C',
      'eta_pair_pct','p_out_W_cm2','p_abs_W_cm2','CPA_dollar_cm2','lcoh_cent_per_kwh',
      'capacity_factor','lcoe_cell_dollar_kwh','lcoe_heat_dollar_kwh','lcoe_dollar_kwh','source_url','source_note'];
    const quote=value=>{
      let v=value==null?'':String(value);
      if(typeof value==='string' && /^[=+\-@\t\r]/.test(v))v="'"+v;
      return '"'+v.replaceAll('"','""')+'"';
    };
    return '\ufeff'+[keys.join(','),...rows.map(row=>keys.map(k=>quote(row[k])).join(','))].join('\r\n');
  }
  const api={materials,cost,bubbleArea,customRow,csv};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.TPVMath=api;
})(globalThis);
