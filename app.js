const API_URL='https://script.google.com/macros/s/AKfycbyQ_ur2ukbglojeWMwgAJ_m8gu0AHr4FGEl3ez0ODf-0IAQkdXjPBVjc60CuuTPHujR/exec';

const state={
  view:'dashboard',
  connected:false,
  health:null,
  dashboard:null,
  universities:[],
  contacts:[],
  followUps:[],
  activities:[],
  lookups:{},
  selectedUniversity:null,
  loading:false
};

const container=document.getElementById('viewContainer');
const nav=[...document.querySelectorAll('nav button[data-view]')];
const modal=document.getElementById('modalBackdrop');
const form=document.getElementById('universityForm');
const connectionStatus=document.getElementById('connectionStatus');
const formMessage=document.getElementById('formMessage');
const saveUniversityBtn=document.getElementById('saveUniversityBtn');
const toast=document.getElementById('toast');

function esc(value){return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function fmtDate(value){if(!value)return '—';const d=new Date(value);if(Number.isNaN(d.getTime()))return esc(value);return new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(d)}
function fmtDateTime(value){if(!value)return '—';const d=new Date(value);if(Number.isNaN(d.getTime()))return esc(value);return new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d)}
function number(value){return new Intl.NumberFormat('en-GB').format(Number(value)||0)}
function pill(value){return `<span class="pill">${esc(value||'—')}</span>`}
function emptyState(title,text){return `<div class="panel empty"><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`}
function loadingState(text='Loading live data…'){return `<div class="panel empty"><div class="spinner"></div><h3>${esc(text)}</h3></div>`}
function layout(title,subtitle,body,actions=''){container.innerHTML=`<div class="view"><div class="title-row"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>${actions}</div>${body}</div>`}
function showToast(message,type='success'){toast.textContent=message;toast.className=`toast ${type}`;clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.add('hidden'),3500)}
function setConnection(ok,text){state.connected=ok;connectionStatus.textContent=text;connectionStatus.className=`connection-status ${ok?'online':'offline'}`}

async function apiGet(action,params={}){
  const url=new URL(API_URL);
  url.searchParams.set('action',action);
  Object.entries(params).forEach(([k,v])=>{if(v!==''&&v!==null&&v!==undefined)url.searchParams.set(k,v)});
  const response=await fetch(url.toString(),{method:'GET',redirect:'follow'});
  if(!response.ok)throw new Error(`Backend returned HTTP ${response.status}`);
  const result=await response.json();
  if(!result.success)throw new Error(result.error||'Backend request failed');
  return result.data;
}

async function apiPost(action,data={}){
  const response=await fetch(API_URL,{
    method:'POST',
    headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify({action,...data}),
    redirect:'follow'
  });
  if(!response.ok)throw new Error(`Backend returned HTTP ${response.status}`);
  const result=await response.json();
  if(!result.success)throw new Error(result.error||'Backend request failed');
  return result.data;
}

async function bootstrap(){
  layout('University Outreach','Connecting to the central database.',loadingState('Connecting to Google Sheets backend…'));
  try{
    state.health=await apiGet('health');
    setConnection(state.health.status==='ok','Live');
    const results=await Promise.allSettled([
      apiGet('getLookups'),
      apiGet('getDashboard'),
      apiGet('listUniversities',{limit:1000})
    ]);
    if(results[0].status==='fulfilled')state.lookups=results[0].value||{};
    if(results[1].status==='fulfilled')state.dashboard=results[1].value;
    if(results[2].status==='fulfilled')state.universities=results[2].value.items||[];
    populateModalLookups();
    show('dashboard');
  }catch(error){
    console.error(error);
    setConnection(false,'Offline');
    layout('Backend connection failed','The front end could not reach the deployed Apps Script web app.',`<div class="panel error-panel"><h3>Could not connect</h3><p>${esc(error.message)}</p><button class="primary" id="retryConnection">Retry connection</button></div>`);
    document.getElementById('retryConnection')?.addEventListener('click',bootstrap);
  }
}

