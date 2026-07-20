/* FinalModules.gs
 * Paste this into the existing bound Apps Script project alongside Code.gs.
 * Then add the route cases shown in apps-script/DEPLOY_FINAL.md and redeploy the web app.
 * This file reuses helper functions already present in Code.gs: getRawRecords_, insertNewRecord_, generateId_, resolveUserId_, serializeObject_, findRecordById_, APP_CONFIG.
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

function getFinalSystemStatus_(){const ss=getSpreadsheet_();return{schemaVersion:'2.0.0',researchQueue:!!ss.getSheetByName('Research Queue'),contactVerification:!!ss.getSheetByName('Contact Verification'),emailLog:!!ss.getSheetByName('Email Log'),rankings:!!ss.getSheetByName('University Rankings'),documents:!!ss.getSheetByName('Documents'),notifications:!!ss.getSheetByName('Notifications')};}
