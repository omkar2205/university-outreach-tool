/* Import reliability upgrade.
 * Loaded after final.js so this function replaces the original importer.
 * Apps Script ContentService responses redirect across origins; bulk import writes
 * therefore use a no-cors text POST and are verified through the normal read API.
 */

function importStatusFinal_(html,type='info'){
  let box=document.getElementById('importStatusFinal');
  if(!box){const button=document.getElementById('runImportFinal');if(!button)return;box=document.createElement('div');box.id='importStatusFinal';box.className='import-status';button.insertAdjacentElement('beforebegin',box)}
  box.className=`import-status ${type}`;box.innerHTML=html;
}

function mapImportUniversityFinal_(r){
  return {
    universityName:pickFinal(r,['university','university name','university_name','institution','institution name']),
    country:pickFinal(r,['country']),region:pickFinal(r,['region']),category:pickFinal(r,['category','type']),
    referenceSource:pickFinal(r,['reference','reference source','source'])||'Normal',
    outreachStage:pickFinal(r,['stage','outreach stage'])||'Not Contacted',website:pickFinal(r,['website','url']),
    avgPgTuition:pickFinal(r,['avg pg tuition fees','average pg tuition','pg tuition','tuition']),
    tuitionCurrency:pickFinal(r,['tuition currency','currency']),
    internationalStudents:pickFinal(r,['international students','international student numbers','international_students']),
    internationalStudentsYear:pickFinal(r,['international students year','data year','year']),
    rankingNotes:pickFinal(r,['ranking','ranking notes','rankings']),generalNotes:pickFinal(r,['notes','user notes','comments'])
  };
}

function canonicalImportFinal_(v){
  let text=String(v||'').trim().toLowerCase();
  try{text=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'')}catch(e){}
  return text.replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}
function domainImportFinal_(v){return String(v||'').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').split('/')[0].split('?')[0].split('#')[0]}

async function submitAppsScriptWriteFinal_(action,data){
  const payload=JSON.stringify({action,...data});
  await fetch(API_URL,{
    method:'POST',
    mode:'no-cors',
    redirect:'follow',
    body:payload
  });
}

async function waitForUniversityCountFinal_(minimumCount,timeoutMs=90000){
  const started=Date.now();let last=state.universities.length;
  while(Date.now()-started<timeoutMs){
    await new Promise(r=>setTimeout(r,1500));
    try{const data=await apiGet('listUniversities',{limit:1000,includeInactive:true});last=(data.items||[]).length;if(last>=minimumCount)return last}catch(e){}
  }
  return last;
}

async function runImportFinal(){
  const raw=Array.isArray(state.importRows)?state.importRows:[];const button=document.getElementById('runImportFinal');
  if(!raw.length){showToast('No import rows found.','error');return}

  const mapped=raw.map(mapImportUniversityFinal_);const valid=mapped.filter(r=>String(r.universityName||'').trim());const missing=raw.length-valid.length;
  const existingNames=new Set(state.universities.map(u=>canonicalImportFinal_(u.university_name)).filter(Boolean));
  const existingDomains=new Set(state.universities.map(u=>String(u.domain||domainImportFinal_(u.website)).trim()).filter(Boolean));
  const newRows=[];let predictedDuplicates=0;
  for(const row of valid){const n=canonicalImportFinal_(row.universityName),d=domainImportFinal_(row.website);if((n&&existingNames.has(n))||(d&&existingDomains.has(d))){predictedDuplicates++;continue}newRows.push(row);if(n)existingNames.add(n);if(d)existingDomains.add(d)}

  if(!valid.length){importStatusFinal_('<strong>Import cannot start.</strong><br>No recognised University / University Name / Institution column was found.','error');return}
  if(!newRows.length){importStatusFinal_(`<strong>Nothing new to import.</strong><br>${predictedDuplicates} rows match universities already in the database.`,'warning');return}
  if(!confirm(`Import ${newRows.length} new university rows?\n\n${predictedDuplicates?`${predictedDuplicates} duplicates will be skipped.\n`:''}${missing?`${missing} rows without a university name will be skipped.\n`:''}`))return;

  const fileName=document.getElementById('importFileFinal')?.files?.[0]?.name||'Browser import';button.disabled=true;button.textContent='Importing…';
  const beforeCount=state.universities.length;let submitted=0;const chunkSize=200;
  try{
    for(let i=0;i<newRows.length;i+=chunkSize){
      const chunk=newRows.slice(i,i+chunkSize);
      importStatusFinal_(`<strong>Importing universities…</strong><br>${submitted} of ${newRows.length} submitted.<div class="import-progress"><i style="width:${Math.round(submitted/newRows.length*100)}%"></i></div><span>Batch ${Math.floor(i/chunkSize)+1} of ${Math.ceil(newRows.length/chunkSize)}.</span>`,'info');
      await submitAppsScriptWriteFinal_('bulkImportUniversities',{rows:chunk,fileName});
      submitted+=chunk.length;
    }

    importStatusFinal_(`<strong>Verifying import…</strong><br>All ${submitted} rows were submitted. Confirming records in Google Sheets…`,'info');
    const confirmedCount=await waitForUniversityCountFinal_(beforeCount+1);const confirmedAdded=Math.max(0,confirmedCount-beforeCount);
    await refreshUniversities();await refreshDashboard();
    const unconfirmed=Math.max(0,newRows.length-confirmedAdded);
    if(confirmedAdded===0){throw new Error('No new records were confirmed in Google Sheets. Make sure FinalModules.gs contains bulkImportUniversities_, Code.gs routes bulkImportUniversities, and the existing web-app deployment was updated to a new version.')}
    importStatusFinal_(`<strong>Import complete.</strong><div class="import-result-grid"><div><b>${confirmedAdded}</b><span>Confirmed new</span></div><div><b>${predictedDuplicates}</b><span>Duplicates skipped</span></div><div><b>${missing+unconfirmed}</b><span>Skipped / unconfirmed</span></div></div>${unconfirmed?'<p>Some submitted rows were not confirmed. Check the Import Log for backend validation results.</p>':''}`,unconfirmed?'warning':'success');
    showToast(`Import confirmed: ${confirmedAdded} new universities added.`);
  }catch(err){console.error(err);importStatusFinal_(`<strong>Import stopped.</strong><br>${esc(err.message||String(err))}<br><br><span>No silent retry is running in the background.</span>`,'error');showToast('Import failed. See the Import page for details.','error')}
  finally{button.disabled=false;button.textContent='Import universities'}
}