function populateSelect(id,values,placeholder,current){
  const el=document.getElementById(id);if(!el)return;
  const items=[...new Set((values||[]).filter(Boolean))];
  el.innerHTML=`<option value="">${esc(placeholder)}</option>`+items.map(v=>`<option value="${esc(v)}" ${v===current?'selected':''}>${esc(v)}</option>`).join('');
}
function populateModalLookups(){
  populateSelect('categorySelect',state.lookups['Category'],'Select category','');
  const ref=document.getElementById('referenceSelect');
  if(ref){const values=state.lookups['Reference Source']||['NAFSA','EAIE','AIRC','Normal'];ref.innerHTML=values.map(v=>`<option value="${esc(v)}" ${v==='Normal'?'selected':''}>${esc(v)}</option>`).join('')}
  const stage=document.getElementById('stageSelect');
  if(stage){const values=state.lookups['Outreach Stage']||['Not Contacted','Introduction','Discovery','Partnership','Not Interested'];stage.innerHTML=values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}
}

function dashboard(){
  if(!state.dashboard){layout('Dashboard','Live overview of university outreach.',loadingState());refreshDashboard();return}
  const d=state.dashboard;const totals=d.totals||{};const pipeline=d.pipeline||{};
  const max=Math.max(1,...Object.values(pipeline).map(Number));
  const pipelineHtml=Object.entries(pipeline).map(([name,count])=>`<div class="pipeline-row"><span>${esc(name)}</span><div class="bar"><i style="width:${Math.max(3,(Number(count)||0)/max*100)}%"></i></div><strong>${number(count)}</strong></div>`).join('');
  const recent=(d.recentActivities||[]).length?(d.recentActivities||[]).map(a=>`<div class="activity-item"><strong>${esc(a.university_name||'University')}</strong><span>${esc(a.activity_type||'Activity')} · ${fmtDateTime(a.activity_datetime||a.created_at)}</span>${a.summary?`<p>${esc(a.summary)}</p>`:''}</div>`).join(''):`<div class="muted-block">No outreach activity has been logged yet.</div>`;
  layout('Good afternoon, Omkar','Here’s what is happening across university outreach today.',`
    <div class="cards">
      <div class="card clickable" data-jump="universities"><span class="label">TOTAL UNIVERSITIES</span><strong>${number(totals.universities)}</strong><small>Active database records</small></div>
      <div class="card clickable" data-jump="contacts"><span class="label">ACTIVE CONTACTS</span><strong>${number(totals.contacts)}</strong><small>Current active contacts</small></div>
      <div class="card clickable" data-jump="followups"><span class="label">FOLLOW-UPS DUE</span><strong>${number(totals.followUpsDue)}</strong><small>${number(totals.dueToday)} due today · ${number(totals.overdue)} overdue</small></div>
      <div class="card clickable" data-jump="universities"><span class="label">NOT CONTACTED</span><strong>${number(totals.notContacted)}</strong><small>Universities awaiting introduction</small></div>
    </div>
    <div class="grid2"><div class="panel"><h3>Outreach pipeline</h3>${pipelineHtml||'<div class="muted-block">No pipeline data yet.</div>'}</div><div class="panel"><div class="panel-title"><h3>Recent activity</h3><button class="text-button" data-jump="activity">View all</button></div>${recent}</div></div>`);
  container.querySelectorAll('[data-jump]').forEach(el=>el.addEventListener('click',()=>show(el.dataset.jump)));
}

async function refreshDashboard(){try{state.dashboard=await apiGet('getDashboard');if(state.view==='dashboard')dashboard()}catch(e){showToast(e.message,'error')}}

function universityRows(items){
  if(!items.length)return `<tr><td colspan="8" class="table-empty">No universities found.</td></tr>`;
  return items.map(x=>`<tr class="click-row" data-university-id="${esc(x.university_id)}"><td><strong>${esc(x.university_name)}</strong>${x.website?`<small>${esc(x.domain||x.website)}</small>`:''}</td><td>${esc(x.country||'—')}</td><td>${esc(x.region||'—')}</td><td>${esc(x.category||'—')}</td><td>${esc(x.reference_source||'—')}</td><td>${pill(x.outreach_stage||'Not Contacted')}</td><td>${fmtDate(x.last_contact_date)}</td><td>${fmtDate(x.next_follow_up_date)}</td></tr>`).join('')
}

