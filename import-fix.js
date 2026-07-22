/* Import reliability upgrade.
 * Loaded after final.js so this function replaces the original importer.
 * Cross-origin writes use a hidden form POST because Apps Script ContentService
 * responses redirect to script.googleusercontent.com and browser fetch() can fail CORS.
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

function canonicalImportFinal_(v){return String(v||'').trim().toLowerCase().normalize?.('NFD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()||String(v||'').trim().toLowerCase()}
function domainImportFinal_(v){return String(v||'').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').split('/')[0].split('?')[0].split('#')[0]}

function submitAppsScriptFormFinal_(action,data){
  return new Promise((resolve,reject)=>{
    const token=`imp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const iframe=document.createElement('iframe');iframe.name=token;iframe.style.display='none';
    const form=document.createElement('form');form.method='POST';form.action=API_URL;form.target=token;form.style.display='none';
    const payload={action,...data};
    Object.entries(payload).forEach(([key,value])=>{const input=document.createElement('input');input.type='hidden';input.name=key;input.value=typeof value==='string'?value:JSON.stringify(value);form.appendChild(input)});
    let submitted=false;let timer;
    iframe.onload=()=>{if(!submitted)return;clearTimeout(timer);setTimeout(()=>{form.remove();iframe.remove();resolve()},200)};
    document.body.appendChild(iframe);document.body.appendChild(form);submitted=true;form.submit();
    timer=setTimeout(()=>{form.remove();iframe.remove();reject(new Error('Apps Script did not finish the import request in time.'))},120000);
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
  if(!newRows.length){importStatusFinal_(`<strong>Nothing new to import.</strong><br>${predictedDuplicates} rows match universities already in the database.`, 'warning');return}
  if(!confirm(`Import ${newRows.length} new university rows?\n\n${predictedDuplicates?`${predictedDuplicates} duplicates will be skipped.\n`:''}${missing?`${missing} rows without a university name will be skipped.\n`:''}`))return;

  const fileName=document.getElementById('importFileFinal')?.files?.[0]?.name||'Browser import';button.disabled=true;button.textContent='Importing…';
  const beforeCount=state.universities.length;let submitted=0;const chunkSize=250;
  try{
    for(let i=0;i<newRows.length;i+=chunkSize){const chunk=newRows.slice(i,i+chunkSize);importStatusFinal_(`<strong>Importing universities…</strong><br>${submitted} of ${newRows.length} submitted.<div class="import-progress"><i style="width:${Math.round(submitted/newRows.length*100)}%"></i></div><span>Batch ${Math.floor(i/chunkSize)+1} of ${Math.ceil(newRows.length/chunkSize)}.</span>`,'info');await submitAppsScriptFormFinal_('bulkImportUniversities',{rows:chunk,fileName});submitted+=chunk.length}

    importStatusFinal_(`<strong>Verifying import…</strong><br>All ${submitted} rows were submitted. Confirming records in Google Sheets…`,'info');
    const confirmedCount=await waitForUniversityCountFinal_(beforeCount+1);const confirmedAdded=Math.max(0,confirmedCount-beforeCount);
    await refreshUniversities();await refreshDashboard();
    const unconfirmed=Math.max(0,newRows.length-confirmedAdded);
    if(confirmedAdded===0){throw new Error('No new records were confirmed in Google Sheets. Check that bulkImportUniversities is added to Code.gs routing, FinalModules.gs is saved, and the existing web-app deployment was updated to a new version.')}
    importStatusFinal_(`<strong>Import complete.</strong><div class="import-result-grid"><div><b>${confirmedAdded}</b><span>Confirmed new</span></div><div><b>${predictedDuplicates}</b><span>Duplicates skipped</span></div><div><b>${missing+unconfirmed}</b><span>Skipped / unconfirmed</span></div></div>${unconfirmed?'<p>Some submitted rows were not confirmed. Check the Import Log for backend validation results.</p>':''}`,unconfirmed?'warning':'success');
    showToast(`Import confirmed: ${confirmedAdded} new universities added.`);
  }catch(err){console.error(err);importStatusFinal_(`<strong>Import stopped.</strong><br>${esc(err.message||String(err))}<br><br><span>No silent retry is running in the background.</span>`,'error');showToast('Import failed. See the Import page for details.','error')}
  finally{button.disabled=false;button.textContent='Import universities'}
}
