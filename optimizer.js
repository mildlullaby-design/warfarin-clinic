
/* Warfarin arithmetic/regimen optimizer. No clinical decision rules. */
(function(root){
'use strict';
const EPS=1e-8;
const near=(a,b)=>Math.abs(a-b)<EPS;
const round=(v,n=5)=>Number(v.toFixed(n));
function weeklyDose(days){return round(days.reduce((total,day)=>total+Object.entries(day).reduce((sum,[mg,quantity])=>sum+(Number.isFinite(Number(mg))?Number(mg)*Number(quantity):0),0),0))}
function percentChange(current,total){return (total-current)/current*100}
function buildDailyOptions(strengths,maxTabs=3){
  const ss=[...new Set(strengths)].filter(x=>Number.isFinite(x)&&x>0).sort((a,b)=>a-b);
  const doses=new Map();
  const counts=Array(ss.length).fill(0);
  function visit(i,units){
    if(i===ss.length){
      if(counts.filter(x=>x>0).length>2) return;
      const dose=round(counts.reduce((s,c,j)=>s+c*ss[j]/2,0));
      const opts=doses.get(dose)||[];
      opts.push({parts:ss.map((mg,j)=>({mg,halfUnits:counts[j]})).filter(p=>p.halfUnits>0),tabs:units/2, split:counts.some(c=>c%2!==0)});
      doses.set(dose,opts);return;
    }
    for(let n=0;n<=maxTabs*2-units;n++){counts[i]=n;visit(i+1,units+n)}
    counts[i]=0;
  }
  visit(0,0);
  return doses;
}
function chooseRepresentations(oa,ob,na,nb){
  let best=null;
  for(const a of oa) for(const b of (nb===0? [a]:ob)){
    const tabs=na*a.tabs+nb*b.tabs;
    const distinct=new Set([...a.parts,...b.parts].map(p=>p.mg)).size;
    const halfDays=na*Number(a.split)+nb*Number(b.split);
    const maxStrengthsPerDay=Math.max(na>0?a.parts.length:0,nb>0?b.parts.length:0);
    const mixedStrengthDays=na*Number(a.parts.length>1)+nb*Number(b.parts.length>1);
    const instructionLineCount=new Set([...a.parts,...b.parts].map(p=>`${p.mg}:${p.halfUnits}`)).size;
    // For a fixed dose pair, prefer fewer distinct medication instructions before other tablet complexity.
    const key=[instructionLineCount,maxStrengthsPerDay,mixedStrengthDays,halfDays,distinct,tabs,JSON.stringify(a.parts),JSON.stringify(b.parts)];
    if(!best||cmp(key,best.key)<0) best={a,b,tabs,distinct,halfDays,maxStrengthsPerDay,mixedStrengthDays,instructionLineCount,key};
  }
  return best;
}
function cmp(a,b){for(let i=0;i<Math.max(a.length,b.length);i++){if(a[i]<b[i])return -1;if(a[i]>b[i])return 1}return 0}
function generateAll(strengths){
  const opts=buildDailyOptions(strengths);
  const ds=[...opts.keys()].sort((a,b)=>a-b);
  const results=[];
  for(let i=0;i<ds.length;i++) for(let j=i;j<ds.length;j++){
    const a=ds[i],b=ds[j];
    const choices=near(a,b)?[0]:[1,2,3,4,5,6];
    for(const nb of choices){
      const na=7-nb, total=round(a*na+b*nb);
      const repr=chooseRepresentations(opts.get(a),opts.get(b),na,nb);
      // If two doses appear, the minority block belongs at the end of the week.
      // Equal 3/4 is impossible with 7 days.
      const doses=na>=nb?[...Array(na).fill(a),...Array(nb).fill(b)]:[...Array(nb).fill(b),...Array(na).fill(a)];
      const rows=doses.map(x=>x===a?repr.a.parts:repr.b.parts);
      results.push({total, gap:round(b-a),distinct:near(a,b)?1:2,doses,rows,tabs:repr.tabs,strengthCount:repr.distinct,halfDays:repr.halfDays,maxStrengthsPerDay:repr.maxStrengthsPerDay,mixedStrengthDays:repr.mixedStrengthDays,instructionLineCount:repr.instructionLineCount});
    }
  }
  return results;
}
function rank(r,target){return [round(Math.abs(r.total-target)),r.doses.filter(x=>x===0).length,r.distinct,r.instructionLineCount,r.maxStrengthsPerDay,r.mixedStrengthDays,r.gap,r.halfDays,r.strengthCount,r.tabs]}
function sortedUnique(list,target){
  const byPattern=new Map();
  for(const r of list){
    const key=r.doses.join(','); // one best tablet representation per dose pair; unique day pattern
    const prev=byPattern.get(key);
    if(!prev||cmp(rank(r,target),rank(prev,target))<0)byPattern.set(key,r);
  }
  return [...byPattern.values()].sort((a,b)=>cmp(rank(a,target),rank(b,target)));
}
function customSearch(all,target,windowPct=5){
  if(!Number.isFinite(target)||target<0)return {exact:[],alternatives:[]};
  const exact=all.filter(x=>near(x.total,target));
  const alternatives=target>0?all.filter(x=>!near(x.total,target)&&Math.abs(x.total-target)/target*100<=windowPct+EPS):[];
  return {exact:sortedUnique(exact,target),alternatives:sortedUnique(alternatives,target)};
}
const BANDS={'5':[4,10],'10':[9,20],'20':[19,30],'-5':[-10,-4],'-10':[-20,-9],'-20':[-30,-19]};
function quickSearch(all,current,button){
  const [lo,hi]=BANDS[String(button)]||[];
  if(!Number.isFinite(current)||current<=0||lo===undefined)return [];
  const target=current*(1+button/100);
  const eligible=all.filter(r=>{
    const pct=(r.total-current)/current*100;
    return pct>=lo-EPS && pct<=hi+EPS && (r.total-current)*button>EPS;
  });
  return sortedUnique(eligible,target);
}
function validateManual(days,allowed){
  const ss=new Set(allowed);if(days.length!==7)return 'กรุณากรอกครบ 7 วัน';
  const doses=[];
  for(const day of days){
    let mg=0, tabs=0,types=0;
    for(const [s,q] of Object.entries(day)){
      const strength=Number(s),count=Number(q);
      if(!ss.has(strength)&&count>0)return 'พบขนาดเม็ดที่ไม่ได้อนุญาต';
      if(!Number.isFinite(count)||count<0||!near(count*2,Math.round(count*2)))return 'ใช้ได้เฉพาะเต็มเม็ดและครึ่งเม็ด';
      if(count>0){mg+=strength*count;tabs+=count;types++}
    }
    if(tabs>3+EPS)return 'เกิน 3 เม็ดต่อวัน';
    if(types>2)return 'เกิน 2 ขนาดเม็ดต่อวัน';
    doses.push(round(mg));
  }
  if(new Set(doses).size>2)return 'เกิน 2 ขนาดยารายวันต่อสัปดาห์';
  return null;
}
function note(current,total,changed=false){
  const fmt=x=>round(x,3).toString();
  const pct=percentChange(current,total).toFixed(1);
  if(near(total,current))return changed?`ปรับรูปแบบการกิน Warfarin โดยคงขนาดยา ${fmt(current)} mg/wk (0.0%)`:`คง Warfarin ${fmt(current)} mg/wk (0.0%)`;
  return `${total>current?'เพิ่ม':'ลด'} Warfarin ${fmt(current)} → ${fmt(total)} mg/wk (${total>current?'+':''}${pct}%)`;
}
const api={weeklyDose,percentChange,buildDailyOptions,generateAll,rank,sortedUnique,customSearch,quickSearch,validateManual,note,BANDS,near,round};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.WarfarinEngine=api;
})(typeof window!=='undefined'?window:globalThis);