function universities(){
  const countries=[...new Set(state.universities.map(x=>x.country).filter(Boolean))].sort();
  const stages=state.lookups['Outreach Stage']||[...new Set(state.universities.map(x=>x.outreach_stage).filter(Boolean))];
  layout('Universities','Search, filter and manage the central university database.',`
    <div class="toolbar">
      <input id="uniSearch" placeholder="Search university, country, reference…">
      <select id="countryFilter"><option value="">All countries</option>${countries.map(v=>`<option>${esc(v)}</option>`).join('')}</select>
      <select id="stageFilter"><option value="">All stages</option>${stages.map(v=>`<option>${esc(v)}</option>`).join('')}</select>
      <button class="secondary" id="refreshUniversities">Refresh</button>
    </div>
    <div class="results-meta"><span id="universityCount">${number(state.universities.length)} universities</span><span>Click a university to open its full profile.</span></div>
    <div class="table-wrap"><table><thead><tr><th>University</th><th>Country</th><th>Region</th><th>Category</th><th>Reference</th><th>Stage</th><th>Last contact</th><th>Next follow-up</th></tr></thead><tbody id="uniRows">${universityRows(state.universities)}</tbody></table></div>`);
  const search=document.getElementById('uniSearch'),country=document.getElementById('countryFilter'),stage=document.getElementById('stageFilter');
  const filter=()=>{const q=search.value.trim().toLowerCase();const items=state.universities.filter(x=>(!q||[x.university_name,x.country,x.region,x.reference_source,x.domain].join(' ').toLowerCase().includes(q))&&(!country.value||x.country===country.value)&&(!stage.value||x.outreach_stage===stage.value));document.getElementById('uniRows').innerHTML=universityRows(items);document.getElementById('universityCount').textContent=`${number(items.length)} universities`;bindUniversityRows()};
  search.addEventListener('input',filter);country.addEventListener('change',filter);stage.addEventListener('change',filter);
  document.getElementById('refreshUniversities').addEventListener('click',refreshUniversities);
  bindUniversityRows();
}

function bindUniversityRows(){container.querySelectorAll('[data-university-id]').forEach(row=>row.addEventListener('click',()=>openUniversity(row.dataset.universityId)))}

async function refreshUniversities(){
  try{showToast('Refreshing universities…','info');const data=await apiGet('listUniversities',{limit:1000});state.universities=data.items||[];if(state.view==='universities')universities();showToast('University database refreshed.')}catch(e){showToast(e.message,'error')}
}

async function openUniversity(id){
  state.selectedUniversity=id;
  layout('University profile','Loading university record.',loadingState('Loading university profile…'));
  try{
    const data=await apiGet('getUniversity',{id});
    const u=data.university||{};
    const contacts=data.contacts||[],activities=data.activities||[],followups=data.followUps||[];
    const contactHtml=contacts.length?contacts.map(c=>`<div class="record-card"><div><strong>${esc(c.contact_name)}</strong><span>${esc(c.position||c.contact_level||'Contact')}</span></div><div>${c.email?`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`:''}${pill(c.contact_status||'Active')}</div></div>`).join(''):`<div class="muted-block">No contacts added yet.</div>`;
    const activityHtml=activities.length?activities.slice(0,20).map(a=>`<div class="timeline-item"><div class="timeline-dot"></div><div><strong>${esc(a.activity_type)}</strong><span>${fmtDateTime(a.activity_datetime||a.created_at)}</span><p>${esc(a.summary||a.context_notes||a.subject||'No notes recorded.')}</p></div></div>`).join(''):`<div class="muted-block">No activity logged yet.</div>`;
    const followHtml=followups.length?followups.map(f=>`<div class="record-card"><div><strong>${esc(f.follow_up_type||'Follow-up')}</strong><span>${esc(f.notes||'No notes')}</span></div><div><span>${fmtDate(f.due_date)}</span>${pill(f.timing||f.status)}</div></div>`).join(''):`<div class="muted-block">No follow-ups scheduled.</div>`;
    layout(u.university_name||'University','University profile and outreach history.',`
      <button class="back-link" id="backUniversities">← Back to universities</button>
      <div class="profile-hero"><div><div class="profile-meta">${esc(u.country||'Country not set')} ${u.region?`· ${esc(u.region)}`:''} ${u.category?`· ${esc(u.category)}`:''}</div><div class="profile-tags">${pill(u.outreach_stage||'Not Contacted')} ${pill(u.reference_source||'Normal')}</div></div><div class="profile-actions"><button class="secondary" id="copyUniversityId">Copy ID</button></div></div>
      <div class="profile-grid">
        <div class="panel"><h3>Overview</h3><dl class="detail-list"><div><dt>Website</dt><dd>${u.website?`<a href="${esc(u.website)}" target="_blank" rel="noreferrer">${esc(u.website)}</a>`:'—'}</dd></div><div><dt>Average PG tuition</dt><dd>${esc(u.avg_pg_tuition||'—')} ${esc(u.tuition_currency||'')}</dd></div><div><dt>International students</dt><dd>${esc(u.international_students||'—')} ${u.international_students_year?`(${esc(u.international_students_year)})`:''}</dd></div><div><dt>Last contact</dt><dd>${fmtDate(u.last_contact_date)}</dd></div><div><dt>Next follow-up</dt><dd>${fmtDate(u.next_follow_up_date)}</dd></div></dl>${u.general_notes?`<div class="notes-box">${esc(u.general_notes)}</div>`:''}</div>
        <div class="panel"><h3>Contacts <span class="count-badge">${contacts.length}</span></h3>${contactHtml}</div>
      </div>
      <div class="profile-grid lower"><div class="panel"><h3>Activity timeline</h3><div class="timeline">${activityHtml}</div></div><div class="panel"><h3>Follow-ups <span class="count-badge">${followups.length}</span></h3>${followHtml}</div></div>`);
    document.getElementById('backUniversities').addEventListener('click',()=>show('universities'));
    document.getElementById('copyUniversityId').addEventListener('click',async()=>{await navigator.clipboard.writeText(u.university_id||'');showToast('University ID copied.')});
  }catch(e){layout('University profile','Could not load this record.',emptyState('Unable to load university',e.message))}
}

