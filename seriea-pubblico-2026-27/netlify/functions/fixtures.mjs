const ALLOWED = new Set(['2025', '2026']);
export default async (request) => {
  const url = new URL(request.url);
  const season = url.searchParams.get('season');
  if (!ALLOWED.has(season)) return Response.json({error:'Stagione non valida'}, {status:400});
  try {
    const source = await fetch(`https://fixturedownload.com/feed/json/serie-a-${season}`, {
      headers: {'User-Agent':'SerieACalendarComparison/1.0', 'Accept':'application/json'},
      signal: AbortSignal.timeout(12000)
    });
    if (!source.ok) throw Error('Provider HTTP '+source.status);
    const json = await source.json();
    if (!Array.isArray(json) || json.length<190) throw Error('Calendario non disponibile');
    return Response.json(json, {headers:{
      'Cache-Control':'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin':'*'
    }});
  } catch(e) {
    return Response.json({error:'Fonte temporaneamente non disponibile',detail:String(e.message)}, {status:502});
  }
};
export const config = {path: '/.netlify/functions/fixtures'};
