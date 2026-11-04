'use strict';
const KEY = 'momentum.workspace.v1';
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => crypto.randomUUID();
const day = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const STAGES = {todo:'To do',doing:'In progress',done:'Done'};
const COLORS = ['sage','orange','purple','blue'];
const VIEWS = {today:'My day',board:'Workflow board',focus:'Focus room',notes:'Notes',guide:'Getting started'};
const ICONS = {sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',board:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m6-16v16"/>',timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6m-3 0v3m6 1 2-2"/>',note:'<path d="M14 3H5v18h14V8zM14 3v6h5M8 13h8m-8 4h6"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .6-1.5 1-1.5 2m0 3h.01"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>'};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
$$('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
function initialState() {
  const today = day();
  return {version:1,projects:[{id:'work',name:'Work & projects',color:'sage'},{id:'personal',name:'Personal growth',color:'orange'},{id:'ideas',name:'Ideas & someday',color:'purple'}],tasks:[
    {id:uid(),title:'Map out the week ahead',detail:'A clear plan makes a little space for the unexpected.',project:'work',priority:'high',due:today,status:'doing',sample:true},
    {id:uid(),title:'Make progress on your biggest project',detail:'Pick one small, meaningful next step.',project:'work',priority:'high',due:today,status:'todo',sample:true},
    {id:uid(),title:'Read a chapter of something good',detail:'Twenty minutes of curiosity.',project:'personal',priority:'normal',due:today,status:'todo',sample:true},
    {id:uid(),title:'Capture an idea worth exploring',detail:'Give that thought somewhere to land.',project:'ideas',priority:'low',due:'',status:'todo',sample:true},
    {id:uid(),title:'Take a breath. Set an intention.',detail:'You made a little room for yourself today.',project:'personal',priority:'normal',due:today,status:'done',sample:true}
  ],notes:'',sessions:[],timer:{duration:1500,remaining:1500,end:null,intention:''}};
}
function validateData(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.tasks) || !Array.isArray(data.projects) || !Array.isArray(data.sessions) || typeof data.notes !== 'string' || data.notes.length > 200000 || data.tasks.length > 10000 || data.projects.length > 200 || data.sessions.length > 10000) throw Error('Invalid backup format.');
  const ids = new Set();
  for (const p of data.projects) { if (!p || typeof p.id !== 'string' || ids.has(p.id) || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 60 || !COLORS.includes(p.color)) throw Error('Invalid project.'); ids.add(p.id); }
  const taskIds = new Set();
  for (const t of data.tasks) { if (!t || typeof t.id !== 'string' || taskIds.has(t.id) || typeof t.title !== 'string' || !t.title.trim() || t.title.length > 180 || typeof t.detail !== 'string' || t.detail.length > 3000 || !['todo','doing','done'].includes(t.status) || !['normal','high','low'].includes(t.priority) || !ids.has(t.project) || typeof t.due !== 'string' || (t.due && !/^\d{4}-\d{2}-\d{2}$/.test(t.due))) throw Error('Invalid task.'); taskIds.add(t.id); }
  for (const s of data.sessions) { if (!s || typeof s.date !== 'string' || !Number.isFinite(s.minutes) || s.minutes < 1 || s.minutes > 180 || typeof s.intention !== 'string' || s.intention.length > 200) throw Error('Invalid session.'); }
  if (!data.timer || ![300,1500,3000].includes(data.timer.duration) || !Number.isFinite(data.timer.remaining) || data.timer.remaining < 0 || data.timer.remaining > data.timer.duration || !(data.timer.end === null || Number.isFinite(data.timer.end)) || typeof data.timer.intention !== 'string' || data.timer.intention.length > 200) throw Error('Invalid timer.');
  return data;
}
let state, storageFailed = false;
try { const stored = localStorage.getItem(KEY); state = stored ? validateData(JSON.parse(stored)) : initialState(); }
catch { state = initialState(); storageFailed = true; }
let view = Object.hasOwn(VIEWS, location.hash.slice(1)) ? location.hash.slice(1) : 'today';
let filter = 'active', projectFilter = '', query = '', toastHandle;
function notify(message) { const el = $('#toast'); el.textContent = message; el.hidden = false; clearTimeout(toastHandle); toastHandle = setTimeout(() => { el.hidden = true; }, 4200); }
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); storageFailed = false; $('#save-status').innerHTML = 'All changes saved locally <span class="tiny-check">✓</span>'; }
  catch { storageFailed = true; $('#save-status').textContent = 'Storage unavailable — export a backup'; notify('Your browser could not save. Export a backup in Getting started.'); }
}
function projectById(id) { return state.projects.find(p => p.id === id); }
function projectOptions(includeAll = false, selected = projectFilter) { return (includeAll ? '<option value="">All projects</option>' : '') + state.projects.map(p => `<option value="${escapeHTML(p.id)}" ${p.id === selected ? 'selected' : ''}>${escapeHTML(p.name)}</option>`).join(''); }
function projectTag(id) { const p = projectById(id); return p ? `<span class="task-project"><span class="project-dot ${p.color}"></span>${escapeHTML(p.name)}</span>` : ''; }
function dueLabel(due) {
  if (!due) return '<span class="task-date">Anytime</span>';
  const today = day();
  return `<span class="task-date ${due < today ? 'overdue' : ''}">${due === today ? 'Today' : new Date(`${due}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</span>`;
}
function selectedTasks() { return state.tasks.filter(t => (!projectFilter || t.project === projectFilter) && (!query || `${t.title} ${t.detail} ${projectById(t.project)?.name || ''}`.toLowerCase().includes(query))); }
function visibleTasks() { return selectedTasks().filter(t => filter === 'all' || (filter === 'completed' ? t.status === 'done' : t.status !== 'done')); }
function heading(title, subtitle, action = true) { return `<div class="page-heading"><div><p class="date-label">${new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})}</p><h1>${title}</h1><p class="subtitle">${subtitle}</p></div>${action ? '<button class="btn primary" data-action="add-task"><span class="plus">+</span> New task</button>' : ''}</div>`; }
function taskRow(t) { return `<div class="task-row ${t.status === 'done' ? 'completed' : ''}"><button class="check-task ${t.status === 'done' ? 'done' : ''}" data-toggle="${escapeHTML(t.id)}" aria-label="${t.status === 'done' ? 'Reopen' : 'Complete'} ${escapeHTML(t.title)}">${t.status === 'done' ? '✓' : ''}</button><div class="task-main"><button class="task-title" data-edit="${escapeHTML(t.id)}">${escapeHTML(t.title)}</button>${t.detail ? `<p class="task-detail">${escapeHTML(t.detail)}</p>` : ''}</div>${t.priority === 'high' ? '<span class="priority-high">↑ High</span>' : ''}${projectTag(t.project)}${dueLabel(t.due)}<button class="row-more" data-edit="${escapeHTML(t.id)}" aria-label="Edit ${escapeHTML(t.title)}">···</button></div>`; }
function renderSidebar() {
  $$('[data-view]').forEach(el => { const active = el.dataset.view === view && !projectFilter; el.classList.toggle('active',active); if (active) el.setAttribute('aria-current','page'); else el.removeAttribute('aria-current'); });
  $('#view-label').textContent = projectFilter ? projectById(projectFilter)?.name || VIEWS[view] : VIEWS[view];
  $('#day-count').textContent = state.tasks.filter(t => t.status !== 'done').length;
  $('#project-nav').innerHTML = state.projects.map(p => `<button class="nav-item project-link ${projectFilter === p.id ? 'active' : ''}" data-project="${escapeHTML(p.id)}" ${projectFilter === p.id ? 'aria-current="page"' : ''}><span class="project-dot ${p.color}"></span>${escapeHTML(p.name)}</button>`).join('');
}
function renderToday() {
  const all = selectedTasks(), complete = all.filter(t => t.status === 'done').length, percent = all.length ? Math.round(complete / all.length * 100) : 0;
  const sessionMinutes = state.sessions.filter(s => s.date === day()).reduce((sum,s) => sum+s.minutes,0);
  const title = projectFilter ? escapeHTML(projectById(projectFilter)?.name || 'Your project') : 'Your day, with intention.';
  const list = visibleTasks();
  $('#main').innerHTML = heading(title,'A little clarity. A little focus. A little forward.') + `<div class="hero-grid"><section class="day-card" aria-label="Task progress"><div><span class="eyebrow">A FRESH PERSPECTIVE</span><h2>${percent === 100 ? 'Look at you.<br>Making things happen.' : 'You don’t need to do it all.<br>Just the next right thing.'}</h2><p>${complete} of ${all.length} tasks complete. You’re moving forward.</p></div><div class="ring-wrap"><svg viewBox="0 0 126 126" aria-hidden="true"><circle class="ring-bg" cx="63" cy="63" r="53"/><circle class="ring-value" cx="63" cy="63" r="53" stroke-dasharray="333.01" stroke-dashoffset="${333.01 * (1-percent/100)}"/></svg><div class="ring-text"><strong>${percent}%</strong><span>of the way there</span></div></div></section><section class="focus-card"><div class="card-label">${icon('timer')} A LITTLE SPACE TO FOCUS</div><h2>${sessionMinutes ? `${sessionMinutes} minutes, well spent.` : 'One task. All your attention.'}</h2><p>Give your next 25 minutes a purpose.</p><button data-view="focus">Enter focus room <span>↗</span></button></section></div>
  <div class="section-bar"><h2>Your next steps <span class="count-chip">${list.length}</span></h2><span class="small-text">Progress over perfection.</span></div><section class="task-panel" aria-label="Your tasks"><div class="task-toolbar"><div class="tabs" role="group" aria-label="Task status">${[['active','Active'],['completed','Completed'],['all','All tasks']].map(([id,label]) => `<button class="tab ${filter === id ? 'active' : ''}" data-filter="${id}" aria-pressed="${filter === id}">${label}</button>`).join('')}</div><select class="filter-select" data-project-filter aria-label="Filter tasks by project">${projectOptions(true)}</select></div>${list.length ? list.map(taskRow).join('') : '<div class="empty"><strong>A little breathing room.</strong>No tasks match this view. Add a next step or change your filters.</div>'}<button class="add-inline" data-action="add-task"><span>+</span> Add a next step…</button></section>
  <div class="lower-grid"><div class="quote-card"><span class="quote-mark">“</span><p>Great things are done by a series of small things.<small>A REMINDER FOR YOUR DAY</small></p></div><div class="progress-mini"><div class="mini-top"><span>Today’s focus time</span><strong>${sessionMinutes} / 60 min</strong></div><div class="progress-track"><span style="width:${Math.min(100,sessionMinutes/60*100)}%"></span></div><p>${sessionMinutes >= 60 ? 'Your daily focus intention, fulfilled.' : 'A little focus goes a long way.'}</p></div></div>${state.tasks.some(t=>t.sample) ? '<div class="sample-notice"><span>A few example tasks to help you find your rhythm.</span><button class="text-btn" data-action="clear-examples">Clear examples</button></div>' : ''}`;
}
function renderBoard() {
  $('#main').innerHTML = heading('Good work, in motion.','See the bigger picture. Move one step closer.') + `<div class="board-controls"><span class="project-filter-name">${selectedTasks().length} tasks across your workflow</span><select class="filter-select" data-project-filter aria-label="Filter board by project">${projectOptions(true)}</select></div><div class="board">${Object.entries(STAGES).map(([stage,label])=>{const tasks=selectedTasks().filter(t=>t.status===stage);return `<section class="column ${stage}" aria-label="${label}"><div class="column-head"><span class="stage-dot"></span><strong>${label}</strong><span class="count-chip">${tasks.length}</span><button class="icon-btn" data-add-stage="${stage}" aria-label="Add task to ${label}">+</button></div>${tasks.map(t=>`<article class="board-card">${projectTag(t.project)}<button class="task-title" data-edit="${escapeHTML(t.id)}">${escapeHTML(t.title)}</button><p>${escapeHTML(t.detail)}</p><div class="board-card-bottom">${dueLabel(t.due)}<select class="stage-select" data-move="${escapeHTML(t.id)}" aria-label="Stage for ${escapeHTML(t.title)}">${Object.entries(STAGES).map(([key,name])=>`<option value="${key}" ${key===t.status?'selected':''}>${name}</option>`).join('')}</select></div></article>`).join('')}${!tasks.length?'<div class="empty">Space for your next step.</div>':''}</section>`;}).join('')}</div><p class="subtitle">Use the stage menu on a card to move it along. Select its title to edit.</p>`;
}
function renderFocus() {
  const sessions=state.sessions.filter(s=>s.date===day()), minutes=sessions.reduce((n,s)=>n+s.minutes,0);
  $('#main').innerHTML=heading('Make a little room.','Settle in. One intention, one uninterrupted moment.',false)+`<div class="focus-layout"><section class="timer-panel" aria-label="Focus timer"><div class="timer-modes" role="group" aria-label="Session length">${[[1500,'25 min focus'],[3000,'50 min focus'],[300,'5 min break']].map(([seconds,label])=>`<button data-duration="${seconds}" class="${state.timer.duration===seconds?'active':''}" aria-pressed="${state.timer.duration===seconds}">${label}</button>`).join('')}</div><div class="timer-number" id="timer-number" role="timer" aria-label="Time remaining"></div><p class="timer-caption" id="timer-caption"></p><div class="timer-actions"><button class="btn primary" id="timer-start" data-action="timer-toggle"></button><button class="btn" data-action="timer-reset" aria-label="Reset timer">Reset</button></div><div class="intention"><label for="intention">WHAT DESERVES YOUR ATTENTION?</label><input id="intention" maxlength="200" placeholder="An intention for this session…" value="${escapeHTML(state.timer.intention)}"></div></section><aside class="panel"><h3>A little more present.</h3><p class="subtitle">Your focus, today.</p><div class="focus-stat"><strong>${minutes}<span> min</span></strong><span>Time well spent</span></div><div class="focus-stat"><strong>${sessions.length}</strong><span>Completed focus sessions</span></div><div class="session-list"><span class="eyebrow">RECENT SESSIONS</span>${sessions.length?sessions.slice(-5).reverse().map(s=>`<div class="session-row"><span>${escapeHTML(s.intention||'A moment of focus')}</span><span>${s.minutes} min</span></div>`).join(''):'<p class="subtitle">Your first session starts with a little intention.</p>'}</div><div class="callout">Put your phone aside. Close a few tabs. You’ve already done the hardest part: starting.</div><p class="subtitle">Breaks are for recharging and don’t count toward focus time.</p></aside></div>`;
  updateClock();
}
function renderNotes() {
  $('#main').innerHTML=heading('Give your thoughts a home.','A quiet corner for ideas, reflections, and everything in between.',false)+`<section class="note-panel"><div class="note-toolbar"><span>YOUR SCRATCHPAD</span><span id="note-count"></span></div><textarea id="notes" class="note-editor" maxlength="200000" aria-label="Your notes" placeholder="What’s on your mind?\n\nCapture an idea. Untangle a thought. Write your next chapter."></textarea></section><p class="subtitle">Saved automatically in this browser. Export a backup in Getting started.</p>`;
  $('#notes').value=state.notes; updateNoteCount();
}
function renderGuide() {
  $('#main').innerHTML=heading('Find your rhythm.','A few simple ways to make this space your own.',false)+`<div class="guide-grid"><section class="panel"><h2>Start small. Keep going.</h2><ol><li><strong>Capture your next step.</strong> Use New task to add a name, project, priority, and date.</li><li><strong>Make progress visible.</strong> Move a task from To do to In progress to Done on your Workflow board.</li><li><strong>Give it your attention.</strong> Pick a session length in Focus room, set an intention, and press Start.</li><li><strong>Leave room for ideas.</strong> Notes saves your thoughts as you type.</li></ol><div class="callout">Tip: press <strong>N</strong> for a new task or <strong>/</strong> to search your tasks. Press Esc to close a task.</div><p class="subtitle">Due dates are labels. My day shows all active tasks so you can choose what matters.</p></section><section class="panel"><h2>Your work, in your hands.</h2><p>Tasks, notes, and sessions are saved <strong>in this browser on this device</strong>. They don’t sync across devices or people. Use a backup to move your workspace.</p><div class="storage-actions"><button class="btn" data-action="export">↓ Export backup</button><button class="btn" data-action="import">↑ Import backup</button></div><p class="subtitle">Import replaces this browser’s workspace. Export first to keep a copy.</p><div class="callout">Sharing the website shares the app. Your personal tasks and notes stay in your own browser.</div><button class="text-btn danger" style="margin-top:22px" data-action="clear-completed">Clear completed tasks</button></section><section class="panel"><h2>Push your website changes.</h2><ol><li><strong>Edit the website files</strong> in the <code>dist</code> folder of your GitHub project.</li><li><strong>Commit and push</strong> your changes to GitHub to save a version of your code.</li><li><strong>Publish with Sites.</strong> Ask Codex to update this Site from your changes and publish it.</li></ol><p>A GitHub push saves your code. Updating this hosted Site also needs the Sites publishing step.</p><p class="subtitle">Your repository: <a href="https://github.com/mt-boop/Workflow-web" target="_blank" rel="noopener">mt-boop / Workflow-web ↗</a></p></section><section class="panel"><h2>A space for steady progress.</h2><p>There’s no perfect system. Keep tasks small enough to begin, finish what matters, and give yourself permission to leave a little space.</p><div class="callout">This is a personal workspace with example tasks to get you started. Add your own projects using the + beside Projects on desktop.</div><button class="btn" data-action="add-project">+ Create a project</button></section></div>`;
}
function render() { renderSidebar(); ({today:renderToday,board:renderBoard,focus:renderFocus,notes:renderNotes,guide:renderGuide})[view](); }
function navigate(next,keepProject=false) { if(!Object.hasOwn(VIEWS,next)) return; view=next; if(!keepProject) projectFilter=''; query=''; $('#search').value=''; location.hash=next; render(); }
function openTask(id='',stage='todo') {
  if(!state.projects.length) { notify('Create a project first.'); $('#project-dialog').showModal(); return; }
  const t=state.tasks.find(t=>t.id===id);
  $('#task-dialog-title').textContent=t?'A step worth taking.':'A new next step.';
  $('#task-id').value=t?.id||''; $('#task-title').value=t?.title||''; $('#task-detail').value=t?.detail||'';
  $('#task-project').innerHTML=projectOptions(false,t?.project||projectFilter||state.projects[0].id);
  $('#task-priority').value=t?.priority||'normal'; $('#task-due').value=t?.due??day(); $('#task-status').value=t?.status||stage;
  $('#delete-task').hidden=!t; $('#task-dialog').showModal(); $('#task-title').focus();
}
function updateNoteCount() { const count=state.notes.trim()?state.notes.trim().split(/\s+/).length:0; $('#note-count').textContent=`${count} ${count===1?'word':'words'} · Saved locally`; }
function remaining() { return state.timer.end ? Math.max(0,Math.ceil((state.timer.end-Date.now())/1000)) : state.timer.remaining; }
function updateClock() {
  const seconds=remaining();
  if($('#timer-number')) { $('#timer-number').textContent=`${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`; $('#timer-start').textContent=state.timer.end?'Pause session':seconds===0?'Start again':'Start session ↗'; $('#timer-caption').textContent=state.timer.end?'You’re right where you need to be.':seconds===0?'A moment well spent. Take a breath.':'A small commitment to yourself.'; }
}
function finishTimer() {
  if(state.timer.duration!==300) state.sessions.push({date:day(new Date(state.timer.end)),minutes:state.timer.duration/60,intention:state.timer.intention});
  state.timer.end=null; state.timer.remaining=0; save(); if(view==='focus') renderFocus();
  notify(state.timer.duration===300?'Break complete. Ready for your next step?':'Session complete. A little more progress.');
}
setInterval(()=>{ if(state.timer.end && remaining()===0) finishTimer(); else updateClock(); },500);
document.addEventListener('click',event=>{
  const button=event.target.closest('button'); if(!button) return;
  if(button.dataset.view) {navigate(button.dataset.view);return;}
  if(button.dataset.project) {projectFilter=button.dataset.project;query='';$('#search').value='';view='today';location.hash='today';filter='active';render();return;}
  if(button.dataset.filter) {filter=button.dataset.filter;renderToday();return;}
  if(button.hasAttribute('data-edit')) {openTask(button.dataset.edit);return;}
  if(button.hasAttribute('data-add-stage')) {openTask('',button.dataset.addStage);return;}
  if(button.dataset.toggle) {const t=state.tasks.find(t=>t.id===button.dataset.toggle);if(t){t.status=t.status==='done'?'todo':'done';save();render();}return;}
  if(button.classList.contains('close-modal')) {button.closest('dialog').close();return;}
  if(button.dataset.duration) {if(state.timer.end&&!confirm('End the current session and change its length?')) return; const seconds=Number(button.dataset.duration);state.timer={...state.timer,duration:seconds,remaining:seconds,end:null};save();renderFocus();return;}
  const action=button.dataset.action;
  if(action==='add-task') openTask();
  if(action==='add-project'||button.id==='add-project') $('#project-dialog').showModal();
  if(action==='clear-examples' && confirm('Remove the example tasks? Your own tasks will stay.')) {state.tasks=state.tasks.filter(t=>!t.sample);save();render();notify('A fresh canvas, just for you.');}
  if(action==='clear-completed' && confirm('Permanently remove all completed tasks from this browser?')) {state.tasks=state.tasks.filter(t=>t.status!=='done');save();render();notify('Completed tasks cleared.');}
  if(action==='export') {const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`momentum-backup-${day()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Your workspace backup is ready.');}
  if(action==='import') $('#import-file').click();
  if(action==='timer-toggle') {if(state.timer.end){state.timer.remaining=remaining();state.timer.end=null;}else{if(state.timer.remaining===0)state.timer.remaining=state.timer.duration;state.timer.end=Date.now()+state.timer.remaining*1000;}save();updateClock();}
  if(action==='timer-reset') {state.timer.end=null;state.timer.remaining=state.timer.duration;save();updateClock();}
});
document.addEventListener('change',event=>{
  if(event.target.hasAttribute('data-project-filter')) {projectFilter=event.target.value;render();}
  if(event.target.dataset.move) {const task=state.tasks.find(t=>t.id===event.target.dataset.move);if(task&&Object.hasOwn(STAGES,event.target.value)){task.status=event.target.value;save();render();}}
});
$('#task-form').addEventListener('submit',event=>{
  event.preventDefault();const title=$('#task-title').value.trim();if(!title){$('#task-title').setCustomValidity('Give this step a name.');$('#task-title').reportValidity();return;}
  const id=$('#task-id').value,values={title,detail:$('#task-detail').value.trim(),project:$('#task-project').value,priority:$('#task-priority').value,due:$('#task-due').value,status:$('#task-status').value};
  const existing=state.tasks.find(t=>t.id===id);if(existing)Object.assign(existing,values);else state.tasks.push({id:uid(),...values});save();$('#task-dialog').close();render();notify(existing?'Task updated.':'Your next step is ready.');
});
$('#task-title').addEventListener('input',()=>$('#task-title').setCustomValidity(''));
$('#delete-task').addEventListener('click',()=>{if(confirm('Permanently delete this task?')){state.tasks=state.tasks.filter(t=>t.id!==$('#task-id').value);save();$('#task-dialog').close();render();notify('Task deleted.');}});
$('#project-form').addEventListener('submit',event=>{event.preventDefault();const name=$('#project-name').value.trim();if(!name){$('#project-name').setCustomValidity('Give your project a name.');$('#project-name').reportValidity();return;}const p={id:uid(),name,color:$('#project-color').value};state.projects.push(p);save();$('#project-dialog').close();$('#project-form').reset();projectFilter=p.id;view='today';query='';$('#search').value='';location.hash='today';render();notify('A new place for meaningful work.');});
$('#project-name').addEventListener('input',()=>$('#project-name').setCustomValidity(''));
$('#search').addEventListener('input',event=>{query=event.target.value.toLowerCase().trim();if(view!=='today'&&view!=='board'){view='today';location.hash='today';}render();});
document.addEventListener('input',event=>{if(event.target.id==='notes'){state.notes=event.target.value;save();updateNoteCount();}if(event.target.id==='intention'){state.timer.intention=event.target.value;save();}});
$('#import-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>5000000)throw Error('Backup too large.');const imported=validateData(JSON.parse(await file.text()));if(!confirm('Replace the workspace saved in this browser with this backup?'))return; imported.timer.end=null;state=imported;projectFilter='';query='';$('#search').value='';save();render();notify('Your workspace is right here.');}catch{notify('That backup could not be imported. Choose a Momentum JSON export under 5 MB.');}finally{event.target.value='';}});
document.addEventListener('keydown',event=>{if(event.ctrlKey||event.metaKey||event.altKey||event.target.matches('input,textarea,select')||$('dialog[open]'))return;if(event.key==='/'){event.preventDefault();$('#search').focus();}if(event.key.toLowerCase()==='n'){event.preventDefault();openTask();}});
window.addEventListener('hashchange',()=>{const next=location.hash.slice(1);if(Object.hasOwn(VIEWS,next)&&next!==view){view=next;projectFilter='';query='';$('#search').value='';render();}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.timer.end&&remaining()===0)finishTimer();});
render();
if(storageFailed){$('#save-status').textContent='Saved data unavailable — export a backup';notify('Saved data could not be loaded. Original browser storage has not been replaced. Export before making changes.');}
