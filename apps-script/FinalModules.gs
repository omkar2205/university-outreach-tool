/* FinalModules.gs
 * Paste this into the existing bound Apps Script project alongside Code.gs.
 * Then add the route cases shown in apps-script/DEPLOY_FINAL.md and redeploy the web app.
 * This file reuses helper functions already present in Code.gs.
 */

function listResearch_(params){return listGenericFinal_('Research Queue',params,'requested_at');}
function listVerification_(params){return listGenericFinal_('Contact Verification',params,'checked_at');}
function listEmails_(params){return listGenericFinal_('Email Log',params,'message_datetime');}
function listNotifications_(params){return listGenericFinal_('Notifications',params,'created_at');}
function listRankings_(params){return listGenericFinal_('University Rankings',params,'verified_at');}
function listDocuments_(params){return listGenericFinal_('Documents',params,'uploaded_at');}

function listGenericFinal_(sheetName,params,dateField){params=params||{};let rows=getRawRecords_(sheetName);if(params.universityId||params.university_id){const id=String(params.universityId||params.university_id);rows=rows.filter(r=>String(r.data.university_id||'')===id);}rows.sort((a,b)=>dateValue_(b.data[dateField])-dateValue_(a.data[dateField]));return{total:rows.length,items:rows.slice(0,Number(params.limit)||500).map(r=>serializeObject_(r.data))};}

function createResearchRequest_(params){if(!params.requestedName&&!params.requested_name&&!params.universityId)throw new Error('University name or ID is required.');const now=new Date();const row={research_id:generateId_('RES'),university_id:params.universityId||params.university_id||'',requested_name:params.requestedName||params.requested_name||'',research_type:params.researchType||params.research_type||'Full Profile',status:'Pending',requested_by_user_id:resolveUserId_(params.userId||params.user_id),requested_at:now,completed_at:'',source_urls:'',summary:'',suggested_updates_json:'',confidence:'',review_notes:'',approved_at:''};insertNewRecord_('Research Queue',row);return{created:true,research:serializeObject_(row)};}
function createVerificationRecord_(params){const now=new Date();const row={verification_id:generateId_('VER'),university_id:params.universityId||'',contact_id:params.contactId||'',position_checked:params.positionChecked||'',existing_contact_name:params.existingContactName||'',found_contact_name:params.foundContactName||'',found_email:params.foundEmail||'',source_url:params.sourceUrl||'',checked_at:now,status:params.status||'Pending Review',change_type:params.changeType||'',reviewed_by_user_id:'',reviewed_at:'',notes:params.notes||''};insertNewRecord_('Contact Verification',row);return{created:true,verification:serializeObject_(row)};}
function addRanking_(params){if(!params.universityId)throw new Error('University ID is required.');const row={ranking_id:generateId_('RNK'),university_id:params.universityId,ranking_system:params.rankingSystem||'',ranking_scope:params.rankingScope||'',rank_value:params.rankValue||'',rank_year:params.rankYear||'',source_url:params.sourceUrl||'',verified_at:new Date(),notes:params.notes||'',is_current:true};insertNewRecord_('University Rankings',row);return{created:true,ranking:serializeObject_(row)};}
function logEmail_(params){if(!params.universityId)throw new Error('University ID is required.');const now=new Date();const row={email_id:generateId_('EML'),university_id:params.universityId,contact_id:params.contactId||'',direction:params.direction||'Outgoing',message_datetime:params.messageDatetime?parseDateTime_(params.messageDatetime):now,from_address:params.fromAddress||'',to_addresses:params.toAddresses||'',cc_addresses:params.ccAddresses||'',subject:params.subject||'',body_summary:params.bodySummary||'',thread_reference:params.threadReference||'',external_message_id:params.externalMessageId||'',logged_by_user_id:resolveUserId_(params.userId),created_at:now,status:params.status||'Logged'};insertNewRecord_('Email Log',row);return{created:true,email:serializeObject_(row)};}

/**
 * Efficient bulk university import.
 * Expects params.rows to be an array (or JSON string) of already-mapped university objects.
 * Reads the existing database once, deduplicates by canonical name/domain, and writes new rows in one batch.
 */
