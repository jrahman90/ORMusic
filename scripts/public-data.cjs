const base = 'https://firestore.googleapis.com/v1/projects/or-music-events/databases/(default)/documents/artists';
async function request(url) {
  const response = await fetch(url,{signal:AbortSignal.timeout(10000)});
  if (response.status===404) return null;
  if (!response.ok) throw new Error(`Public artist lookup returned ${response.status}`);
  return response.json();
}
async function listArtists() {
  const documents=[]; let token;
  do {
    const url = new URL(base);url.searchParams.set('pageSize','300');if(token) url.searchParams.set('pageToken',token);
    const page = await request(url);documents.push(...(page?.documents || []));token=page?.nextPageToken;
  } while(token);
  return documents;
}
module.exports={listArtists,getArtist:id=>request(`${base}/${encodeURIComponent(id)}`)};
