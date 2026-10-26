// Separate external source for real final match results: football-data.co.uk
// Result fields FTHG/FTAG and FTR indicate played matches.
const ALIASES={internazionale:'Inter',inter:'Inter',milan:'Milan',acmilan:'Milan',roma:'Roma',napoli:'Napoli',juventus:'Juventus',atalanta:'Atalanta',bologna:'Bologna',como:'Como',lazio:'Lazio',fiorentina:'Fiorentina',torino:'Torino',udinese:'Udinese',sassuolo:'Sassuolo',genoa:'Genoa',parma:'Parma',cagliari:'Cagliari',lecce:'Lecce',monza:'Monza',frosinone:'Frosinone',venezia:'Venezia'};
function normalized(s){const key=String(s).toLowerCase().replace(/[^a-z]/g,'');return ALIASES[key]||s.trim()}
function parseCSV(text){const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);return lines.map(line=>{let out=[],v='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){v+='"';i++}else q=!q}else if(c===','&&!q){out.push(v);v=''}else v+=c}out.push(v);return out})}
async function readFeed(url,kind){
 const res=await fetch(url,{headers:{'Accept':'text/csv,text/plain,*/*','User-Agent':'Mozilla/5.0 (compatible; SerieAStats/1.0)'},signal:AbortSignal.timeout(13000),cache:'no-store'});
 if(!res.ok)throw Error(kind+' HTTP '+res.status);
 const data=parseCSV(await res.text());const header=data.shift().map(x=>x.trim());const col=n=>header.indexOf(n);
 const expected=kind==='Football-Data'?['HomeTeam','AwayTeam','FTHG','FTAG','FTR']:['home','away','ft_home','ft_away','ft_result'];
 for(const c of expected)if(col(c)<0)throw Error(kind+' manca '+c);
 const scores={};
 for(const line of data){
  const home=normalized(line[col(expected[0])]||''),away=normalized(line[col(expected[1])]||'');
  const a=(line[col(expected[2])]||'').trim(),b=(line[col(expected[3])]||'').trim(),state=(line[col(expected[4])]||'').trim();
  if(!home||!away||!['H','D','A'].includes(state)||!/^\d+$/.test(a)||!/^\d+$/.test(b))continue;
  scores[home+'|'+away]=a+' - '+b;
 }
 return scores;
}
export default async(request)=>{
 try{
  if(new URL(request.url).searchParams.get('season')!=='2026')return Response.json({error:'Stagione non valida'},{status:400});
  const feeds=[
    ['Football-Data','https://www.football-data.co.uk/mmz4281/2627/I1.csv'],
    ['open-matchday','https://raw.githubusercontent.com/oladeeayo/open-matchday/master/data/ITA_1_serie-a/results_2627.csv']
  ];
  const settled=await Promise.allSettled(feeds.map(([kind,url])=>readFeed(url,kind)));
  const merged={};const sources=[];
  // If both sources disagree, prefer the source that has more completed results.
  const valid=settled.map((v,i)=>v.status==='fulfilled'?{name:feeds[i][0],scores:v.value,count:Object.keys(v.value).length}:null).filter(x=>x&&x.count).sort((a,b)=>a.count-b.count);
  for(const feed of valid){Object.assign(merged,feed.scores);sources.push(feed.name+' ('+feed.count+')')}
  if(!Object.keys(merged).length)throw Error(settled.map(v=>v.status==='rejected'?String(v.reason):'nessun risultato').join(' / '));
  return Response.json({scores:merged,source:sources.join(' + '),updated:new Date().toISOString(),count:Object.keys(merged).length},{headers:{'Cache-Control':'public,max-age=60,s-maxage=300,stale-while-revalidate=120'}});
 }catch(e){return Response.json({error:String(e.message)},{status:502,headers:{'Cache-Control':'no-store'}})}
};
export const config={path:'/.netlify/functions/results'};