function bulkImportUniversities_(params){
  let rows=params.rows||[];
  if(typeof rows==='string')rows=JSON.parse(rows);
  if(!Array.isArray(rows)||!rows.length)throw new Error('No import rows supplied.');
  if(rows.length>5000)throw new Error('A maximum of 5,000 rows can be imported at once.');

  const lock=LockService.getScriptLock();
  if(!lock.tryLock(30000))throw new Error('Another database update is running. Try again shortly.');
  try{
    const sheet=getSheet_(APP_CONFIG.SHEETS.UNIVERSITIES);
    const headers=getHeaders_(sheet);
    const existing=getRawRecords_(APP_CONFIG.SHEETS.UNIVERSITIES).map(r=>r.data);
    const names=new Set();
    const domains=new Set();
    existing.forEach(d=>{
      const n=canonicalUniversityName_(d.university_name||d.canonical_name||'');
      const dm=String(d.domain||extractDomain_(d.website||'')||'').toLowerCase().trim();
      if(n)names.add(n);if(dm)domains.add(dm);
    });

    const now=new Date();
    const userId=resolveUserId_(params.userId||params.user_id);
    const toWrite=[];
    const createdIds=[];
    let duplicates=0,errors=0;

    rows.forEach(raw=>{
      try{
        const input=normalizeUniversityInput_(raw||{});
        const name=String(input.university_name||'').trim();
        if(!name){errors++;return;}
        const canonical=canonicalUniversityName_(name);
        const domain=String(input.domain||extractDomain_(input.website||'')||'').toLowerCase().trim();
        if((canonical&&names.has(canonical))||(domain&&domains.has(domain))){duplicates++;return;}

        const record=Object.assign({},input,{
          university_id:generateId_('UNI'),
          university_name:name,
          canonical_name:canonical,
          domain:domain,
          outreach_stage:input.outreach_stage||'Not Contacted',
          outreach_status:input.outreach_status||'Not Contacted',
          assigned_user_id:input.assigned_user_id||userId,
          created_at:now,
          updated_at:now,
          is_active:true
        });
        toWrite.push(headers.map(h=>normalizeForSheet_(record[h])));
        createdIds.push(record.university_id);
        if(canonical)names.add(canonical);if(domain)domains.add(domain);
      }catch(e){errors++;}
    });

    if(toWrite.length){
      const startRow=findFirstBlankIdRow_(sheet);
      sheet.getRange(startRow,1,toWrite.length,headers.length).setValues(toWrite);
    }

    const importId=generateId_('IMP');
    try{
      insertNewRecord_(APP_CONFIG.SHEETS.IMPORT_LOG,{
        import_id:importId,
        file_name:params.fileName||params.file_name||'Browser import',
        file_url:'',
        imported_by_user_id:userId,
        imported_at:now,
        total_rows:rows.length,
        new_rows:toWrite.length,
        duplicate_rows:duplicates,
        error_rows:errors,
        status:errors?'Imported with errors':'Imported',
        notes:'Bulk browser import'
      });
      logAudit_({entity_type:'Import',entity_id:importId,action:'BULK_IMPORT',field_name:'summary',old_value:'',new_value:JSON.stringify({total:rows.length,created:toWrite.length,duplicates:duplicates,errors:errors}),user_id:userId});
    }catch(e){console.warn('Import logging failed: '+e.message);}

    return{total:rows.length,created:toWrite.length,duplicates:duplicates,errors:errors,importId:importId,createdIds:createdIds.slice(0,100)};
  }finally{lock.releaseLock();}
}

function getFinalSystemStatus_(){const ss=getSpreadsheet_();return{schemaVersion:'2.0.0',researchQueue:!!ss.getSheetByName('Research Queue'),contactVerification:!!ss.getSheetByName('Contact Verification'),emailLog:!!ss.getSheetByName('Email Log'),rankings:!!ss.getSheetByName('University Rankings'),documents:!!ss.getSheetByName('Documents'),notifications:!!ss.getSheetByName('Notifications'),bulkImport:true};}