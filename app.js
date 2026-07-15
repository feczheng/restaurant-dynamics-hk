'use strict';

const NAMED_CUISINES = [
  'Hong Kong-style',
  'Western',
  'Chinese Mainland',
  'Japanese',
  'Korean',
  'Taiwanese',
  'Vietnamese',
  'Thai'
];
const ALL_CUISINES = [...NAMED_CUISINES, 'Other'];
const TIERS = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'];
const COLORWAY = ['#60a5fa','#22c55e','#f43f5e','#f59e0b','#a855f7','#06b6d4','#f472b6','#94a3b8','#16a34a'];
const AXIS_LINE = {showline:true, linewidth:1.6, linecolor:'rgba(255,255,255,.75)'};
const GRID_COLOR = 'rgba(255,255,255,.18)';
const TICK_FONT = {color:'#f6f9ff', size:13};
const TITLE_FONT = {color:'#f6f9ff', size:16};
const PLOT_CONFIG = {displayModeBar:true, displaylogo:false, responsive:true};

const state = {
  ycWide: [],
  totals: [],
  tierDiversity: [],
  years: [],
  view: 'table',
  trendOn: false,
  applied: {start:2016, end:2025, cuisines:[...NAMED_CUISINES]}
};

function csvUrl(name){ return './data/' + name; }

function parseCSV(url){
  return new Promise((resolve, reject)=>{
    Papa.parse(url, {
      download:true,
      header:true,
      dynamicTyping:true,
      skipEmptyLines:true,
      complete:(res)=> res.errors.length ? reject(new Error(res.errors[0].message)) : resolve(res.data),
      error:reject
    });
  });
}

function normalizeWide(rows){
  return rows.map(r=>{
    const out = {__Year:+(r.__Year ?? r.Year)};
    ALL_CUISINES.forEach(c=>{ out[c] = +(r[c] ?? 0); });
    return out;
  }).filter(r=>Number.isFinite(r.__Year)).sort((a,b)=>a.__Year-b.__Year);
}

function normalizeTotals(rows){
  return rows.map(r=>({
    __Year:+(r.__Year ?? r.Year),
    restaurants:+(r.restaurants ?? r.Total ?? r.total ?? r.TOTAL)
  })).filter(r=>Number.isFinite(r.__Year) && Number.isFinite(r.restaurants)).sort((a,b)=>a.__Year-b.__Year);
}

function normalizeTierDiversity(rows){
  return rows.map(r=>({
    Year:+r.Year,
    Tier:String(r.Tier),
    DCCAs:+r.DCCAs,
    Restaurants:+r.Restaurants,
    Shannon_H:+r.Shannon_H,
    Effective_N:+r.Effective_N
  })).filter(r=>Number.isFinite(r.Year) && TIERS.includes(r.Tier)).sort((a,b)=>a.Year-b.Year || TIERS.indexOf(a.Tier)-TIERS.indexOf(b.Tier));
}

function validateData(){
  const expectedYears = Array.from({length:10},(_,i)=>2016+i);
  if (state.ycWide.length !== expectedYears.length || state.totals.length !== expectedYears.length){
    throw new Error('Expected one cuisine row and one total row for every year from 2016 to 2025.');
  }
  expectedYears.forEach((year,i)=>{
    const row = state.ycWide[i];
    const total = state.totals[i];
    if (row.__Year !== year || total.__Year !== year) throw new Error(`Missing or duplicate annual row for ${year}.`);
    const sum = ALL_CUISINES.reduce((acc,c)=>acc+(+row[c]||0),0);
    if (sum !== total.restaurants) throw new Error(`Cuisine sum ${sum} does not match total ${total.restaurants} in ${year}.`);
    const tierRows = state.tierDiversity.filter(r=>r.Year===year);
    if (tierRows.length !== 4 || !TIERS.every(tier=>tierRows.some(r=>r.Tier===tier))){
      throw new Error(`Expected one row for every tier in ${year}.`);
    }
    if (tierRows.reduce((acc,r)=>acc+r.DCCAs,0) !== 452){
      throw new Error(`Tier DCCA counts do not sum to 452 in ${year}.`);
    }
    if (tierRows.reduce((acc,r)=>acc+r.Restaurants,0) !== sumNamed(row)){
      throw new Error(`Tier restaurant counts do not match the named-eight total in ${year}.`);
    }
    if (tierRows.some(r=>!Number.isFinite(r.Shannon_H) || !Number.isFinite(r.Effective_N))){
      throw new Error(`Tier diversity contains a non-numeric value in ${year}.`);
    }
  });
  if (state.tierDiversity.length !== 40) throw new Error('Expected 40 tier-diversity rows (10 years × 4 tiers).');
}