async function contacts(){
  layout('Contacts','Manage multiple contacts under each university.',loadingState('Loading contact directory…'));
  try{const data=await apiGet('listContacts');state.contacts=data.items||[];const body=state.contacts.length?`<div class="toolbar"><input id="contactSearch" placeholder="Search name, position or email…"></div><div class="table-wrap"><table><thead><tr><th>Contact</th><th>University</th><th>Level</th><th>Position</th><th>Email</th><th>Status</th></tr></thead><tbody id="contactRows">${contactRows(state.contacts)}</tbody></table></div>`:emptyState('No contacts yet','Contacts added to universities will appear here.');layout('Contacts','Manage multiple contacts under each university.',body);document.getElementById('contactSearch')?.addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.getElementById('contactRows').innerHTML=contactRows(state.contacts.filter(c=>[c.contact_name,c.position,c.email,c.university_name].join(' ').toLowerCase().includes(q)))})}catch(e){layout('Contacts','Could not load contact directory.',emptyState('Unable to load contacts',e.message))}
}
function contactRows(items){return items.map(c=>`<tr><td><strong>${esc(c.contact_name)}</strong>${c.is_primary===true||String(c.is_primary).toLowerCase()==='true'?'<small>Primary contact</small>':''}</td><td>${esc(c.university_name||'—')}</td><td>${esc(c.contact_level||'—')}</td><td>${esc(c.position||'—')}</td><td>${c.email?`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`:'—'}</td><td>${pill(c.contact_status||'Active')}</td></tr>`).join('')}

async function followups(){
  layout('Follow-ups','See due, overdue and upcoming outreach actions.',loadingState('Loading follow-up queue…'));
  try{const data=await apiGet('listFollowUps');state.followUps=data.items||[];const counts={Overdue:0,Today:0,Upcoming:0};state.followUps.forEach(f=>{if(counts[f.timing]!==undefined)counts[f.timing]++});const body=`<div class="mini-cards"><div class="mini-card"><span>OVERDUE</span><strong>${counts.Overdue}</strong></div><div class="mini-card"><span>DUE TODAY</span><strong>${counts.Today}</strong></div><div class="mini-card"><span>UPCOMING</span><strong>${counts.Upcoming}</strong></div></div>${state.followUps.length?`<div class="table-wrap"><table><thead><tr><th>University</th><th>Contact</th><th>Type</th><th>Due date</th><th>Priority</th><th>Status</th><th>Timing</th></tr></thead><tbody>${state.followUps.map(f=>`<tr><td><strong>${esc(f.university_name||'—')}</strong></td><td>${esc(f.contact_name||'—')}</td><td>${esc(f.follow_up_type||'General Follow-up')}</td><td>${fmtDate(f.due_date)}</td><td>${pill(f.priority||'Normal')}</td><td>${esc(f.status||'Open')}</td><td>${pill(f.timing)}</td></tr>`).join('')}</tbody></table></div>`:emptyState('No follow-ups scheduled','New follow-up tasks will appear here.')}`;layout('Follow-ups','See due, overdue and upcoming outreach actions.',body)}catch(e){layout('Follow-ups','Could not load follow-ups.',emptyState('Unable to load follow-ups',e.message))}
}

