/* Import reliability upgrade.
 * Loaded after final.js so this function replaces the original row-by-row importer.
 */

function importStatusFinal_(html, type='info') {
  let box=document.getElementById('importStatusFinal');
  if(!box){
    const button=document.getElementById('runImportFinal');
    if(!button)return;
    box=document.createElement('div');
    box.id='importStatusFinal';
    box.className='import-status';
    button.insertAdjacentElement('beforebegin',box);
  }
  box.className=`import-status ${type}`;
  box.innerHTML=html;
}

function mapImportUniversityFinal_(r){
  return {
    universityName:pickFinal(r,['university','university name','university_name','institution','institution name']),
    country:pickFinal(r,['country']),
    region:pickFinal(r,['region']),
    category:pickFinal(r,['category','type']),
    referenceSource:pickFinal(r,['reference','reference source','source'])||'Normal',
    outreachStage:pickFinal(r,['stage','outreach stage'])||'Not Contacted',
    website:pickFinal(r,['website','url']),
    avgPgTuition:pickFinal(r,['avg pg tuition fees','average pg tuition','pg tuition','tuition']),
    tuitionCurrency:pickFinal(r,['tuition currency','currency']),
    internationalStudents:pickFinal(r,['international students','international student numbers','international_students']),
    internationalStudentsYear:pickFinal(r,['international students year','data year','year']),
    rankingNotes:pickFinal(r,['ranking','ranking notes','rankings']),
    generalNotes:pickFinal(r,['notes','user notes','comments'])
  };
}

async function runImportFinal(){
  const raw=Array.isArray(state.importRows)?state.importRows:[];
  const button=document.getElementById('runImportFinal');
  if(!raw.length){showToast('No import rows found.','error');return;}

  const mapped=raw.map(mapImportUniversityFinal_);
  const valid=mapped.filter(r=>String(r.universityName||'').trim());
  const missing=raw.length-valid.length;
  const fileName=document.getElementById('importFileFinal')?.files?.[0]?.name||'Browser import';

  if(!valid.length){
    importStatusFinal_(`<strong>Import cannot start.</strong><br>No recognised University / University Name / Institution column was found.`, 'error');
    return;
  }

  if(!confirm(`Import ${valid.length} university rows?\n\n${missing?`${missing} rows without a university name will be skipped.\n\n`:''}Duplicates will be skipped automatically.`))return;

  button.disabled=true;
  button.textContent='Importing…';
  let created=0,duplicates=0,errors=missing,processed=0;
  const chunkSize=500;

  try{
    importStatusFinal_(`<strong>Starting import…</strong><br>0 of ${valid.length} rows processed. Do not close this page.`, 'info');

    for(let i=0;i<valid.length;i+=chunkSize){
      const chunk=valid.slice(i,i+chunkSize);
      importStatusFinal_(`<strong>Importing universities…</strong><br>${processed} of ${valid.length} processed.<div class="import-progress"><i style="width:${Math.round(processed/valid.length*100)}%"></i></div><span>Sending batch ${Math.floor(i/chunkSize)+1} of ${Math.ceil(valid.length/chunkSize)}.</span>`, 'info');

      let result;
      try{
        result=await apiPost('bulkImportUniversities',{rows:chunk,fileName});
      }catch(err){
        const message=String(err.message||err);
        if(/Unknown API action|bulkImportUniversities/i.test(message)){
          throw new Error('The new bulk-import backend has not been deployed yet. Update FinalModules.gs, add the bulkImportUniversities route in Code.gs, then redeploy the Apps Script web app.');
        }
        throw err;
      }

      created+=Number(result.created)||0;
      duplicates+=Number(result.duplicates)||0;
      errors+=Number(result.errors)||0;
      processed+=chunk.length;
    }

    importStatusFinal_(`<strong>Import complete.</strong><div class="import-result-grid"><div><b>${created}</b><span>New</span></div><div><b>${duplicates}</b><span>Duplicates</span></div><div><b>${errors}</b><span>Errors / skipped</span></div></div>`, errors?'warning':'success');
    await refreshUniversities();
    await refreshDashboard();
    showToast(`Import complete: ${created} new, ${duplicates} duplicates, ${errors} skipped/errors.`);
  }catch(err){
    console.error(err);
    importStatusFinal_(`<strong>Import stopped.</strong><br>${esc(err.message||String(err))}<br><br><span>No silent retry is running in the background.</span>`, 'error');
    showToast('Import failed. See the Import page for details.','error');
  }finally{
    button.disabled=false;
    button.textContent='Import universities';
  }
}