async function loadData(){
  try {
    const [wide, totals, tierDiversity] = await Promise.all([
      parseCSV(csvUrl('year_cuisine_counts_wide.csv')),
      parseCSV(csvUrl('yearly_totals_summary.csv')),
      parseCSV(csvUrl('tier_diversity_2016_2025.csv'))
    ]);
    state.ycWide = normalizeWide(wide);
    state.totals = normalizeTotals(totals);
    state.tierDiversity = normalizeTierDiversity(tierDiversity);
    state.years = state.ycWide.map(r=>r.__Year);
    validateData();
    renderCuisineList();
    syncControlsFromApplied();
    render();
  } catch(error) {
    showEmpty('Data could not be loaded or failed validation. Check the CSV files in ./data/.');
    setCaption(error.message);
    console.error(error);
  }
}

function renderCuisineList(){
  const wrap = document.getElementById('cuisineList');
  wrap.replaceChildren();
  ALL_CUISINES.forEach(c=>{
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = c;
    input.id = 'c_' + c.replace(/\W+/g,'_');
    const text = document.createElement('span');
    text.textContent = c === 'Other' ? 'Other (residual)' : c;
    label.append(input,text);
    wrap.append(label);
  });
}

function syncControlsFromApplied(){
  document.getElementById('yearStart').value = String(state.applied.start);
  document.getElementById('yearEnd').value = String(state.applied.end);
  document.querySelectorAll('#cuisineList input').forEach(input=>{
    input.checked = state.applied.cuisines.includes(input.value);
  });
}

function readDraft(){
  return {
    start:+document.getElementById('yearStart').value,
    end:+document.getElementById('yearEnd').value,
    cuisines:Array.from(document.querySelectorAll('#cuisineList input:checked')).map(i=>i.value)
  };
}

function applyDraft(){
  const draft = readDraft();
  if (draft.end < draft.start) draft.end = draft.start;
  state.applied = draft;
  syncControlsFromApplied();
}

function rowsInRange(rows, yearKey='__Year'){
  const {start,end} = state.applied;
  return rows.filter(r=>+r[yearKey]>=start && +r[yearKey]<=end);
}

function selectedRows(){
  const rows = rowsInRange(state.ycWide);
  return {rows, years:rows.map(r=>r.__Year), use:[...state.applied.cuisines]};
}

function sumNamed(row){
  return NAMED_CUISINES.reduce((acc,c)=>acc+(+row[c]||0),0);
}

function linearTrend(years, values){
  const n = Math.min(years.length,values.length);
  if (n<2) return values.slice(0,n);
  const xbar = years.reduce((a,v)=>a+v,0)/n;
  const ybar = values.reduce((a,v)=>a+v,0)/n;
  let numerator=0, denominator=0;
  for(let i=0;i<n;i++){
    const dx=years[i]-xbar;
    numerator+=dx*(values[i]-ybar);
    denominator+=dx*dx;
  }
  const slope=denominator?numerator/denominator:0;
  const intercept=ybar-slope*xbar;
  return years.map(x=>intercept+slope*x);
}

function prepareChart(){
  const chart=document.getElementById('chart');
  chart.className='';
  chart.style.display='block';
  document.getElementById('tableWrap').style.display='none';
}

function showEmpty(message){
  const chart=document.getElementById('chart');
  if (window.Plotly) Plotly.purge(chart);
  chart.className='empty';
  chart.style.display='flex';
  chart.textContent=message;
  document.getElementById('tableWrap').style.display='none';
}

function setCaption(text){ document.getElementById('caption').textContent=text; }