async function activity(){
  layout('Activity','A chronological record of all outreach interactions.',loadingState('Loading activity timeline…'));
  try{const data=await apiGet('listActivities',{limit:500});state.activities=data.items||[];const body=state.activities.length?`<div class="panel timeline-page">${state.activities.map(a=>`<div class="timeline-item"><div class="timeline-dot"></div><div><strong>${esc(a.university_name||'University')} · ${esc(a.activity_type||'Activity')}</strong><span>${fmtDateTime(a.activity_datetime||a.created_at)}${a.contact_name?` · ${esc(a.contact_name)}`:''}</span><p>${esc(a.summary||a.context_notes||a.subject||'No notes recorded.')}</p></div></div>`).join('')}</div>`:emptyState('No outreach activity yet','Emails, calls, meetings, notes and status changes will appear here.');layout('Activity','A chronological record of all outreach interactions.',body)}catch(e){layout('Activity','Could not load activity.',emptyState('Unable to load activity',e.message))}
}

function importView(){layout('Import','Upload Excel or CSV and review duplicates before import.',emptyState('Import centre is the next backend module','The database and live CRUD connection are being completed first. Excel/CSV mapping, duplicate review and import confirmation will be added next.'))}
function analytics(){
  if(!state.dashboard){dashboard();return}
  const d=state.dashboard,pipe=d.pipeline||{},total=Math.max(1,Number(d.totals?.universities)||0);
  layout('Analytics','Live outreach coverage and pipeline distribution.',`<div class="panel"><h3>Pipeline distribution</h3>${Object.entries(pipe).map(([k,v])=>`<div class="analytics-row"><div><strong>${esc(k)}</strong><span>${number(v)} universities</span></div><div class="analytics-value">${Math.round(Number(v||0)/total*100)}%</div></div>`).join('')}</div>`)
}
function settings(){
  const h=state.health||{};
  layout('Settings','Backend connection and application configuration.',`<div class="panel settings-panel"><h3>System connection</h3><dl class="detail-list"><div><dt>Status</dt><dd>${pill(state.connected?'Connected':'Offline')}</dd></div><div><dt>Backend version</dt><dd>${esc(h.version||'—')}</dd></div><div><dt>Database</dt><dd>${esc(h.spreadsheet||'—')}</dd></div><div><dt>API endpoint</dt><dd class="code-value">${esc(API_URL)}</dd></div></dl><p class="settings-note">The front end is now configured to use the live Apps Script backend. Authentication and role-based permissions should be added before production rollout.</p></div>`)
}

const views={dashboard,universities,contacts,followups,activity,import:importView,analytics,settings};
function show(view){state.view=view;nav.forEach(b=>b.classList.toggle('active',b.dataset.view===view));(views[view]||dashboard)()}
nav.forEach(b=>b.addEventListener('click',()=>show(b.dataset.view)));

function openModal(){form.reset();formMessage.classList.add('hidden');populateModalLookups();modal.classList.remove('hidden');form.querySelector('[name="universityName"]')?.focus()}
function closeModal(){modal.classList.add('hidden');formMessage.classList.add('hidden')}
document.getElementById('addUniversityBtn').addEventListener('click',openModal);
document.getElementById('cancelModal').addEventListener('click',closeModal);
document.getElementById('closeModal').addEventListener('click',closeModal);
modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});

form.addEventListener('submit',async e=>{
  e.preventDefault();
  const data=Object.fromEntries(new FormData(form).entries());
  saveUniversityBtn.disabled=true;saveUniversityBtn.textContent='Saving…';formMessage.classList.add('hidden');
  try{
    let result=await apiPost('createUniversity',data);
    if(result.duplicate){
      const names=(result.matches||[]).map(x=>x.university_name).join(', ');
      const proceed=confirm(`Possible duplicate found: ${names||'an existing university'}.\n\nAdd this university anyway?`);
      if(!proceed){formMessage.textContent='University was not added because a possible duplicate already exists.';formMessage.className='form-message warning';return}
      result=await apiPost('createUniversity',{...data,allowDuplicate:true});
    }
    if(!result.created)throw new Error(result.message||'University could not be created.');
    closeModal();
    showToast(`${result.university.university_name} added to the database.`);
    await Promise.all([refreshUniversities(),refreshDashboard()]);
    show('universities');
  }catch(error){console.error(error);formMessage.textContent=error.message;formMessage.className='form-message error'}finally{saveUniversityBtn.disabled=false;saveUniversityBtn.textContent='Save University'}
});

document.getElementById('globalSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){show('universities');setTimeout(()=>{const search=document.getElementById('uniSearch');if(search){search.value=e.target.value;search.dispatchEvent(new Event('input'))}},0)}});

bootstrap();
