/* quely-content-library.js
   The Quely Information Library, structured into tagged, reusable content blocks.
   The prospect-page generator selects & orders blocks from this library by
   matching a prospect's {role, topic} against each block's tags.

   Source of truth: "Quely Information Library" doc. Copy is taken from that doc
   (esp. the §21 approved problem statements) — no invented metrics or claims.
   Integration liveness is left neutral ("supported/referenced") per the doc's note.

   Block shape:
     { id, type, topic[], role[], title, kicker?, body?, points?[], quote?, demo?, cta? }
   type:  'problem' | 'capability' | 'usecase' | 'proof' | 'objection' | 'role' | 'cta' | 'statement'
   topic: canonical topic slugs (see TOPICS)
   role:  canonical role slugs (see ROLES); [] or ['any'] means fits all roles
   demo:  'orbit' | 'space' | 'lens'  (which interactive demo best illustrates it)
*/
(function () {
  const TOPICS = [
    { slug: 'context-fragmentation', label: 'Context scattered across tools' },
    { slug: 'work-before-work',      label: 'Time lost understanding the work' },
    { slug: 'status-chasing',        label: 'Chasing status & updates' },
    { slug: 'human-search-engine',   label: 'One person is the team\u2019s memory' },
    { slug: 'repeated-translation',  label: 'Repeating the same information' },
    { slug: 'decision-traceability', label: 'Lost decisions & rationale' },
    { slug: 'unexplained-change',    label: 'Changes without explanation' },
    { slug: 'conflicting-info',      label: 'Conflicting info across tools' },
    { slug: 'risk-dependencies',     label: 'Hidden risks & dependencies' },
    { slug: 'onboarding',            label: 'Onboarding into a project' },
    { slug: 'knowledge-loss',        label: 'Knowledge lost when people leave' },
    { slug: 'distributed-async',     label: 'Distributed / async coordination' },
    { slug: 'ceremony-loss',         label: 'Ceremony outputs don\u2019t survive' },
    { slug: 'capacity-planning',     label: 'Capacity & realistic planning' },
    { slug: 'retro-followthrough',   label: 'Retro actions don\u2019t get done' },
  ];

  const ROLES = [
    { slug: 'eng-leader',  label: 'Engineering manager / tech lead' },
    { slug: 'pm',          label: 'Product manager' },
    { slug: 'engineer',    label: 'Engineer' },
    { slug: 'exec',        label: 'Product / engineering leader' },
    { slug: 'new-member',  label: 'New team member' },
    { slug: 'stakeholder', label: 'Stakeholder / guest' },
  ];

  const ANY = ['any'];

  /* ---------------------------------------------------------------- PROBLEMS (§5) */
  const PROBLEMS = [
    { id: 'p-ticket-meaning', type: 'problem', topic: ['context-fragmentation'], role: ['engineer', 'eng-leader', 'pm'],
      demo: 'orbit',
      title: 'Tickets don\u2019t contain the full meaning of the work',
      body: 'An engineer opens a ticket and sees a title, a short description, and an assignee. The full explanation lives elsewhere.',
      points: ['The customer problem came from a call', 'The scope was narrowed in a Slack thread', 'A design decision changed during review', 'A dependency was mentioned in planning', 'The deadline changed in a stakeholder meeting'],
      consequence: 'Slower starts, repeated questions, incorrect implementation, rework, and reopened decisions.' },

    { id: 'p-work-before-work', type: 'problem', topic: ['work-before-work', 'context-fragmentation'], role: ['engineer', 'eng-leader'],
      demo: 'orbit',
      title: 'Teams spend too much time doing \u201cwork before work\u201d',
      body: 'Before someone can do the actual task, they must first reconstruct what it means \u2014 searching Slack, opening documents, checking notes, comparing conflicting status reports, and asking who owns what.',
      points: ['Engineers spend less time executing', 'Tasks sit idle while people gather information', 'Interruptions spread to everyone who gets asked', 'The cost grows with every new tool and teammate'],
      consequence: 'This preliminary reconstruction consumes time without advancing delivery.' },

    { id: 'p-human-search', type: 'problem', topic: ['human-search-engine', 'status-chasing'], role: ['eng-leader', 'exec'],
      demo: 'orbit',
      title: 'Managers become the team\u2019s human search engine',
      body: 'Every question routes back to the same manager or tech lead: Did this ship? Who owns this? Why did we change scope? Did we resolve the blocker? Where is the latest doc?',
      points: ['The knowledgeable person becomes a coordination bottleneck', 'Their time goes to answering, forwarding, and repeating', 'The team can\u2019t use their knowledge without interrupting them'],
      consequence: 'The information exists, but only a few people know where it is and which version is current.' },

    { id: 'p-repeated-translation', type: 'problem', topic: ['repeated-translation'], role: ['pm'],
      demo: 'space',
      title: 'Product managers repeatedly translate the same information',
      body: 'A PM explains a requirement in planning, adds it to a ticket, clarifies it in Slack, repeats it in a meeting, then explains it again when an engineer starts. Each repetition creates another version.',
      points: ['The PM becomes a relay between tools and people', 'Small differences appear between versions', 'The original rationale gets diluted', 'Less time for discovery and prioritization'],
      consequence: 'Engineers receive inconsistent explanations of the same work.' },

    { id: 'p-decisions-separated', type: 'problem', topic: ['decision-traceability'], role: ['pm', 'eng-leader', 'stakeholder'],
      demo: 'lens',
      title: 'Decisions get separated from the work they affect',
      body: 'A team decides something in a meeting or Slack, but only the final status appears in the tracker. Weeks later you can see what was done \u2014 not why, what alternatives were weighed, or who decided.',
      points: ['Old debates get repeated', 'Decisions are reversed without their original rationale', 'New members revisit rejected approaches', 'Teams become dependent on memory'],
      consequence: 'The reasoning behind the work disappears while the work remains.' },

    { id: 'p-unexplained-change', type: 'problem', topic: ['unexplained-change', 'status-chasing'], role: ['eng-leader', 'exec'],
      demo: 'lens',
      title: 'Changes are recorded without an explanation',
      body: 'A ticket moves to \u201cblocked\u201d or a deadline shifts, but the status change alone doesn\u2019t explain what caused it, what scope was affected, who else is involved, or what decision is now required.',
      points: ['Late escalation', 'Unnecessary status meetings', 'Repeated requests for updates', 'Missed risks and poor forecasts'],
      consequence: 'Managers see activity without understanding its significance.' },

    { id: 'p-conflicting-info', type: 'problem', topic: ['conflicting-info'], role: ['eng-leader', 'pm', 'exec'],
      demo: 'orbit',
      title: 'Information conflicts across tools',
      body: 'Jira says \u201cclosed.\u201d Slack says it went live two weeks ago. A spreadsheet says it\u2019s still in progress. Each record is correct in its own timeframe, but no single place explains the sequence.',
      points: ['Someone must reconstruct events before answering a simple question', 'Uncertainty about status, ownership, scope, and release state', 'Reduced trust in the team\u2019s systems'],
      consequence: 'No source explains the sequence of events.' },

    { id: 'p-hidden-risk', type: 'problem', topic: ['risk-dependencies'], role: ['eng-leader', 'exec', 'pm'],
      demo: 'lens',
      title: 'Risks and dependencies stay hidden',
      body: 'A risk shows up in a meeting transcript, a passing Slack comment, or a conversation on another task. Because those pieces live separately, no one recognizes their combined significance.',
      points: ['A blocker is discovered after implementation begins', 'Two teams unknowingly depend on the same resource', 'A delivery date slips without early warning'],
      consequence: 'Managers react to problems instead of preventing them.' },

    { id: 'p-onboarding', type: 'problem', topic: ['onboarding'], role: ['new-member', 'eng-leader'],
      demo: 'orbit',
      title: 'New team members can\u2019t reconstruct project history',
      body: 'A new joiner gets links to tickets, docs, Slack channels, and recordings \u2014 but still doesn\u2019t know which documents are current, which decisions matter, what changed during execution, or who to ask.',
      points: ['Slow onboarding', 'Repeated explanations from senior members', 'Incorrect assumptions', 'Reopened decisions'],
      consequence: 'The materials are available, but the understanding isn\u2019t.' },

    { id: 'p-knowledge-loss', type: 'problem', topic: ['knowledge-loss'], role: ['exec', 'eng-leader'],
      demo: 'orbit',
      title: 'Knowledge disappears when people leave',
      body: 'When a senior engineer or lead leaves, the team keeps their tickets and documents but loses their understanding of how the pieces fit together.',
      points: ['Systems become hard to modify', 'Past decisions lose their rationale', 'Incidents take longer to resolve', 'Institutional knowledge becomes a delivery risk'],
      consequence: 'You retain the files but lose the understanding required to use them.' },

    { id: 'p-distributed', type: 'problem', topic: ['distributed-async'], role: ['eng-leader', 'exec', 'engineer'],
      demo: 'space',
      title: 'Distributed teams can\u2019t rely on informal coordination',
      body: 'Co-located teams fill gaps with desk conversations. Distributed teams can\u2019t. Decisions stay locked in synchronous meetings, and async contributors get the outcome without the reasoning.',
      points: ['People in other time zones get information later', 'Participation depends on who can attend', 'Questions answered elsewhere get repeated'],
      consequence: 'Reasoning behind decisions doesn\u2019t reach everyone.' },

    { id: 'p-ceremony-loss', type: 'problem', topic: ['ceremony-loss'], role: ['eng-leader', 'pm'],
      demo: 'lens',
      title: 'Ceremony discussions don\u2019t survive into execution',
      body: 'Planning, stand-ups, estimation, and retros generate useful information that disappears when the ceremony ends \u2014 a planning decision never added to the ticket, a blocker separated from its task.',
      points: ['Each ceremony starts from incomplete information', 'Teams repeat discussions and lose actions', 'Previous learning isn\u2019t applied'],
      consequence: 'Useful outputs vanish when the session ends.' },

    { id: 'p-capacity', type: 'problem', topic: ['capacity-planning'], role: ['eng-leader', 'exec'],
      demo: 'space',
      title: 'Planning decisions ignore actual capacity',
      body: 'Teams commit to work based on velocity, intuition, or pressure rather than the real availability of individual team members.',
      points: ['Overcommitment', 'Missed sprint goals', 'Work repeatedly carried over', 'Hidden overload', 'Unreliable stakeholder commitments'],
      consequence: 'Planning that looks successful but collapses during execution.' },

    { id: 'p-retro', type: 'problem', topic: ['retro-followthrough', 'ceremony-loss'], role: ['eng-leader', 'pm'],
      demo: 'lens',
      title: 'Retrospective actions don\u2019t become real work',
      body: 'Teams identify the same process problems every sprint, record actions in a retro tool, and then return to normal work.',
      points: ['The same problems recur', 'Retrospectives lose credibility', 'Members stop contributing honestly'],
      consequence: 'Time in the ceremony produces little operational change.' },
  ];

  /* ---------------------------------------------------------------- CAPABILITIES (§6-9) */
  const CAPABILITIES = [
    { id: 'c-space', type: 'capability', topic: ['context-fragmentation', 'work-before-work', 'distributed-async'], role: ANY,
      demo: 'space',
      title: 'A Space brings the work and its context together',
      body: 'A Space is the central organizing environment in Quely. It brings together a task, sprint, feature, or initiative with the documents, conversations, meetings, decisions, and assets that explain it \u2014 organized around meaning, not by which tool produced it.',
      points: ['Bring in work items from your trackers', 'Add supporting docs, designs, and assets', 'Discuss the work and record decisions in place', 'Keep meetings, recordings, and transcripts attached'] },

    { id: 'c-orbit', type: 'capability', topic: ['human-search-engine', 'status-chasing', 'conflicting-info', 'knowledge-loss', 'onboarding'], role: ANY,
      demo: 'orbit',
      title: 'Orbit reads across everything in the Space',
      body: 'Orbit is Quely\u2019s AI assistant. It reasons across the relationships between tickets, conversations, documents, meetings, and decisions \u2014 not just keyword search \u2014 to retrieve information, explain what changed, and trace decisions.',
      points: ['Retrieve answers about the work', 'Explain how and why the work changed', 'Preserve who decided what, and why', 'Answer without interrupting a teammate'] },

    { id: 'c-signals-lenses', type: 'capability', topic: ['risk-dependencies', 'unexplained-change', 'decision-traceability', 'ceremony-loss'], role: ['eng-leader', 'exec', 'pm'],
      demo: 'lens',
      title: 'Signals and Lenses turn discussion into what matters',
      body: 'Signals are meaningful developments \u2014 decisions, risks, blockers, scope changes, dependencies, unanswered questions, required actions. A Lens examines the same work for a purpose (planning, retro, QA, stakeholder or risk review) without copying anything into a new system.',
      points: ['Distinguish meaningful change from general activity', 'Surface risks and dependencies early', 'Convert conversations into owned actions', 'Push items into your tracker or schedule a meeting'] },

    { id: 'c-queue', type: 'capability', topic: ['context-fragmentation', 'repeated-translation'], role: ['eng-leader', 'pm'],
      demo: 'space',
      title: 'The Queue is a continuous intake layer',
      body: 'The Queue collects Units \u2014 tickets, docs, conversations, meetings \u2014 from the tools you connect, and gives the team a place to review, select, and organize them around the work they support.',
      points: ['Bring connected work items and assets into view', 'Add relevant Units to Spaces', 'Reduce copying information between tools'] },

    { id: 'c-meetings', type: 'capability', topic: ['decision-traceability', 'ceremony-loss', 'distributed-async'], role: ['eng-leader', 'pm'],
      demo: 'space',
      title: 'Meetings connected to the work',
      body: 'Schedule meetings from inside a Space. A meeting bot can join, record, transcribe, and return the meeting information to the Space \u2014 so the recording becomes part of the history Orbit can reason across.',
      points: ['Recordings and transcripts stay attached to the work', 'Decisions and actions return to the Space'] },

    { id: 'c-capacity', type: 'capability', topic: ['capacity-planning'], role: ['eng-leader', 'exec'],
      demo: 'space',
      title: 'Capacity visible before the plan is finalized',
      body: 'Quely can show assigned work and team availability before a sprint is committed, so managers can identify overload before it becomes a missed goal.',
      points: ['See assigned work across sessions', 'Make individual workload visible in planning', 'Make more defensible commitments'] },

    { id: 'c-async-standup', type: 'capability', topic: ['distributed-async', 'status-chasing'], role: ['eng-leader', 'engineer'],
      demo: 'orbit',
      title: 'Async stand-ups attached to the work',
      body: 'Team members give updates on their own schedule, connected to the work being discussed \u2014 progress, blockers, changes, help needed, next actions \u2014 instead of a status report to a manager.',
      points: ['Updates stay attached to the task or sprint', 'People across time zones participate without a call'] },
  ];

  /* ---------------------------------------------------------------- USE CASES (§10) */
  const USECASES = [
    { id: 'u-understand-task', type: 'usecase', topic: ['work-before-work', 'context-fragmentation'], role: ['engineer'], demo: 'orbit',
      title: 'Understand a task before starting',
      body: 'Open the Space and see the work item, requirement, design, conversations, decisions, meetings, dependencies, and recent changes \u2014 then ask Orbit instead of searching every tool.',
      outcome: 'Faster time from assignment to productive execution.' },
    { id: 'u-status', type: 'usecase', topic: ['status-chasing', 'unexplained-change'], role: ['eng-leader', 'exec'], demo: 'orbit',
      title: 'Answer status questions without asking for an update',
      body: 'Ask Orbit what changed this week, which tasks are blocked, where help is needed, which decisions are unresolved, and what\u2019s at risk.',
      outcome: 'An explanation from existing information \u2014 not another status report.' },
    { id: 'u-scope', type: 'usecase', topic: ['decision-traceability'], role: ['pm', 'stakeholder'], demo: 'lens',
      title: 'Explain why a scope decision was made',
      body: 'A stakeholder asks why a requirement was removed. Orbit retrieves the original requirement, the discussion, the decision, the participants, and the trade-off.',
      outcome: 'Answer quickly and with evidence.' },
    { id: 'u-onboard', type: 'usecase', topic: ['onboarding'], role: ['new-member', 'eng-leader'], demo: 'orbit',
      title: 'Bring a new team member into an active project',
      body: 'The new member reviews the Space and asks Orbit about major decisions, current risks, scope changes, ownership, dependencies, and outstanding actions.',
      outcome: 'Useful faster, without a senior member retelling the project.' },
    { id: 'u-risk', type: 'usecase', topic: ['risk-dependencies'], role: ['eng-leader', 'exec'], demo: 'lens',
      title: 'Identify delivery risks earlier',
      body: 'Orbit connects signals spread across tickets, meetings, documents, and conversations.',
      outcome: 'Act before the risk becomes a missed commitment.' },
    { id: 'u-crossfunc', type: 'usecase', topic: ['distributed-async', 'repeated-translation'], role: ['pm', 'stakeholder'], demo: 'space',
      title: 'Coordinate cross-functional work',
      body: 'Product, engineering, design, legal, and CS contribute different artifacts to the same initiative, brought into one shared Space.',
      outcome: 'Each function sees how its work affects the whole \u2014 without moving into one tool.' },
    { id: 'u-fewer-meetings', type: 'usecase', topic: ['status-chasing', 'work-before-work'], role: ['eng-leader', 'exec'], demo: 'orbit',
      title: 'Reduce repeated meetings and messages',
      body: 'When the information is already in the Space, Orbit answers questions that would otherwise need a status meeting, a Slack message, or a summary from the manager.',
      outcome: 'Reserve synchronous time for real decisions.' },
  ];

  /* ---------------------------------------------------------------- ROLE BENEFITS (§11) */
  const ROLE_BLOCKS = [
    { id: 'r-eng-leader', type: 'role', topic: [], role: ['eng-leader'], demo: 'orbit',
      title: 'For engineering managers & tech leads',
      points: ['Understand work without checking every tool', 'See what changed and why', 'Spot blockers and dependencies earlier', 'Cut the status questions routed through you', 'Make capacity and assignments visible', 'Preserve decisions beyond the meeting'],
      core: 'Oversee delivery without being the team\u2019s permanent information-retrieval system.' },
    { id: 'r-pm', type: 'role', topic: [], role: ['pm'], demo: 'space',
      title: 'For product managers',
      points: ['Keep requirements connected to implementation', 'Preserve the reasoning behind scope decisions', 'Stop repeating yourself across tickets, Slack, and meetings', 'Answer stakeholders with a traceable history', 'Turn discussions into owned actions'],
      core: 'Keep the reason behind the work connected to the work as it moves through execution.' },
    { id: 'r-engineer', type: 'role', topic: [], role: ['engineer'], demo: 'orbit',
      title: 'For engineers',
      points: ['Understand a task before beginning', 'Find requirements, decisions, and designs faster', 'See the latest scope, not an outdated ticket', 'Ask Orbit without interrupting anyone', 'Understand why an earlier approach was rejected'],
      core: 'Less time locating information, more time completing the work correctly.' },
    { id: 'r-exec', type: 'role', topic: [], role: ['exec'], demo: 'lens',
      title: 'For product & engineering leaders',
      points: ['Understand delivery beyond ticket status', 'See emerging risks across projects', 'Improve the reliability of commitments', 'Reduce knowledge concentration in a few people', 'Preserve organizational learning'],
      core: 'Understand why delivery is progressing or struggling \u2014 not just a record of activity.' },
    { id: 'r-new-member', type: 'role', topic: [], role: ['new-member'], demo: 'orbit',
      title: 'For new team members',
      points: ['Learn project history', 'Locate the current source material', 'Understand major decisions and trade-offs', 'Ask questions without depending on onboarding meetings'],
      core: 'Reach useful understanding faster, with fewer interruptions to the team.' },
    { id: 'r-stakeholder', type: 'role', topic: [], role: ['stakeholder'], demo: 'space',
      title: 'For stakeholders & guests',
      points: ['Review only the work relevant to them', 'See decisions and supporting material', 'Contribute without joining every internal channel', 'Understand changes without requesting a summary'],
      core: 'A clear, bounded view of the work without creating reporting work for the team.' },
  ];

  /* ---------------------------------------------------------------- PROOF / OUTCOMES (§12,13,20) */
  const PROOF = [
    { id: 'x-outcomes', type: 'proof', topic: [], role: ANY, demo: null,
      title: 'What changes when the context stays connected',
      points: ['Understand work faster', 'Start tasks with better information', 'Less time searching across tools', 'Fewer repeated questions', 'Lower dependence on individual memory', 'Decision history preserved', 'Blockers and dependencies detected earlier', 'Fewer avoidable meetings'] },
    { id: 'x-cost', type: 'proof', topic: ['work-before-work', 'status-chasing'], role: ['exec', 'eng-leader'], demo: null,
      title: 'The cost of leaving it unsolved',
      points: ['Slower delivery from constant searching', 'Rework from incomplete information', 'Hidden management overhead', 'Greater dependence on a few individuals', 'Late risk discovery', 'Unreliable commitments and stakeholder surprises'] },
  ];

  /* ---------------------------------------------------------------- APPROVED STATEMENTS (§21) */
  const STATEMENTS = [
    { id: 's-spread', type: 'statement', topic: ['context-fragmentation'], role: ANY,
      text: 'The full information around any piece of work is spread across too many places.' },
    { id: 's-notconnected', type: 'statement', topic: ['context-fragmentation'], role: ANY,
      text: 'Every call, planning session, thread, and ticket creates information. The problem is that these pieces are not connected.' },
    { id: 's-organized', type: 'statement', topic: ['work-before-work', 'status-chasing'], role: ['eng-leader', 'exec'],
      text: 'Your team is constantly producing information, but it is not organized in a way that helps people quickly understand what is happening, why it matters, and what should happen next.' },
  ];

  /* ---------------------------------------------------------------- OBJECTIONS (§18) */
  const OBJECTIONS = [
    { id: 'o-jira', type: 'objection', topic: ['context-fragmentation'], role: ANY,
      q: '\u201cWe already use Jira.\u201d',
      a: 'Jira tells you what the item is, who owns it, and its status. It doesn\u2019t automatically bring together the documents, discussions, meetings, and decisions that explain it. Quely extends the Jira item rather than replacing it.' },
    { id: 'o-slack', type: 'objection', topic: ['context-fragmentation', 'conflicting-info'], role: ANY,
      q: '\u201cWe already use Slack and Confluence.\u201d',
      a: 'They hold valuable information, but someone must still find the right thread, identify the current doc, and connect both to the task. Quely organizes those pieces around the work and gives Orbit a defined body to reason across.' },
    { id: 'o-another-tool', type: 'objection', topic: [], role: ['eng-leader', 'exec'],
      q: '\u201cThis sounds like another tool we have to maintain.\u201d',
      a: 'Quely works with the tools you already use. The value comes from reducing the manual work of moving between them, not from creating another isolated destination.' },
    { id: 'o-adoption', type: 'objection', topic: [], role: ['eng-leader'],
      q: '\u201cOur engineers won\u2019t adopt another process tool.\u201d',
      a: 'The strongest adoption moment isn\u2019t asking engineers to document more \u2014 it\u2019s helping them find the requirement or decision they need without searching or waiting. Start with one task or active initiative.' },
    { id: 'o-search', type: 'objection', topic: ['human-search-engine'], role: ['exec'],
      q: '\u201cAI tools can already search all our apps.\u201d',
      a: 'General enterprise search retrieves individual records. Quely\u2019s value is organizing Units into Spaces around a specific task, sprint, or objective \u2014 giving Orbit a meaningful boundary and a place to keep building history.' },
  ];

  /* ---------------------------------------------------------------- CTAs */
  const CTAS = [
    { id: 'cta-demo', type: 'cta', topic: [], role: ANY,
      title: 'See it on your own work',
      body: 'Start with one task, sprint, or active initiative and see the difference before a broader rollout.',
      cta: { label: 'Book a demo', href: 'https://meetings.hubspot.com/ronma2/?utm_source=sales_enablement&utm_medium=viewer' } },
  ];

  const BLOCKS = [].concat(PROBLEMS, CAPABILITIES, USECASES, ROLE_BLOCKS, PROOF, STATEMENTS, OBJECTIONS, CTAS);

  /* ================================================================ PROBLEM NARRATIVES
     A NARRATIVE is one coherent story arc for a single prospect concern: the hook,
     the problem, its consequence, the Quely mechanism that resolves it, and the
     outcome. Each beat is approved copy only — no layout, colours, or component
     names. Layer 3 binds beats to visual blocks (see quely-architecture.md).

     Shape:
       { id, label, topics[], roles[], family, dormant?,
         arc: { hook, problem, consequence, mechanism, outcome, close },
         capabilityIds[], proofIds[], objectionIds[] }
     ================================================================ */
  const NARRATIVES = {
    'scattered-information': {
      label: 'Work information is spread across too many tools',
      topics: ['context-fragmentation', 'work-before-work', 'conflicting-info', 'repeated-translation'],
      roles: ['engineer', 'eng-leader', 'pm'],
      family: 'fragmentation',
      arc: {
        hook: {
          headline: 'The full context around a piece of work is spread across too many places.',
          body: 'A ticket has a title and a short description. The call that created the urgency, the thread about the trade-off, the meeting where scope changed — each lives somewhere else.' },
        problem: {
          headline: 'One piece of work, its context split across six tools.',
          body: 'Everything the team needs exists. It is just not in one place, so someone has to go find it tool by tool before any real work happens.',
          points: ['The customer problem came from a call', 'The scope was narrowed in a thread', 'A design decision changed during review', 'The deadline shifted in a stakeholder meeting'] },
        consequence: {
          headline: 'So the work does not start when the ticket is assigned.',
          points: ['Slower starts and repeated questions', 'Tasks sit idle while people gather information', 'Interruptions spread to everyone who gets asked', 'Incorrect implementation, rework, reopened decisions'] },
        mechanism: {
          headline: 'One Space holds the work and everything that explains it.',
          body: 'The task comes in from your tracker; the docs, discussion, meetings, and decisions that explain it sit alongside it. Orbit reads across all of it and answers.' },
        outcome: {
          headline: 'Anyone can understand the work without asking around.',
          points: ['Understand a task before starting it', 'Less time searching across tools', 'Fewer repeated questions', 'Fewer avoidable meetings'] },
        close: {
          headline: 'Give your team the full picture around the work.',
          body: 'Quely keeps the ticket, decisions, docs, and conversations in one Space, so anyone can see what changed, what is blocked, and what needs attention.' },
      },
      capabilityIds: ['c-space', 'c-orbit', 'c-queue', 'c-meetings'],
      proofIds: ['x-outcomes', 'x-cost'],
      objectionIds: ['o-jira', 'o-slack'],
    },

    'decision-history': {
      label: 'Decisions and changes lose their history',
      topics: ['decision-traceability', 'unexplained-change'],
      roles: ['eng-leader', 'pm', 'stakeholder'],
      family: 'decisions',
      arc: {
        hook: {
          headline: 'The work survives. The reasoning disappears.',
          body: 'Weeks later you can see what was done — not why, what alternatives were weighed, or who decided.' },
        problem: {
          headline: 'Decisions get separated from the work they affect.',
          body: 'A team decides something in a meeting or a thread, but only the final status lands in the tracker. The trade-off, the participants, and the alternatives are gone by the time anyone needs them.',
          points: ['Old debates get repeated from scratch', 'Decisions reversed without their original rationale', 'New members revisit already-rejected approaches', 'The team depends on a few people’s memory'] },
        consequence: {
          headline: 'The reasoning behind the work vanishes while the work remains.',
          points: ['Changes are recorded without an explanation', 'Managers see activity without understanding its significance', 'Scope questions take days to answer', 'Teams relitigate settled choices'] },
        mechanism: {
          headline: 'One searchable history for every piece of work.',
          body: 'Quely gives every task a Space where the team discusses the work, records decisions, and moves to a live meeting when needed. Orbit retrieves what was decided, why, the trade-offs considered, and who owns the next step.' },
        outcome: {
          headline: 'Find what was decided and why in minutes.',
          points: ['Explain a scope decision with evidence', 'Preserve rationale beyond the meeting', 'Onboard without retelling the project', 'Stop reopening settled decisions'] },
        close: {
          headline: 'Keep every decision — and its reasoning — with the work.',
          body: 'Quely keeps decisions, trade-offs, and history attached to the work, so the reasoning survives long after the meeting.' },
      },
      capabilityIds: ['c-orbit', 'c-space', 'c-meetings', 'c-signals-lenses'],
      proofIds: ['x-outcomes'],
      objectionIds: ['o-jira', 'o-search'],
    },

    'late-risk': {
      label: 'Delivery risks and dependencies surface too late',
      topics: ['risk-dependencies', 'status-chasing', 'distributed-async'],
      roles: ['eng-leader', 'exec', 'pm'],
      family: 'risks',
      arc: {
        hook: {
          headline: 'The risk was always there. It just lived in three different places.',
          body: 'A blocker in a transcript, a dependency in a thread, a concern raised on another task. Apart, none of them looks urgent.' },
        problem: {
          headline: 'Risks and dependencies stay hidden until they hit.',
          body: 'The signals exist, scattered across tickets, meetings, and conversations. Nothing connects them into an early warning.',
          points: ['A blocker is discovered after implementation begins', 'Two teams unknowingly depend on the same resource', 'A delivery date slips with no early signal', 'Status looks fine right up until it doesn’t'] },
        consequence: {
          headline: 'Managers react to problems instead of preventing them.',
          points: ['Late escalation', 'Unnecessary status meetings', 'Missed risks and poor forecasts', 'Unreliable commitments to stakeholders'] },
        mechanism: {
          headline: 'Signals and Lenses surface what matters, early.',
          body: 'Quely distinguishes meaningful developments — decisions, risks, blockers, dependencies, scope changes — from general activity, and connects them across the work. Push any item into your tracker or schedule a meeting around it.' },
        outcome: {
          headline: 'See what is at risk while there is still time to act.',
          points: ['Identify delivery risks earlier', 'See the real critical path', 'Know where the team needs help', 'Make more defensible commitments'] },
        close: {
          headline: 'See what’s at risk before the date slips.',
          body: 'Quely connects risks and dependencies from across tickets, meetings, and threads, so the critical path is visible while there is still time to act.' },
      },
      capabilityIds: ['c-signals-lenses', 'c-orbit', 'c-space', 'c-async-standup'],
      proofIds: ['x-cost', 'x-outcomes'],
      objectionIds: ['o-jira', 'o-another-tool'],
    },

    'key-person-knowledge': {
      label: 'Project knowledge depends on a few people',
      topics: ['human-search-engine', 'knowledge-loss', 'onboarding'],
      roles: ['eng-leader', 'exec', 'new-member'],
      family: 'decisions',
      arc: {
        hook: {
          headline: 'The information exists. Only a few people know where it lives.',
          body: 'Every question about status, history, or ownership routes back to the same person.' },
        problem: {
          headline: 'One person becomes the team’s search engine.',
          body: 'The most knowledgeable person turns into a coordination bottleneck. The team cannot use what they know without interrupting them.',
          points: ['Did this ship? Who owns it? Why did scope change?', 'Their time goes to answering and forwarding', 'New joiners cannot reconstruct project history', 'When they leave, the understanding leaves too'] },
        consequence: {
          headline: 'Institutional knowledge becomes a delivery risk.',
          points: ['Slow onboarding and repeated explanations', 'Incorrect assumptions and reopened decisions', 'Systems become hard to modify safely', 'Incidents take longer to resolve'] },
        mechanism: {
          headline: 'The history answers for itself.',
          body: 'Because decisions, discussions, and documents stay attached to the work, Orbit can answer questions about what happened and why — without routing them through one person.' },
        outcome: {
          headline: 'Anyone can get the answer without interrupting anyone.',
          points: ['Lower dependence on individual memory', 'New members useful faster', 'Fewer questions routed through the lead', 'Organizational learning preserved'] },
        close: {
          headline: 'Stop being the team’s search engine.',
          body: 'Quely keeps the history with the work so anyone can retrieve it, and the person who knows the most can get back to their own work.' },
      },
      capabilityIds: ['c-orbit', 'c-space', 'c-meetings', 'c-queue'],
      proofIds: ['x-cost', 'x-outcomes'],
      objectionIds: ['o-search', 'o-slack'],
    },

    'lost-outputs': {
      label: 'Discussions and meeting outputs do not turn into action',
      topics: ['ceremony-loss', 'retro-followthrough'],
      roles: ['eng-leader', 'pm'],
      family: 'risks',
      arc: {
        hook: {
          headline: 'The discussion was useful. Then the meeting ended.',
          body: 'Planning, stand-ups, and retros produce decisions, blockers, and actions that disappear when the session closes.' },
        problem: {
          headline: 'Ceremony outputs do not survive into execution.',
          body: 'A planning decision never reaches the ticket. A blocker gets separated from its task. A retro action never becomes real work.',
          points: ['Each ceremony restarts from incomplete information', 'Teams repeat discussions and lose actions', 'The same process problems recur every sprint', 'Previous learning is not applied'] },
        consequence: {
          headline: 'Time in the ceremony produces little operational change.',
          points: ['Retrospectives lose credibility', 'Members stop contributing honestly', 'Actions have no owner and no due date', 'Decisions get remade in the next session'] },
        mechanism: {
          headline: 'Discussion becomes owned action, in place.',
          body: 'Quely reads the discussion and surfaces the decisions, risks, and required actions — then pushes any item into your tracker as a task or schedules a meeting around it. Nothing is retyped into another system.' },
        outcome: {
          headline: 'What was discussed actually gets done.',
          points: ['Actions leave the meeting with an owner', 'Decisions stay attached to the work', 'Blockers reach the task they affect', 'Fewer repeated discussions'] },
        close: {
          headline: 'Turn every discussion into work that moves.',
          body: 'Quely captures the decisions and actions inside your conversations and pushes them straight into the tools your team already uses.' },
      },
      capabilityIds: ['c-signals-lenses', 'c-meetings', 'c-space', 'c-orbit'],
      proofIds: ['x-outcomes'],
      objectionIds: ['o-another-tool', 'o-adoption'],
    },

    /* Dormant in V1 (see INACTIVE_FAMILIES in quely-page-plans.js). Content retained. */
    'capacity-reality': {
      label: 'Planning ignores the team’s actual capacity',
      topics: ['capacity-planning'],
      roles: ['eng-leader', 'exec'],
      family: 'capacity',
      dormant: true,
      arc: {
        hook: {
          headline: 'The sprint looked achievable. Then real life happened.',
          body: 'Teams commit on velocity, intuition, or pressure — not the actual availability of each person.' },
        problem: {
          headline: 'Planning decisions ignore actual capacity.',
          body: 'The existing responsibilities, the on-call week, the carry-over: none of it was visible when the commitment was made.',
          points: ['Overcommitment hidden until mid-sprint', 'Missed goals and repeated carry-over', 'Workload imbalance across the team', 'Unreliable commitments to stakeholders'] },
        consequence: {
          headline: 'A plan that looks successful but collapses during execution.',
          points: ['Hidden overload', 'Work repeatedly carried over', 'Stakeholder surprises', 'Burnout risk concentrated on a few people'] },
        mechanism: {
          headline: 'Capacity visible before the plan is finalized.',
          body: 'Quely shows assigned work and team availability before a sprint is committed, so managers can identify overload before it becomes a missed goal.' },
        outcome: {
          headline: 'Commit to a sprint the team can actually deliver.',
          points: ['See assigned work across sessions', 'Make individual workload visible in planning', 'Rebalance before committing', 'More defensible commitments'] },
        close: {
          headline: 'Commit to a sprint the team can actually deliver.',
          body: 'Quely shows assigned work and real availability before you commit, so your plan survives contact with the sprint.' },
      },
      capabilityIds: ['c-capacity', 'c-orbit', 'c-space', 'c-async-standup'],
      proofIds: ['x-cost'],
      objectionIds: ['o-another-tool'],
    },
  };

  /* topic slug -> narrative id */
  const TOPIC_NARRATIVE = (function () {
    const m = {};
    Object.keys(NARRATIVES).forEach(function (nid) {
      (NARRATIVES[nid].topics || []).forEach(function (t) { if (!m[t]) m[t] = nid; });
    });
    return m;
  })();

  function narrativeFor(topic) { return NARRATIVES[TOPIC_NARRATIVE[topic] || ''] || NARRATIVES['scattered-information']; }
  function activeNarratives() { return Object.keys(NARRATIVES).filter(function (k) { return !NARRATIVES[k].dormant; }); }
  /* Resolve a narrative's referenced content ids into full units. */
  function narrativeContent(nid) {
    const n = NARRATIVES[nid]; if (!n) return null;
    const grab = function (ids) { return (ids || []).map(byId).filter(Boolean); };
    return {
      id: nid, label: n.label, family: n.family, arc: n.arc, topics: n.topics, roles: n.roles,
      capabilities: grab(n.capabilityIds), proof: grab(n.proofIds), objections: grab(n.objectionIds),
    };
  }

  /* --------------------------------------------------------------- selection engine */
  function score(block, role, topic) {
    let s = 0;
    const roleFits = !block.role || block.role.length === 0 || block.role.indexOf('any') !== -1 || block.role.indexOf(role) !== -1;
    const topicFits = block.topic && block.topic.indexOf(topic) !== -1;
    if (topicFits) s += 14;
    if (block.role && block.role.indexOf(role) !== -1) s += 5; // explicit role match
    if (roleFits) s += 1;
    if (!roleFits) s -= 4;
    return { s: s, roleFits: roleFits, topicFits: topicFits };
  }

  /* Assemble an ordered prospect page: statement -> problem -> capability
     -> use case -> role benefits -> proof -> objection -> CTA. */
  function assemble(opts) {
    opts = opts || {};
    const role = opts.role || 'eng-leader';
    const topic = opts.topic || 'context-fragmentation';
    const pick = (type, n) => BLOCKS
      .filter((b) => b.type === type)
      .map((b) => ({ b: b, r: score(b, role, topic) }))
      .sort((a, b) => b.r.s - a.r.s)
      .slice(0, n)
      .map((x) => x.b);

    const ordered = [].concat(
      pick('statement', 1),
      pick('problem', 1),
      pick('capability', 2),
      pick('usecase', 1),
      pick('role', 1),
      pick('proof', 1),
      pick('objection', 1),
      pick('cta', 1)
    );
    // de-dupe, keep order
    const seen = {};
    const blockIds = ordered.filter((b) => (seen[b.id] ? false : (seen[b.id] = true))).map((b) => b.id);
    const primaryDemo = (ordered.find((b) => b.demo) || {}).demo || 'orbit';
    return { role: role, topic: topic, blockIds: blockIds, primaryDemo: primaryDemo };
  }

  function byId(id) { return BLOCKS.find((b) => b.id === id) || null; }

  const API = { TOPICS, ROLES, BLOCKS, assemble, byId, score,
    NARRATIVES, TOPIC_NARRATIVE, narrativeFor, activeNarratives, narrativeContent };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.QuelyLibrary = API;
})();
