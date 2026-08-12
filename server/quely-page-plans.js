/* quely-page-plans.js
   The PagePlan layer for the Advanced (per-prospect) Prospect Viewer.

   Model: one Quely design system, MANY page compositions.
   A prospect's concern selects a NARRATIVE FAMILY, then buildPagePlan()
   configures every section's DATA from that family. The renderer reads the
   plan and feeds the SAME fixed interaction mechanics (Orbit, Space, Lens map,
   problem visual) with family-specific scenario data. Nothing on the page is
   hard-coded to one story; the generated narrative controls the whole page.

   Families (V1):
     fragmentation  Fragmented work information
     decisions      Decision & project history
     risks          Risks, dependencies & delivery visibility
     capacity       Planning & capacity

   Each pain-point topic slug maps to exactly one family. Several concerns can
   share a family (and therefore its configurable demo) with different content.
*/
(function () {
  /* Families deactivated for the current V1. Content, scenario data, and the
     interactive board remain below, dormant — remove a key here to restore. */
  const INACTIVE_FAMILIES = { capacity: true };

  /* topic slug -> family */
  const TOPIC_FAMILY = {
    'context-fragmentation': 'fragmentation',
    'work-before-work': 'fragmentation',
    'conflicting-info': 'fragmentation',
    'human-search-engine': 'fragmentation',
    'repeated-translation': 'fragmentation',
    'decision-traceability': 'decisions',
    'unexplained-change': 'decisions',
    'knowledge-loss': 'decisions',
    'onboarding': 'decisions',
    'ceremony-loss': 'decisions',
    'risk-dependencies': 'risks',
    'status-chasing': 'risks',
    'distributed-async': 'risks',
    'capacity-planning': 'capacity',
    'retro-followthrough': 'capacity',
  };

  /* Shared capability card presets, referenced by id per family */
  const CAP = {
    space:   { icon:'ph ph-stack',            title:'One Space for the work',   sub:'The task plus its docs, discussion, and decisions in one place.' },
    orbit:   { icon:'ph ph-sparkle',          title:'Orbit reads everything',   sub:'Ask across the tickets, docs, and meetings — no status meeting.' },
    lenses:  { icon:'ph ph-scan',             title:'Signals & Lenses',         sub:'Distill discussion into decisions, risks, and next steps.' },
    meetings:{ icon:'ph ph-microphone-stage', title:'Meetings on the work',     sub:'Recordings and transcripts attached to the task they belong to.' },
    queue:   { icon:'ph ph-tray',             title:'Continuous intake',        sub:'Connected items flow in from the tools you already use.' },
    capacity:{ icon:'ph ph-gauge',            title:'Capacity, visible',        sub:'See assigned work and availability before you commit.' },
    async:   { icon:'ph ph-chats-circle',     title:'Async stand-ups',          sub:'Updates attached to the work, across time zones.' },
    decisions:{ icon:'ph ph-seal-check',      title:'Decision log',             sub:'What was decided, what changed, and why — preserved.' },
    timeline:{ icon:'ph ph-git-commit',       title:'Project history',          sub:'The full timeline of how the work evolved, kept with it.' },
    deps:    { icon:'ph ph-graph',            title:'Dependency view',          sub:'See what blocks what before it becomes a slip.' },
  };

  /* ---------------------------------------------------------------- FAMILIES */
  const FAMILIES = {
    /* ============================================================ 1. FRAGMENTATION */
    fragmentation: {
      label: 'Fragmented work information',
      accent: '#8F5BD7',
      workItem: { name: 'Fix checkout flow', id: 'CHECKOUT-1428', tool: 'Jira', toolIcon: 'jira' },
      hero: {
        eyebrowBase: 'The full picture is scattered',
        headline: 'The full context around a piece of work is spread across too many places.',
        body: 'A ticket has a title and a short description. The customer call that created the urgency, the thread about the tradeoff, the meeting where scope changed — they all live somewhere else. So the work does not start when the ticket is assigned. It starts when someone pieces together what it actually means.',
        visual: 'fragments',
      },
      problem: {
        headline: 'One piece of work, its context split across six tools.',
        body: 'Everything the team needs to move this forward exists. It is just not in one place — so someone has to go find it, tool by tool, before any real work happens.',
        points: [
          'The customer problem came from a call',
          'The scope was narrowed in a Slack thread',
          'A design decision changed during review',
          'The deadline shifted in a stakeholder meeting',
        ],
        visual: 'fragments',
      },
      scattered: [
        { label: 'Jira ticket', icon: 'jira' },
        { label: 'Slack thread', icon: 'slack' },
        { label: 'Gong call', icon: 'phone' },
        { label: 'Meeting notes', icon: 'note' },
        { label: 'Notion doc', icon: 'notion' },
        { label: 'Salesforce', icon: 'salesforce' },
      ],
      signalsLabel: 'One task, its context scattered across',
      signals: [
        { label: 'Ticket: the task', icon: 'ph-fill ph-kanban', color: '#60A5FA' },
        { label: 'Slack: scope change', icon: 'ph-fill ph-chat-circle', color: '#A78BFA' },
        { label: 'Call: the real urgency', icon: 'ph-fill ph-phone-call', color: '#C084FC' },
        { label: 'Meeting: the decision', icon: 'ph-fill ph-note-blank', color: '#FBBF24' },
        { label: 'Doc: the requirements', icon: 'ph-fill ph-file-text', color: '#34D399' },
        { label: 'CRM: the renewal risk', icon: 'ph-fill ph-cloud', color: '#38BDF8' },
      ],
      space: {
        title: 'A task and everything connected to it, in one place.',
        body: 'Bring the task in from your tools, then add the materials, discussion, and decisions that move it forward. Ask Orbit anything and it answers from all of it.',
        bullets: [
          { icon: 'ph-fill ph-plugs-connected', text: 'Task imported from Jira' },
          { icon: 'ph-fill ph-chats-circle', text: 'Scope discussion, in context' },
          { icon: 'ph-fill ph-seal-check', text: 'Decisions captured with the work' },
        ],
        tabs: {
          disc: [
            { who: 'Priya (PM)', when: '2d', text: 'Customer call: they need card checkout before renewal. Wallet/ACH can wait.' },
            { who: 'Sam (Eng)', when: '1d', text: 'Then we are blocked on the payments tokenization change from Platform.' },
            { who: 'Priya (PM)', when: '22h', text: 'Agreed — narrowing scope to card only. Updating the ticket.' },
          ],
          docs: [
            { icon: 'ph-fill ph-file-text', name: 'Checkout requirements', meta: 'Notion · updated 2d ago' },
            { icon: 'ph-fill ph-figma-logo', name: 'Card checkout flow', meta: 'Figma · 3 frames' },
            { icon: 'ph-fill ph-phone-call', name: 'Renewal call transcript', meta: 'Gong · 41 min' },
          ],
          dec: [
            { text: 'Scope narrowed to card checkout only', meta: 'decided in planning · Nov 18' },
            { text: 'Wallet & ACH deferred to next cycle', meta: 'decided in planning · Nov 18' },
          ],
          activity: [
            { text: 'Priya changed scope', meta: '22h ago' },
            { text: 'Sam flagged payments dependency', meta: '1d ago' },
            { text: 'Renewal call attached by CS', meta: '2d ago' },
          ],
        },
      },
      orbit: {
        subject: 'Fix checkout flow',
        intro: 'This is a simulation of an Orbit session for the task “Fix checkout flow.” Ask a question below and watch how Orbit answers from everything in the Space.',
        suggestions: [
          { label: 'What is blocking this?', q: 'What is blocking this right now?' },
          { label: 'What changed recently?', q: 'What changed recently?' },
          { label: 'Why this scope?', q: 'Why did we decide on this scope?' },
          { label: "What's next?", q: 'What are the next steps?' },
        ],
        answers: [
          { keys:['block','stuck','wait','depend'], text:"It's blocked on a payments dependency. The card-tokenization change owned by the Platform team has to land first, and it is still in review — so checkout can't be finished until it merges." },
          { keys:['chang','update','happen','latest','status','new'], text:'Since last week: scope was narrowed to card checkout only, a payments dependency was flagged as the blocker, and CS raised that a customer expects this before their renewal. The ticket itself still just says “Fix checkout flow.”' },
          { keys:['customer','renew','churn','account','client'], text:'A customer is expecting this before their renewal. CS logged it as a renewal risk and it came up on the last customer call, which is why it was prioritized.' },
          { keys:['why','decid','reason','scope','choose','chose'], text:'Scope was narrowed to card checkout only. In the Nov 18 planning session the team cut wallet/ACH to hit the renewal timeline, and agreed to revisit them afterward.' },
          { keys:['next','todo','action','do now','should'], text:'Next: unblock the payments dependency with Platform, confirm the card-only scope with the customer via CS, then finish and QA the checkout flow. The dependency has no owner yet.' },
        ],
        fallback: { text: 'Here is what the Space shows: the work is “Fix checkout flow,” blocked on a payments dependency, scoped to card checkout only, and flagged as a renewal risk. Ask what is blocking it, what changed, why the scope was set, or what is next.' },
      },
      lensSubject: 'Fix checkout flow',
      lenses: [
        { id:'decisions', label:'Decisions', icon:'ph-fill ph-seal-check', color:'#22C55E', items:['Scope narrowed to card checkout only','Wallet & ACH deferred to next cycle'] },
        { id:'risks', label:'Risks', icon:'ph-fill ph-warning', color:'#F87171', items:['Renewal at risk if checkout slips','Payments dependency still unowned'] },
        { id:'actions', label:'Actions', icon:'ph-fill ph-list-checks', color:'#60A5FA', items:['Unblock payments tokenization with Platform','Confirm card-only scope with the customer','QA the card checkout path'] },
        { id:'questions', label:'Open questions', icon:'ph-fill ph-question', color:'#C084FC', items:['Who owns the payments dependency?','Do we need a fallback if it slips?'] },
        { id:'next', label:'Next steps', icon:'ph-fill ph-arrow-right', color:'#818CF8', items:['Assign the dependency this week','Schedule QA once it merges'] },
      ],
      capabilities: ['space','orbit','queue','meetings','decisions','lenses'],
      capabilitiesTitle: 'Built to bring the whole picture together.',
      sections: { proof:true, space:true, orbit:true, lenses:false, capacity:false, features:true },
      primaryDemo: 'orbit',
      heroVisual: 'scatter',
      /* ---- HERO SCATTER (Block Hero Scatter) ---- */
      heroScatter: {
        eyebrow: 'One task, six places',
        workId: 'CHECKOUT-1428',
        workName: 'Fix checkout flow',
        workDesc: 'Users are dropping off at payment. Investigate and fix.',
        workStatus: 'In progress',
        workGapLabel: 'Nothing else attached',
        centreCaption: 'All the engineer actually gets',
        fragments: [
          { tool:'Customer call', icon:'ph-fill ph-phone-call',  text:'“We need card checkout before our renewal.”', x:2,  y:2,  rot:-3.2, scale:1,   dim:.10 },
          { tool:'Slack thread',  icon:'ph-fill ph-chat-circle', text:'Scope narrowed to card only — wallet deferred.',   x:71, y:0,  rot:2.6,  scale:1,   dim:.12 },
          { tool:'Meeting notes', icon:'ph-fill ph-note-blank',  text:'Decision: card checkout only, revisit wallet in Q3.', x:0,  y:40, rot:2.1,  scale:.94, dim:.24 },
          { tool:'Requirements',  icon:'ph-fill ph-file-text',   text:'Edge cases for expired cards, retries, and 3DS.',     x:75, y:38, rot:-2.4, scale:.94, dim:.26 },
          { tool:'CRM',           icon:'ph-fill ph-cloud',       text:'Renewal risk flagged by CS on this account.',         x:6,  y:78, rot:-1.8, scale:.88, dim:.36 },
          { tool:'Linear',        icon:'ph-fill ph-git-branch',  text:'Blocked on the payments tokenization change.',        x:67, y:80, rot:1.9,  scale:.88, dim:.34 }
        ],
        tally: [
          { num:'1', label:'piece of work' },
          { num:'6', label:'places hold the answer' },
          { num:'0', label:'connections between them' }
        ]
      },
      proof: {
        title: 'This is what teams are actually saying.',
        subtitle: 'Real voices describing the same fragmentation problem.',
        posts: [
          { sub:'r/ExperiencedDevs', badge:'Jira / Slack / Confluence', up:'842', comments:'214', title:'Half my job is just finding out what the ticket actually means', body:'The ticket says one thing, Slack says another, and the real decision was in a meeting nobody wrote down. I spend more time reconstructing context than writing code.' },
          { sub:'r/engineeringmanagement', badge:'Status chasing', up:'611', comments:'139', title:'I became the team\u2019s human search engine', body:'Every question about status, history, or ownership routes back to me. The information exists — but only I seem to know where it lives.' },
          { sub:'r/ProductManagement', badge:'Repeated translation', up:'527', comments:'98', title:'I explain the same requirement in four different tools', body:'Planning, the ticket, Slack, then again when the engineer starts. Each copy drifts a little and the original reasoning gets lost.' },
        ],
      },
      cta: { headline: 'Give your team the full picture around the work.', body: 'Stop checking multiple tools to understand one task. Quely keeps the ticket, decisions, docs, and conversations in one Space — so anyone can see what changed, what is blocked, and what needs attention.' },
    },

    /* ============================================================ 2. DECISIONS */
    decisions: {
      label: 'Decision & project history',
      accent: '#8F5BD7',
      workItem: { name: 'Real-time in-app notifications', id: 'NOTIF-2314', tool: 'Jira', toolIcon: 'jira' },
      hero: {
        eyebrowBase: 'The reasoning disappears',
        headline: 'The work survives. The reasoning disappears.',
        body: 'Nine weeks after your team made a careful trade-off, a new engineer asks why — and nobody can answer. The ticket kept the outcome. The thinking is gone.',
        visual: 'timeline',
      },
      problem: {
        headline: 'Decisions get separated from the work they affect.',
        body: 'The decision happened in a meeting. The reasoning lived in a thread. The tracker kept only the result. So weeks later you can see what was done, but not why, what was weighed, or who decided.',
        points: [
          'Old debates get repeated from scratch',
          'Decisions reversed without their original rationale',
          'New members revisit already-rejected approaches',
          'The team becomes dependent on a few people\u2019s memory',
        ],
        visual: 'timeline',
      },
      signalsLabel: 'The reasoning, scattered and fading',
      signals: [
        { label: 'Decision: made in a meeting', icon: 'ph-fill ph-seal-check', color: '#22C55E' },
        { label: 'Rationale: lost in a thread', icon: 'ph-fill ph-chat-circle', color: '#A78BFA' },
        { label: 'Alternative: rejected, forgotten', icon: 'ph-fill ph-x-circle', color: '#F87171' },
        { label: 'Tracker: only the outcome', icon: 'ph-fill ph-kanban', color: '#60A5FA' },
        { label: 'The person who knew: left', icon: 'ph-fill ph-user-minus', color: '#FBBF24' },
      ],
      space: {
        title: 'The decision and its reasoning, kept with the work.',
        body: 'Every scope change, trade-off, and decision stays attached to the task — with who decided and why. Ask Orbit and it reconstructs the history for you.',
        bullets: [
          { icon: 'ph-fill ph-git-commit', text: 'Full history of how the work evolved' },
          { icon: 'ph-fill ph-seal-check', text: 'Decisions with rationale and participants' },
          { icon: 'ph-fill ph-sparkle', text: 'Orbit reconstructs the “why” on demand' },
        ],
        tabs: {
          disc: [
            { who: 'Priya (PM)', when: 'Mar 3', text: 'Requirement: notifications must arrive in real time, under 2s, over WebSockets.' },
            { who: 'Elena (Platform)', when: 'Mar 14', text: 'Persistent connections at this tenant scale need a 3-week gateway project and ~4× infra cost.' },
            { who: 'Marcus (Eng lead)', when: 'Mar 15', text: 'Then we ship 30s polling for V1 and defer WebSockets to Q3. Decision recorded.' },
          ],
          docs: [
            { icon: 'ph-fill ph-file-text', name: 'Notifications PRD', meta: 'Notion · updated Mar 3' },
            { icon: 'ph-fill ph-microphone-stage', name: 'Infra review', meta: 'Transcript · 38 min' },
            { icon: 'ph-fill ph-kanban', name: 'NOTIF-2314', meta: 'Jira · polling MVP' },
          ],
          dec: [
            { text: 'Ship 30-second polling for V1', meta: 'decided in infra review · Mar 15' },
            { text: 'Defer WebSockets to Q3', meta: 'decided in infra review · Mar 15' },
            { text: 'Accept up to 30s delay to ship 5 weeks sooner', meta: 'trade-off recorded with the decision' },
          ],
          activity: [
            { text: 'Scope changed to polling MVP', meta: 'Mar 16' },
            { text: 'Decision + rationale recorded', meta: 'Mar 15' },
            { text: 'Infra review transcript attached', meta: 'Mar 14' },
          ],
        },
      },
      orbit: {
        subject: 'Real-time in-app notifications',
        intro: 'This is a simulation of an Orbit session for NOTIF-2314. Ask the question Tomás asked — or any of your own — and watch Orbit reconstruct the reasoning from the Space.',
        suggestions: [
          { label: 'Why polling, not WebSockets?', q: 'Why is this using polling instead of WebSockets?' },
          { label: 'What trade-off did we accept?', q: 'What trade-off did we accept?' },
          { label: 'Who decided this?', q: 'Who made this decision?' },
          { label: 'What got deferred?', q: 'What got deferred, and to when?' },
        ],
        answers: [
          { keys:['why','polling','websocket','decid','reason','choose','chose'], text:'It uses polling because of an infrastructure constraint, not a preference. In the Mar 14 infra review, Elena showed that persistent WebSocket connections at current tenant scale would need a three-week connection-gateway project and roughly 4× the infra cost. The team chose 30-second polling for V1 and deferred WebSockets to Q3.' },
          { keys:['trade','tradeoff','trade-off','accept','cost','compromise'], text:'The accepted trade-off was up to 30 seconds of notification delay in exchange for shipping five weeks sooner and avoiding the gateway project. That was recorded on Mar 15 with the decision itself.' },
          { keys:['who','decid','approv','made','responsible','own'], text:'Priya (PM), Marcus (eng lead), and Elena (platform lead) made the call together in the Mar 14 infra review, recorded Mar 15. The transcript is attached to NOTIF-2314.' },
          { keys:['defer','deferred','later','q3','postpone','when','next'], text:'WebSockets were deferred to Q3, along with the connection-gateway work they depend on. The original sub-2-second real-time requirement is still on the roadmap — it was not dropped, only sequenced.' },
          { keys:['chang','scope','since','update','happen','history','fix','should i'], text:'Scope changed on Mar 15: from real-time delivery under 2s via WebSockets, to a polling MVP at a 30-second interval. Nothing has changed since. Before "fixing" it, note the gateway project is the actual prerequisite — that is what the Q3 plan covers.' },
        ],
        fallback: { text: 'The Space holds the full history for NOTIF-2314: the original real-time requirement, the Mar 14 infra review that changed the direction, the decision to ship 30-second polling, the trade-off accepted, and who decided. Ask why polling was chosen, what trade-off was accepted, who decided, or what got deferred.' },
      },
      lensSubject: 'Real-time in-app notifications',
      lenses: [
        { id:'decisions', label:'Decisions', icon:'ph-fill ph-seal-check', color:'#22C55E', items:['Ship 30-second polling for V1','Defer WebSockets to Q3','Accept up to 30s delay to ship sooner'] },
        { id:'rationale', label:'Rationale', icon:'ph-fill ph-lightbulb', color:'#FBBF24', items:['Gateway project would add three weeks','WebSockets ~4× infra cost at current scale','Shipping five weeks sooner judged more valuable'] },
        { id:'risks', label:'Risks', icon:'ph-fill ph-warning', color:'#F87171', items:['New engineers may re-open the polling decision','Real-time requirement still unmet until Q3'] },
        { id:'actions', label:'Actions', icon:'ph-fill ph-list-checks', color:'#60A5FA', items:['Scope the Q3 connection-gateway work','Record the trade-off on the ticket itself'] },
        { id:'next', label:'Next steps', icon:'ph-fill ph-arrow-right', color:'#818CF8', items:['Schedule the phased rollout','Brief new engineers on the decision'] },
      ],
      capabilities: ['decisions','timeline','orbit','space','lenses','meetings'],
      capabilitiesTitle: 'Built to keep the reasoning with the work.',
      sections: { proof:false, space:false, orbit:true, lenses:false, capacity:false, features:false, timeline:true, mechanism:true, outcome:true },
      primaryDemo: 'orbit',
      heroVisual: 'thread',

      /* ---- SHARED SCENARIO (NOTIF-2314). Every block on this page uses it. ---- */
      scenario: {
        workItem: { name:'Real-time in-app notifications', id:'NOTIF-2314', tool:'jira' },
        people: [
          { name:'Priya',  role:'PM',            initials:'PR', color:'#5C28A4' },
          { name:'Elena',  role:'Platform lead', initials:'EL', color:'#2563EB' },
          { name:'Marcus', role:'Eng lead',      initials:'MA', color:'#16A34A' },
          { name:'Tom\u00e1s', role:'Engineer, joined April', initials:'TO', color:'#D97706' }
        ],
        decision: { text:'Ship 30-second polling for V1. Defer WebSockets to Q3.', date:'Mar 15', participants:'Priya, Marcus, Elena', source:'Infra review \u00b7 Mar 14' },
        rationale: 'Persistent WebSocket connections at current tenant scale need a three-week connection-gateway project and roughly 4\u00d7 the infra cost.',
        tradeoff: 'Accepted up to 30 seconds of notification delay in exchange for shipping five weeks sooner.',
        scopeChange: { from:'Real-time delivery under 2s via WebSockets', to:'Polling MVP, 30-second interval' },
        laterQuestion: { who:'Tom\u00e1s', when:'9 weeks later', text:'Why is notifications polling? WebSockets seems obviously better \u2014 should I fix this?' }
      },

      /* ---- BLOCK: decision timeline ---- */
      timeline: {
        title: 'Watch the reasoning come apart.',
        intro: 'One work item, seven weeks. Every step was written down somewhere. Follow what survives \u2014 and what quietly detaches from the ticket.',
        events: [
          { id:'e1', date:'Mar 3',  kind:'requirement', source:'doc',     actor:'Priya',  sourceLabel:'Notifications PRD \u00b7 Notion',
            title:'The original requirement', detail:'Notifications must arrive in real time, under two seconds, on web and mobile \u2014 delivered over WebSockets.', kept:true },
          { id:'e2', date:'Mar 10', kind:'build',       source:'jira',    actor:'Marcus', sourceLabel:'NOTIF-2314 \u00b7 Jira',
            title:'Work starts', detail:'Ticket created and picked up by the Platform squad. Acceptance criteria: real-time via WebSockets.', kept:true },
          { id:'e3', date:'Mar 14', kind:'discussion',  source:'meeting', actor:'Elena',  sourceLabel:'Infra review \u00b7 transcript',
            title:'Something changes the direction', detail:'Persistent connections at current tenant scale need a three-week connection-gateway project and about 4\u00d7 the infra cost.', kept:true },
          { id:'e4', date:'Mar 15', kind:'decision',    source:'meeting', actor:'Priya, Marcus, Elena', sourceLabel:'Decided in the review \u00b7 recorded nowhere',
            title:'The decision and the trade-off', detail:'Ship 30-second polling for V1, defer WebSockets to Q3. Up to 30s delay accepted in exchange for shipping five weeks sooner.', kept:false,
            note:'This is the moment the reasoning separates from the work.' },
          { id:'e5', date:'Mar 16', kind:'scopeChange', source:'slack',   actor:'Marcus', sourceLabel:'#platform-eng \u00b7 Slack',
            title:'The scope change', detail:'\u201cRetitling the ticket to polling MVP and updating the acceptance criteria.\u201d No reason given in the thread.', kept:false },
          { id:'e6', date:'Apr 2',  kind:'ticketState', source:'jira',    actor:'\u2014',      sourceLabel:'NOTIF-2314 \u00b7 Jira',
            title:'What the ticket kept', detail:'Notifications: polling MVP \u00b7 30-second interval \u00b7 Done. The outcome survived. The reasoning did not.', kept:false },
          { id:'e7', date:'May 21', kind:'question',    source:'slack',   actor:'Tom\u00e1s', sourceLabel:'#platform-eng \u00b7 Slack',
            title:'Nine weeks later', detail:'\u201cWhy is notifications polling? WebSockets seems obviously better \u2014 should I fix this?\u201d Nobody in the thread remembers the details.', kept:false, unanswered:true }
        ]
      },

      /* ---- BLOCK: mechanism ---- */
      mechanism: {
        title: 'In Quely, that thread does not break.',
        body: 'The decision stays attached to the work it changed \u2014 with the reasoning, the trade-off, who decided, and the meeting it came from. Nobody retypes anything into a wiki.',
        record: {
          attachedTo: 'NOTIF-2314 \u00b7 Real-time in-app notifications',
          rows: [
            { label:'Decision',   icon:'ph-fill ph-seal-check', color:'#16A34A', text:'Ship 30-second polling for V1. Defer WebSockets to Q3.' },
            { label:'Rationale',  icon:'ph-fill ph-lightbulb',  color:'#D97706', text:'Persistent connections need a three-week gateway project and ~4\u00d7 infra cost at current scale.' },
            { label:'Trade-off',  icon:'ph-fill ph-scales',     color:'#6366F1', text:'Up to 30s delay accepted to ship five weeks sooner.' },
            { label:'Decided by', icon:'ph-fill ph-users-three',color:'#5C28A4', text:'Priya (PM), Marcus (Eng lead), Elena (Platform lead)' },
            { label:'Source',     icon:'ph-fill ph-microphone-stage', color:'#2563EB', text:'Infra review, Mar 14 \u00b7 transcript attached' }
          ]
        }
      },

      /* ---- BLOCK: outcome ---- */
      outcome: {
        title: 'The next person does not have to ask.',
        body: 'Same team, same trade-off, same nine-week gap \u2014 different ending.',
        points: [
          { icon:'ph-fill ph-clock-countdown', text:'A question answered in seconds instead of half a day of archaeology' },
          { icon:'ph-fill ph-lock-simple',     text:'A settled decision that stays settled, instead of being re-litigated' },
          { icon:'ph-fill ph-user-check',      text:'No senior engineer pulled away to remember what happened' }
        ]
      },
      proof: {
        title: 'This is what teams are actually saying.',
        subtitle: 'Real voices describing lost decisions and history.',
        posts: [
          { sub:'r/ExperiencedDevs', badge:'Lost rationale', up:'734', comments:'181', title:'We keep re-deciding things we already decided', body:'Six months later nobody remembers why we ruled out an approach, so we debate it all over again. The decision is in the tracker; the reasoning evaporated.' },
          { sub:'r/cscareerquestions', badge:'Onboarding', up:'688', comments:'156', title:'Onboarding is just archaeology', body:'I got links to tickets, docs, and Slack channels — but no way to tell which decisions still matter or why the code looks the way it does.' },
          { sub:'r/engineeringmanagement', badge:'Knowledge loss', up:'559', comments:'112', title:'A senior left and took the “why” with them', body:'We still have all their tickets and docs. What we lost was the understanding of how it fits together and why past calls were made.' },
        ],
      },
      cta: { headline: 'Keep every decision — and its reasoning — with the work.', body: 'Stop losing the “why” behind your projects. Quely keeps decisions, trade-offs, and history attached to the work, so the reasoning survives long after the meeting.' },
    },

    /* ============================================================ 3. RISKS */
    risks: {
      label: 'Risks, dependencies & delivery visibility',
      accent: '#8F5BD7',
      workItem: { name: 'Q3 platform release', id: 'REL-Q3', tool: 'Jira', toolIcon: 'jira' },
      hero: {
        eyebrowBase: 'Risks surface too late',
        headline: 'The risk was always there. It just lived in three different places.',
        body: 'A blocker in a meeting transcript, a dependency mentioned in a thread, a concern raised on another task. Because the pieces live apart, no one sees their combined significance — until a delivery date slips without warning.',
        visual: 'dependency',
      },
      problem: {
        headline: 'Risks and dependencies stay hidden until they hit.',
        body: 'The signals exist — scattered across tickets, meetings, and conversations. Managers react to problems instead of preventing them, because nothing connects the pieces into an early warning.',
        points: [
          'A blocker is discovered after implementation begins',
          'Two teams unknowingly depend on the same resource',
          'A delivery date slips with no early signal',
          'Status looks fine right up until it doesn\u2019t',
        ],
        visual: 'dependency',
      },
      signalsLabel: 'The signals, sitting apart in different tools',
      signals: [
        { label: 'Blocker: in a transcript', icon: 'ph-fill ph-microphone-stage', color: '#FBBF24' },
        { label: 'Dependency: in a thread', icon: 'ph-fill ph-chat-circle', color: '#A78BFA' },
        { label: 'Concern: on another task', icon: 'ph-fill ph-warning', color: '#F87171' },
        { label: 'Critical path: unmapped', icon: 'ph-fill ph-graph', color: '#38BDF8' },
        { label: 'Status: green until it slips', icon: 'ph-fill ph-check-circle', color: '#22C55E' },
      ],
      space: {
        title: 'Every signal about the release, connected.',
        body: 'Blockers, dependencies, and concerns from across tickets and meetings come together around the release. Orbit connects them into a picture of what is actually at risk.',
        bullets: [
          { icon: 'ph-fill ph-graph', text: 'Dependencies mapped across teams' },
          { icon: 'ph-fill ph-warning', text: 'Risks surfaced from every source' },
          { icon: 'ph-fill ph-sparkle', text: 'Orbit connects the early signals' },
        ],
        tabs: {
          disc: [
            { who: 'Rel Manager', when: '2d', text: 'Payments API freeze lands mid-Q3. Anything depending on it needs to merge before then.' },
            { who: 'Payments', when: '1d', text: 'Checkout and refunds both depend on it. Refunds is behind.' },
            { who: 'Rel Manager', when: '20h', text: 'That is our critical path then. Flagging refunds as the release risk.' },
          ],
          docs: [
            { icon: 'ph-fill ph-file-text', name: 'Q3 release plan', meta: 'Doc · updated 1d ago' },
            { icon: 'ph-fill ph-graph', name: 'Dependency map', meta: 'Diagram · 9 nodes' },
            { icon: 'ph-fill ph-microphone-stage', name: 'Release sync', meta: 'Transcript · 32 min' },
          ],
          dec: [
            { text: 'Refunds flagged as the release critical path', meta: 'decided in release sync' },
            { text: 'Payments API freeze is a hard cutoff', meta: 'decided in release sync' },
          ],
          activity: [
            { text: 'Refunds flagged as risk', meta: '20h ago' },
            { text: 'Dependency map updated', meta: '1d ago' },
            { text: 'Freeze date confirmed', meta: '2d ago' },
          ],
        },
      },
      orbit: {
        subject: 'Q3 platform release',
        intro: 'This is a simulation of an Orbit session for the “Q3 platform release.” Ask about risks and dependencies and watch Orbit connect the signals.',
        suggestions: [
          { label: "What's at risk?", q: 'What is at risk in this release?' },
          { label: 'Critical path?', q: 'What is the critical path?' },
          { label: 'Where do we need help?', q: 'Where does the team need help?' },
          { label: 'Any hidden dependencies?', q: 'Are there hidden dependencies?' },
        ],
        answers: [
          { keys:['risk','at risk','danger','slip','worried','concern'], text:'The release risk is refunds. It depends on the payments API, which hits a hard freeze mid-Q3, and refunds is currently behind schedule — so if it does not merge before the freeze, the release slips.' },
          { keys:['critical','path','blocker','block','depend'], text:'Critical path: payments API freeze → refunds → release. Checkout also depends on the API but is on track. Refunds is the one that determines the date.' },
          { keys:['help','where','support','behind','stuck'], text:'Refunds needs help. It is the only critical-path item behind schedule, and the payments freeze removes any slack. That is where an extra engineer would most change the outcome.' },
          { keys:['hidden','dependenc','connect','other team','unknown'], text:'Two teams depend on the same payments API window — checkout and refunds. That shared dependency was mentioned in separate threads; connected, it is the single biggest exposure for the release.' },
          { keys:['status','on track','update','latest','ready'], text:'Overall: on track except refunds. The freeze date is confirmed, the dependency map is current, and refunds is flagged as the risk. Nothing else is currently blocking.' },
        ],
        fallback: { text: 'The Space connects the release signals: a payments API freeze mid-Q3, refunds behind schedule on the critical path, and a shared dependency between checkout and refunds. Ask what is at risk, the critical path, or where the team needs help.' },
      },
      lensSubject: 'Q3 platform release',
      lenses: [
        { id:'risks', label:'Risks', icon:'ph-fill ph-warning', color:'#F87171', items:['Refunds may miss the payments freeze','Two teams share one API window','No slack left in the schedule'] },
        { id:'dependencies', label:'Dependencies', icon:'ph-fill ph-graph', color:'#38BDF8', items:['Refunds → payments API','Checkout → payments API','Release → refunds (critical path)'] },
        { id:'actions', label:'Actions', icon:'ph-fill ph-list-checks', color:'#60A5FA', items:['Add an engineer to refunds','Confirm the freeze date with Platform','Prepare a fallback if refunds slips'] },
        { id:'decisions', label:'Decisions', icon:'ph-fill ph-seal-check', color:'#22C55E', items:['Refunds is the release critical path','Freeze is a hard cutoff'] },
        { id:'next', label:'Next steps', icon:'ph-fill ph-arrow-right', color:'#818CF8', items:['Daily check-in on refunds','Escalate if not merged in 5 days'] },
      ],
      capabilities: ['deps','orbit','lenses','space','meetings','decisions'],
      capabilitiesTitle: 'Built to surface risk before it lands.',
      sections: { proof:false, space:false, orbit:true, lenses:true, capacity:false, features:true },
      primaryDemo: 'lenses',
      proof: {
        title: 'This is what teams are actually saying.',
        subtitle: 'Real voices describing risk that surfaced too late.',
        posts: [
          { sub:'r/engineeringmanagement', badge:'Late blockers', up:'796', comments:'203', title:'Everything is “green” until the week it ships', body:'Status reports look fine, then a dependency nobody connected blows up the date. The signals were all there — just in different tools.' },
          { sub:'r/ExperiencedDevs', badge:'Hidden dependencies', up:'642', comments:'147', title:'Two teams were building on the same thing and nobody knew', body:'We found out during integration. Each team had mentioned it in their own channel; no one saw both.' },
          { sub:'r/projectmanagement', badge:'Delivery visibility', up:'514', comments:'96', title:'I can see status. I can\u2019t see what\u2019s actually at risk', body:'The board tells me what state things are in. It does not tell me which thing is going to slip and why.' },
        ],
      },
      cta: { headline: 'See what\u2019s at risk before the date slips.', body: 'Stop discovering blockers during integration. Quely connects risks and dependencies from across tickets, meetings, and threads — so the critical path is visible while there is still time to act.' },
    },

    /* ============================================================ 4. CAPACITY */
    capacity: {
      label: 'Planning & capacity',
      accent: '#8F5BD7',
      workItem: { name: 'Sprint 24 planning', id: 'SPRINT-24', tool: 'Jira', toolIcon: 'jira' },
      hero: {
        eyebrowBase: 'Plans ignore real capacity',
        headline: 'The sprint looked achievable. Then real life happened.',
        body: 'Teams commit based on velocity, intuition, or pressure — not the actual availability of each person. The work that was already competing for their time was never in the picture, so the plan collapses during execution.',
        visual: 'capacity',
      },
      problem: {
        headline: 'Planning decisions ignore actual capacity.',
        body: 'What looks like a successful plan on Monday quietly overcommits half the team. The existing responsibilities, the on-call week, the carry-over — none of it was visible when the commitment was made.',
        points: [
          'Overcommitment hidden until mid-sprint',
          'Missed goals and repeated carry-over',
          'Workload imbalance across the team',
          'Unreliable commitments to stakeholders',
        ],
        visual: 'capacity',
      },
      signalsLabel: 'What the plan never counted',
      signals: [
        { label: 'On-call: half a person gone', icon: 'ph-fill ph-phone-call', color: '#F87171' },
        { label: 'Carry-over: from last sprint', icon: 'ph-fill ph-arrows-clockwise', color: '#FBBF24' },
        { label: 'Meetings: real hours', icon: 'ph-fill ph-calendar', color: '#A78BFA' },
        { label: 'Velocity: a guess, not capacity', icon: 'ph-fill ph-gauge', color: '#38BDF8' },
        { label: 'Overload: invisible on the board', icon: 'ph-fill ph-user-focus', color: '#60A5FA' },
      ],
      space: {
        title: 'The plan, against the capacity you actually have.',
        body: 'See assigned work and real availability before the sprint is committed. Ask Orbit who is overloaded and what will realistically fit — before it becomes a missed goal.',
        bullets: [
          { icon: 'ph-fill ph-gauge', text: 'Assigned work and availability, side by side' },
          { icon: 'ph-fill ph-users-three', text: 'Individual workload made visible' },
          { icon: 'ph-fill ph-sparkle', text: 'Orbit flags overload before you commit' },
        ],
        tabs: {
          disc: [
            { who: 'EM', when: '2d', text: 'Proposed sprint is 48 points. But Dana is on-call and Ravi has carry-over from S23.' },
            { who: 'Dana (Eng)', when: '1d', text: 'On-call realistically halves my capacity that week.' },
            { who: 'EM', when: '20h', text: 'Then 48 is not real. Trimming to 36 and moving two items out.' },
          ],
          docs: [
            { icon: 'ph-fill ph-gauge', name: 'Capacity board — S24', meta: 'Board · 6 people' },
            { icon: 'ph-fill ph-file-text', name: 'Sprint 24 goals', meta: 'Doc · draft' },
            { icon: 'ph-fill ph-arrows-clockwise', name: 'S23 carry-over', meta: 'List · 4 items' },
          ],
          dec: [
            { text: 'Sprint trimmed from 48 to 36 points', meta: 'decided in planning' },
            { text: 'Two items deferred to S25', meta: 'decided in planning' },
            { text: 'Dana\u2019s on-call week counted at 50%', meta: 'decided in planning' },
          ],
          activity: [
            { text: 'Commitment set to 36 pts', meta: '20h ago' },
            { text: 'Dana marked on-call', meta: '1d ago' },
            { text: 'Carry-over pulled in', meta: '2d ago' },
          ],
        },
      },
      orbit: {
        subject: 'Sprint 24 planning',
        intro: 'This is a simulation of an Orbit session for “Sprint 24 planning.” Ask about capacity and workload and watch Orbit answer before you commit.',
        suggestions: [
          { label: 'Who is overloaded?', q: 'Who is overloaded this sprint?' },
          { label: 'Will this fit?', q: 'Will the proposed sprint actually fit?' },
          { label: "What's not counted?", q: 'What work is not being counted?' },
          { label: 'What should we cut?', q: 'What should we cut to make it realistic?' },
        ],
        answers: [
          { keys:['overload','too much','capacity','who','stretched'], text:'Dana is overloaded. She is on-call this sprint, which realistically halves her availability, but she is still assigned a full load. Ravi is also over because his S23 carry-over was not counted.' },
          { keys:['fit','realistic','achiev','48','commit','possible'], text:'The proposed 48 points do not fit. Once on-call and carry-over are counted, real capacity is closer to 36. Committing to 48 repeats last sprint\u2019s overcommitment.' },
          { keys:['not counted','missing','hidden','forgot','ignore','existing'], text:'Two things are not in the plan: Dana\u2019s on-call week (about 50% of her time) and four carry-over items from S23. Together they explain most of the gap between the plan and reality.' },
          { keys:['cut','trim','defer','remove','reduce','drop'], text:'To make it realistic, trim to 36 points: defer two lower-priority items to S25 and count Dana\u2019s on-call at 50%. That matches the commitment to actual capacity.' },
          { keys:['balance','imbalance','spread','distribut','fair'], text:'Workload is uneven: Dana and Ravi are over, while two others have room. Rebalancing two items would even it out without changing the total.' },
        ],
        fallback: { text: 'The Space shows the sprint plan against real capacity: 48 points proposed, but on-call and carry-over bring true capacity to ~36. Ask who is overloaded, whether it fits, what is not counted, or what to cut.' },
      },
      lensSubject: 'Sprint 24 planning',
      lenses: [
        { id:'risks', label:'Capacity risks', icon:'ph-fill ph-warning', color:'#F87171', items:['Dana overloaded (on-call week)','Ravi over from S23 carry-over','48-point plan exceeds real capacity'] },
        { id:'decisions', label:'Decisions', icon:'ph-fill ph-seal-check', color:'#22C55E', items:['Trim sprint from 48 to 36 points','Defer two items to S25','Count on-call at 50%'] },
        { id:'actions', label:'Actions', icon:'ph-fill ph-list-checks', color:'#60A5FA', items:['Rebalance two items off Dana','Confirm carry-over ownership','Update stakeholder commitment'] },
        { id:'questions', label:'Open questions', icon:'ph-fill ph-question', color:'#C084FC', items:['Can on-call be swapped this sprint?','Which two items are safe to defer?'] },
        { id:'next', label:'Next steps', icon:'ph-fill ph-arrow-right', color:'#818CF8', items:['Lock the 36-point commitment','Share realistic date with stakeholders'] },
      ],
      capabilities: ['capacity','orbit','space','async','lenses','decisions'],
      capabilitiesTitle: 'Built to plan against the capacity you have.',
      sections: { proof:false, space:false, orbit:false, lenses:false, capacity:true, features:true },
      primaryDemo: 'capacity',
      capacityDemo: {
        sprint: 'Sprint 24',
        avail: 10,
        members: [
          { name:'Dana Reed', role:'Backend', items:[ { label:'On-call week', pts:5, kind:'oncall' }, { label:'Checkout API', pts:5, kind:'sprint' }, { label:'Refund bugfix', pts:3, kind:'sprint' } ] },
          { name:'Ravi Shah', role:'Frontend', items:[ { label:'S23 carry-over', pts:3, kind:'carry' }, { label:'Settings redesign', pts:5, kind:'sprint' } ] },
          { name:'Mei Lin', role:'Full-stack', items:[ { label:'Search revamp', pts:5, kind:'sprint' } ] },
          { name:'Tom Ford', role:'Backend', items:[ { label:'Meetings & reviews', pts:2, kind:'meeting' }, { label:'Billing fix', pts:3, kind:'sprint' } ] }
        ],
        backlog: [ { label:'Refunds flow', pts:5, kind:'sprint' }, { label:'Email templates', pts:3, kind:'sprint' }, { label:'Audit log', pts:5, kind:'sprint' } ]
      },
      proof: {
        title: 'This is what teams are actually saying.',
        subtitle: 'Real voices describing unrealistic plans.',
        posts: [
          { sub:'r/agile', badge:'Overcommitment', up:'703', comments:'168', title:'Every sprint plan is a work of fiction', body:'We commit to a number that ignores on-call, meetings, and carry-over. Then we act surprised when half of it rolls over.' },
          { sub:'r/engineeringmanagement', badge:'Workload visibility', up:'627', comments:'134', title:'I can\u2019t see who is actually underwater', body:'Everyone looks equally busy on the board. The real overload is invisible until someone burns out or misses.' },
          { sub:'r/projectmanagement', badge:'Unrealistic commitments', up:'488', comments:'91', title:'Stakeholders get a date I already know we\u2019ll miss', body:'The plan doesn\u2019t reflect what the team can really do, so I\u2019m committing to something unrealistic on day one.' },
        ],
      },
      cta: { headline: 'Commit to a sprint the team can actually deliver.', body: 'Stop planning on a number that ignores reality. Quely shows assigned work and real availability before you commit — so your plan survives contact with the sprint.' },
    },
  };

  /* ---------------------------------------------------------------- builder */

  /* ------------------------------------------------- VISUAL BLOCK REGISTRY
     The generator does not hand-write sections: it SELECTS approved visual
     blocks and populates them. Each block is a sibling .dc.html Design
     Component; the PagePlan names which appear, in order, for a given problem.
     Hero blocks (Scatter / Thread) are the page's own hero treatment, so the
     narrative set below lists the mechanism + outcome blocks the page mounts. */
  const BLOCK_FILES = {
    thread:     'Block Hero Thread',
    collision:  'Block Hero Collision',
    bottleneck: 'Block Hero Bottleneck',
    handoff:    'Block Hero Handoff',
    converge:   'Block Space Converge',
    anatomy:    'Block Space Anatomy',
    relmap:     'Block Relationship Map',
    multitool:  'Block Multi Tool Space',
    record:     'Block Decision Record',
    lenses:     'Block Orbit Lenses',
    planning:   'Block Sprint Planning',
    review:     'Block Sprint Review',
    roles:      'Block Team Roles',
    beforeafter:'Block Before After',
    howitworks: 'Block How It Works',
    ctaFrag:    'Block CTA Fragmentation',
    ctaDec:     'Block CTA Decisions',
    ctaRisk:    'Block CTA Risks',
    ctaKnow:    'Block CTA Knowledge',
    ctaAction:  'Block CTA Action'
  };

  /* problem topic -> ordered visual blocks. Several topics share a set, with
     their own copy, which is the point of a block library. */
  const BLOCK_SETS = {
    'context-fragmentation': ['scatter', 'anatomy', 'roles', 'ctaFrag'],
    'work-before-work':      ['converge', 'howitworks', 'ctaFrag'],
    'conflicting-info':      ['multitool', 'beforeafter', 'ctaFrag'],
    'human-search-engine':   ['converge', 'lenses', 'beforeafter', 'ctaFrag'],
    'repeated-translation':  ['anatomy', 'roles', 'ctaFrag'],

    'decision-traceability': ['thread', 'record', 'lenses', 'ctaDec'],
    'unexplained-change':    ['thread', 'record', 'beforeafter', 'ctaDec'],
    'onboarding':            ['bottleneck', 'record', 'anatomy', 'ctaKnow'],
    'knowledge-loss':        ['bottleneck', 'record', 'lenses', 'ctaKnow'],

    'risk-dependencies':     ['collision', 'relmap', 'lenses', 'ctaRisk'],
    'status-chasing':        ['collision', 'lenses', 'roles', 'ctaRisk'],
    'distributed-async':     ['collision', 'multitool', 'anatomy', 'ctaRisk'],

    'ceremony-loss':         ['handoff', 'lenses', 'review', 'ctaAction'],
    'retro-followthrough':   ['handoff', 'review', 'planning', 'ctaAction']
  };

  function blockKeysFor(topic) {
    return BLOCK_SETS[topic] || BLOCK_SETS['context-fragmentation'];
  }

  /* Which beats each block owns. The viewer derives BOTH mounting and suppression
     from this, so a plan stored before these fields existed still behaves correctly. */
  const OWNS = {
    converge:{space:true}, anatomy:{space:true}, multitool:{space:true}, relmap:{space:true},
    collision:{problem:true}, thread:{problem:true}, bottleneck:{problem:true},
    handoff:{problem:true}, scatter:{problem:true},
    lenses:{orbit:true, lenses:true}, review:{proof:true},
    planning:{features:true}, roles:{features:true}, howitworks:{features:true},
    record:{}, ctaFrag:{cta:true}, ctaDec:{cta:true}, ctaRisk:{cta:true},
    ctaKnow:{cta:true}, ctaAction:{cta:true}
  };
  const HERO_KEYS = ['collision','thread','bottleneck','handoff','scatter'];

  /* Computed from the LIVE block keys, never from persisted plan fields. */
  function ownedSections(keys) {
    const out = { hero:false, problem:false, space:false, orbit:false, lenses:false,
                  proof:false, features:false, cta:false };
    (keys || []).forEach(function (k) {
      const o = OWNS[k] || {};
      Object.keys(o).forEach(function (sec) { out[sec] = true; });
      if (HERO_KEYS.indexOf(k) !== -1) out.hero = true;
    });
    return out;
  }

  function familyFor(topic) {
    var f = TOPIC_FAMILY[topic] || 'fragmentation';
    return INACTIVE_FAMILIES[f] ? 'fragmentation' : f;
  }
  function activeFamilyKeys() { return Object.keys(FAMILIES).filter(function (k) { return !INACTIVE_FAMILIES[k]; }); }

  function buildPagePlan(opts) {
    opts = opts || {};
    const topic = opts.topic || opts.painPoint || 'context-fragmentation';
    const famKey = familyFor(topic);
    const F = FAMILIES[famKey];
    const company = opts.company || '';
    const name = opts.name || '';
    const role = opts.role || 'eng-leader';

    const _lib = (typeof window !== 'undefined' && window.QuelyLibrary) || (typeof global !== 'undefined' && global.QuelyLibrary) || null;
    const topicLabel = (_lib && _lib.TOPICS && _lib.TOPICS.find(function (t) { return t.slug === topic; }) || {}).label || F.label;
    const heroEyebrow = company ? ('For ' + company + ' \u00b7 ' + topicLabel) : ('For teams facing ' + topicLabel.toLowerCase());

    const caps = F.capabilities.map(function (id) { return CAP[id] || CAP.space; }).slice(0, 6);
    const blockKeys = blockKeysFor(topic);
    // The viewer mounts these blocks, so each block stands the viewer's own
    // equivalent section down. One beat is only ever told once.
    const OWNS_LOCAL = {
      converge:{space:true}, anatomy:{space:true}, multitool:{space:true},
      relmap:{space:true},
      collision:{problem:true}, thread:{problem:true},
      bottleneck:{problem:true}, handoff:{problem:true}, scatter:{problem:true},
      lenses:{orbit:true, lenses:true}, review:{proof:true},
      planning:{features:true}, roles:{features:true}, howitworks:{features:true},
      record:{}, ctaFrag:{}, ctaDec:{}, ctaRisk:{}, ctaKnow:{}, ctaAction:{}
    };
    const blockSections = blockKeys.reduce(function (acc, k) {
      const owned = OWNS_LOCAL[k] || {};
      Object.keys(owned).forEach(function (sec) { acc[sec] = false; });
      return acc;
    }, {});

    return {
      family: famKey,
      familyLabel: F.label,
      accent: F.accent,
      topic: topic,
      topicLabel: topicLabel,
      prospect: { company: company, name: name, role: role },
      workItem: F.workItem,
      hero: {
        eyebrow: heroEyebrow,
        headline: F.hero.headline,
        body: F.hero.body,
        visual: F.hero.visual,
      },
      problem: {
        headline: F.problem.headline,
        body: F.problem.body,
        points: F.problem.points,
        visual: F.problem.visual,
      },
      scattered: F.scattered || null,
      signals: F.signals || [],
      signalsLabel: F.signalsLabel || 'The pieces, scattered',
      space: F.space,
      orbit: F.orbit,
      lenses: F.lenses,
      lensSubject: F.lensSubject,
      capabilities: caps,
      capabilitiesTitle: F.capabilitiesTitle,
      sections: Object.assign({ proof:true, space:true, orbit:true, lenses:true, capacity:false, features:true, timeline:false, mechanism:false, outcome:false }, F.sections || {}, blockSections),
      primaryDemo: F.primaryDemo || 'orbit',
      blockKeys: blockKeys,
      blockOrder: blockKeys.map(function (k) { return BLOCK_FILES[k]; }),
      // a hero block owns the opening, so the page's own hero stands down
      ownsHero: blockKeys.some(function (k) { return /^(collision|thread|bottleneck|handoff|scatter)$/.test(k); }),
      // CTA blocks are terminal: they render after every inline section
      ctaBlocks: blockKeys.filter(function (k) { return /^cta/.test(k); }).map(function (k) { return BLOCK_FILES[k]; }),
      bodyBlocks: blockKeys.filter(function (k) { return !/^cta/.test(k); }).map(function (k) { return BLOCK_FILES[k]; }),
      blocks: Object.keys(BLOCK_FILES).reduce(function (acc, k) {
        acc[k] = blockKeys.indexOf(k) !== -1; return acc;
      }, {}),
      capacityDemo: F.capacityDemo || null,
      heroVisual: F.heroVisual || 'product',
      heroScatter: F.heroScatter || null,
      scenario: F.scenario || null,
      timeline: F.timeline || null,
      mechanism: F.mechanism || null,
      outcome: F.outcome || null,
      proof: F.proof,
      cta: F.cta,
    };
  }

  const API = { FAMILIES: FAMILIES, TOPIC_FAMILY: TOPIC_FAMILY, BLOCK_FILES: BLOCK_FILES, BLOCK_SETS: BLOCK_SETS, blockKeysFor: blockKeysFor, INACTIVE_FAMILIES: INACTIVE_FAMILIES, activeFamilyKeys: activeFamilyKeys, familyFor: familyFor, OWNS: OWNS, ownedSections: ownedSections, buildPagePlan: buildPagePlan };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.QuelyPagePlans = API;
})();