function plot(data,layout){
  prepareChart();
  Plotly.newPlot('chart',data,layout,PLOT_CONFIG);
}

function lineTotal(){
  const rows=rowsInRange(state.totals);
  plot([{x:rows.map(r=>r.__Year),y:rows.map(r=>r.restaurants),mode:'lines+markers',name:'All licensed restaurants',line:{width:3},marker:{size:7}}],baseLayoutTime('Total licensed restaurants'));
  setCaption('All licensed restaurants in each January snapshot, including the residual “Other” category. Cuisine selection does not apply.');
}

function cuisineCounts(){
  const {rows,years,use}=selectedRows();
  if(!use.length){showEmpty('Select at least one cuisine, then apply filters.');setCaption('No cuisine series selected.');return;}
  const data=[];
  use.forEach((c,i)=>{
    const values=rows.map(r=>+r[c]||0);
    const color=COLORWAY[i%COLORWAY.length];
    data.push({x:years,y:values,mode:'lines+markers',name:c,line:{width:3,color},marker:{size:7,color}});
    if(state.trendOn && years.length>=2){
      data.push({x:years,y:linearTrend(years,values),mode:'lines',name:c+' trend',showlegend:false,hoverinfo:'skip',line:{width:2,dash:'dot',color}});
    }
  });
  plot(data,baseLayoutTime('Cuisine counts by January snapshot'));
  setCaption(state.trendOn?'Checked cuisines only; dotted lines are OLS fits over the applied window.':'Checked cuisines only; no unselected cuisine is added automatically.');
}

function netChange(){
  const {rows,use}=selectedRows();
  if(!use.length){showEmpty('Select at least one cuisine, then apply filters.');setCaption('No cuisine series selected.');return;}
  const first=rows[0], last=rows[rows.length-1];
  const items=use.map(c=>({c,v:(+last[c]||0)-(+first[c]||0)})).sort((a,b)=>b.v-a.v);
  plot([{type:'bar',x:items.map(i=>i.c),y:items.map(i=>i.v),text:items.map(i=>String(i.v)),textposition:'outside',cliponaxis:false,marker:{line:{color:'rgba(255,255,255,.45)',width:1}}}],baseLayoutCat(`Net change: January ${first.__Year} → January ${last.__Year}`));
  setCaption('Bars show exactly the checked cuisines; no Top-N or filler categories are added.');
}

function indexedGrowth(){
  const {rows,years,use}=selectedRows();
  if(!use.length){showEmpty('Select at least one cuisine, then apply filters.');setCaption('No cuisine series selected.');return;}
  const base=rows[0];
  const data=use.map(c=>{
    const baseValue=+base[c]||0;
    return {x:years,y:rows.map(r=>baseValue?(+r[c]/baseValue)*100:null),mode:'lines+markers',name:c,line:{width:3},marker:{size:7}};
  });
  const layout=baseLayoutTime(`Indexed growth (January ${years[0]} = 100)`);
  layout.yaxis.title='Index';
  plot(data,layout);
  setCaption('Relative growth for exactly the checked cuisines.');
}

function yoyChange(){
  const {rows,years,use}=selectedRows();
  if(!use.length){showEmpty('Select at least one cuisine, then apply filters.');setCaption('No cuisine series selected.');return;}
  const byYear=new Map(state.ycWide.map(r=>[r.__Year,r]));
  const data=use.map(c=>({
    x:years,
    y:rows.map(r=>{
      const previous=byYear.get(r.__Year-1);
      return previous?(+r[c]||0)-(+previous[c]||0):null;
    }),
    mode:'lines+markers',name:c,line:{width:3},marker:{size:7},connectgaps:false
  }));
  const layout=baseLayoutTime('Year-on-year change by cuisine');
  layout.yaxis.title='Change from previous January';
  layout.yaxis.zeroline=true;
  plot(data,layout);
  setCaption('Each point compares with the previous natural January, including when the applied window starts after 2016.');
}

function namedShares(){
  const {rows,years,use}=selectedRows();
  const namedUse=use.filter(c=>NAMED_CUISINES.includes(c));
  if(!namedUse.length){showEmpty('Select at least one of the eight named cuisines, then apply filters.');setCaption('Other is excluded from manuscript composition shares.');return;}
  const data=namedUse.map(c=>({
    x:years,
    y:rows.map(r=>{const denominator=sumNamed(r);return denominator?(+r[c]||0)/denominator:null;}),
    mode:'lines+markers',name:c,line:{width:3},marker:{size:7}
  }));
  const layout=baseLayoutTime('Citywide shares of the eight named cuisines');
  layout.yaxis.title='Share of named-cuisine total';
  layout.yaxis.tickformat=',.0%';
  plot(data,layout);
  setCaption('Citywide exploratory view. The denominator is always the pooled total of the eight named cuisines; “Other” is excluded. This is not the tier-level Figure 4.');
}

function tierDiversity(){
  const rows=rowsInRange(state.tierDiversity,'Year');
  const data=TIERS.map((tier,i)=>{
    const tierRows=rows.filter(r=>r.Tier===tier);
    return {
      x:tierRows.map(r=>r.Year),
      y:tierRows.map(r=>r.Shannon_H),
      customdata:tierRows.map(r=>[r.Effective_N,r.DCCAs,r.Restaurants]),
      mode:'lines+markers',
      name:tier,
      line:{width:3,color:COLORWAY[i]},
      marker:{size:7,color:COLORWAY[i]},
      hovertemplate:'January %{x}<br>H=%{y:.3f}<br>Effective cuisines exp(H)=%{customdata[0]:.2f}<br>DCCAs=%{customdata[1]}<br>Named-cuisine restaurants=%{customdata[2]:,}<extra>%{fullData.name}</extra>'
    };
  });
  const layout=baseLayoutTime('Tier-level pooled Shannon diversity (named 8)');
  layout.yaxis.title='Shannon diversity (H)';
  layout.yaxis.range=[1.44,1.75];
  plot(data,layout);
  setCaption('Pooled counts within annually reassigned tiers; “Other” excluded. Effective cuisines are exp(H) in hover. Values include the corrected Mainland alias merge; bootstrap sensitivity ribbons are not included here. Cuisine selection does not apply.');
}

function renderTable(){
  const {rows,use}=selectedRows();
  if(!use.length){showEmpty('Select at least one cuisine, then apply filters.');setCaption('No cuisine series selected.');return;}
  const byYear=new Map(state.ycWide.map(r=>[r.__Year,r]));
  const years=rows.map(r=>r.__Year);
  const head=['Cuisine',...years.map(String)];
  let html='<table><thead><tr>'+head.map(h=>`<th>${h}</th>`).join('')+'</tr></thead><tbody>';
  use.forEach(c=>{
    let cells=`<td>${c}</td>`;
    rows.forEach(r=>{
      const value=+r[c]||0;
      const previous=byYear.get(r.__Year-1);
      if(!previous){cells+=`<td>${value.toLocaleString('en-US')}</td>`;return;}
      const prevValue=+previous[c]||0;
      const change=prevValue?(value-prevValue)/prevValue*100:null;
      const pct=change===null?'n/a':`${change>=0?'+':''}${change.toFixed(1)}%`;
      cells+=`<td>${value.toLocaleString('en-US')} (${pct})</td>`;
    });
    html+=`<tr>${cells}</tr>`;
  });
  html+='</tbody></table>';
  if(window.Plotly) Plotly.purge('chart');
  document.getElementById('chart').style.display='none';
  const wrap=document.getElementById('tableWrap');
  wrap.innerHTML=html;
  wrap.style.display='block';
  setCaption('Checked cuisines only. Percentages compare each value with the previous natural January.');
}

function periodReferences(){
  const {start,end}=state.applied;
  const refs=[2019,2022].filter(year=>year>=start&&year<=end);
  return {
    shapes:refs.map(year=>({type:'line',x0:year,x1:year,y0:0,y1:1,xref:'x',yref:'paper',line:{dash:'dot',width:1.5,color:'rgba(255,255,255,.6)'}})),
    annotations:refs.map(year=>({x:year,y:1,xref:'x',yref:'paper',text:`Jan ${year}`,showarrow:false,yshift:10,font:{color:'#b9c7e6',size:11}}))
  };
}

function baseLayoutTime(title){
  const refs=periodReferences();
  return {
    title:{text:title,font:TITLE_FONT},
    colorway:COLORWAY,
    paper_bgcolor:'rgba(0,0,0,0)',
    plot_bgcolor:'rgba(0,0,0,0)',
    legend:{font:TICK_FONT,bgcolor:'#0e1422',bordercolor:'rgba(255,255,255,.25)',borderwidth:1},
    margin:{t:58,r:28,b:56,l:68},
    xaxis:Object.assign({title:'January snapshot',tickmode:'linear',dtick:1,gridcolor:GRID_COLOR,tickfont:TICK_FONT,titlefont:TITLE_FONT},AXIS_LINE),
    yaxis:Object.assign({title:'Count',gridcolor:GRID_COLOR,tickfont:TICK_FONT,titlefont:TITLE_FONT,zerolinecolor:'rgba(255,255,255,.5)'},AXIS_LINE),
    hoverlabel:{bgcolor:'#0e1422',bordercolor:'#7aa7ff',font:{color:'#f6f9ff'}},
    shapes:refs.shapes,
    annotations:refs.annotations
  };
}

function baseLayoutCat(title){
  return {
    title:{text:title,font:TITLE_FONT},
    colorway:COLORWAY,
    paper_bgcolor:'rgba(0,0,0,0)',
    plot_bgcolor:'rgba(0,0,0,0)',
    margin:{t:58,r:28,b:110,l:68},
    xaxis:Object.assign({title:'Cuisine',type:'category',tickangle:-30,gridcolor:GRID_COLOR,tickfont:TICK_FONT,titlefont:TITLE_FONT},AXIS_LINE),
    yaxis:Object.assign({title:'Net change',gridcolor:GRID_COLOR,tickfont:TICK_FONT,titlefont:TITLE_FONT,zeroline:true,zerolinecolor:'rgba(255,255,255,.5)'},AXIS_LINE),
    hoverlabel:{bgcolor:'#0e1422',bordercolor:'#7aa7ff',font:{color:'#f6f9ff'}}
  };
}

function setActive(button){
  document.querySelectorAll('.tabbar .btn').forEach(b=>b.classList.remove('active'));
  button.classList.add('active');
}

function render(){
  if(state.view==='table') renderTable();
  if(state.view==='total') lineTotal();
  if(state.view==='cline') cuisineCounts();
  if(state.view==='net') netChange();
  if(state.view==='indexed') indexedGrowth();
  if(state.view==='yoy') yoyChange();
  if(state.view==='share') namedShares();
  if(state.view==='diversity') tierDiversity();
}

const yearStart=document.getElementById('yearStart');
const yearEnd=document.getElementById('yearEnd');
yearStart.addEventListener('change',()=>{if(+yearEnd.value<+yearStart.value)yearEnd.value=yearStart.value;});
yearEnd.addEventListener('change',()=>{if(+yearEnd.value<+yearStart.value)yearStart.value=yearEnd.value;});

document.getElementById('applyFilter').addEventListener('click',()=>{applyDraft();render();});
document.getElementById('selectNamed').addEventListener('click',()=>{
  document.querySelectorAll('#cuisineList input').forEach(input=>{input.checked=NAMED_CUISINES.includes(input.value);});
});
document.getElementById('selectAll').addEventListener('click',()=>{
  document.querySelectorAll('#cuisineList input').forEach(input=>{input.checked=true;});
});
document.getElementById('clearAll').addEventListener('click',()=>{
  document.querySelectorAll('#cuisineList input').forEach(input=>{input.checked=false;});
});
document.getElementById('resetFilter').addEventListener('click',()=>{
  state.applied={start:2016,end:2025,cuisines:[...NAMED_CUISINES]};
  state.trendOn=false;
  document.getElementById('toggleTrend').checked=false;
  syncControlsFromApplied();
  render();
});
document.getElementById('toggleTrend').addEventListener('change',event=>{
  state.trendOn=!!event.target.checked;
  if(state.view==='cline')render();
});
document.querySelectorAll('.tabbar .btn').forEach(button=>{
  button.addEventListener('click',()=>{setActive(button);state.view=button.dataset.view;render();});
});

loadData();
