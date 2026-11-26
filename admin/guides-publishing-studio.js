/**
 * Common Sense Odisha — Informative Articles & Guides Publishing Studio (v350)
 * - Dedicated Sidebar Folder & Sub-Views (All, How-To, Exam Strategy, Citizen/Schemes, Odisha GK, Drafts)
 * - 5 One-Click Structured Starter Blueprint Templates
 * - Structured Bilingual Inputs, Key Takeaways Repeater & Quick Markdown Formatting Toolbar
 * - Cover Photo + AI Cover Generator + Inline Photo Gallery (cso-media R2), Downloadable PDFs (cso-files R2),
 *   Verified Official Links (.gov.in Badge) & Related Practice/Alert Linker
 * - Gemini Pro-First AI Co-Author Bar: 1-Click PDF Upload -> Auto-Write Guide (lazy self-hosted pdfjs-dist),
 *   AI Auto-Fix & Fill Everything, Outline/Draft, Title/Slug/Summary/Tags, 1-Click EN -> Odia
 * - Interactive Full-Screen Live Preview Modal (Desktop/Mobile, EN/Odia, 4-Theme Switcher, Direct Publish Live)
 * Strict CSP-compliant: pure DOM APIs only, zero innerHTML / outerHTML / inline style / inline handlers.
 */
(function (window, document) {
  'use strict';

  var CATEGORIES = [
    { key: 'how-to', label: 'Step-by-Step How-To Guides', shortLabel: 'How-To Guide', icon: '\uD83E\uDDED' },
    { key: 'exam-strategy', label: 'Exam Strategy & Study Handbooks', shortLabel: 'Exam Handbook', icon: '\uD83C\uDFAF' },
    { key: 'citizen-scheme', label: 'Citizen & Scheme Explainers', shortLabel: 'Scheme Explainer', icon: '\uD83C\uDFDB\uFE0F' },
    { key: 'odisha-gk', label: 'Odisha GK & Heritage', shortLabel: 'Odisha GK', icon: '\uD83C\uDFFA' }
  ];

  var SUBVIEWS = [
    { key: 'all', num: '01', title: 'All Articles & Guides', tag: 'ALL' },
    { key: 'how-to', num: '02', title: 'Step-by-Step How-To Guides', tag: 'HOW-TO' },
    { key: 'exam-strategy', num: '03', title: 'Exam Strategy & Study Handbooks', tag: 'EXAM' },
    { key: 'citizen-scheme', num: '04', title: 'Citizen & Scheme Explainers', tag: 'SCHEME' },
    { key: 'odisha-gk', num: '05', title: 'Odisha GK & Heritage', tag: 'GK' },
    { key: 'drafts', num: '06', title: 'Drafts', tag: 'DRAFT' }
  ];

  var STARTER_TEMPLATES = [
    {
      key: 'how-to',
      name: 'Step-by-Step How-To Guide',
      icon: '\uD83E\uDDED',
      category: 'how-to',
      isExam: false,
      readMinutes: 6,
      summaryEn: 'Complete step-by-step walkthrough covering eligibility, required documents, online application steps, and common errors to avoid.',
      takeaways: [
        { text_en: 'Verify eligibility criteria and keep scanned documents ready before starting.', text_or: '' },
        { text_en: 'Complete online registration only on the verified official .gov.in portal.', text_or: '' },
        { text_en: 'Download and save the final acknowledgement receipt PDF for tracking.', text_or: '' }
      ],
      bodyEn: [
        '## Overview',
        'Explain clearly what this process helps citizens or candidates achieve in Odisha, who conducts it, and key timelines.',
        '',
        '## Eligibility & Required Documents',
        '- Resident / Domicile proof (Odisha Resident Certificate)',
        '- Identity proof (Aadhaar / Voter ID / PAN)',
        '- Educational certificates and recent passport-size photograph',
        '',
        '| Document | Format | Max Size |',
        '| --- | --- | --- |',
        '| Passport Photo | JPG / PNG | 50 KB |',
        '| Supporting Certificate | PDF | 200 KB |',
        '',
        '## Step-by-Step Application/Process',
        '1. Visit the verified official government portal listed below.',
        '2. Complete One-Time Registration (OTR) using your mobile number and email.',
        '3. Fill in personal, educational, and address details accurately.',
        '4. Upload scanned documents and preview the complete form before final submission.',
        '5. Save the confirmation PDF and application reference number.',
        '',
        '## Common Mistakes to Avoid',
        '> [!WARNING]',
        '> Do not submit blurry document scans or mismatched date-of-birth entries between Matriculation Certificate and Aadhaar.',
        '',
        '## Official Links & Downloads',
        'Use the verified official links and downloadable official notification PDFs attached at the bottom of this guide.'
      ].join('\n')
    },
    {
      key: 'exam-strategy',
      name: 'Exam Strategy & Study Handbook',
      icon: '\uD83C\uDFAF',
      category: 'exam-strategy',
      isExam: true,
      readMinutes: 8,
      summaryEn: 'Structured exam preparation handbook with exam pattern snapshot, high-yield syllabus breakdown, 30/60-day study roadmap, and PYQ practice strategy.',
      takeaways: [
        { text_en: 'Focus 60% of revision time on high-weightage Odisha GK, Reasoning, and Core Paper topics.', text_or: '' },
        { text_en: 'Solve at least 5 years of Previous Year Question Papers (PYQs) under timed CBT conditions.', text_or: '' },
        { text_en: 'Maintain a daily mistake notebook to eliminate negative marking.', text_or: '' }
      ],
      bodyEn: [
        '## Exam Pattern Snapshot',
        '| Stage | Mode | Questions / Marks | Duration | Negative Marking |',
        '| --- | --- | --- | --- | --- |',
        '| Prelims | CBT / OMR | 100 Qs / 100 Marks | 90 Mins | 0.25 |',
        '| Mains | Written / CBT | 200 Marks | 180 Mins | As notified |',
        '',
        '## High-Yield Syllabus Breakdown',
        '### Core Scoring Areas',
        '- Odisha History, Geography, Polity & Welfare Schemes',
        '- General Studies & Current Affairs (last 8-12 months)',
        '- Quantitative Aptitude, Data Interpretation & Logical Reasoning',
        '- Odia & English Language Comprehension',
        '',
        '## 30/60-Day Study Roadmap',
        '1. **Days 1-20 (Foundation):** Complete standard NCERT + Odisha Board core chapters and concise notes.',
        '2. **Days 21-40 (PYQ & Sectional Practice):** Solve topic-wise PYQs and daily 25-question drills.',
        '3. **Days 41-60 (Full CBT Mocks & Revision):** Attempt 2 full-length CBT mocks weekly and revise error logs.',
        '',
        '> [!TIP]',
        '> Review every mock test on the same day—analyzing wrong and skipped questions boosts accuracy faster than reading new books.',
        '',
        '## PYQ PDFs & CBT Practice Links',
        'Download the official syllabus and previous year papers attached below, then launch the linked CBT Mock Test.'
      ].join('\n')
    },
    {
      key: 'citizen-scheme',
      name: 'Citizen & Government Scheme Explainer',
      icon: '\uD83C\uDFDB\uFE0F',
      category: 'citizen-scheme',
      isExam: false,
      readMinutes: 5,
      summaryEn: 'Plain-language citizen guide detailing financial/service benefits, eligibility criteria, required documents checklist, and official helpline.',
      takeaways: [
        { text_en: 'Direct Benefit Transfer (DBT) requires an Aadhaar-seeded, NPCI-mapped active bank account.', text_or: '' },
        { text_en: 'Application is 100% free on the official portal or Mo Seba Kendra / CSC.', text_or: '' },
        { text_en: 'Check beneficiary status online using your Application ID or Aadhaar number.', text_or: '' }
      ],
      bodyEn: [
        '## Key Financial/Service Benefits',
        '| Benefit Component | Amount / Coverage | Disbursement Mode |',
        '| --- | --- | --- |',
        '| Primary Assistance | As per Govt. Order | Direct Benefit Transfer (DBT) |',
        '| Frequency | Annual / Installments | Aadhaar-seeded Bank Account |',
        '',
        '## Who Can Apply',
        '- Permanent residents of Odisha meeting the notified income/category criteria.',
        '- Exclusions: Verify official exclusion clauses in the attached Government Guideline PDF.',
        '',
        '## Documents Checklist',
        '- Aadhaar Card (linked with mobile number)',
        '- Bank Passbook with active DBT / NPCI seeding',
        '- Income / Caste / Residence Certificate (as applicable)',
        '- Ration Card / NFSA / SFSS Card (if required)',
        '',
        '> [!IMPORTANT]',
        '> Never share OTPs or pay unauthorized middlemen. Verify status strictly on the official .gov.in portal.',
        '',
        '## Official Portal & Helpline',
        'Access the verified official scheme portal and citizen helpline details in the Verified Official Links table below.'
      ].join('\n')
    },
    {
      key: 'odisha-gk',
      name: 'Odisha GK & Heritage Deep Dive',
      icon: '\uD83C\uDFFA',
      category: 'odisha-gk',
      isExam: true,
      readMinutes: 7,
      summaryEn: 'Exam-focused Odisha GK & Heritage deep dive with quick facts box, historical & geographical context, and high-probability Prelims/Mains takeaways.',
      takeaways: [
        { text_en: 'Covers frequently tested facts for OPSC OAS, OSSC CGL, OSSSC RI/ARI/Amin, and Odisha Police exams.', text_or: '' },
        { text_en: 'Structured timeline and regional geography notes ideal for quick last-week revision.', text_or: '' }
      ],
      bodyEn: [
        '## Quick Exam Facts Box',
        '| Fact Parameter | Exam-Ready Detail |',
        '| --- | --- |',
        '| Region / District | Odisha |',
        '| Historical Era / Dynasty | Mention key dynasty & century |',
        '| Key Significance | Cultural, administrative, or ecological importance |',
        '',
        '## Historical & Geographical Context',
        'Summarize the historical origin, geographic location, major rivers/districts involved, and cultural evolution in clear short paragraphs.',
        '',
        '## Key Prelims/Mains Takeaways',
        '- **Prelims Focus:** Exact dates, monuments, rivers, wildlife sanctuaries, GI tags, and official awards.',
        '- **Mains Focus:** Socio-economic impact, heritage preservation initiatives, and Odisha cultural identity.',
        '',
        '> [!NOTE]',
        '> Compare related Odisha static GK topics alongside recent Odisha Government current affairs updates.',
        '',
        '## Reference PDFs',
        'Download the compiled revision notes and reference PDFs attached below for offline study.'
      ].join('\n')
    },
    {
      key: 'blank',
      name: 'Blank Custom Guide',
      icon: '\uD83D\uDCDD',
      category: 'how-to',
      isExam: false,
      readMinutes: 5,
      summaryEn: '',
      takeaways: [],
      bodyEn: '## Overview\n\nStart writing your structured guide here...\n'
    }
  ];

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function toast(msg, kind) {
    if (typeof window.showToast === 'function') window.showToast(msg, kind || 'info');
  }

  // =========================================================================
  // v361 MULTI-PROVIDER AI ENGINE SWITCHER & API MANAGER MODAL (STRICT CSP)
  // =========================================================================
  var AI_ENGINE_STORAGE_KEY = 'cso_admin_preferred_ai_model';
  var cachedCustomAiProviders = [];

  var AI_PROVIDER_PRESETS = [
    {
      key: 'groq',
      chip: '\u26A1 Groq Free',
      label: 'Groq Free (Llama 3.3 70B)',
      provider_type: 'openai_compatible',
      base_url: 'https://api.groq.com/openai/v1',
      model_id: 'llama-3.3-70b-versatile',
      hint: 'Fast $0 free tier. Also supports llama-3.1-8b-instant or openai/gpt-oss-120b.'
    },
    {
      key: 'openrouter',
      chip: '\uD83C\uDF10 OpenRouter Free Router',
      label: 'OpenRouter Free Router',
      provider_type: 'openai_compatible',
      base_url: 'https://openrouter.ai/api/v1',
      model_id: 'openrouter/free',
      hint: 'Auto-routes to active free community models via openrouter.ai.'
    },
    {
      key: 'cerebras',
      chip: '\uD83D\uDE80 Cerebras Free',
      label: 'Cerebras Free (Llama 3.3 70B)',
      provider_type: 'openai_compatible',
      base_url: 'https://api.cerebras.ai/v1',
      model_id: 'llama-3.3-70b',
      hint: 'Ultra-fast free inference endpoint.'
    },
    {
      key: 'mistral',
      chip: '\uD83C\uDF2C\uFE0F Mistral Free',
      label: 'Mistral Free (Small Latest)',
      provider_type: 'openai_compatible',
      base_url: 'https://api.mistral.ai/v1',
      model_id: 'mistral-small-latest',
      hint: 'Mistral La Plateforme free tier endpoint.'
    },
    {
      key: 'gemini_backup',
      chip: '\u2728 Backup Google Gemini Key',
      label: 'Backup Google Gemini Key',
      provider_type: 'gemini',
      base_url: 'https://generativelanguage.googleapis.com/v1beta',
      model_id: 'gemini-2.5-flash',
      hint: 'Use a secondary Google AI Studio key for extra free daily Gemini quota.'
    },
    {
      key: 'custom',
      chip: '\uD83D\uDD27 Custom OpenAI-Compatible',
      label: 'Custom OpenAI-Compatible API',
      provider_type: 'openai_compatible',
      base_url: '',
      model_id: '',
      hint: 'Enter any public https:// OpenAI-compatible /v1 Base URL and Model ID.'
    }
  ];

  function getSavedAiEnginePref() {
    try {
      return String(window.localStorage.getItem(AI_ENGINE_STORAGE_KEY) || 'auto').trim() || 'auto';
    } catch (_e) {
      return 'auto';
    }
  }

  function saveAiEnginePref(val) {
    var clean = String(val || 'auto').trim() || 'auto';
    try { window.localStorage.setItem(AI_ENGINE_STORAGE_KEY, clean); } catch (_e) {}
    try {
      window.dispatchEvent(new CustomEvent('cso:ai-engine-changed', { detail: { value: clean } }));
    } catch (_e2) {}
    return clean;
  }

  function populateAiEngineSelect(selectEl, providersList) {
    if (!selectEl) return;
    var wanted = getSavedAiEnginePref();
    var list = Array.isArray(providersList) ? providersList : cachedCustomAiProviders;
    clear(selectEl);

    function addGroup(groupLabel, items) {
      var og = el('optgroup');
      og.label = groupLabel;
      items.forEach(function (item) {
        var op = el('option', '', item.label);
        op.value = item.value;
        if (item.disabled) op.disabled = true;
        og.appendChild(op);
      });
      selectEl.appendChild(og);
    }

    addGroup('Auto Smart Cascade', [
      { value: 'auto', label: '\u2728 Auto Smart Cascade (Custom \u2192 Gemini \u2192 Workers AI)' }
    ]);

    var enabledCustom = list.filter(function (p) { return p && p.id && p.enabled !== false; });
    if (enabledCustom.length) {
      addGroup('Custom Added AI APIs', enabledCustom.map(function (p) {
        return {
          value: 'custom:' + p.id,
          label: '\uD83D\uDD11 ' + p.label + ' (' + p.model_id + ')'
        };
      }));
    } else {
      addGroup('Custom Added AI APIs', [
        { value: '__none_custom__', label: 'No custom APIs saved yet (click + Add AI API)', disabled: true }
      ]);
    }

    addGroup('Google AI Studio ($0 Free Tier)', [
      { value: 'gemini:gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { value: 'gemini:gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite' },
      { value: 'gemini:gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { value: 'gemini:gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite' }
    ]);

    addGroup('Cloudflare Workers AI (10K Neurons/Day)', [
      { value: 'workers:@cf/google/gemma-4-26b-a4b-it', label: 'Gemma 4 26B A4B (Low-Neuron)' },
      { value: 'workers:@cf/meta/llama-3.3-70b-instruct-fp8-fast', label: 'Llama 3.3 70B Instruct' },
      { value: 'workers:@cf/meta/llama-3.1-8b-instruct-fp8-fast', label: 'Llama 3.1 8B Fast (Ultra-Low)' }
    ]);

    addGroup('Zero-Quota Local Mode', [
      { value: 'local:deterministic', label: '\u26A1 Local Deterministic Extractor (Zero API / Zero Quota)' }
    ]);

    var hasWanted = false;
    for (var i = 0; i < selectEl.options.length; i++) {
      if (selectEl.options[i].value === wanted && !selectEl.options[i].disabled) {
        hasWanted = true;
        break;
      }
    }
    selectEl.value = hasWanted ? wanted : 'auto';
  }

  function fetchCustomAiProviders() {
    return apiFetch('/api/admin/ai-providers').then(function (res) {
      cachedCustomAiProviders = (res && Array.isArray(res.providers)) ? res.providers : [];
      try {
        window.dispatchEvent(new CustomEvent('cso:ai-providers-updated', { detail: { providers: cachedCustomAiProviders } }));
      } catch (_e) {}
      return cachedCustomAiProviders;
    }).catch(function () {
      return cachedCustomAiProviders;
    });
  }

  function openAiProvidersManagerModal() {
    var existingModal = document.getElementById('csoAiProvidersModal');
    if (existingModal) existingModal.remove();

    var editingProviderId = '';
    var overlay = el('div', 'cso-aip-overlay');
    overlay.id = 'csoAiProvidersModal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Multi-Provider AI API Manager');

    var dialog = el('div', 'cso-aip-dialog');

    var head = el('div', 'cso-aip-head');
    var headCopy = el('div', 'cso-aip-head-copy');
    headCopy.append(
      el('h3', 'cso-aip-title', '\uD83D\uDD11 Multi-Provider AI API Manager'),
      el('p', 'cso-aip-sub', 'Add free-tier Groq, OpenRouter, Cerebras, Mistral, Backup Gemini, or custom OpenAI-compatible API keys. Stored securely in D1 and masked on read.')
    );
    var btnClose = el('button', 'cso-pill-btn', '\u2715 Close');
    btnClose.type = 'button';
    btnClose.id = 'btnCloseAiProvidersModal';
    head.append(headCopy, btnClose);

    var body = el('div', 'cso-aip-body');

    // 1-Click Presets Row
    var presetSec = el('div', 'cso-aip-section');
    presetSec.appendChild(el('div', 'cso-aip-sec-label', '1-Click Provider Presets'));
    var presetGrid = el('div', 'cso-aip-presets');
    var presetHint = el('p', 'cso-aip-hint', 'Pick a preset below to pre-fill Base URL & Model ID, then paste your API key and click Test Connection.');

    // Form Inputs
    var formGrid = el('div', 'cso-form-grid cso-aip-form-grid');

    function mkGrp(lblTxt, ctrl, full) {
      var g = el('div', 'cso-form-group' + (full ? ' cso-span-full' : ''));
      var l = el('label', 'cso-form-label', lblTxt);
      if (ctrl.id) l.setAttribute('for', ctrl.id);
      g.append(l, ctrl);
      return g;
    }

    var inpLabel = el('input', 'cso-form-input');
    inpLabel.type = 'text';
    inpLabel.id = 'inpAiProvLabel';
    inpLabel.placeholder = 'e.g., Groq Free (Llama 3.3 70B)';

    var selType = el('select', 'cso-form-select');
    selType.id = 'selAiProvType';
    [
      ['openai_compatible', 'OpenAI-Compatible (/chat/completions)'],
      ['gemini', 'Google Gemini (:generateContent)']
    ].forEach(function (pair) {
      var op = el('option', '', pair[1]);
      op.value = pair[0];
      selType.appendChild(op);
    });

    var inpBaseUrl = el('input', 'cso-form-input');
    inpBaseUrl.type = 'url';
    inpBaseUrl.id = 'inpAiProvBaseUrl';
    inpBaseUrl.placeholder = 'https://api.groq.com/openai/v1';

    var inpModelId = el('input', 'cso-form-input');
    inpModelId.type = 'text';
    inpModelId.id = 'inpAiProvModelId';
    inpModelId.placeholder = 'llama-3.3-70b-versatile';

    var inpApiKey = el('input', 'cso-form-input');
    inpApiKey.type = 'password';
    inpApiKey.id = 'inpAiProvApiKey';
    inpApiKey.autocomplete = 'new-password';
    inpApiKey.placeholder = 'Paste API key (kept masked; leave blank when editing to keep existing key)';

    var inpPriority = el('input', 'cso-form-input');
    inpPriority.type = 'number';
    inpPriority.id = 'inpAiProvPriority';
    inpPriority.min = '1';
    inpPriority.max = '999';
    inpPriority.value = '10';

    formGrid.append(
      mkGrp('Display Label *', inpLabel, false),
      mkGrp('Provider Type *', selType, false),
      mkGrp('Base URL (https://) *', inpBaseUrl, true),
      mkGrp('Model ID *', inpModelId, false),
      mkGrp('Cascade Priority (1 = highest)', inpPriority, false),
      mkGrp('API Key *', inpApiKey, true)
    );

    AI_PROVIDER_PRESETS.forEach(function (pr) {
      var pb = el('button', 'cso-pill-btn cso-aip-preset-btn', pr.chip);
      pb.type = 'button';
      pb.setAttribute('data-ai-preset', pr.key);
      pb.addEventListener('click', function () {
        editingProviderId = '';
        inpLabel.value = pr.label;
        selType.value = pr.provider_type;
        inpBaseUrl.value = pr.base_url;
        inpModelId.value = pr.model_id;
        inpApiKey.value = '';
        inpApiKey.placeholder = 'Paste your ' + pr.chip.replace(/^[^\s]+\s+/, '') + ' API key...';
        presetHint.textContent = pr.hint;
        btnSave.textContent = '\uD83D\uDCBE Save Provider';
        inpApiKey.focus();
      });
      presetGrid.appendChild(pb);
    });
    presetSec.append(presetGrid, presetHint);

    var modalStatus = el('div', 'cso-aip-status', 'Ready \u00B7 Add a provider or select a 1-click preset above.');
    modalStatus.id = 'csoAiProvidersModalStatus';
    modalStatus.setAttribute('role', 'status');
    modalStatus.setAttribute('aria-live', 'polite');

    var btnRow = el('div', 'cso-aip-btn-row');
    var btnTest = el('button', 'cso-pill-btn is-accent', '\u26A1 Test Connection');
    btnTest.type = 'button';
    btnTest.id = 'btnAiProvTest';

    var btnSave = el('button', 'cso-btn cso-btn-primary', '\uD83D\uDCBE Save Provider');
    btnSave.type = 'button';
    btnSave.id = 'btnAiProvSave';

    var btnReset = el('button', 'cso-pill-btn', 'Reset Form');
    btnReset.type = 'button';
    btnReset.id = 'btnAiProvReset';
    btnRow.append(btnTest, btnSave, btnReset);

    // Saved Providers Live List
    var listSec = el('div', 'cso-aip-section');
    listSec.appendChild(el('div', 'cso-aip-sec-label', 'Saved Custom AI Providers (Ordered by Priority)'));
    var listHost = el('div', 'cso-aip-list');
    listHost.id = 'csoAiProvidersList';
    listSec.appendChild(listHost);

    function setModalStatus(msg, state) {
      modalStatus.classList.remove('is-ok', 'is-warn', 'is-error');
      if (state) modalStatus.classList.add('is-' + state);
      modalStatus.textContent = msg;
    }

    function resetForm() {
      editingProviderId = '';
      inpLabel.value = '';
      selType.value = 'openai_compatible';
      inpBaseUrl.value = '';
      inpModelId.value = '';
      inpApiKey.value = '';
      inpApiKey.placeholder = 'Paste API key (kept masked; leave blank when editing to keep existing key)';
      inpPriority.value = '10';
      btnSave.textContent = '\uD83D\uDCBE Save Provider';
    }

    function renderSavedList(providers) {
      clear(listHost);
      if (!providers || !providers.length) {
        listHost.appendChild(el('p', 'cso-ca-empty', 'No custom AI providers configured yet. Click any preset above (Groq, OpenRouter, Cerebras, Mistral, Backup Gemini) to add one.'));
        return;
      }
      providers.forEach(function (p) {
        var row = el('div', 'cso-aip-item' + (p.enabled ? '' : ' is-disabled'));
        var info = el('div', 'cso-aip-item-info');
        var topLine = el('div', 'cso-aip-item-top');
        topLine.append(
          el('strong', 'cso-aip-item-name', p.label),
          el('span', 'cso-pill-badge', '#' + p.priority),
          el('span', 'cso-pill-badge', p.provider_type === 'gemini' ? 'Gemini' : 'OpenAI-Compat'),
          el('span', 'cso-pill-badge', p.enabled ? 'Enabled' : 'Disabled')
        );
        var metaLine = el('div', 'cso-aip-item-meta', p.model_id + ' \u00B7 ' + p.base_url + ' \u00B7 Key: ' + (p.api_key_masked || '****'));
        info.append(topLine, metaLine);

        var acts = el('div', 'cso-aip-item-actions');

        var bToggle = el('button', 'cso-pill-btn', p.enabled ? 'Disable' : 'Enable');
        bToggle.type = 'button';
        bToggle.addEventListener('click', function () {
          bToggle.disabled = true;
          apiFetch('/api/admin/ai-providers', {
            method: 'POST',
            body: { id: p.id, enabled: !p.enabled }
          }).then(function () {
            setModalStatus((p.enabled ? 'Disabled ' : 'Enabled ') + p.label + '.', 'ok');
            return refreshProviders();
          }).catch(function (e) {
            setModalStatus('\u2715 ' + e.message, 'error');
          }).finally(function () { bToggle.disabled = false; });
        });

        var bEdit = el('button', 'cso-pill-btn', 'Edit');
        bEdit.type = 'button';
        bEdit.addEventListener('click', function () {
          editingProviderId = p.id;
          inpLabel.value = p.label;
          selType.value = p.provider_type;
          inpBaseUrl.value = p.base_url;
          inpModelId.value = p.model_id;
          inpApiKey.value = '';
          inpApiKey.placeholder = 'Stored key (' + p.api_key_masked + ') \u2014 leave blank to keep';
          inpPriority.value = String(p.priority || 10);
          btnSave.textContent = '\uD83D\uDCBE Update Provider';
          setModalStatus('Editing "' + p.label + '" (leave API Key blank to preserve stored key).', 'warn');
          inpLabel.focus();
        });

        var bTest = el('button', 'cso-pill-btn is-accent', '\u26A1 Test');
        bTest.type = 'button';
        bTest.addEventListener('click', function () {
          bTest.disabled = true;
          setModalStatus('\u23F3 Testing ' + p.label + ' (' + p.model_id + ')\u2026', 'warn');
          apiFetch('/api/admin/ai-providers/test', {
            method: 'POST',
            body: { id: p.id }
          }).then(function (r) {
            setModalStatus('\u2713 ' + p.label + ': ' + (r.message || 'Connected') + ' (' + (r.latency_ms || 0) + ' ms)', 'ok');
            toast(p.label + ' connected in ' + (r.latency_ms || 0) + ' ms!', 'ok');
          }).catch(function (e) {
            setModalStatus('\u2715 Test failed for ' + p.label + ': ' + e.message, 'error');
            toast('Test failed: ' + e.message, 'amber');
          }).finally(function () { bTest.disabled = false; });
        });

        var bDel = el('button', 'cso-pill-btn is-danger', '\uD83D\uDDD1 Delete');
        bDel.type = 'button';
        bDel.addEventListener('click', function () {
          if (!window.confirm('Delete custom AI provider "' + p.label + '"?')) return;
          bDel.disabled = true;
          apiFetch('/api/admin/ai-providers/' + encodeURIComponent(p.id), { method: 'DELETE' })
            .then(function () {
              if (editingProviderId === p.id) resetForm();
              setModalStatus('\u2713 Deleted "' + p.label + '".', 'ok');
              toast('Deleted AI provider "' + p.label + '".', 'ok');
              return refreshProviders();
            })
            .catch(function (e) {
              setModalStatus('\u2715 ' + e.message, 'error');
            })
            .finally(function () { bDel.disabled = false; });
        });

        acts.append(bToggle, bEdit, bTest, bDel);
        row.append(info, acts);
        listHost.appendChild(row);
      });
    }

    function refreshProviders() {
      return fetchCustomAiProviders().then(function (list) {
        renderSavedList(list);
        return list;
      });
    }

    btnTest.addEventListener('click', function () {
      var payload = {
        id: editingProviderId || undefined,
        label: inpLabel.value.trim() || 'Custom AI',
        provider_type: selType.value,
        base_url: inpBaseUrl.value.trim(),
        model_id: inpModelId.value.trim(),
        api_key: inpApiKey.value.trim()
      };
      if (!payload.base_url || !payload.model_id || (!payload.api_key && !editingProviderId)) {
        setModalStatus('Enter Base URL, Model ID, and API Key before testing.', 'warn');
        return;
      }
      btnTest.disabled = true;
      setModalStatus('\u23F3 Sending live 10-token test ("Reply with OK") to ' + payload.model_id + '\u2026', 'warn');
      apiFetch('/api/admin/ai-providers/test', { method: 'POST', body: payload })
        .then(function (r) {
          setModalStatus('\u2713 ' + (r.message || 'Connected') + ' \u00B7 ' + (r.model_id || payload.model_id) + ' (' + (r.latency_ms || 0) + ' ms)', 'ok');
          toast('Connection OK (' + (r.latency_ms || 0) + ' ms)!', 'ok');
        })
        .catch(function (e) {
          setModalStatus('\u2715 Connection failed: ' + e.message, 'error');
          toast('Connection failed: ' + e.message, 'amber');
        })
        .finally(function () { btnTest.disabled = false; });
    });

    btnSave.addEventListener('click', function () {
      var payload = {
        id: editingProviderId || undefined,
        label: inpLabel.value.trim(),
        provider_type: selType.value,
        base_url: inpBaseUrl.value.trim(),
        model_id: inpModelId.value.trim(),
        api_key: inpApiKey.value.trim(),
        priority: Number(inpPriority.value) || 10,
        enabled: true
      };
      if (!payload.label || !payload.base_url || !payload.model_id || (!payload.api_key && !editingProviderId)) {
        setModalStatus('Display Label, Base URL, Model ID, and API Key are required.', 'warn');
        return;
      }
      btnSave.disabled = true;
      setModalStatus('Saving provider to D1\u2026', 'warn');
      apiFetch('/api/admin/ai-providers', { method: 'POST', body: payload })
        .then(function (r) {
          var saved = r && r.provider;
          resetForm();
          setModalStatus('\u2713 Saved "' + ((saved && saved.label) || payload.label) + '" to D1!', 'ok');
          toast('Saved custom AI provider!', 'ok');
          return refreshProviders().then(function () {
            if (saved && saved.id) {
              saveAiEnginePref('custom:' + saved.id);
            }
          });
        })
        .catch(function (e) {
          setModalStatus('\u2715 ' + e.message, 'error');
          toast('Save failed: ' + e.message, 'crimson');
        })
        .finally(function () { btnSave.disabled = false; });
    });

    btnReset.addEventListener('click', function () {
      resetForm();
      setModalStatus('Form cleared.', '');
    });

    function closeModal() {
      document.removeEventListener('keydown', onEsc);
      document.body.classList.remove('cso-modal-open');
      overlay.remove();
    }
    function onEsc(e) {
      if (e.key === 'Escape') closeModal();
    }
    btnClose.addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', onEsc);
    document.body.classList.add('cso-modal-open');

    body.append(presetSec, formGrid, modalStatus, btnRow, listSec);
    dialog.append(head, body);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    listHost.appendChild(el('p', 'cso-ca-empty', 'Loading saved providers from D1\u2026'));
    refreshProviders();
  }

  window.CSOOpenAiProvidersModal = openAiProvidersManagerModal;
  window.CSOAiEngineHelper = {
    storageKey: AI_ENGINE_STORAGE_KEY,
    getPref: getSavedAiEnginePref,
    setPref: saveAiEnginePref,
    populateSelect: populateAiEngineSelect,
    fetchProviders: fetchCustomAiProviders
  };

  function slugify(raw) {
    return String(raw || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 96);
  }

  var BLUEPRINT_PLACEHOLDER_SLUGS = (function () {
    var set = {
      'preview': true,
      'untitled': true,
      'untitled-guide': true,
      'untitled-informative-guide': true,
      'auto-generated-url-slug': true,
      'guide-preview': true
    };
    STARTER_TEMPLATES.forEach(function (tpl) {
      if (tpl.key) set[slugify(tpl.key)] = true;
      if (tpl.name) set[slugify(tpl.name)] = true;
      if (tpl.category) set[slugify(tpl.category)] = true;
    });
    CATEGORIES.forEach(function (cat) {
      if (cat.key) set[slugify(cat.key)] = true;
      if (cat.label) set[slugify(cat.label)] = true;
      if (cat.shortLabel) set[slugify(cat.shortLabel)] = true;
    });
    return set;
  })();

  function isBlueprintPlaceholderSlug(rawSlug, lastAutoSlug) {
    var clean = slugify(rawSlug);
    if (!clean) return true;
    if (lastAutoSlug && clean === slugify(lastAutoSlug)) return true;
    return Boolean(BLUEPRINT_PLACEHOLDER_SLUGS[clean]);
  }

  function bustCaches() {
    if (window.CSOQuickCreate && typeof window.CSOQuickCreate.bustHomeCache === 'function') {
      window.CSOQuickCreate.bustHomeCache('all');
    }
  }

  function apiFetch(url, opts) {
    var o = opts || {};
    var method = (o.method || 'GET').toUpperCase();
    var headers = Object.assign({}, o.headers || {});
    if (method !== 'GET' && method !== 'HEAD') {
      headers['X-CSO-CSRF'] = '1';
      if (!(o.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }
    var body = o.body;
    if (body && !(body instanceof FormData) && typeof body !== 'string') {
      body = JSON.stringify(body);
    }
    return fetch(url, {
      method: method,
      credentials: 'same-origin',
      headers: headers,
      body: body
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) {
          var err = new Error((d && (d.error || d.message)) || ('HTTP ' + r.status));
          err.status = r.status;
          throw err;
        }
        if (method !== 'GET' && method !== 'HEAD' && String(url).indexOf('/ai-coauthor') === -1) {
          bustCaches();
        }
        return d;
      });
    });
  }

  function uploadImageToMediaR2(file) {
    var fd = new FormData();
    fd.append('file', file);
    return apiFetch('/api/admin/media/upload', { method: 'POST', body: fd }).then(function (res) {
      var u = res && (res.url || (res.item && (res.item.clean_url || res.item.url)));
      if (!u) throw new Error('Media upload succeeded but no URL returned.');
      return { url: u, size_bytes: res.size_bytes || 0 };
    });
  }

  function uploadPdfToFilesR2(file) {
    var fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'Study PDFs');
    return apiFetch('/api/admin/files/upload', { method: 'POST', body: fd }).then(function (res) {
      var item = (res && res.item) || res || {};
      var u = item.clean_url || item.url;
      if (!u) throw new Error('PDF upload succeeded but no URL returned.');
      return {
        url: u,
        size_bytes: Number(item.size_bytes || file.size || 0),
        original_name: item.original_name || file.name || ''
      };
    });
  }

  function formatBytesLabel(bytes) {
    var n = Number(bytes || 0);
    if (!n) return 'Official PDF';
    if (n < 1024 * 1024) return 'Official PDF · ' + Math.max(1, Math.round(n / 1024)) + ' KB';
    return 'Official PDF · ' + (n / (1024 * 1024)).toFixed(1) + ' MB';
  }

  var _pdfjsLibPromise = null;
  function loadSelfHostedPdfJs() {
    if (!_pdfjsLibPromise) {
      _pdfjsLibPromise = import('/assets/js/vendor/pdfjs/pdf.min.mjs').then(function (lib) {
        if (lib && lib.GlobalWorkerOptions) {
          lib.GlobalWorkerOptions.workerSrc = '/assets/js/vendor/pdfjs/pdf.worker.min.mjs';
        }
        return lib;
      });
    }
    return _pdfjsLibPromise;
  }

  function extractPdfTextFallback(arrayBuf) {
    try {
      var raw = new TextDecoder('latin1').decode(new Uint8Array(arrayBuf).slice(0, 1500000));
      var chunks = [];
      var re = /\(([^()\\]{3,240})\)/g;
      var m;
      while ((m = re.exec(raw)) !== null && chunks.length < 1800) {
        var cleaned = m[1].replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleaned.length >= 3) chunks.push(cleaned);
      }
      return chunks.join(' ').slice(0, 34000);
    } catch (_e) {
      return '';
    }
  }

  function extractTextFromPdfFile(file) {
    return file.arrayBuffer().then(function (buf) {
      return loadSelfHostedPdfJs().then(function (pdfjsLib) {
        var loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)), useSystemFonts: true });
        return loadingTask.promise.then(function (pdfDoc) {
          var totalPages = Math.min(Number(pdfDoc.numPages || 0), 35);
          var pageNums = [];
          for (var p = 1; p <= totalPages; p++) pageNums.push(p);
          var pagesText = [];
          return pageNums.reduce(function (chain, pageNum) {
            return chain.then(function () {
              return pdfDoc.getPage(pageNum).then(function (page) {
                return page.getTextContent().then(function (tc) {
                  var items = (tc && Array.isArray(tc.items)) ? tc.items : [];
                  var rows = [];
                  items.forEach(function (it) {
                    var str = String((it && it.str) || '').trim();
                    if (!str) return;
                    var tx = (it.transform && it.transform[4]) || 0;
                    var ty = (it.transform && it.transform[5]) || 0;
                    var row = null;
                    for (var ri = 0; ri < rows.length; ri++) {
                      if (Math.abs(rows[ri].y - ty) <= 3.5) { row = rows[ri]; break; }
                    }
                    if (!row) {
                      row = { y: ty, cells: [] };
                      rows.push(row);
                    }
                    row.cells.push({ x: tx, text: str });
                  });
                  rows.sort(function (a, b) { return b.y - a.y; });
                  var pageLines = rows.map(function (r) {
                    r.cells.sort(function (a, b) { return a.x - b.x; });
                    var parts = [];
                    for (var ci = 0; ci < r.cells.length; ci++) {
                      if (ci > 0 && (r.cells[ci].x - r.cells[ci - 1].x) > 38) {
                        parts.push(' | ');
                      } else if (ci > 0) {
                        parts.push(' ');
                      }
                      parts.push(r.cells[ci].text);
                    }
                    return parts.join('').replace(/\s{2,}/g, ' ').trim();
                  }).filter(Boolean);
                  if (pageLines.length) {
                    pagesText.push('--- Page ' + pageNum + ' ---\n' + pageLines.join('\n'));
                  }
                });
              });
            });
          }, Promise.resolve()).then(function () {
            var full = pagesText.join('\n\n').trim().slice(0, 60000);
            if (!full) full = extractPdfTextFallback(buf);
            return { text: full, pageCount: Number(pdfDoc.numPages || 0) };
          });
        });
      }).catch(function () {
        return { text: extractPdfTextFallback(buf), pageCount: 0 };
      });
    });
  }

  function requestAiGeneratedImage(payload) {
    return apiFetch('/api/admin/ai/generate-image', {
      method: 'POST',
      body: payload || {}
    });
  }

  function getCategoryMeta(key) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].key === key) return CATEGORIES[i];
    }
    return CATEGORIES[0];
  }

  function insertAtCursor(textarea, snippet) {
    if (!textarea) return;
    var start = textarea.selectionStart || 0;
    var end = textarea.selectionEnd || 0;
    var val = textarea.value || '';
    var prefix = start > 0 && val.charAt(start - 1) !== '\n' ? '\n\n' : '';
    textarea.value = val.slice(0, start) + prefix + snippet + val.slice(end);
    textarea.focus();
    var pos = start + prefix.length + snippet.length;
    try { textarea.setSelectionRange(pos, pos); } catch (_) {}
  }

  // =========================================================================
  // CSP-SAFE CLIENT MARKDOWN RENDERER + TOC BUILDER (FOR LIVE PREVIEW MODAL)
  // =========================================================================
  function appendInlineFormatted(parent, rawText) {
    var text = String(rawText || '');
    var tokenRe = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
    var lastIdx = 0;
    var match;
    while ((match = tokenRe.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parent.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
      }
      var tok = match[0];
      if (tok.startsWith('**') && tok.endsWith('**')) {
        parent.appendChild(el('strong', '', tok.slice(2, -2)));
      } else if (tok.startsWith('*') && tok.endsWith('*')) {
        parent.appendChild(el('em', '', tok.slice(1, -1)));
      } else if (tok.startsWith('`') && tok.endsWith('`')) {
        parent.appendChild(el('code', '', tok.slice(1, -1)));
      } else if (tok.startsWith('[')) {
        var lm = tok.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
        if (lm) {
          var href = lm[2];
          if (/^https?:\/\//i.test(href) || (href.startsWith('/') && !href.startsWith('//'))) {
            var a = el('a', '', lm[1]);
            a.href = href;
            if (/^https?:\/\//i.test(href)) {
              a.target = '_blank';
              a.rel = 'noopener noreferrer';
            }
            parent.appendChild(a);
          } else {
            parent.appendChild(document.createTextNode(lm[1]));
          }
        }
      }
      lastIdx = match.index + tok.length;
    }
    if (lastIdx < text.length) {
      parent.appendChild(document.createTextNode(text.slice(lastIdx)));
    }
  }

  function normalizeHtmlLikeBody(rawBody) {
    var s = String(rawBody || '').replace(/\r\n/g, '\n');
    if (/<(?:h[23]|p|li|strong|em|br)\b/i.test(s)) {
      s = s
        .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
        .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
        .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1')
        .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
        .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/?(?:p|ul|ol|div|section|article)[^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, '');
    }
    return s;
  }

  function buildBodyDomAndToc(rawBody, prefix) {
    var frag = document.createDocumentFragment();
    var toc = [];
    var lines = normalizeHtmlLikeBody(rawBody).split('\n');
    var used = {};
    var i = 0;

    function mkId(txt) {
      var base = slugify(txt).slice(0, 48) || prefix;
      var id = prefix + '-' + base;
      var c = 2;
      while (used[id]) { id = prefix + '-' + base + '-' + (c++); }
      used[id] = true;
      return id;
    }

    while (i < lines.length) {
      var line = lines[i].trim();
      if (!line) { i++; continue; }

      var hm = line.match(/^(#{2,3})\s+(.+)$/);
      if (hm) {
        var lvl = hm[1].length;
        var hText = hm[2].trim();
        var hid = mkId(hText);
        toc.push({ id: hid, level: lvl, text: hText });
        var hNode = el('h' + lvl, 'gp-h' + lvl);
        hNode.id = hid;
        appendInlineFormatted(hNode, hText);
        frag.appendChild(hNode);
        i++;
        continue;
      }

      if (line.startsWith('>')) {
        var qLines = [];
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          qLines.push(lines[i].trim().replace(/^>\s?/, ''));
          i++;
        }
        var badge = '';
        if (qLines[0] && /^\[!(NOTE|TIP|IMPORTANT|WARNING)\]/i.test(qLines[0])) {
          badge = qLines.shift().replace(/^\[!([A-Z]+)\]\s*/i, '$1').toUpperCase();
        }
        var aside = el('aside', 'gp-callout is-' + (badge ? badge.toLowerCase() : 'note'));
        aside.appendChild(el('div', 'gp-callout-tag', badge ? ('\uD83D\uDCCC ' + badge) : '\uD83D\uDCCC IMPORTANT NOTE / EXAM RULE'));
        qLines.filter(Boolean).forEach(function (ql) {
          var p = el('p');
          appendInlineFormatted(p, ql);
          aside.appendChild(p);
        });
        frag.appendChild(aside);
        continue;
      }

      if (line.startsWith('|') && line.endsWith('|') && i + 1 < lines.length && /^\|[\s:-]+(?:\|[\s:-]+)*\|$/.test(lines[i + 1].trim())) {
        var parseRow = function (r) { return r.replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); }); };
        var headers = parseRow(line);
        i += 2;
        var rows = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          rows.push(parseRow(lines[i].trim()));
          i++;
        }
        var wrap = el('div', 'gp-table-wrap');
        var tbl = el('table', 'gp-table');
        var thead = el('thead');
        var trh = el('tr');
        headers.forEach(function (h) {
          var th = el('th');
          appendInlineFormatted(th, h);
          trh.appendChild(th);
        });
        thead.appendChild(trh);
        var tbody = el('tbody');
        rows.forEach(function (r) {
          var tr = el('tr');
          headers.forEach(function (_, ci) {
            var td = el('td');
            appendInlineFormatted(td, r[ci] || '');
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        tbl.append(thead, tbody);
        wrap.appendChild(tbl);
        frag.appendChild(wrap);
        continue;
      }

      if (/^!\[([^\]]{0,260})\]\(([^)\s]{1,600})\)$/.test(line)) {
        var im = line.match(/^!\[([^\]]{0,260})\]\(([^)\s]{1,600})\)$/);
        var imgSrc = im && im[2] ? im[2].trim() : '';
        if (imgSrc && (imgSrc.indexOf('/') === 0 || /^https?:\/\//i.test(imgSrc))) {
          var fig = el('figure', 'gp-inline-figure');
          var imEl = el('img', 'gp-inline-img');
          imEl.src = imgSrc;
          imEl.alt = (im[1] || 'Guide infographic').trim();
          imEl.loading = 'lazy';
          fig.appendChild(imEl);
          if (im[1] && im[1].trim()) fig.appendChild(el('figcaption', 'gp-caption', im[1].trim()));
          frag.appendChild(fig);
          i++;
          continue;
        }
      }

      if (/^[-*\u2022]\s+/.test(line)) {
        var ul = el('ul', 'gp-list');
        while (i < lines.length && /^[-*\u2022]\s+/.test(lines[i].trim())) {
          var li = el('li');
          appendInlineFormatted(li, lines[i].trim().replace(/^[-*\u2022]\s+/, ''));
          ul.appendChild(li);
          i++;
        }
        frag.appendChild(ul);
        continue;
      }

      if (/^\d+\.\s+/.test(line)) {
        var ol = el('ol', 'gp-list is-ordered');
        while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
          var oli = el('li');
          appendInlineFormatted(oli, lines[i].trim().replace(/^\d+\.\s+/, ''));
          ol.appendChild(oli);
          i++;
        }
        frag.appendChild(ol);
        continue;
      }

      var paraLines = [];
      while (i < lines.length && lines[i].trim() && !/^(#{2,3}\s|>|\||[-*\u2022]\s|\d+\.\s|!\[)/.test(lines[i].trim())) {
        paraLines.push(lines[i].trim());
        i++;
      }
      var pNode = el('p', 'gp-para');
      appendInlineFormatted(pNode, paraLines.join(' '));
      frag.appendChild(pNode);
    }

    return { fragment: frag, toc: toc };
  }

  // =========================================================================
  // INTERACTIVE FULL-SCREEN LIVE PREVIEW MODAL
  // =========================================================================
  function openLivePreviewModal(draft, onPublishLive) {
    var existing = document.getElementById('csoGuideLivePreviewModal');
    if (existing) existing.remove();

    var state = {
      viewport: 'desktop', // desktop | mobile
      lang: 'en',          // en | or
      theme: 'system'      // system | dark | reading | utkal-bharat
    };

    var overlay = el('div', 'cso-guide-preview-overlay');
    overlay.id = 'csoGuideLivePreviewModal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Live Pre-Publish Guide Preview');

    var toolbar = el('div', 'cso-guide-preview-toolbar');
    var tbLeft = el('div', 'cso-guide-preview-tb-group');
    var resolvedPreviewSlug = (!draft.slug || isBlueprintPlaceholderSlug(draft.slug))
      ? (slugify(draft.title_en) || draft.slug || 'preview')
      : draft.slug;
    tbLeft.appendChild(el('strong', 'cso-guide-preview-title', '\uD83D\uDC41\uFE0F Live Preview \u00B7 /guides/' + resolvedPreviewSlug));

    // Viewport switch
    var vpGroup = el('div', 'cso-guide-preview-seg');
    var btnDesk = el('button', 'cso-guide-preview-seg-btn is-active', '\uD83D\uDDA5\uFE0F Desktop (100%)');
    btnDesk.type = 'button';
    var btnMob = el('button', 'cso-guide-preview-seg-btn', '\uD83D\uDCF1 Mobile (390px)');
    btnMob.type = 'button';
    vpGroup.append(btnDesk, btnMob);

    // Language switch
    var langGroup = el('div', 'cso-guide-preview-seg');
    var btnEn = el('button', 'cso-guide-preview-seg-btn is-active', 'English');
    btnEn.type = 'button';
    var btnOr = el('button', 'cso-guide-preview-seg-btn', '\u0B13\u0B21\u0B3C\u0B3F\u0B06');
    btnOr.type = 'button';
    langGroup.append(btnEn, btnOr);

    // 4-Theme selector
    var themeSel = el('select', 'cso-form-select cso-guide-preview-theme-sel');
    themeSel.setAttribute('aria-label', 'Preview Theme');
    [
      ['system', 'System Light'],
      ['dark', 'Dark Night'],
      ['reading', 'Reading Mode'],
      ['utkal-bharat', 'Odisha & Bharat']
    ].forEach(function (pair) {
      var op = el('option', '', pair[1]);
      op.value = pair[0];
      themeSel.appendChild(op);
    });

    var tbRight = el('div', 'cso-guide-preview-tb-group');
    var btnPublish = el('button', 'cso-btn cso-btn-primary', '\uD83D\uDE80 Publish Live');
    btnPublish.type = 'button';
    var btnClose = el('button', 'cso-pill-btn', '\u2715 Close');
    btnClose.type = 'button';
    tbRight.append(btnPublish, btnClose);

    toolbar.append(tbLeft, vpGroup, langGroup, themeSel, tbRight);

    var stageWrap = el('div', 'cso-guide-preview-stage-wrap');
    var frame = el('div', 'cso-guide-preview-frame');
    frame.setAttribute('data-cso-theme', 'system');
    frame.setAttribute('data-theme', 'system');
    frame.setAttribute('data-cso-resolved-mode', 'light');
    frame.setAttribute('data-guide-lang', 'en');
    stageWrap.appendChild(frame);

    function applyPreviewControls() {
      btnDesk.classList.toggle('is-active', state.viewport === 'desktop');
      btnMob.classList.toggle('is-active', state.viewport === 'mobile');
      frame.classList.toggle('is-mobile-frame', state.viewport === 'mobile');

      btnEn.classList.toggle('is-active', state.lang === 'en');
      btnOr.classList.toggle('is-active', state.lang === 'or');
      frame.setAttribute('data-guide-lang', state.lang);

      frame.setAttribute('data-cso-theme', state.theme);
      frame.setAttribute('data-theme', state.theme === 'utkal-bharat' ? 'odisha' : state.theme);
      frame.setAttribute('data-cso-resolved-mode', state.theme === 'dark' ? 'dark' : 'light');
      renderArticleIntoFrame();
    }

    function pickLang(enVal, orVal) {
      if (state.lang === 'or' && String(orVal || '').trim()) return String(orVal).trim();
      return String(enVal || orVal || '').trim();
    }

    function renderArticleIntoFrame() {
      clear(frame);
      var cat = getCategoryMeta(draft.category);
      var main = el('div', 'gp-main gp-reader-main gp-shell gp-detail-shell cso-gp-preview-inner');

      // Kicker / Breadcrumb
      var kicker = el('nav', 'gp-breadcrumb cso-detail-kicker');
      kicker.setAttribute('aria-label', 'Breadcrumb');
      var sep1 = el('span', 'gp-breadcrumb-sep cso-detail-kicker-sep', '\u203A');
      sep1.setAttribute('aria-hidden', 'true');
      var sep2 = el('span', 'gp-breadcrumb-sep cso-detail-kicker-sep', '\u203A');
      sep2.setAttribute('aria-hidden', 'true');
      kicker.append(
        el('span', '', 'CS ODISHA'),
        sep1,
        el('span', '', 'GUIDES'),
        sep2,
        el('span', '', cat.label.toUpperCase())
      );
      main.appendChild(kicker);

      // Header Card
      var head = el('header', 'gp-article-head');
      var metaRow = el('div', 'gp-article-meta-row');
      metaRow.appendChild(el('span', 'gp-badge', cat.icon + ' ' + cat.label));
      metaRow.appendChild(el('span', 'gp-meta-pill', '\u23F1\uFE0F ' + (draft.read_minutes || 5) + ' min read'));
      metaRow.appendChild(el('span', 'gp-meta-pill', draft.scope || 'Odisha'));
      if (draft.is_exam) metaRow.appendChild(el('span', 'gp-meta-pill is-exam', '\uD83D\uDCDD Exam Relevant'));
      head.appendChild(metaRow);
      head.appendChild(el('h1', 'gp-article-title', pickLang(draft.title_en, draft.title_or) || 'Untitled Informative Guide'));
      var sumTxt = pickLang(draft.summary_en, draft.summary_or);
      if (sumTxt) head.appendChild(el('p', 'gp-article-summary', sumTxt));
      main.appendChild(head);

      // Cover Photo
      if (draft.cover_image) {
        var fig = el('figure', 'gp-cover gp-cover-figure');
        var coverFrame = el('div', 'gp-cover-frame gp-hero-media');
        var img = el('img', 'gp-cover-img');
        img.src = draft.cover_image;
        img.alt = draft.cover_caption_en || draft.title_en || 'Cover Photo';
        coverFrame.appendChild(img);
        fig.appendChild(coverFrame);
        var cap = pickLang(draft.cover_caption_en, draft.cover_caption_or);
        if (cap) fig.appendChild(el('figcaption', 'gp-caption', cap));
        main.appendChild(fig);
      }

      // Reader Layout (TOC + Body)
      var layout = el('div', 'gp-reader-layout gp-detail-grid');
      var parsed = buildBodyDomAndToc(pickLang(draft.body_en, draft.body_or), 'pv-' + state.lang);

      var rail = el('aside', 'gp-toc-rail');
      if (parsed.toc.length) {
        var tocNav = el('nav', 'gp-toc');
        tocNav.setAttribute('aria-label', state.lang === 'or' ? '\u0B2C\u0B3F\u0B37\u0B5F\u0B38\u0B42\u0B1A\u0B40' : 'Table of Contents');
        var tocDetails = el('details', 'gp-toc-details');
        tocDetails.open = state.viewport !== 'mobile';
        var tocSummary = el('summary', 'gp-toc-summary');
        tocSummary.appendChild(el('span', 'gp-toc-title', (state.lang === 'or' ? '\uD83D\uDCD1 \u0B2C\u0B3F\u0B37\u0B5F\u0B38\u0B42\u0B1A\u0B40' : '\uD83D\uDCD1 On This Page') + ' (' + parsed.toc.length + ')'));
        var chev = el('span', 'gp-toc-chevron', '\u25BE');
        chev.setAttribute('aria-hidden', 'true');
        tocSummary.appendChild(chev);
        var ol = el('ol', 'gp-toc-list');
        parsed.toc.forEach(function (h) {
          var li = el('li', 'is-lvl-' + h.level);
          var a = el('a', '', h.text);
          a.href = '#' + h.id;
          li.appendChild(a);
          ol.appendChild(li);
        });
        tocDetails.append(tocSummary, ol);
        tocNav.appendChild(tocDetails);
        rail.appendChild(tocNav);
      }

      var art = el('article', 'gp-article gp-article-body gp-article-card');

      // Key Takeaways
      var tks = (draft.takeaways || []).filter(function (t) { return t && (t.text_en || t.text_or); });
      if (tks.length) {
        var tkSec = el('section', 'gp-takeaways');
        tkSec.appendChild(el('h2', 'gp-sec-title', state.lang === 'or' ? '\uD83D\uDCCC \u0B2E\u0B41\u0B16\u0B4D\u0B5F \u0B2C\u0B3F\u0B28\u0B4D\u0B26\u0B41\u0B38\u0B2E\u0B42\u0B39' : '\uD83D\uDCCC Key Takeaways'));
        var tkUl = el('ul', 'gp-takeaway-list');
        tks.forEach(function (t) {
          tkUl.appendChild(el('li', '', pickLang(t.text_en, t.text_or)));
        });
        tkSec.appendChild(tkUl);
        art.appendChild(tkSec);
      }

      // Formatted Body
      var prose = el('div', 'gp-body gp-prose');
      prose.appendChild(parsed.fragment);
      art.appendChild(prose);

      // Inline Photo Gallery
      var photos = (draft.photos || []).filter(function (p) { return p && p.url; });
      if (photos.length) {
        var phSec = el('section', 'gp-section gp-gallery-sec');
        phSec.appendChild(el('h2', 'gp-sec-title', state.lang === 'or' ? '\uD83D\uDDBC\uFE0F \u0B1A\u0B3F\u0B24\u0B4D\u0B30 \u0B13 \u0B2B\u0B1F\u0B4B' : '\uD83D\uDDBC\uFE0F Visual Walkthrough & Reference Photos'));
        var pg = el('div', 'gp-gallery-grid');
        photos.forEach(function (p) {
          var pf = el('figure', 'gp-photo-card');
          var pi = el('img');
          pi.src = p.url;
          pi.alt = p.alt || p.caption_en || 'Guide photo';
          pf.appendChild(pi);
          var pc = pickLang(p.caption_en, p.caption_or);
          if (pc) pf.appendChild(el('figcaption', 'gp-caption', pc));
          pg.appendChild(pf);
        });
        phSec.appendChild(pg);
        art.appendChild(phSec);
      }

      // Downloadable PDFs
      var pdfs = (draft.pdfs || []).filter(function (d) { return d && d.url && d.title_en; });
      if (pdfs.length) {
        var pdfSec = el('section', 'gp-section gp-pdfs-sec');
        pdfSec.appendChild(el('h2', 'gp-sec-title', state.lang === 'or' ? '\uD83D\uDCC4 \u0B21\u0B3E\u0B09\u0B28\u0B32\u0B4B\u0B21\u0B4D \u0B2F\u0B4B\u0B17\u0B4D\u0B5F PDF' : '\uD83D\uDCC4 Downloadable PDFs & Official Documents'));
        var pdg = el('div', 'gp-pdf-grid');
        pdfs.forEach(function (d) {
          var a = el('a', 'gp-pdf-card');
          a.href = d.url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.appendChild(el('span', 'gp-pdf-ico', 'PDF'));
          var info = el('span', 'gp-pdf-info');
          info.appendChild(el('strong', 'gp-pdf-title', pickLang(d.title_en, d.title_or)));
          info.appendChild(el('span', 'gp-pdf-badge', d.badge || 'Official PDF'));
          a.appendChild(info);
          a.appendChild(el('span', 'gp-pdf-dl', 'Download \u2193'));
          pdg.appendChild(a);
        });
        pdfSec.appendChild(pdg);
        art.appendChild(pdfSec);
      }

      // Verified Official Links
      var links = (draft.links || []).filter(function (l) { return l && l.url && l.label_en; });
      if (links.length) {
        var lkSec = el('section', 'gp-section gp-links-sec');
        lkSec.appendChild(el('h2', 'gp-sec-title', state.lang === 'or' ? '\uD83D\uDD17 \u0B2F\u0B3E\u0B1E\u0B4D\u0B1A \u0B39\u0B4B\u0B07\u0B25\u0B3F\u0B2C\u0B3E \u0B38\u0B30\u0B15\u0B3E\u0B30\u0B40 \u0B32\u0B3F\u0B19\u0B4D\u0B15\u0B4D' : '\uD83D\uDD17 Verified Official Links & References'));
        var tw = el('div', 'gp-table-wrap');
        var tb = el('table', 'gp-table gp-links-table');
        var th = el('thead');
        var thr = el('tr');
        ['Resource / Portal', 'Verification', 'Action'].forEach(function (c) { thr.appendChild(el('th', '', c)); });
        th.appendChild(thr);
        var tbd = el('tbody');
        links.forEach(function (l) {
          var tr = el('tr');
          tr.appendChild(el('td', '', pickLang(l.label_en, l.label_or)));
          var tdv = el('td');
          tdv.appendChild(el('span', l.is_official ? 'gp-gov-badge' : 'gp-ref-badge', l.is_official ? '\u2713 Official .gov.in Verified' : 'Reference'));
          tr.appendChild(tdv);
          var tda = el('td');
          var la = el('a', 'gp-link-btn', 'Open Link \u2197');
          la.href = l.url;
          la.target = '_blank';
          la.rel = 'noopener noreferrer';
          tda.appendChild(la);
          tr.appendChild(tda);
          tbd.appendChild(tr);
        });
        tb.append(th, tbd);
        tw.appendChild(tb);
        lkSec.appendChild(tw);
        art.appendChild(lkSec);
      }

      // Related Practice / Alert CTA
      var cta = draft.related_cta;
      if (cta && (cta.slug || cta.url)) {
        var cSec = el('section', 'gp-related-cta');
        var copy = el('div', 'gp-related-cta-copy');
        var lbl = cta.type === 'mock_test' ? '\u23F1\uFE0F Related CBT Mock Test' : (cta.type === 'job' ? '\uD83D\uDCBC Related Recruitment Alert' : (cta.type === 'scheme' ? '\uD83C\uDFDB\uFE0F Related Government Scheme' : '\uD83D\uDE80 Recommended Action'));
        copy.appendChild(el('span', 'gp-badge', lbl));
        copy.appendChild(el('h2', 'gp-related-cta-title', pickLang(cta.title_en, cta.title_or) || cta.slug));
        var cBtn = el('a', 'gp-btn-primary', pickLang(cta.cta_en || 'Open Resource \u2192', cta.cta_or));
        cBtn.href = cta.url || '#';
        cSec.append(copy, cBtn);
        art.appendChild(cSec);
      }

      layout.append(rail, art);
      main.appendChild(layout);
      frame.appendChild(main);
    }

    function closeModal() {
      document.removeEventListener('keydown', onEsc);
      document.body.classList.remove('cso-modal-open');
      overlay.remove();
    }
    function onEsc(e) { if (e.key === 'Escape') closeModal(); }

    btnDesk.addEventListener('click', function () { state.viewport = 'desktop'; applyPreviewControls(); });
    btnMob.addEventListener('click', function () { state.viewport = 'mobile'; applyPreviewControls(); });
    btnEn.addEventListener('click', function () { state.lang = 'en'; applyPreviewControls(); });
    btnOr.addEventListener('click', function () { state.lang = 'or'; applyPreviewControls(); });
    themeSel.addEventListener('change', function () { state.theme = themeSel.value; applyPreviewControls(); });
    btnClose.addEventListener('click', closeModal);
    btnPublish.addEventListener('click', function () {
      closeModal();
      if (typeof onPublishLive === 'function') onPublishLive();
    });
    document.addEventListener('keydown', onEsc);
    document.body.classList.add('cso-modal-open');

    overlay.append(toolbar, stageWrap);
    document.body.appendChild(overlay);
    applyPreviewControls();
  }

  // =========================================================================
  // COMPOSER VIEW (TEMPLATES + AI BAR + MEDIA REPEATERS + LIVE PREVIEW)
  // =========================================================================
  function renderComposer(root, headerActions, existingGuide, opts) {
    var options = opts || {};
    var onBack = typeof options.onBack === 'function' ? options.onBack : function () { renderFolderView(root, headerActions, 'all'); };
    var editing = existingGuide && existingGuide.id ? existingGuide : null;

    clear(root);
    if (headerActions) {
      clear(headerActions);
      var hdrBack = el('button', 'cso-pill-btn', '\u2190 Back to Articles & Guides');
      hdrBack.type = 'button';
      hdrBack.addEventListener('click', onBack);
      headerActions.appendChild(hdrBack);
    }

    var shell = el('div', 'cso-guides-studio');

    // State for repeaters
    var takeawaysList = editing && Array.isArray(editing.takeaways) && editing.takeaways.length
      ? editing.takeaways.map(function (t) { return { text_en: t.text_en || '', text_or: t.text_or || '' }; })
      : [{ text_en: '', text_or: '' }];
    var photosList = editing && Array.isArray(editing.photos)
      ? editing.photos.map(function (p) { return { url: p.url || '', caption_en: p.caption_en || '', caption_or: p.caption_or || '', alt: p.alt || '' }; })
      : [];
    var pdfsList = editing && Array.isArray(editing.pdfs)
      ? editing.pdfs.map(function (d) { return { title_en: d.title_en || '', title_or: d.title_or || '', url: d.url || '', badge: d.badge || 'Official PDF' }; })
      : [];
    var linksList = editing && Array.isArray(editing.links)
      ? editing.links.map(function (l) { return { label_en: l.label_en || '', label_or: l.label_or || '', url: l.url || '', is_official: Boolean(l.is_official) }; })
      : [];

    var initialSlugVal = (editing && editing.slug) || '';
    var lastAutoSlug = initialSlugVal;
    var slugTouched = Boolean(initialSlugVal && !isBlueprintPlaceholderSlug(initialSlugVal));

    // Core Form Inputs
    var selCat = el('select', 'cso-form-select');
    CATEGORIES.forEach(function (c) {
      var op = el('option', '', c.icon + ' ' + c.label);
      op.value = c.key;
      selCat.appendChild(op);
    });
    selCat.value = (editing && editing.category) || options.initialCategory || 'how-to';

    var selScope = el('select', 'cso-form-select');
    [['Odisha', 'Odisha State'], ['National', 'National / All-India']].forEach(function (p) {
      var op = el('option', '', p[1]);
      op.value = p[0];
      selScope.appendChild(op);
    });
    selScope.value = (editing && editing.scope) || 'Odisha';

    var inReadMins = el('input', 'cso-form-input');
    inReadMins.type = 'number';
    inReadMins.min = '1';
    inReadMins.max = '120';
    inReadMins.value = String((editing && editing.read_minutes) || 5);
    var readMinsManual = Boolean(editing && editing.read_minutes);
    inReadMins.addEventListener('input', function () { readMinsManual = true; });

    var inTags = el('input', 'cso-form-input');
    inTags.type = 'text';
    inTags.placeholder = 'e.g., OPSC, OAS, Odisha Scholarship, How-To';
    inTags.value = (editing && editing.tags) || '';

    var chkPin = el('input');
    chkPin.type = 'checkbox';
    chkPin.checked = Boolean(editing && editing.is_pinned);

    var chkExam = el('input');
    chkExam.type = 'checkbox';
    chkExam.checked = Boolean(editing ? editing.is_exam : selCat.value === 'exam-strategy');

    var inTitleEn = el('input', 'cso-form-input');
    inTitleEn.type = 'text';
    inTitleEn.placeholder = 'Clear, informative English guide title...';
    inTitleEn.value = (editing && editing.title_en) || '';

    var inTitleOr = el('input', 'cso-form-input');
    inTitleOr.type = 'text';
    inTitleOr.placeholder = '\u0B13\u0B21\u0B3C\u0B3F\u0B06 \u0B36\u0B40\u0B30\u0B4D\u0B37\u0B15...';
    inTitleOr.value = (editing && editing.title_or) || '';

    var inSlug = el('input', 'cso-form-input');
    inSlug.type = 'text';
    inSlug.placeholder = 'auto-generated-url-slug';
    inSlug.value = initialSlugVal;

    function syncSlugFromTitleIfUnmodified() {
      var derived = slugify(inTitleEn.value);
      var current = inSlug.value.trim();
      if (derived && (!slugTouched || !current || isBlueprintPlaceholderSlug(current, lastAutoSlug))) {
        inSlug.value = derived;
        lastAutoSlug = derived;
        slugTouched = false;
      }
      return inSlug.value.trim() || derived;
    }

    inSlug.addEventListener('input', function () {
      var cur = inSlug.value.trim();
      slugTouched = Boolean(cur) && !isBlueprintPlaceholderSlug(cur, lastAutoSlug);
    });
    inTitleEn.addEventListener('input', function () {
      syncSlugFromTitleIfUnmodified();
    });
    inTitleEn.addEventListener('change', function () {
      syncSlugFromTitleIfUnmodified();
    });

    var inSumEn = el('textarea', 'cso-form-textarea');
    inSumEn.rows = 2;
    inSumEn.placeholder = 'Concise 2-line English summary for hub cards and Google SEO...';
    inSumEn.value = (editing && editing.summary_en) || '';

    var inSumOr = el('textarea', 'cso-form-textarea');
    inSumOr.rows = 2;
    inSumOr.placeholder = '2-\u0B27\u0B3E\u0B21\u0B3C\u0B3F \u0B13\u0B21\u0B3C\u0B3F\u0B06 \u0B38\u0B3E\u0B30\u0B3E\u0B02\u0B36...';
    inSumOr.value = (editing && editing.summary_or) || '';

    var BODY_EN_LOCK_MIN_CHARS = 200;

    var inBodyEn = el('textarea', 'cso-form-textarea cso-guide-body-ta');
    inBodyEn.id = 'inpGuideBodyEn';
    inBodyEn.setAttribute('data-cso-lang', 'en');
    inBodyEn.rows = 18;
    inBodyEn.placeholder = '## Overview\nWrite or paste your full English guide Markdown here (>= 200 chars automatically locks verbatim during AI Auto-Fill)...';
    inBodyEn.value = (editing && editing.body_en) || '';

    var bodyEnLockBadge = el('span', 'cso-pill-badge cso-guide-lock-badge', '\uD83D\uDD12 Pasted Text Locked (Auto-Fill will preserve 100% verbatim)');
    bodyEnLockBadge.id = 'guideBodyEnLockBadge';
    bodyEnLockBadge.hidden = inBodyEn.value.trim().length < BODY_EN_LOCK_MIN_CHARS;

    var inBodyOr = el('textarea', 'cso-form-textarea cso-guide-body-ta');
    inBodyOr.id = 'guideBodyOrInput';
    inBodyOr.setAttribute('data-cso-lang', 'or');
    inBodyOr.setAttribute('data-cso-odia-body', '1');
    inBodyOr.rows = 18;
    inBodyOr.placeholder = '## \u0B38\u0B02\u0B15\u0B4D\u0B37\u0B3F\u0B2A\u0B4D\u0B24 \u0B2C\u0B3F\u0B2C\u0B30\u0B23\u0B40\n\u0B38\u0B2E\u0B4D\u0B2A\u0B42\u0B30\u0B4D\u0B23\u0B4D\u0B23 \u0B13\u0B21\u0B3C\u0B3F\u0B06 \u0B2C\u0B3F\u0B37\u0B5F\u0B2C\u0B38\u0B4D\u0B24\u0B41...';
    inBodyOr.value = (editing && editing.body_or) || '';

    var wordCountBar = el('div', 'cso-guide-wordcount-bar');
    wordCountBar.id = 'guideBodyWordCount';
    wordCountBar.setAttribute('aria-live', 'polite');

    function countWords(str) {
      var trimmed = String(str || '').trim();
      return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
    }

    function updateBodyEnLockBadge() {
      var isLocked = inBodyEn.value.trim().length >= BODY_EN_LOCK_MIN_CHARS;
      bodyEnLockBadge.hidden = !isLocked;
      return isLocked;
    }

    function updateWordCountAndReadTime(forceSyncReadMins) {
      updateBodyEnLockBadge();
      var enWords = countWords(inBodyEn.value);
      var orWords = countWords(inBodyOr.value);
      var estMins = Math.max(1, Math.min(120, Math.ceil(Math.max(enWords, 1) / 200)));
      if ((forceSyncReadMins || !readMinsManual) && enWords >= 20) {
        inReadMins.value = String(estMins);
      }
      wordCountBar.textContent = '\uD83D\uDCCA Word Count: ' + enWords.toLocaleString() + ' EN words (~' + estMins + ' min read at 200 wpm) \u00B7 ' + orWords.toLocaleString() + ' \u0B13\u0B21\u0B3C\u0B3F\u0B06 words';
      return { enWords: enWords, orWords: orWords, estMins: estMins };
    }

    inBodyEn.addEventListener('input', function () { updateWordCountAndReadTime(false); });
    inBodyEn.addEventListener('paste', function () { window.setTimeout(function () { updateWordCountAndReadTime(false); }, 10); });
    inBodyOr.addEventListener('input', function () { updateWordCountAndReadTime(false); });

    // Cover photo inputs
    var inCoverUrl = el('input', 'cso-form-input');
    inCoverUrl.type = 'url';
    inCoverUrl.placeholder = '/api/media/... or https://...';
    inCoverUrl.value = (editing && editing.cover_image) || '';

    var inCoverCapEn = el('input', 'cso-form-input');
    inCoverCapEn.type = 'text';
    inCoverCapEn.placeholder = 'Cover caption & accessible alt text (EN)';
    inCoverCapEn.value = (editing && editing.cover_caption_en) || '';

    var inCoverCapOr = el('input', 'cso-form-input');
    inCoverCapOr.type = 'text';
    inCoverCapOr.placeholder = '\u0B15\u0B2D\u0B30\u0B4D \u0B2B\u0B1F\u0B4B \u0B15\u0B4D\u0B5F\u0B3E\u0B2A\u0B4D\u0B38\u0B28\u0B4D (\u0B13\u0B21\u0B3C\u0B3F\u0B06)';
    inCoverCapOr.value = (editing && editing.cover_caption_or) || '';

    // Related Practice / Alert Linker
    var relObj = (editing && editing.related_cta) || {};
    var selRelType = el('select', 'cso-form-select');
    [
      ['', 'None (No related action card)'],
      ['mock_test', '\u23F1\uFE0F Related CBT Mock Test'],
      ['job', '\uD83D\uDCBC Related Job Alert'],
      ['scheme', '\uD83C\uDFDB\uFE0F Related Government Scheme'],
      ['custom', '\uD83D\uDD17 Custom Internal / Official Link']
    ].forEach(function (p) {
      var op = el('option', '', p[1]);
      op.value = p[0];
      selRelType.appendChild(op);
    });
    selRelType.value = relObj.type || '';

    var inRelSlug = el('input', 'cso-form-input');
    inRelSlug.type = 'text';
    inRelSlug.setAttribute('list', 'csoGuideRelatedSlugList');
    inRelSlug.placeholder = 'Pick or enter slug / path (e.g., opsc-oas-prelims-mock-1 or /mock-tests/)';
    inRelSlug.value = relObj.slug || relObj.url || '';

    var relDatalist = el('datalist');
    relDatalist.id = 'csoGuideRelatedSlugList';

    function populateRelatedSlugSuggestions(kind) {
      clear(relDatalist);
      var ep = kind === 'mock_test' ? '/api/admin/mock-tests?limit=30'
        : (kind === 'job' ? '/api/admin/jobs/articles?limit=30'
          : (kind === 'scheme' ? '/api/admin/schemes/articles?limit=30' : ''));
      if (!ep) return;
      apiFetch(ep).then(function (d) {
        var rows = (d && (d.items || d.tests || d.articles)) || [];
        rows.forEach(function (item) {
          var s = item && (item.slug || item.id);
          if (!s) return;
          var op = el('option');
          op.value = String(s);
          op.label = String(item.title_en || item.title || s);
          relDatalist.appendChild(op);
        });
      }).catch(function () {});
    }
    selRelType.addEventListener('change', function () { populateRelatedSlugSuggestions(selRelType.value); });
    if (selRelType.value) populateRelatedSlugSuggestions(selRelType.value);

    var inRelTitleEn = el('input', 'cso-form-input');
    inRelTitleEn.type = 'text';
    inRelTitleEn.placeholder = 'Action card heading (EN, e.g., Practice OPSC OAS Full Mock Test)';
    inRelTitleEn.value = relObj.title_en || '';

    var inRelTitleOr = el('input', 'cso-form-input');
    inRelTitleOr.type = 'text';
    inRelTitleOr.placeholder = 'Action card heading (\u0B13\u0B21\u0B3C\u0B3F\u0B06)';
    inRelTitleOr.value = relObj.title_or || '';

    var inRelCtaEn = el('input', 'cso-form-input');
    inRelCtaEn.type = 'text';
    inRelCtaEn.placeholder = 'Button label (EN, e.g., Start Practice Test \u2192)';
    inRelCtaEn.value = relObj.cta_en || '';

    var inRelCtaOr = el('input', 'cso-form-input');
    inRelCtaOr.type = 'text';
    inRelCtaOr.placeholder = 'Button label (\u0B13\u0B21\u0B3C\u0B3F\u0B06)';
    inRelCtaOr.value = relObj.cta_or || '';

    var statusMsg = el('span', 'cso-ca-status');
    statusMsg.setAttribute('role', 'status');
    statusMsg.setAttribute('aria-live', 'polite');

    function makeField(labelText, control, extraClass) {
      var grp = el('div', 'cso-form-group' + (extraClass ? ' ' + extraClass : ''));
      grp.appendChild(el('label', 'cso-form-label', labelText));
      grp.appendChild(control);
      return grp;
    }

    // ---- Repeaters ----
    var takeawaysHost = el('div', 'cso-guide-repeater-list');
    function drawTakeaways() {
      clear(takeawaysHost);
      takeawaysList.forEach(function (row, idx) {
        var r = el('div', 'cso-guide-repeater-row cso-guide-repeater-2col');
        var iEn = el('input', 'cso-form-input');
        iEn.placeholder = 'Key takeaway #' + (idx + 1) + ' (English)';
        iEn.value = row.text_en || '';
        iEn.addEventListener('input', function () { row.text_en = iEn.value; });

        var iOr = el('input', 'cso-form-input');
        iOr.placeholder = '\u0B2E\u0B41\u0B16\u0B4D\u0B5F \u0B24\u0B25\u0B4D\u0B5F #' + (idx + 1) + ' (\u0B13\u0B21\u0B3C\u0B3F\u0B06)';
        iOr.value = row.text_or || '';
        iOr.addEventListener('input', function () { row.text_or = iOr.value; });

        var del = el('button', 'cso-pill-btn is-danger', '\u2715');
        del.type = 'button';
        del.title = 'Remove takeaway';
        del.addEventListener('click', function () {
          takeawaysList.splice(idx, 1);
          drawTakeaways();
        });
        r.append(iEn, iOr, del);
        takeawaysHost.appendChild(r);
      });
    }

    var photosHost = el('div', 'cso-guide-repeater-list');
    function drawPhotos() {
      clear(photosHost);
      if (!photosList.length) {
        photosHost.appendChild(el('p', 'cso-ca-empty', 'No inline gallery photos added yet. Click "+ Add Gallery Photo" or "🎨 + AI Illustration" to upload or generate section visuals.'));
      }
      photosList.forEach(function (p, idx) {
        var card = el('div', 'cso-guide-slot-card');
        var topRow = el('div', 'cso-guide-slot-row');

        var thumb = el('img', 'cso-guide-slot-thumb');
        thumb.alt = p.alt || p.caption_en || 'Gallery visual preview';
        if (p.url) {
          thumb.src = p.url;
          thumb.hidden = false;
        } else {
          thumb.hidden = true;
        }

        var iUrl = el('input', 'cso-form-input');
        iUrl.type = 'url';
        iUrl.placeholder = 'Image URL (/api/media/... or https://...)';
        iUrl.value = p.url || '';
        iUrl.addEventListener('input', function () {
          p.url = iUrl.value;
          if (p.url.trim()) {
            thumb.src = p.url.trim();
            thumb.hidden = false;
          } else {
            thumb.hidden = true;
          }
        });

        var fInput = el('input');
        fInput.type = 'file';
        fInput.accept = 'image/jpeg,image/png,image/webp';
        fInput.hidden = true;
        var upBtn = el('button', 'cso-pill-btn', '\u2B06 Upload (R2)');
        upBtn.type = 'button';
        upBtn.addEventListener('click', function () { fInput.click(); });
        fInput.addEventListener('change', function () {
          if (!fInput.files || !fInput.files[0]) return;
          upBtn.disabled = true;
          upBtn.textContent = 'Uploading\u2026';
          uploadImageToMediaR2(fInput.files[0]).then(function (r) {
            p.url = r.url;
            p.provider_label = 'R2 Upload';
            iUrl.value = r.url;
            thumb.src = r.url;
            thumb.hidden = false;
            provBadge.textContent = '\u2713 Uploaded to cso-media R2';
            provBadge.hidden = false;
            toast('Photo uploaded to cso-media R2!', 'ok');
          }).catch(function (e) {
            toast('Upload failed: ' + e.message, 'crimson');
          }).finally(function () {
            upBtn.disabled = false;
            upBtn.textContent = '\u2B06 Upload (R2)';
            fInput.value = '';
          });
        });

        var rmBtn = el('button', 'cso-pill-btn is-danger', '\u2715 Remove');
        rmBtn.type = 'button';
        rmBtn.addEventListener('click', function () { photosList.splice(idx, 1); drawPhotos(); });

        topRow.append(thumb, iUrl, fInput, upBtn, rmBtn);

        var aiRow = el('div', 'cso-guide-slot-row');
        var iAiPrompt = el('input', 'cso-form-input');
        iAiPrompt.type = 'text';
        iAiPrompt.placeholder = 'Optional AI illustration prompt (e.g., Odisha campus study roadmap visual)...';
        iAiPrompt.value = p.ai_prompt || '';
        iAiPrompt.addEventListener('input', function () { p.ai_prompt = iAiPrompt.value; });

        var aiIllusBtn = el('button', 'cso-pill-btn is-accent', '\uD83C\uDFA8 AI Illustration');
        aiIllusBtn.type = 'button';
        var provBadge = el('span', 'cso-pill-badge cso-guide-provider-badge');
        if (p.provider_label) {
          provBadge.textContent = '\u2728 ' + p.provider_label;
          provBadge.hidden = false;
        } else {
          provBadge.hidden = true;
        }

        aiIllusBtn.addEventListener('click', function () {
          aiIllusBtn.disabled = true;
          aiIllusBtn.textContent = '\uD83C\uDFA8 Generating\u2026';
          var scenePrompt = iAiPrompt.value.trim() || p.caption_en || '';
          var titleHint = p.caption_en || inTitleEn.value.trim() || 'Odisha Informative Guide Section Illustration';
          requestAiGeneratedImage({
            prompt: scenePrompt,
            title_en: titleHint,
            category: selCat.value,
            scope: selScope.value,
            aspect_ratio: '16:9'
          }).then(function (r) {
            p.url = r.url || '';
            p.caption_en = p.caption_en || r.caption_en || titleHint;
            p.caption_or = p.caption_or || r.caption_or || '';
            p.alt = p.alt || r.alt_en || titleHint;
            p.provider_label = (r.provider_label || r.provider || 'AI') + (r.model ? (' · ' + r.model) : '');
            drawPhotos();
            toast('AI Illustration generated via ' + (r.provider_label || r.provider) + '!', 'ok');
          }).catch(function (e) {
            toast('AI Illustration failed: ' + e.message, 'crimson');
          }).finally(function () {
            aiIllusBtn.disabled = false;
            aiIllusBtn.textContent = '\uD83C\uDFA8 AI Illustration';
          });
        });

        aiRow.append(iAiPrompt, aiIllusBtn, provBadge);

        var capRow = el('div', 'cso-guide-repeater-3col');
        var iCapEn = el('input', 'cso-form-input');
        iCapEn.placeholder = 'Caption (English)';
        iCapEn.value = p.caption_en || '';
        iCapEn.addEventListener('input', function () { p.caption_en = iCapEn.value; });

        var iCapOr = el('input', 'cso-form-input');
        iCapOr.placeholder = 'Caption (\u0B13\u0B21\u0B3C\u0B3F\u0B06)';
        iCapOr.value = p.caption_or || '';
        iCapOr.addEventListener('input', function () { p.caption_or = iCapOr.value; });

        var iAlt = el('input', 'cso-form-input');
        iAlt.placeholder = 'Alt Text (Accessibility)';
        iAlt.value = p.alt || '';
        iAlt.addEventListener('input', function () { p.alt = iAlt.value; });

        capRow.append(iCapEn, iCapOr, iAlt);
        card.append(topRow, aiRow, capRow);
        photosHost.appendChild(card);
      });
    }

    var pdfsHost = el('div', 'cso-guide-repeater-list');
    function drawPdfs() {
      clear(pdfsHost);
      if (!pdfsList.length) {
        pdfsHost.appendChild(el('p', 'cso-ca-empty', 'No downloadable PDFs attached yet. Upload directly to cso-files R2 or paste an official .gov.in PDF URL.'));
      }
      pdfsList.forEach(function (d, idx) {
        var card = el('div', 'cso-guide-slot-card');
        var r1 = el('div', 'cso-guide-repeater-3col');
        var iTEn = el('input', 'cso-form-input');
        iTEn.placeholder = 'Document Title (English, e.g., Official Notification PDF)';
        iTEn.value = d.title_en || '';
        iTEn.addEventListener('input', function () { d.title_en = iTEn.value; });

        var iTOr = el('input', 'cso-form-input');
        iTOr.placeholder = 'Document Title (\u0B13\u0B21\u0B3C\u0B3F\u0B06)';
        iTOr.value = d.title_or || '';
        iTOr.addEventListener('input', function () { d.title_or = iTOr.value; });

        var iBadge = el('input', 'cso-form-input');
        iBadge.placeholder = 'Badge / Size (e.g., Syllabus PDF · 1.2 MB)';
        iBadge.value = d.badge || '';
        iBadge.addEventListener('input', function () { d.badge = iBadge.value; });
        r1.append(iTEn, iTOr, iBadge);

        var r2 = el('div', 'cso-guide-slot-row');
        var iUrl = el('input', 'cso-form-input');
        iUrl.type = 'url';
        iUrl.placeholder = 'PDF URL (/files/... or https://...gov.in/...pdf)';
        iUrl.value = d.url || '';
        iUrl.addEventListener('input', function () { d.url = iUrl.value; });

        var fInput = el('input');
        fInput.type = 'file';
        fInput.accept = 'application/pdf';
        fInput.hidden = true;
        var upBtn = el('button', 'cso-pill-btn', '\u2B06 Upload PDF (cso-files R2)');
        upBtn.type = 'button';
        upBtn.addEventListener('click', function () { fInput.click(); });
        fInput.addEventListener('change', function () {
          if (!fInput.files || !fInput.files[0]) return;
          upBtn.disabled = true;
          upBtn.textContent = 'Uploading PDF\u2026';
          uploadPdfToFilesR2(fInput.files[0]).then(function (r) {
            d.url = r.url;
            iUrl.value = r.url;
            if (!d.title_en && r.original_name) {
              d.title_en = r.original_name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ');
              iTEn.value = d.title_en;
            }
            if (!d.badge || d.badge === 'Official PDF') {
              d.badge = formatBytesLabel(r.size_bytes);
              iBadge.value = d.badge;
            }
            toast('PDF uploaded to cso-files R2!', 'ok');
          }).catch(function (e) {
            toast('PDF upload failed: ' + e.message, 'crimson');
          }).finally(function () {
            upBtn.disabled = false;
            upBtn.textContent = '\u2B06 Upload PDF (cso-files R2)';
            fInput.value = '';
          });
        });

        var rmBtn = el('button', 'cso-pill-btn is-danger', '\u2715 Remove');
        rmBtn.type = 'button';
        rmBtn.addEventListener('click', function () { pdfsList.splice(idx, 1); drawPdfs(); });

        r2.append(iUrl, fInput, upBtn, rmBtn);
        card.append(r1, r2);
        pdfsHost.appendChild(card);
      });
    }

    var linksHost = el('div', 'cso-guide-repeater-list');
    function drawLinks() {
      clear(linksHost);
      if (!linksList.length) {
        linksHost.appendChild(el('p', 'cso-ca-empty', 'No verified reference links added yet. Click "+ Add Reference Link" to add official .gov.in portals or internal pages.'));
      }
      linksList.forEach(function (l, idx) {
        var card = el('div', 'cso-guide-slot-card');
        var r1 = el('div', 'cso-guide-repeater-3col');
        var iLEn = el('input', 'cso-form-input');
        iLEn.placeholder = 'Button Label (English, e.g., OPSC Official Portal)';
        iLEn.value = l.label_en || '';
        iLEn.addEventListener('input', function () { l.label_en = iLEn.value; });

        var iLOr = el('input', 'cso-form-input');
        iLOr.placeholder = 'Button Label (\u0B13\u0B21\u0B3C\u0B3F\u0B06)';
        iLOr.value = l.label_or || '';
        iLOr.addEventListener('input', function () { l.label_or = iLOr.value; });

        var iUrl = el('input', 'cso-form-input');
        iUrl.type = 'url';
        iUrl.placeholder = 'https://www.opsc.gov.in/ or /jobs/';
        iUrl.value = l.url || '';
        iUrl.addEventListener('input', function () {
          l.url = iUrl.value;
          if (/\.gov\.in\b|\.nic\.in\b/i.test(l.url) && !l._userToggled) {
            l.is_official = true;
            chkGov.checked = true;
          }
        });
        r1.append(iLEn, iLOr, iUrl);

        var r2 = el('div', 'cso-guide-slot-row');
        var govLbl = el('label', 'cso-qc-check');
        var chkGov = el('input');
        chkGov.type = 'checkbox';
        chkGov.checked = Boolean(l.is_official);
        chkGov.addEventListener('change', function () {
          l._userToggled = true;
          l.is_official = chkGov.checked;
        });
        govLbl.append(chkGov, el('span', '', '\u2713 Official .gov.in Verified Badge'));

        var rmBtn = el('button', 'cso-pill-btn is-danger', '\u2715 Remove');
        rmBtn.type = 'button';
        rmBtn.addEventListener('click', function () { linksList.splice(idx, 1); drawLinks(); });

        r2.append(govLbl, rmBtn);
        card.append(r1, r2);
        linksHost.appendChild(card);
      });
    }

    function collectDraftPayload(overrideStatus) {
      var relSlug = inRelSlug.value.trim();
      var relType = selRelType.value;
      var relatedCta = {};
      if (relType && relSlug) {
        var rUrl = relSlug.startsWith('/') || /^https?:\/\//i.test(relSlug)
          ? relSlug
          : (relType === 'mock_test' ? '/mock-tests/?test=' + encodeURIComponent(relSlug)
            : (relType === 'job' ? '/jobs/' + encodeURIComponent(relSlug)
              : (relType === 'scheme' ? '/schemes/' + encodeURIComponent(relSlug) : relSlug)));
        relatedCta = {
          type: relType,
          slug: relSlug,
          url: rUrl,
          title_en: inRelTitleEn.value.trim(),
          title_or: inRelTitleOr.value.trim(),
          cta_en: inRelCtaEn.value.trim(),
          cta_or: inRelCtaOr.value.trim()
        };
      }
      var syncedSlug = syncSlugFromTitleIfUnmodified();
      return {
        category: selCat.value,
        scope: selScope.value,
        read_minutes: Number(inReadMins.value) || 5,
        tags: inTags.value.trim(),
        is_pinned: chkPin.checked,
        is_exam: chkExam.checked,
        title_en: inTitleEn.value.trim(),
        title_or: inTitleOr.value.trim(),
        slug: syncedSlug || slugify(inTitleEn.value),
        summary_en: inSumEn.value.trim(),
        summary_or: inSumOr.value.trim(),
        takeaways: takeawaysList.filter(function (t) { return (t.text_en || '').trim() || (t.text_or || '').trim(); }),
        body_en: inBodyEn.value,
        body_or: inBodyOr.value,
        cover_image: inCoverUrl.value.trim(),
        cover_caption_en: inCoverCapEn.value.trim(),
        cover_caption_or: inCoverCapOr.value.trim(),
        photos: photosList.filter(function (p) { return (p.url || '').trim(); }),
        pdfs: pdfsList.filter(function (d) { return (d.url || '').trim() && (d.title_en || '').trim(); }),
        links: linksList.filter(function (l) { return (l.url || '').trim() && (l.label_en || '').trim(); }),
        related_cta: relatedCta,
        status: overrideStatus || (editing && editing.status) || 'draft'
      };
    }

    function saveGuide(targetStatus) {
      var payload = collectDraftPayload(targetStatus);
      if (!payload.title_en) {
        statusMsg.textContent = 'Title (English) is required.';
        toast('Please enter a Guide Title (English).', 'amber');
        inTitleEn.focus();
        return;
      }
      statusMsg.textContent = targetStatus === 'published' ? 'Publishing live & syncing Vectorize + Homepage\u2026' : 'Saving draft to D1\u2026';
      var ep = editing ? ('/api/admin/guides/' + encodeURIComponent(editing.id)) : '/api/admin/guides';
      apiFetch(ep, { method: editing ? 'PUT' : 'POST', body: payload })
        .then(function (res) {
          var item = res && res.item;
          if (item) editing = item;
          if (item && item.slug) inSlug.value = item.slug;
          statusMsg.textContent = targetStatus === 'published'
            ? '\u2713 Published live at ' + (item ? item.url : '/guides/') + '!'
            : '\u2713 Draft saved in D1.';
          toast(targetStatus === 'published' ? 'Guide published live & synced to Homepage + Search!' : 'Guide draft saved!', 'ok');
          if (typeof window.CSOStudioRefreshGuideCount === 'function') window.CSOStudioRefreshGuideCount();
        })
        .catch(function (err) {
          statusMsg.textContent = '\u2715 ' + err.message;
          toast(err.message || 'Save failed.', 'crimson');
        });
    }

    // ---- 1. STARTER BLUEPRINT SELECTOR ----
    var tplCard = el('section', 'cso-card studio-card cso-guide-tpl-card');
    var tplHead = el('div', 'cso-guide-sec-head');
    tplHead.append(
      el('h3', 'cso-qc-card-title', '\uD83D\uDCD0 Starter Blueprint Selector (1-Click Templates)'),
      el('span', 'cso-text-muted', 'Pre-fills clean headings, checklists, callout boxes & tables')
    );
    var tplGrid = el('div', 'cso-guide-tpl-grid');
    STARTER_TEMPLATES.forEach(function (tpl) {
      var b = el('button', 'cso-guide-tpl-btn');
      b.type = 'button';
      b.setAttribute('data-guide-template', tpl.key);
      b.append(
        el('span', 'cso-guide-tpl-ico', tpl.icon),
        el('strong', '', tpl.name)
      );
      b.addEventListener('click', function () {
        var hasExisting = Boolean(inBodyEn.value.trim() || inBodyOr.value.trim() || inTitleEn.value.trim() || inSumEn.value.trim());
        if (hasExisting && !window.confirm('Apply "' + tpl.name + '" blueprint? This will overwrite the current body and starter takeaways.')) {
          return;
        }
        tplGrid.querySelectorAll('.cso-guide-tpl-btn').forEach(function (x) { x.classList.remove('is-selected'); });
        b.classList.add('is-selected');
        selCat.value = tpl.category;
        chkExam.checked = tpl.isExam;
        inReadMins.value = String(tpl.readMinutes || 5);
        if (tpl.summaryEn && !inSumEn.value.trim()) inSumEn.value = tpl.summaryEn;
        inBodyEn.value = tpl.bodyEn;
        takeawaysList = tpl.takeaways.length
          ? tpl.takeaways.map(function (t) { return { text_en: t.text_en, text_or: t.text_or || '' }; })
          : [{ text_en: '', text_or: '' }];
        drawTakeaways();
        if (isBlueprintPlaceholderSlug(inSlug.value.trim(), lastAutoSlug)) {
          slugTouched = false;
          syncSlugFromTitleIfUnmodified();
        }
        toast('Applied "' + tpl.name + '" template.', 'ok');
      });
      tplGrid.appendChild(b);
    });
    tplCard.append(tplHead, tplGrid);
    shell.appendChild(tplCard);

    // Cover AI controls declared ahead so PDF Auto-Write / Auto-Fix can trigger AI Cover generation
    var inCoverAiPrompt = el('input', 'cso-form-input');
    inCoverAiPrompt.type = 'text';
    inCoverAiPrompt.id = 'inGuideCoverAiPrompt';
    inCoverAiPrompt.placeholder = 'Optional AI cover visual prompt (leave blank to auto-craft from Guide Title, Category & Scope)...';

    var coverProviderBadge = el('span', 'cso-pill-badge cso-guide-provider-badge');
    coverProviderBadge.id = 'guideCoverAiProviderBadge';
    coverProviderBadge.hidden = true;

    var coverThumb = el('img', 'cso-guide-cover-thumb');
    coverThumb.alt = 'Cover photo preview';
    if (inCoverUrl.value.trim()) {
      coverThumb.src = inCoverUrl.value.trim();
      coverThumb.hidden = false;
    } else {
      coverThumb.hidden = true;
    }
    inCoverUrl.addEventListener('input', function () {
      var u = inCoverUrl.value.trim();
      if (u) {
        coverThumb.src = u;
        coverThumb.hidden = false;
      } else {
        coverThumb.hidden = true;
      }
    });

    var btnCoverAiGen = el('button', 'cso-pill-btn is-accent', '\uD83C\uDFA8 Generate Cover with AI');
    btnCoverAiGen.type = 'button';
    btnCoverAiGen.id = 'btnGuideCoverAiGen';

    var btnCoverAiRegen = el('button', 'cso-pill-btn', '\uD83D\uDD04 Regenerate');
    btnCoverAiRegen.type = 'button';
    btnCoverAiRegen.id = 'btnGuideCoverAiRegen';

    function runCoverAiGeneration(isRegenerate) {
      var titleVal = inTitleEn.value.trim();
      var promptVal = inCoverAiPrompt.value.trim();
      if (!titleVal && !promptVal) {
        toast('Enter a Guide Title (EN) or AI Cover Prompt first.', 'amber');
        inTitleEn.focus();
        return Promise.resolve(null);
      }
      btnCoverAiGen.disabled = true;
      btnCoverAiRegen.disabled = true;
      coverProviderBadge.hidden = false;
      coverProviderBadge.textContent = isRegenerate ? 'Regenerating via Gemini / Workers AI\u2026' : 'Generating Cover via Gemini / Workers AI\u2026';
      var promptToSend = promptVal;
      if (isRegenerate && promptToSend) {
        promptToSend = promptToSend + ' (fresh editorial angle and composition)';
      }
      return requestAiGeneratedImage({
        prompt: promptToSend,
        title_en: titleVal || promptVal.slice(0, 120),
        category: selCat.value,
        scope: selScope.value,
        aspect_ratio: '16:9'
      }).then(function (r) {
        if (r && r.url) {
          inCoverUrl.value = r.url;
          coverThumb.src = r.url;
          coverThumb.hidden = false;
        }
        if (r && r.caption_en && (!inCoverCapEn.value.trim() || isRegenerate)) inCoverCapEn.value = r.caption_en;
        if (r && r.caption_or && (!inCoverCapOr.value.trim() || isRegenerate)) inCoverCapOr.value = r.caption_or;
        var provTxt = (r && r.provider_label) || (r && r.provider) || 'AI';
        var mdlTxt = (r && r.model) ? (' · ' + r.model) : '';
        coverProviderBadge.textContent = '\u2728 Generated via ' + provTxt + mdlTxt;
        coverProviderBadge.hidden = false;
        toast('AI Cover Photo saved to cso-media R2 via ' + provTxt + '!', 'ok');
        return r;
      }).catch(function (e) {
        coverProviderBadge.textContent = '\u2715 Cover AI failed: ' + e.message;
        coverProviderBadge.hidden = false;
        toast('AI Cover generation failed: ' + e.message, 'crimson');
        return null;
      }).finally(function () {
        btnCoverAiGen.disabled = false;
        btnCoverAiRegen.disabled = false;
      });
    }

    btnCoverAiGen.addEventListener('click', function () { runCoverAiGeneration(false); });
    btnCoverAiRegen.addEventListener('click', function () { runCoverAiGeneration(true); });

    var AI_QUOTA_FRIENDLY_MSG = 'Daily AI quota reached \u2014 resets at 5:30 AM IST (Workers AI) / 1:30 PM IST (Gemini). You can still edit and publish manually.';
    var LOCAL_META_QUOTA_NOTICE = '\u2705 English metadata & links auto-filled locally! (Odia auto-translation skipped: daily AI quota resets at 5:30 AM IST / 1:30 PM IST \u2014 you can paste Odia manually and publish now.)';

    function isQuotaLikeError(err) {
      var msg = String((err && err.message) || err || '');
      var status = Number(err && err.status);
      return status === 429 || /quota|rate.?limit|429|resource.?exhausted|neurons|daily limit/i.test(msg);
    }

    function formatAiErrorMessage(err) {
      var msg = String((err && err.message) || err || 'AI request failed.');
      if (isQuotaLikeError(err)) {
        return AI_QUOTA_FRIENDLY_MSG;
      }
      return msg;
    }

    // ---- 2. AI CO-AUTHOR BAR (2026 Free-Tier Gemini Flash + Low-Neuron Workers AI Fallback) ----
    var aiCard = el('section', 'cso-card studio-card cso-guide-ai-bar');
    var aiHead = el('div', 'cso-guide-sec-head');
    aiHead.append(
      el('h3', 'cso-qc-card-title', '\u2728 AI Co-Author Bar (Free-Tier Gemini Flash + Low-Neuron Workers AI)'),
      el('span', 'cso-pill-badge', 'Gemini 2.5 Flash \u2192 Gemma 4 26B / Llama 8B \u00B7 EN / \u0B13\u0B21\u0B3C\u0B3F\u0B06')
    );

    // 1-Click PDF Upload -> Auto-Write Guide Dropzone
    var pdfAutoInput = el('input');
    pdfAutoInput.type = 'file';
    pdfAutoInput.accept = 'application/pdf';
    pdfAutoInput.id = 'inputGuidePdfAutoWrite';
    pdfAutoInput.hidden = true;

    var pdfDropzone = el('div', 'cso-guide-pdf-dropzone');
    pdfDropzone.id = 'guidePdfDropzone';
    var pdfDropCopy = el('div', 'cso-guide-pdf-drop-copy');
    pdfDropCopy.append(
      el('strong', '', '\uD83D\uDCC4 1-Click PDF Upload \u2192 Auto-Write Bilingual Guide'),
      el('span', 'cso-text-muted', 'Drop an official Odisha / National notification, syllabus, or scheme PDF here — extracts all pages via pdfjs-dist, uploads to cso-files R2, attaches Official PDF, writes structured Markdown + tables + Odia translation & extracts verified .gov.in links.')
    );
    var btnPdfAutoWrite = el('button', 'cso-btn cso-btn-primary', '\uD83D\uDCC4 Upload PDF \u2192 Auto-Write Guide');
    btnPdfAutoWrite.type = 'button';
    btnPdfAutoWrite.id = 'btnGuidePdfAutoWrite';
    btnPdfAutoWrite.addEventListener('click', function () { pdfAutoInput.click(); });
    pdfDropzone.append(pdfDropCopy, btnPdfAutoWrite, pdfAutoInput);

    var aiSeed = el('textarea', 'cso-form-textarea');
    aiSeed.rows = 3;
    aiSeed.placeholder = 'Enter a topic, paste rough notes, or drop an official PDF above (e.g., "OPSC OAS 2026 Notification" or paste raw notice text to repair & auto-fill)...';

    // Options row (Output Depth Selector + Overwrite toggle + Auto-generate AI Cover checkbox)
    var aiOptsRow = el('div', 'cso-guide-ai-options');

    var depthWrap = el('label', 'cso-guide-depth-wrap');
    depthWrap.appendChild(el('span', 'cso-guide-depth-lbl', 'Output Depth:'));
    var selAiDepth = el('select', 'cso-form-select cso-guide-depth-select');
    selAiDepth.id = 'selGuideAiDepth';
    selAiDepth.setAttribute('aria-label', 'AI Output Depth');
    [
      ['comprehensive', '\uD83D\uDCDA Comprehensive & Exhaustive (Full Detail \u2014 No Summary)'],
      ['standard', '\uD83D\uDCDD Standard Guide']
    ].forEach(function (pair) {
      var op = el('option', '', pair[1]);
      op.value = pair[0];
      selAiDepth.appendChild(op);
    });
    selAiDepth.value = 'comprehensive';
    depthWrap.appendChild(selAiDepth);

    var chkAiOverwrite = el('input');
    chkAiOverwrite.type = 'checkbox';
    chkAiOverwrite.id = 'chkGuideAiOverwrite';
    chkAiOverwrite.checked = false;
    var lblOverwrite = el('label', 'cso-qc-check');
    lblOverwrite.append(chkAiOverwrite, el('span', '', 'Overwrite existing fields'));

    var chkAiAutoCover = el('input');
    chkAiAutoCover.type = 'checkbox';
    chkAiAutoCover.id = 'chkGuideAiAutoCover';
    chkAiAutoCover.checked = false;
    var lblAutoCover = el('label', 'cso-qc-check');
    lblAutoCover.append(chkAiAutoCover, el('span', '', 'Auto-generate AI Cover Photo if empty'));
    aiOptsRow.append(depthWrap, lblOverwrite, lblAutoCover);

    // v361 Multi-Provider AI Engine Switcher & + Add AI API Control Row
    var aiEngineRow = el('div', 'cso-ai-engine-bar');
    var engineLblWrap = el('label', 'cso-ai-engine-wrap');
    engineLblWrap.appendChild(el('span', 'cso-guide-depth-lbl', '\uD83E\uDD16 AI Engine:'));
    var selGuideAiEngine = el('select', 'cso-form-select cso-ai-engine-select');
    selGuideAiEngine.id = 'selGuideAiEngine';
    selGuideAiEngine.setAttribute('aria-label', 'Select AI Engine or Custom Provider');
    populateAiEngineSelect(selGuideAiEngine, cachedCustomAiProviders);
    selGuideAiEngine.addEventListener('change', function () {
      saveAiEnginePref(selGuideAiEngine.value);
    });
    engineLblWrap.appendChild(selGuideAiEngine);

    var btnOpenAiProviders = el('button', 'cso-pill-btn cso-ai-add-api-btn', '\uD83D\uDD11 + Add AI API');
    btnOpenAiProviders.type = 'button';
    btnOpenAiProviders.id = 'btnOpenAiProvidersModal';
    btnOpenAiProviders.addEventListener('click', openAiProvidersManagerModal);
    aiEngineRow.append(engineLblWrap, btnOpenAiProviders);

    function getSelectedAiEngine() {
      return (selGuideAiEngine && selGuideAiEngine.value && selGuideAiEngine.value !== '__none_custom__')
        ? selGuideAiEngine.value
        : getSavedAiEnginePref();
    }

    window.addEventListener('cso:ai-providers-updated', function (ev) {
      if (!selGuideAiEngine.isConnected) return;
      var list = (ev && ev.detail && ev.detail.providers) || cachedCustomAiProviders;
      populateAiEngineSelect(selGuideAiEngine, list);
    });
    window.addEventListener('cso:ai-engine-changed', function (ev) {
      if (!selGuideAiEngine.isConnected) return;
      var nextVal = ev && ev.detail && ev.detail.value;
      if (nextVal && selGuideAiEngine.value !== nextVal) {
        populateAiEngineSelect(selGuideAiEngine, cachedCustomAiProviders);
      }
    });
    fetchCustomAiProviders().then(function (list) {
      if (selGuideAiEngine.isConnected) populateAiEngineSelect(selGuideAiEngine, list);
    });

    var aiActions = el('div', 'cso-guide-ai-actions');

    var btnAiAutoFix = el('button', 'cso-btn cso-btn-primary', '\u2728 AI Auto-Fix & Fill Everything');
    btnAiAutoFix.type = 'button';
    btnAiAutoFix.id = 'btnGuideAiAutoFix';

    var btnAiDraft = el('button', 'cso-pill-btn is-accent', '\u2728 AI Outline & Draft Generator');
    btnAiDraft.type = 'button';
    btnAiDraft.id = 'btnGuideAiDraft';

    var btnAiMeta = el('button', 'cso-pill-btn', '\u2728 AI Title, Slug, Summary & Tags');
    btnAiMeta.type = 'button';
    btnAiMeta.id = 'btnGuideAiMeta';

    var btnAiFullOr = el('button', 'cso-pill-btn', '\uD83C\uDF10 1-Click EN \u2192 \u0B13\u0B21\u0B3C\u0B3F\u0B06 Full Guide Translate');
    btnAiFullOr.type = 'button';
    btnAiFullOr.id = 'btnGuideAiTranslateAll';

    var aiStatus = el('span', 'cso-text-muted cso-guide-ai-progress');
    aiStatus.id = 'guideAiCoauthorStatus';
    aiStatus.setAttribute('role', 'status');
    aiStatus.setAttribute('aria-live', 'polite');

    function setAiBusy(busy) {
      btnPdfAutoWrite.disabled = busy;
      btnAiAutoFix.disabled = busy;
      btnAiDraft.disabled = busy;
      btnAiMeta.disabled = busy;
      btnAiFullOr.disabled = busy;
      selAiDepth.disabled = busy;
      selGuideAiEngine.disabled = busy;
    }

    function applyAutoFixPayload(d, opts) {
      var o = opts || {};
      var overwrite = Boolean(o.overwrite);
      var lockBodyEn = Boolean(o.lockBodyEn);
      var shouldSet = function (curVal) {
        return overwrite || !String(curVal || '').trim();
      };

      if (d.category && ['how-to', 'exam-strategy', 'citizen-scheme', 'odisha-gk'].indexOf(d.category) !== -1) {
        if (overwrite || !editing) selCat.value = d.category;
      }
      if (d.scope === 'Odisha' || d.scope === 'National') {
        if (overwrite || !editing) selScope.value = d.scope;
      }
      if (typeof d.is_exam === 'boolean' && (overwrite || !editing)) {
        chkExam.checked = d.is_exam;
      }
      if (d.read_minutes && (overwrite || !inReadMins.value || Number(inReadMins.value) === 5)) {
        inReadMins.value = String(d.read_minutes);
      }
      if (d.title_en && shouldSet(inTitleEn.value)) inTitleEn.value = d.title_en;
      if (d.title_or && shouldSet(inTitleOr.value)) inTitleOr.value = d.title_or;
      if (d.slug && (overwrite || !slugTouched || isBlueprintPlaceholderSlug(inSlug.value.trim(), lastAutoSlug))) {
        inSlug.value = d.slug;
        lastAutoSlug = d.slug;
        slugTouched = false;
      } else {
        syncSlugFromTitleIfUnmodified();
      }
      if (d.summary_en && shouldSet(inSumEn.value)) inSumEn.value = d.summary_en;
      if (d.summary_or && shouldSet(inSumOr.value)) inSumOr.value = d.summary_or;
      if (Array.isArray(d.tags) && d.tags.length && shouldSet(inTags.value)) {
        inTags.value = d.tags.join(', ');
      }
      // Byte-for-Byte Preservation Rule: NEVER rewrite or replace pasted Body (EN) when locked
      if (lockBodyEn) {
        if (typeof o.lockedBodyEnValue === 'string' && inBodyEn.value !== o.lockedBodyEnValue) {
          inBodyEn.value = o.lockedBodyEnValue;
        }
      } else if (d.body_en && (overwrite || !inBodyEn.value.trim() || o.alwaysRepairBody)) {
        inBodyEn.value = d.body_en;
      }
      if (d.body_or && shouldSet(inBodyOr.value)) {
        inBodyOr.value = d.body_or;
      }
      var hasTakeaways = takeawaysList.some(function (t) { return (t.text_en || '').trim(); });
      if (Array.isArray(d.takeaways_en) && d.takeaways_en.length && (overwrite || !hasTakeaways)) {
        takeawaysList = d.takeaways_en.map(function (t, idx) {
          return { text_en: t, text_or: (d.takeaways_or && d.takeaways_or[idx]) || '' };
        });
        drawTakeaways();
      }
      if (d.image_prompt && shouldSet(inCoverAiPrompt.value)) {
        inCoverAiPrompt.value = d.image_prompt;
      }
      var capEnVal = d.cover_caption_en || d.cover_alt || '';
      if (capEnVal && shouldSet(inCoverCapEn.value)) inCoverCapEn.value = capEnVal;
      if (d.cover_caption_or && shouldSet(inCoverCapOr.value)) inCoverCapOr.value = d.cover_caption_or;

      if (o.pdfRecord) {
        if (d.pdf_title_en) o.pdfRecord.title_en = d.pdf_title_en;
        if (d.pdf_title_or) o.pdfRecord.title_or = d.pdf_title_or;
        drawPdfs();
      }

      if (Array.isArray(d.official_links) && d.official_links.length) {
        var existingUrls = {};
        linksList.forEach(function (l) {
          if (l && l.url) existingUrls[String(l.url).trim().toLowerCase()] = true;
        });
        var addedLinks = 0;
        d.official_links.forEach(function (lnk) {
          if (!lnk || !lnk.url) return;
          var key = String(lnk.url).trim().toLowerCase();
          if (existingUrls[key]) return;
          existingUrls[key] = true;
          linksList.push({
            label_en: lnk.label_en || lnk.url,
            label_or: lnk.label_or || lnk.label_en || lnk.url,
            url: lnk.url,
            is_official: lnk.is_official !== false
          });
          addedLinks++;
        });
        if (addedLinks) drawLinks();
      }
      readMinsManual = false;
      updateWordCountAndReadTime(true);
    }

    function runDedicatedOdiaTranslationPass(overwriteOr, pdfRecord, passOpts) {
      var throwOnQuota = Boolean(passOpts && passOpts.throwOnQuota);
      var metaFields = {};
      if (inTitleEn.value.trim() && (overwriteOr || !inTitleOr.value.trim())) metaFields.title_or = inTitleEn.value.trim();
      if (inSumEn.value.trim() && (overwriteOr || !inSumOr.value.trim())) metaFields.summary_or = inSumEn.value.trim();
      if (inCoverCapEn.value.trim() && (overwriteOr || !inCoverCapOr.value.trim())) metaFields.cover_caption_or = inCoverCapEn.value.trim();
      if (pdfRecord && pdfRecord.title_en) metaFields.pdf_title_or = pdfRecord.title_en;
      takeawaysList.forEach(function (t, i) {
        if ((t.text_en || '').trim() && (overwriteOr || !(t.text_or || '').trim())) {
          metaFields['tk_' + i] = t.text_en.trim();
        }
      });
      linksList.forEach(function (l, i) {
        if ((l.label_en || '').trim() && (overwriteOr || !(l.label_or || '').trim())) {
          metaFields['lnk_' + i] = l.label_en.trim();
        }
      });

      var needBodyOr = Boolean(inBodyEn.value.trim() && (overwriteOr || !inBodyOr.value.trim()));
      var needMetaOr = Object.keys(metaFields).length > 0;
      if (!needBodyOr && !needMetaOr) return Promise.resolve(null);

      aiStatus.classList.remove('is-warn-amber');
      aiStatus.textContent = '2/3 Translating full guide to \u0B13\u0B21\u0B3C\u0B3F\u0B06 (##-chunked Markdown tables & metadata)\u2026';

      var firstErr = null;
      var quotaNotice = '';
      var bodyPromise = needBodyOr
        ? apiFetch('/api/admin/ai-coauthor', {
          method: 'POST',
          body: { mode: 'translate_markdown', input: inBodyEn.value.slice(0, 64000), preferred_model: getSelectedAiEngine() }
        }).then(function (mdRes) {
          var md = mdRes && mdRes.data && (mdRes.data.translated_markdown || mdRes.data.translated_or);
          if (md) inBodyOr.value = md;
          return mdRes;
        }).catch(function (e) {
          if (!firstErr) firstErr = e;
          quotaNotice = formatAiErrorMessage(e);
          return null;
        })
        : Promise.resolve(null);

      var metaPromise = needMetaOr
        ? apiFetch('/api/admin/ai-coauthor', {
          method: 'POST',
          body: { mode: 'translate_fields', fields: metaFields, preferred_model: getSelectedAiEngine() }
        }).then(function (trRes) {
          var tr = (trRes && trRes.data && trRes.data.translations) || {};
          if (tr.title_or) inTitleOr.value = tr.title_or;
          if (tr.summary_or) inSumOr.value = tr.summary_or;
          if (tr.cover_caption_or) inCoverCapOr.value = tr.cover_caption_or;
          if (pdfRecord && tr.pdf_title_or) {
            pdfRecord.title_or = tr.pdf_title_or;
            drawPdfs();
          }
          takeawaysList.forEach(function (t, i) { if (tr['tk_' + i]) t.text_or = tr['tk_' + i]; });
          linksList.forEach(function (l, i) { if (tr['lnk_' + i]) l.label_or = tr['lnk_' + i]; });
          drawTakeaways();
          drawLinks();
          return trRes;
        }).catch(function (e) {
          if (!firstErr) firstErr = e;
          if (!quotaNotice) quotaNotice = formatAiErrorMessage(e);
          return null;
        })
        : Promise.resolve(null);

      return Promise.all([bodyPromise, metaPromise]).then(function (pair) {
        updateWordCountAndReadTime(true);
        if (firstErr && throwOnQuota && (isQuotaLikeError(firstErr) || (!pair[0] && !pair[1]))) {
          throw firstErr;
        }
        if (quotaNotice && !pair[0] && !pair[1]) {
          toast(quotaNotice, 'amber');
        }
        return pair[0] || pair[1];
      });
    }

    function handlePdfAutoWriteFile(file) {
      if (!file) return;
      if (!/\.pdf$/i.test(file.name || '') && file.type !== 'application/pdf') {
        toast('Please upload a valid .pdf file.', 'amber');
        return;
      }
      setAiBusy(true);
      aiStatus.textContent = '1/3 Extracting PDF pages (pdfjs-dist) & uploading to cso-files R2\u2026';

      Promise.all([
        extractTextFromPdfFile(file),
        uploadPdfToFilesR2(file)
      ]).then(function (pair) {
        var extracted = pair[0] || { text: '', pageCount: 0 };
        var uploaded = pair[1];
        var cleanBaseTitle = (uploaded.original_name || file.name || 'Official Document')
          .replace(/\.pdf$/i, '')
          .replace(/[-_]+/g, ' ')
          .trim();

        var pdfRec = {
          title_en: cleanBaseTitle + ' (Official PDF)',
          title_or: cleanBaseTitle + ' (\u0B38\u0B30\u0B15\u0B3E\u0B30\u0B40 PDF)',
          url: uploaded.url,
          badge: formatBytesLabel(uploaded.size_bytes || file.size)
        };
        var alreadyHas = pdfsList.some(function (x) { return x && x.url === pdfRec.url; });
        if (!alreadyHas) {
          pdfsList.push(pdfRec);
          drawPdfs();
        }

        if (!extracted.text || extracted.text.length < 20) {
          aiStatus.textContent = '\u26A0 PDF uploaded & attached to Downloadable PDFs, but minimal selectable text was found (scanned PDF). Paste notes above and click AI Auto-Fix.';
          toast('PDF attached to Downloadable PDFs (scanned image PDF detected).', 'amber');
          return null;
        }

        aiStatus.textContent = '1/3 Structuring full English guide & tables (' + (extracted.pageCount || 'all') + ' pages \u00B7 ' + selAiDepth.value + ')\u2026';
        return apiFetch('/api/admin/ai-coauthor', {
          method: 'POST',
          body: {
            mode: 'auto_fix_fill',
            depth: selAiDepth.value,
            skip_body_or: true,
            preferred_model: getSelectedAiEngine(),
            pdf_text: extracted.text,
            pdf_filename: file.name || 'official-document.pdf',
            input: aiSeed.value.trim(),
            draft: collectDraftPayload(),
            overwrite: true
          }
        }).then(function (res) {
          var d = (res && res.data) || {};
          applyAutoFixPayload(d, { overwrite: true, alwaysRepairBody: true, pdfRecord: pdfRec });
          var provLabel = (res && res.provider_model) || (((res && res.provider_label) || (res && res.provider) || 'AI') + (res && res.model ? (' · ' + res.model) : ''));
          return runDedicatedOdiaTranslationPass(true, pdfRec).then(function () {
            aiStatus.textContent = '3/3 Filling metadata, links & cover\u2026';
            var maybeCover = (chkAiAutoCover.checked && (!inCoverUrl.value.trim() || chkAiOverwrite.checked))
              ? runCoverAiGeneration(false)
              : Promise.resolve(null);
            return maybeCover.then(function () {
              var wc = updateWordCountAndReadTime(true);
              aiStatus.textContent = '\u2713 3/3 Complete \u2014 PDF attached & full bilingual guide written (' + wc.enWords.toLocaleString() + ' EN \u00B7 ' + wc.orWords.toLocaleString() + ' \u0B13\u0B21\u0B3C\u0B3F\u0B06 words) via ' + provLabel + '!';
              toast('PDF uploaded & exhaustive bilingual guide written via ' + provLabel + '!', 'ok');
            });
          });
        });
      }).catch(function (e) {
        var msg = formatAiErrorMessage(e);
        aiStatus.textContent = '\u2715 ' + msg;
        toast(msg, 'amber');
      }).finally(function () {
        setAiBusy(false);
        pdfAutoInput.value = '';
      });
    }

    pdfAutoInput.addEventListener('change', function () {
      if (pdfAutoInput.files && pdfAutoInput.files[0]) {
        handlePdfAutoWriteFile(pdfAutoInput.files[0]);
      }
    });
    pdfDropzone.addEventListener('dragover', function (e) {
      e.preventDefault();
      pdfDropzone.classList.add('is-dragover');
    });
    pdfDropzone.addEventListener('dragleave', function () {
      pdfDropzone.classList.remove('is-dragover');
    });
    pdfDropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      pdfDropzone.classList.remove('is-dragover');
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handlePdfAutoWriteFile(f);
    });

    async function runGuideAutoFixAndFill() {
      var currentDraft = collectDraftPayload();
      var seed = aiSeed.value.trim();
      var pastedBodyEn = inBodyEn.value;
      var lockBodyEn = pastedBodyEn.trim().length >= BODY_EN_LOCK_MIN_CHARS;
      var totalLen = seed.length + (currentDraft.title_en || '').length + pastedBodyEn.trim().length + (currentDraft.summary_en || '').length;
      if (totalLen < 8) {
        toast('Paste rough notes/draft in the AI box or Guide Body first, or upload a PDF above.', 'amber');
        aiSeed.focus();
        return;
      }
      setAiBusy(true);
      aiStatus.classList.remove('is-warn-amber');
      var overwriteMode = chkAiOverwrite.checked;
      aiStatus.textContent = lockBodyEn
        ? '1/3 Body (EN) locked verbatim \u2014 extracting SEO metadata, 5 takeaways & official links\u2026'
        : '1/3 Structuring full English guide & tables (' + selAiDepth.value + ')\u2026';

      try {
        // Pass 1: Extract & fill all English metadata fields (falls back deterministically locally when Body EN >= 200 chars even under 429 quota exhaustion)
        var res = await apiFetch('/api/admin/ai-coauthor', {
          method: 'POST',
          body: {
            mode: 'auto_fix_fill',
            depth: selAiDepth.value,
            skip_body_or: true,
            preserve_body_en: lockBodyEn,
            preferred_model: getSelectedAiEngine(),
            input: seed,
            draft: currentDraft,
            overwrite: overwriteMode
          }
        });
        var d = (res && res.data) || {};
        applyAutoFixPayload(d, {
          overwrite: overwriteMode,
          alwaysRepairBody: !lockBodyEn,
          lockBodyEn: lockBodyEn,
          lockedBodyEnValue: pastedBodyEn
        });
        var provLabel = (res && res.provider_model) || (((res && res.provider_label) || (res && res.provider) || 'AI') + (res && res.model ? (' · ' + res.model) : ''));
        var odiaSkippedDueToQuota = Boolean(res && (res.quota_exhausted_odia || res.provider === 'deterministic_fallback'));

        // Pass 2: Odia translation wrapped in its own try/catch so a 429/quota error NEVER discards Pass 1 English fields
        if (!odiaSkippedDueToQuota) {
          try {
            await runDedicatedOdiaTranslationPass(overwriteMode || !inBodyOr.value.trim(), null, { throwOnQuota: true });
          } catch (pass2Err) {
            odiaSkippedDueToQuota = true;
            if (!isQuotaLikeError(pass2Err)) {
              // Keep Pass 1 English metadata populated even on transient Pass 2 translation errors
              toast('English metadata filled; Odia translation skipped (' + formatAiErrorMessage(pass2Err) + ').', 'amber');
            }
          }
        }

        if (lockBodyEn && inBodyEn.value !== pastedBodyEn) {
          inBodyEn.value = pastedBodyEn;
        }

        if (odiaSkippedDueToQuota) {
          updateWordCountAndReadTime(true);
          aiStatus.classList.add('is-warn-amber');
          aiStatus.textContent = LOCAL_META_QUOTA_NOTICE;
          toast(LOCAL_META_QUOTA_NOTICE, 'amber');
          return;
        }

        aiStatus.textContent = '3/3 Filling metadata, links & cover\u2026';
        if (chkAiAutoCover.checked && (!inCoverUrl.value.trim() || overwriteMode)) {
          await runCoverAiGeneration(false);
        }
        if (lockBodyEn && inBodyEn.value !== pastedBodyEn) {
          inBodyEn.value = pastedBodyEn;
        }
        var wc = updateWordCountAndReadTime(true);
        aiStatus.classList.remove('is-warn-amber');
        aiStatus.textContent = lockBodyEn
          ? '\u2713 3/3 Complete \u2014 Pasted Body (EN) preserved 100% verbatim & metadata + \u0B13\u0B21\u0B3C\u0B3F\u0B06 filled (' + wc.enWords.toLocaleString() + ' EN \u00B7 ' + wc.orWords.toLocaleString() + ' \u0B13\u0B21\u0B3C\u0B3F\u0B06 words) via ' + provLabel + '!'
          : '\u2713 3/3 Complete \u2014 Full guide structured & translated (' + wc.enWords.toLocaleString() + ' EN \u00B7 ' + wc.orWords.toLocaleString() + ' \u0B13\u0B21\u0B3C\u0B3F\u0B06 words) via ' + provLabel + '!';
        toast(lockBodyEn ? 'Pasted Body (EN) locked verbatim \u2014 metadata & Odia filled via ' + provLabel + '!' : 'Full guide structured & translated via ' + provLabel + '!', 'ok');
      } catch (e) {
        var msg = formatAiErrorMessage(e);
        aiStatus.classList.add('is-warn-amber');
        aiStatus.textContent = '\u2715 ' + msg;
        toast(msg, 'amber');
      } finally {
        setAiBusy(false);
      }
    }

    btnAiAutoFix.addEventListener('click', runGuideAutoFixAndFill);

    btnAiDraft.addEventListener('click', function () {
      var seed = aiSeed.value.trim() || inTitleEn.value.trim() || inBodyEn.value.trim();
      if (seed.length < 8) {
        toast('Enter at least 8 characters of topic or notes in the AI box first.', 'amber');
        aiSeed.focus();
        return;
      }
      setAiBusy(true);
      aiStatus.textContent = 'Generating structured guide outline & draft\u2026';
      apiFetch('/api/admin/ai-coauthor', { method: 'POST', body: { mode: 'guide', input: seed, preferred_model: getSelectedAiEngine() } })
        .then(function (res) {
          var d = (res && res.data) || {};
          if (d.title_en) inTitleEn.value = d.title_en;
          if (d.title_or) inTitleOr.value = d.title_or;
          if (d.slug && (!slugTouched || isBlueprintPlaceholderSlug(inSlug.value.trim(), lastAutoSlug))) {
            inSlug.value = d.slug;
            lastAutoSlug = d.slug;
          } else {
            syncSlugFromTitleIfUnmodified();
          }
          if (d.summary_en) inSumEn.value = d.summary_en;
          if (d.summary_or) inSumOr.value = d.summary_or;
          if (d.read_minutes) inReadMins.value = String(d.read_minutes);
          if (Array.isArray(d.tags) && d.tags.length) inTags.value = d.tags.join(', ');
          if (d.body_en) inBodyEn.value = d.body_en;
          if (d.body_or) inBodyOr.value = d.body_or;
          if (Array.isArray(d.takeaways_en) && d.takeaways_en.length) {
            takeawaysList = d.takeaways_en.map(function (t, idx) {
              return { text_en: t, text_or: (d.takeaways_or && d.takeaways_or[idx]) || '' };
            });
            drawTakeaways();
          }
          var provLabel = (res && res.provider_model) || (((res && res.provider_label) || (res && res.provider) || 'Free AI') + (res && res.model ? (' · ' + res.model) : ''));
          aiStatus.classList.remove('is-warn-amber');
          aiStatus.textContent = '\u2713 Draft generated via ' + provLabel + '!';
          toast('AI Outline & Draft generated via ' + provLabel + '!', 'ok');
        })
        .catch(function (e) {
          var msg = formatAiErrorMessage(e);
          aiStatus.textContent = '\u2715 ' + msg;
          toast(msg, 'amber');
        })
        .finally(function () { setAiBusy(false); });
    });

    btnAiMeta.addEventListener('click', function () {
      var seed = (inBodyEn.value.trim() || aiSeed.value.trim() || inTitleEn.value.trim()).slice(0, 4500);
      if (seed.length < 3) {
        toast('Write a draft body or topic phrase first.', 'amber');
        return;
      }
      setAiBusy(true);
      aiStatus.textContent = 'Suggesting SEO Title, Slug, Summary & Tags\u2026';
      apiFetch('/api/admin/ai-coauthor', { method: 'POST', body: { mode: 'suggest_meta', input: seed, kind: 'informative guide', preferred_model: getSelectedAiEngine() } })
        .then(function (res) {
          var d = (res && res.data) || {};
          if (Array.isArray(d.titles_en) && d.titles_en[0]) inTitleEn.value = d.titles_en[0];
          if (Array.isArray(d.titles_or) && d.titles_or[0]) inTitleOr.value = d.titles_or[0];
          if (d.slug) { inSlug.value = d.slug; slugTouched = true; }
          if (d.summary_en) inSumEn.value = d.summary_en;
          if (d.summary_or) inSumOr.value = d.summary_or;
          if (d.read_minutes) inReadMins.value = String(d.read_minutes);
          if (Array.isArray(d.tags) && d.tags.length) inTags.value = d.tags.join(', ');
          var provLabel = (res && res.provider_model) || ((res && res.provider_label) || 'AI');
          aiStatus.classList.remove('is-warn-amber');
          aiStatus.textContent = '\u2713 SEO Title, Slug, Summary & Tags updated via ' + provLabel + '!';
          toast('SEO metadata applied!', 'ok');
        })
        .catch(function (e) {
          var msg = formatAiErrorMessage(e);
          aiStatus.textContent = '\u2715 ' + msg;
          toast(msg, 'amber');
        })
        .finally(function () { setAiBusy(false); });
    });

    btnAiFullOr.addEventListener('click', function () {
      var fields = {};
      if (inTitleEn.value.trim()) fields.title_or = inTitleEn.value.trim();
      if (inSumEn.value.trim()) fields.summary_or = inSumEn.value.trim();
      if (inCoverCapEn.value.trim()) fields.cover_caption_or = inCoverCapEn.value.trim();
      if (inBodyEn.value.trim()) fields.body_or = inBodyEn.value.trim().slice(0, 64000);
      if (inRelTitleEn.value.trim()) fields.rel_title_or = inRelTitleEn.value.trim();
      if (inRelCtaEn.value.trim()) fields.rel_cta_or = inRelCtaEn.value.trim();
      takeawaysList.forEach(function (t, i) { if ((t.text_en || '').trim()) fields['tk_' + i] = t.text_en.trim(); });
      photosList.forEach(function (p, i) { if ((p.caption_en || '').trim()) fields['ph_' + i] = p.caption_en.trim(); });
      pdfsList.forEach(function (d, i) { if ((d.title_en || '').trim()) fields['pdf_' + i] = d.title_en.trim(); });
      linksList.forEach(function (l, i) { if ((l.label_en || '').trim()) fields['lnk_' + i] = l.label_en.trim(); });

      if (!Object.keys(fields).length) {
        toast('Add English title, summary, or body text first to translate into Odia.', 'amber');
        return;
      }
      setAiBusy(true);
      aiStatus.textContent = 'Translating entire guide into natural Odia (\u0B13\u0B21\u0B3C\u0B3F\u0B06)\u2026';
      apiFetch('/api/admin/ai-coauthor', { method: 'POST', body: { mode: 'translate_fields', fields: fields, preferred_model: getSelectedAiEngine() } })
        .then(function (res) {
          var tr = (res && res.data && res.data.translations) || {};
          if (tr.title_or) inTitleOr.value = tr.title_or;
          if (tr.summary_or) inSumOr.value = tr.summary_or;
          if (tr.cover_caption_or) inCoverCapOr.value = tr.cover_caption_or;
          if (tr.body_or) inBodyOr.value = tr.body_or;
          if (tr.rel_title_or) inRelTitleOr.value = tr.rel_title_or;
          if (tr.rel_cta_or) inRelCtaOr.value = tr.rel_cta_or;
          takeawaysList.forEach(function (t, i) { if (tr['tk_' + i]) t.text_or = tr['tk_' + i]; });
          photosList.forEach(function (p, i) { if (tr['ph_' + i]) p.caption_or = tr['ph_' + i]; });
          pdfsList.forEach(function (d, i) { if (tr['pdf_' + i]) d.title_or = tr['pdf_' + i]; });
          linksList.forEach(function (l, i) { if (tr['lnk_' + i]) l.label_or = tr['lnk_' + i]; });
          drawTakeaways(); drawPhotos(); drawPdfs(); drawLinks();
          updateWordCountAndReadTime(false);
          var provLabel = (res && res.provider_model) || (((res && res.provider_label) || (res && res.provider) || 'Free AI') + (res && res.model ? (' · ' + res.model) : ''));
          aiStatus.classList.remove('is-warn-amber');
          aiStatus.textContent = '\u2713 Full guide translated into Odia via ' + provLabel + '!';
          toast('Translated all guide fields & media labels to Odia!', 'ok');
        })
        .catch(function (e) {
          var msg = formatAiErrorMessage(e);
          aiStatus.textContent = '\u2715 ' + msg;
          toast(msg, 'amber');
        })
        .finally(function () { setAiBusy(false); });
    });

    aiActions.append(btnAiAutoFix, btnAiDraft, btnAiMeta, btnAiFullOr, aiStatus);
    aiCard.append(aiHead, pdfDropzone, aiSeed, aiOptsRow, aiEngineRow, aiActions);
    shell.appendChild(aiCard);

    // ---- 3. STRUCTURED METADATA & BILINGUAL CONTENT ----
    var metaCard = el('section', 'cso-card studio-card');
    metaCard.appendChild(el('h3', 'cso-qc-card-title', '1. Guide Details, Bilingual Titles & Summary'));
    var g1 = el('div', 'cso-form-grid');
    g1.append(
      makeField('Category *', selCat),
      makeField('Scope (Odisha / National)', selScope),
      makeField('Estimated Reading Time (mins)', inReadMins),
      makeField('Tags (comma-separated)', inTags),
      makeField('Title (English) *', inTitleEn, 'cso-span-full'),
      makeField('Title (\u0B13\u0B21\u0B3C\u0B3F\u0B06)', inTitleOr, 'cso-span-full'),
      makeField('URL Slug (/guides/<slug>)', inSlug, 'cso-span-full'),
      makeField('2-Line Summary (English)', inSumEn),
      makeField('2-Line Summary (\u0B13\u0B21\u0B3C\u0B3F\u0B06)', inSumOr)
    );
    var checksRow = el('div', 'cso-guide-checks-row');
    var pinLbl = el('label', 'cso-qc-check');
    pinLbl.append(chkPin, el('span', '', '\uD83D\uDCCC Pin to Homepage Latest Updates'));
    var examLbl = el('label', 'cso-qc-check');
    examLbl.append(chkExam, el('span', '', '\uD83D\uDCDD Tag under Exams Filter'));
    checksRow.append(pinLbl, examLbl);
    metaCard.append(g1, checksRow);
    shell.appendChild(metaCard);

    // ---- 4. KEY TAKEAWAYS REPEATER ----
    var tkCard = el('section', 'cso-card studio-card');
    var tkHead = el('div', 'cso-guide-sec-head');
    tkHead.appendChild(el('h3', 'cso-qc-card-title', '2. Key Takeaways (Bilingual Highlight Bullets)'));
    var btnAddTk = el('button', 'cso-pill-btn', '+ Add Takeaway');
    btnAddTk.type = 'button';
    btnAddTk.addEventListener('click', function () {
      takeawaysList.push({ text_en: '', text_or: '' });
      drawTakeaways();
    });
    tkHead.appendChild(btnAddTk);
    tkCard.append(tkHead, takeawaysHost);
    shell.appendChild(tkCard);

    // ---- 5. RICH STRUCTURED BODY + FORMATTING & MARKDOWN TRANSLATION TOOLBAR ----
    var bodyCard = el('section', 'cso-card studio-card');
    bodyCard.appendChild(el('h3', 'cso-qc-card-title', '3. Rich Structured Body (EN & \u0B13\u0B21\u0B3C\u0B3F\u0B06)'));
    var activeBodyTarget = inBodyEn;
    inBodyEn.addEventListener('focus', function () { activeBodyTarget = inBodyEn; });
    inBodyOr.addEventListener('focus', function () { activeBodyTarget = inBodyOr; });

    var fmtBar = el('div', 'cso-guide-fmt-bar');
    [
      ['H2 Heading', '## Section Heading\n'],
      ['H3 Subheading', '### Subheading\n'],
      ['Bullet List', '- Point 1\n- Point 2\n- Point 3\n'],
      ['Callout Box', '> [!TIP]\n> Important practical advice for Odisha aspirants.\n'],
      ['Table', '| Column 1 | Column 2 | Details |\n| --- | --- | --- |\n| Item A | Value | Notes |\n']
    ].forEach(function (pair) {
      var fb = el('button', 'cso-pill-btn', '+ ' + pair[0]);
      fb.type = 'button';
      fb.addEventListener('click', function () { insertAtCursor(activeBodyTarget, pair[1]); });
      fmtBar.appendChild(fb);
    });

    // Markdown-Preserving EN -> Odia Translation Controls right on the Markdown Editor Toolbar (v354)
    var fmtSep = el('span', 'cso-guide-fmt-sep');
    fmtSep.setAttribute('aria-hidden', 'true');

    var btnMdTranslateFull = el('button', 'cso-pill-btn is-accent cso-guide-md-tr-btn', '\uD83C\uDF10 Translate Markdown (EN \u2192 \u0B13\u0B21\u0B3C\u0B3F\u0B06)');
    btnMdTranslateFull.type = 'button';
    btnMdTranslateFull.id = 'btnGuideTranslateMdFull';
    btnMdTranslateFull.title = 'Translate full Body (EN) Markdown into Body (\u0B13\u0B21\u0B3C\u0B3F\u0B06) preserving headings, pipe tables, lists & links';

    var btnMdTranslateSel = el('button', 'cso-pill-btn cso-guide-md-tr-sel-btn', '\uD83C\uDF10 Translate Selection / Section to \u0B13\u0B21\u0B3C\u0B3F\u0B06');
    btnMdTranslateSel.type = 'button';
    btnMdTranslateSel.id = 'btnGuideTranslateMdSel';
    btnMdTranslateSel.title = 'Highlight text in Body (EN) or place cursor inside any ## section to translate and insert into Body (\u0B13\u0B21\u0B3C\u0B3F\u0B06)';

    var mdTrStatusWrap = el('div', 'cso-guide-md-tr-status');
    mdTrStatusWrap.id = 'guideMdTranslateStatusWrap';
    mdTrStatusWrap.hidden = true;

    var mdTrBadge = el('span', 'cso-pill-badge cso-guide-md-tr-badge');
    mdTrBadge.id = 'guideMdTranslateBadge';
    mdTrBadge.setAttribute('role', 'status');
    mdTrBadge.setAttribute('aria-live', 'polite');

    var btnMdCopyLast = el('button', 'cso-pill-btn cso-guide-md-copy-btn', '\uD83D\uDCCB Copy Translated \u0B13\u0B21\u0B3C\u0B3F\u0B06');
    btnMdCopyLast.type = 'button';
    btnMdCopyLast.id = 'btnGuideCopyTranslatedMd';
    btnMdCopyLast.hidden = true;
    var lastTranslatedMdSnippet = '';

    btnMdCopyLast.addEventListener('click', function () {
      if (!lastTranslatedMdSnippet) return;
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(lastTranslatedMdSnippet).then(function () {
          toast('Copied translated \u0B13\u0B21\u0B3C\u0B3F\u0B06 Markdown to clipboard!', 'ok');
        }).catch(function () {
          toast('Clipboard copy blocked — text is already inside Body (\u0B13\u0B21\u0B3C\u0B3F\u0B06).', 'amber');
        });
      } else {
        toast('Translated text is inserted in Body (\u0B13\u0B21\u0B3C\u0B3F\u0B06).', 'info');
      }
    });
    mdTrStatusWrap.append(mdTrBadge, btnMdCopyLast);

    var savedEnSelection = '';
    function refreshSelectionButtonLabel() {
      var start = inBodyEn.selectionStart || 0;
      var end = inBodyEn.selectionEnd || 0;
      var sel = end > start ? inBodyEn.value.slice(start, end).trim() : '';
      savedEnSelection = sel;
      if (sel.length >= 2) {
        btnMdTranslateSel.textContent = '\uD83C\uDF10 Translate Selection to \u0B13\u0B21\u0B3C\u0B3F\u0B06 (' + sel.length + ' chars)';
        btnMdTranslateSel.classList.add('is-has-selection');
      } else {
        btnMdTranslateSel.textContent = '\uD83C\uDF10 Translate Selection / Section to \u0B13\u0B21\u0B3C\u0B3F\u0B06';
        btnMdTranslateSel.classList.remove('is-has-selection');
      }
    }
    inBodyEn.addEventListener('select', refreshSelectionButtonLabel);
    inBodyEn.addEventListener('keyup', refreshSelectionButtonLabel);
    inBodyEn.addEventListener('mouseup', refreshSelectionButtonLabel);

    function extractCurrentH2SectionFromBodyEn() {
      var full = String(inBodyEn.value || '');
      if (!full.trim()) return '';
      var pos = Math.max(0, Math.min(full.length, inBodyEn.selectionStart || 0));
      var headingMatches = [];
      var re = /^##\s+/gm;
      var m;
      while ((m = re.exec(full)) !== null) {
        headingMatches.push(m.index);
      }
      if (!headingMatches.length) return full.trim();
      var secStart = 0;
      var secEnd = full.length;
      for (var i = 0; i < headingMatches.length; i++) {
        if (headingMatches[i] <= pos) {
          secStart = headingMatches[i];
          secEnd = (i + 1 < headingMatches.length) ? headingMatches[i + 1] : full.length;
        }
      }
      return full.slice(secStart, secEnd).trim();
    }

    function setMdTranslateBusy(busy, badgeText) {
      btnMdTranslateFull.disabled = busy;
      btnMdTranslateSel.disabled = busy;
      mdTrStatusWrap.hidden = false;
      if (badgeText) mdTrBadge.textContent = badgeText;
      mdTrBadge.classList.toggle('is-busy', busy);
    }

    btnMdTranslateFull.addEventListener('click', function () {
      var src = inBodyEn.value.trim();
      if (src.length < 2) {
        toast('Write or paste English Markdown in Body (EN) first.', 'amber');
        inBodyEn.focus();
        return;
      }
      if (inBodyOr.value.trim() && !window.confirm('Replace existing Body (\u0B13\u0B21\u0B3C\u0B3F\u0B06) with a fresh Markdown-preserved translation of Body (EN)?')) {
        return;
      }
      btnMdCopyLast.hidden = true;
      setMdTranslateBusy(true, '\u23F3 Translating Markdown sections & tables to \u0B13\u0B21\u0B3C\u0B3F\u0B06\u2026');
      apiFetch('/api/admin/ai-coauthor', {
        method: 'POST',
        body: { mode: 'translate_markdown', input: src, preferred_model: getSelectedAiEngine() }
      }).then(function (res) {
        var d = (res && res.data) || {};
        var outMd = String(d.translated_markdown || d.translated_or || '').trim();
        if (!outMd) throw new Error('No translated Markdown returned.');
        inBodyOr.value = outMd;
        lastTranslatedMdSnippet = outMd;
        btnMdCopyLast.hidden = false;
        updateWordCountAndReadTime(false);
        var chunks = Number(d.chunks_count || (res && res.chunks_count) || 1);
        var prov = (res && (res.provider_model || res.provider_label || res.provider)) || 'Gemini Flash';
        setMdTranslateBusy(false, '\u2713 Translated full Markdown (' + chunks + (chunks === 1 ? ' section' : ' sections') + ' \u00B7 ' + prov + ')');
        toast('Full Markdown body translated to \u0B13\u0B21\u0B3C\u0B3F\u0B06 with tables & headings intact!', 'ok');
      }).catch(function (e) {
        var msg = formatAiErrorMessage(e);
        setMdTranslateBusy(false, '\u2715 ' + msg);
        toast(msg, 'amber');
      });
    });

    btnMdTranslateSel.addEventListener('click', function () {
      var start = inBodyEn.selectionStart || 0;
      var end = inBodyEn.selectionEnd || 0;
      var liveSel = end > start ? inBodyEn.value.slice(start, end).trim() : '';
      var snippet = liveSel || savedEnSelection || extractCurrentH2SectionFromBodyEn();
      var usedSelection = Boolean(liveSel || savedEnSelection);
      if (!snippet || snippet.length < 2) {
        toast('Highlight text in Body (EN) or place your cursor inside a Markdown section first.', 'amber');
        inBodyEn.focus();
        return;
      }
      btnMdCopyLast.hidden = true;
      setMdTranslateBusy(true, usedSelection
        ? '\u23F3 Translating selected Markdown to \u0B13\u0B21\u0B3C\u0B3F\u0B06\u2026'
        : '\u23F3 Translating current section & tables to \u0B13\u0B21\u0B3C\u0B3F\u0B06\u2026');
      apiFetch('/api/admin/ai-coauthor', {
        method: 'POST',
        body: { mode: 'translate_markdown', input: snippet, preferred_model: getSelectedAiEngine() }
      }).then(function (res) {
        var d = (res && res.data) || {};
        var outMd = String(d.translated_markdown || d.translated_or || '').trim();
        if (!outMd) throw new Error('No translated Markdown returned.');
        lastTranslatedMdSnippet = outMd;
        btnMdCopyLast.hidden = false;
        if (!inBodyOr.value.trim()) {
          inBodyOr.value = outMd;
        } else if (document.activeElement === inBodyOr || inBodyOr.selectionStart > 0) {
          insertAtCursor(inBodyOr, outMd);
        } else {
          inBodyOr.value = inBodyOr.value.replace(/\s+$/, '') + '\n\n' + outMd;
        }
        updateWordCountAndReadTime(false);
        var prov = (res && (res.provider_label || res.provider)) || 'Gemini Pro';
        setMdTranslateBusy(false, '\u2713 Inserted translated ' + (usedSelection ? 'selection' : 'section') + ' into Body (\u0B13\u0B21\u0B3C\u0B3F\u0B06) \u00B7 ' + prov);
        toast('Translated ' + (usedSelection ? 'selection' : 'section') + ' inserted into Body (\u0B13\u0B21\u0B3C\u0B3F\u0B06)!', 'ok');
      }).catch(function (e) {
        var msg = formatAiErrorMessage(e);
        setMdTranslateBusy(false, '\u2715 ' + msg);
        toast(msg, 'amber');
      });
    });

    fmtBar.append(fmtSep, btnMdTranslateFull, btnMdTranslateSel);

    var bodyEnField = el('div', 'cso-form-group cso-span-full');
    var bodyEnLabelRow = el('div', 'cso-guide-body-label-row');
    var lblBodyEn = el('label', 'cso-form-label', 'Structured Body (English \u2014 Markdown headings generate Table of Contents automatically)');
    lblBodyEn.setAttribute('for', 'inpGuideBodyEn');
    bodyEnLabelRow.append(lblBodyEn, bodyEnLockBadge);
    bodyEnField.append(bodyEnLabelRow, inBodyEn);

    bodyCard.append(
      fmtBar,
      mdTrStatusWrap,
      wordCountBar,
      bodyEnField,
      makeField('Structured Body (\u0B13\u0B21\u0B3C\u0B3F\u0B06)', inBodyOr, 'cso-span-full')
    );
    updateWordCountAndReadTime(false);
    shell.appendChild(bodyCard);

    // ---- 6. COVER PHOTO & INLINE PHOTO GALLERY (cso-media R2 + AI Image Generation) ----
    var photoCard = el('section', 'cso-card studio-card');
    var phHead = el('div', 'cso-guide-sec-head');
    phHead.appendChild(el('h3', 'cso-qc-card-title', '4. Cover Photo & Inline Photo Gallery (cso-media R2 + AI Visuals)'));
    var phHeadBtns = el('div', 'cso-guide-hdr-btns');
    var btnAddPhoto = el('button', 'cso-pill-btn', '+ Add Gallery Photo');
    btnAddPhoto.type = 'button';
    btnAddPhoto.addEventListener('click', function () {
      photosList.push({ url: '', caption_en: '', caption_or: '', alt: '', ai_prompt: '', provider_label: '' });
      drawPhotos();
    });
    var btnAddAiIllus = el('button', 'cso-pill-btn is-accent', '\uD83C\uDFA8 + AI Illustration');
    btnAddAiIllus.type = 'button';
    btnAddAiIllus.id = 'btnGuideAddAiIllustration';
    btnAddAiIllus.addEventListener('click', function () {
      btnAddAiIllus.disabled = true;
      btnAddAiIllus.textContent = '\uD83C\uDFA8 Generating\u2026';
      var sectionTitle = inTitleEn.value.trim() || 'Odisha Study Visual';
      requestAiGeneratedImage({
        prompt: '',
        title_en: sectionTitle + ' — Visual Walkthrough',
        category: selCat.value,
        scope: selScope.value,
        aspect_ratio: '16:9'
      }).then(function (r) {
        photosList.push({
          url: r.url || '',
          caption_en: r.caption_en || sectionTitle,
          caption_or: r.caption_or || '',
          alt: r.alt_en || sectionTitle,
          ai_prompt: '',
          provider_label: (r.provider_label || r.provider || 'AI') + (r.model ? (' · ' + r.model) : '')
        });
        drawPhotos();
        toast('AI section illustration added via ' + (r.provider_label || r.provider) + '!', 'ok');
      }).catch(function (e) {
        toast('AI Illustration failed: ' + e.message, 'crimson');
      }).finally(function () {
        btnAddAiIllus.disabled = false;
        btnAddAiIllus.textContent = '\uD83C\uDFA8 + AI Illustration';
      });
    });
    phHeadBtns.append(btnAddAiIllus, btnAddPhoto);
    phHead.appendChild(phHeadBtns);

    var coverFile = el('input');
    coverFile.type = 'file';
    coverFile.accept = 'image/jpeg,image/png,image/webp';
    coverFile.hidden = true;
    var btnCoverUp = el('button', 'cso-pill-btn', '\u2B06 Upload Cover Photo (cso-media R2)');
    btnCoverUp.type = 'button';
    btnCoverUp.addEventListener('click', function () { coverFile.click(); });
    coverFile.addEventListener('change', function () {
      if (!coverFile.files || !coverFile.files[0]) return;
      btnCoverUp.disabled = true;
      btnCoverUp.textContent = 'Uploading Cover\u2026';
      uploadImageToMediaR2(coverFile.files[0]).then(function (r) {
        inCoverUrl.value = r.url;
        coverThumb.src = r.url;
        coverThumb.hidden = false;
        coverProviderBadge.textContent = '\u2713 Uploaded to cso-media R2';
        coverProviderBadge.hidden = false;
        toast('Cover photo uploaded to cso-media R2!', 'ok');
      }).catch(function (e) {
        toast('Cover upload failed: ' + e.message, 'crimson');
      }).finally(function () {
        btnCoverUp.disabled = false;
        btnCoverUp.textContent = '\u2B06 Upload Cover Photo (cso-media R2)';
        coverFile.value = '';
      });
    });

    var coverRow = el('div', 'cso-guide-slot-row');
    coverRow.append(inCoverUrl, coverFile, btnCoverUp);

    var coverAiBar = el('div', 'cso-guide-cover-ai-bar');
    coverAiBar.append(inCoverAiPrompt, btnCoverAiGen, btnCoverAiRegen, coverProviderBadge);

    var coverCaps = el('div', 'cso-form-grid');
    coverCaps.append(
      makeField('Cover Caption & Alt Text (EN)', inCoverCapEn),
      makeField('Cover Caption (\u0B13\u0B21\u0B3C\u0B3F\u0B06)', inCoverCapOr)
    );
    photoCard.append(
      phHead,
      el('label', 'cso-form-label', 'Cover Photo URL, Direct R2 Upload, or AI Cover Generator (Gemini-First + Workers AI Fallback)'),
      coverRow,
      coverAiBar,
      coverThumb,
      coverCaps,
      el('h4', 'cso-guide-sublabel', 'Inline Photo Gallery'),
      photosHost
    );
    shell.appendChild(photoCard);

    // ---- 7. DOWNLOADABLE PDFs (cso-files R2) ----
    var pdfCard = el('section', 'cso-card studio-card');
    var pdfHead = el('div', 'cso-guide-sec-head');
    pdfHead.appendChild(el('h3', 'cso-qc-card-title', '5. Downloadable PDFs (cso-files R2 or .gov.in PDF URL)'));
    var btnAddPdf = el('button', 'cso-pill-btn', '+ Add PDF Attachment');
    btnAddPdf.type = 'button';
    btnAddPdf.addEventListener('click', function () {
      pdfsList.push({ title_en: '', title_or: '', url: '', badge: 'Official Notification PDF' });
      drawPdfs();
    });
    pdfHead.appendChild(btnAddPdf);
    pdfCard.append(pdfHead, pdfsHost);
    shell.appendChild(pdfCard);

    // ---- 8. VERIFIED REFERENCE LINKS ----
    var linkCard = el('section', 'cso-card studio-card');
    var lkHead = el('div', 'cso-guide-sec-head');
    lkHead.appendChild(el('h3', 'cso-qc-card-title', '6. Verified Reference Links & Official .gov.in Portals'));
    var btnAddLink = el('button', 'cso-pill-btn', '+ Add Reference Link');
    btnAddLink.type = 'button';
    btnAddLink.addEventListener('click', function () {
      linksList.push({ label_en: '', label_or: '', url: '', is_official: true });
      drawLinks();
    });
    lkHead.appendChild(btnAddLink);
    linkCard.append(lkHead, linksHost);
    shell.appendChild(linkCard);

    // ---- 9. RELATED PRACTICE / ALERT LINKER ----
    var relCard = el('section', 'cso-card studio-card');
    relCard.appendChild(el('h3', 'cso-qc-card-title', '7. Related Practice / Alert Linker (Bottom Action Card)'));
    var gRel = el('div', 'cso-form-grid');
    gRel.append(
      makeField('Related Resource Type', selRelType),
      makeField('Target Slug or Path', inRelSlug),
      makeField('Action Card Title (EN)', inRelTitleEn),
      makeField('Action Card Title (\u0B13\u0B21\u0B3C\u0B3F\u0B06)', inRelTitleOr),
      makeField('CTA Button Label (EN)', inRelCtaEn),
      makeField('CTA Button Label (\u0B13\u0B21\u0B3C\u0B3F\u0B06)', inRelCtaOr)
    );
    relCard.append(relDatalist, gRel);
    shell.appendChild(relCard);

    // ---- 10. PUBLISH BAR (LIVE PREVIEW + SAVE DRAFT + PUBLISH LIVE) ----
    var bar = el('div', 'cso-guide-publish-bar');
    var btnPreview = el('button', 'cso-pill-btn is-accent', '\uD83D\uDC41\uFE0F Live Preview');
    btnPreview.type = 'button';
    btnPreview.id = 'btnGuideLivePreview';
    btnPreview.addEventListener('click', function () {
      syncSlugFromTitleIfUnmodified();
      openLivePreviewModal(collectDraftPayload(), function () { saveGuide('published'); });
    });

    var btnDraft = el('button', 'cso-pill-btn', 'Save Draft');
    btnDraft.type = 'button';
    btnDraft.addEventListener('click', function () { saveGuide('draft'); });

    var btnPub = el('button', 'cso-btn cso-btn-primary', '\uD83D\uDE80 Publish Live');
    btnPub.type = 'button';
    btnPub.addEventListener('click', function () { saveGuide('published'); });

    var btnCancel = el('button', 'cso-pill-btn', '\u2190 Back to List');
    btnCancel.type = 'button';
    btnCancel.addEventListener('click', onBack);

    bar.append(btnPreview, btnDraft, btnPub, btnCancel, statusMsg);
    shell.appendChild(bar);

    drawTakeaways();
    drawPhotos();
    drawPdfs();
    drawLinks();
    root.appendChild(shell);
  }

  // =========================================================================
  // FOLDER LIST VIEW (SEARCH, FILTER, EDIT, DUPLICATE, PIN, PUBLISH, DELETE)
  // =========================================================================
  function renderFolderView(root, headerActions, initialFilter) {
    var activeFilter = initialFilter || 'all';
    var state = {
      items: [],
      counts: {},
      q: '',
      statusFilter: activeFilter === 'drafts' ? 'draft' : '',
      catFilter: (activeFilter !== 'all' && activeFilter !== 'drafts') ? activeFilter : 'all'
    };

    clear(root);
    if (headerActions) {
      clear(headerActions);
      var hdrNew = el('button', 'cso-btn cso-btn-primary', '+ New Article / Guide');
      hdrNew.type = 'button';
      hdrNew.addEventListener('click', function () {
        renderComposer(root, headerActions, null, {
          initialCategory: state.catFilter !== 'all' ? state.catFilter : 'how-to',
          onBack: function () { renderFolderView(root, headerActions, activeFilter); }
        });
      });
      var hdrLive = el('a', 'cso-pill-btn', 'Open /guides/ \u2197');
      hdrLive.href = '/guides/';
      hdrLive.target = '_blank';
      hdrLive.rel = 'noopener noreferrer';
      headerActions.append(hdrLive, hdrNew);
    }

    var shell = el('div', 'cso-guides-studio');

    // Subview Tabs
    var tabBar = el('div', 'cso-guide-tabs');
    function drawTabs() {
      clear(tabBar);
      SUBVIEWS.forEach(function (sv) {
        var isAct = (sv.key === 'drafts' && state.statusFilter === 'draft' && state.catFilter === 'all')
          || (sv.key === 'all' && state.catFilter === 'all' && !state.statusFilter)
          || (sv.key !== 'all' && sv.key !== 'drafts' && state.catFilter === sv.key && state.statusFilter !== 'draft');
        var cnt = state.counts[sv.key];
        var b = el('button', 'cso-pill-btn' + (isAct ? ' is-active' : ''), sv.title + (cnt !== undefined ? ' (' + cnt + ')' : ''));
        b.type = 'button';
        b.addEventListener('click', function () {
          activeFilter = sv.key;
          if (sv.key === 'drafts') {
            state.catFilter = 'all';
            state.statusFilter = 'draft';
          } else if (sv.key === 'all') {
            state.catFilter = 'all';
            state.statusFilter = '';
          } else {
            state.catFilter = sv.key;
            state.statusFilter = '';
          }
          selCatFilter.value = state.catFilter;
          selStatus.value = state.statusFilter;
          if (window.CSOStudio && typeof window.CSOStudio.setGuidesSubTab === 'function') {
            window.CSOStudio.setGuidesSubTab(sv.key);
          }
          loadList();
        });
        tabBar.appendChild(b);
      });
    }

    // Filter Toolbar
    var filterBar = el('div', 'cso-card studio-card cso-guide-filter-bar');
    var inSearch = el('input', 'cso-form-input');
    inSearch.type = 'search';
    inSearch.placeholder = 'Search guides by title, slug, or tag\u2026';

    var selCatFilter = el('select', 'cso-form-select');
    selCatFilter.setAttribute('aria-label', 'Filter by category');
    var allCatOpt = el('option', '', 'All Categories');
    allCatOpt.value = 'all';
    selCatFilter.appendChild(allCatOpt);
    CATEGORIES.forEach(function (c) {
      var op = el('option', '', c.icon + ' ' + c.label);
      op.value = c.key;
      selCatFilter.appendChild(op);
    });
    selCatFilter.value = state.catFilter;

    var selStatus = el('select', 'cso-form-select');
    selStatus.setAttribute('aria-label', 'Filter by status');
    [['', 'All Statuses'], ['published', 'Published Live'], ['draft', 'Drafts Only']].forEach(function (p) {
      var op = el('option', '', p[1]);
      op.value = p[0];
      selStatus.appendChild(op);
    });
    selStatus.value = state.statusFilter;

    var btnRef = el('button', 'cso-pill-btn', '\u21BB Refresh');
    btnRef.type = 'button';
    var btnCreate = el('button', 'cso-btn cso-btn-primary', '+ Create Informative Guide');
    btnCreate.type = 'button';
    btnCreate.addEventListener('click', function () {
      renderComposer(root, headerActions, null, {
        initialCategory: state.catFilter !== 'all' ? state.catFilter : 'how-to',
        onBack: function () { renderFolderView(root, headerActions, activeFilter); }
      });
    });

    inSearch.addEventListener('input', function () { state.q = inSearch.value.trim(); drawList(); });
    selCatFilter.addEventListener('change', function () {
      state.catFilter = selCatFilter.value || 'all';
      activeFilter = state.statusFilter === 'draft' && state.catFilter === 'all' ? 'drafts' : state.catFilter;
      loadList();
    });
    selStatus.addEventListener('change', function () { state.statusFilter = selStatus.value; loadList(); });
    btnRef.addEventListener('click', loadList);
    filterBar.append(inSearch, selCatFilter, selStatus, btnRef, btnCreate);

    var listHost = el('div', 'cso-guide-list-host');

    function drawList() {
      clear(listHost);
      var q = state.q.toLowerCase();
      var rows = state.items.filter(function (g) {
        if (!q) return true;
        return (g.title_en + ' ' + g.title_or + ' ' + g.slug + ' ' + g.tags).toLowerCase().indexOf(q) !== -1;
      });

      if (!rows.length) {
        var empty = el('div', 'cso-card studio-card cso-guide-empty');
        empty.appendChild(el('h3', '', 'No Informative Articles & Guides in this view yet'));
        empty.appendChild(el('p', 'cso-text-muted', 'Start with a 1-click structured template (How-To, Exam Strategy, Scheme Explainer, or Odisha GK) and publish live to /guides/.'));
        var cta = el('button', 'cso-btn cso-btn-primary', '+ Create First Informative Guide');
        cta.type = 'button';
        cta.addEventListener('click', function () {
          renderComposer(root, headerActions, null, {
            initialCategory: state.catFilter !== 'all' ? state.catFilter : 'how-to',
            onBack: function () { renderFolderView(root, headerActions, activeFilter); }
          });
        });
        empty.appendChild(cta);
        listHost.appendChild(empty);
        return;
      }

      rows.forEach(function (g) {
        var card = el('article', 'cso-card studio-card cso-guide-row-card');
        var main = el('div', 'cso-guide-row-main');
        var badges = el('div', 'cso-guide-row-badges');
        badges.appendChild(el('span', 'cso-pill-badge', g.category_icon + ' ' + g.category_short_en));
        badges.appendChild(el('span', 'cso-pill-badge ' + (g.status === 'published' ? 'is-live' : 'is-draft'), g.status === 'published' ? 'Published Live' : 'Draft'));
        if (g.is_pinned) badges.appendChild(el('span', 'cso-pill-badge is-pinned', '\uD83D\uDCCC Pinned'));
        if (g.is_exam) badges.appendChild(el('span', 'cso-pill-badge', '\uD83D\uDCDD Exams'));
        badges.appendChild(el('span', 'cso-text-muted', g.scope + ' \u00B7 ' + g.read_minutes + ' min read'));

        main.append(
          badges,
          el('h4', 'cso-guide-row-title', g.title_en),
          el('p', 'cso-text-muted', '/guides/' + g.slug + (g.title_or ? ' \u00B7 ' + g.title_or : ''))
        );

        var actions = el('div', 'cso-guide-row-actions');
        var bEdit = el('button', 'cso-pill-btn', 'Edit');
        bEdit.type = 'button';
        bEdit.addEventListener('click', function () {
          renderComposer(root, headerActions, g, {
            onBack: function () { renderFolderView(root, headerActions, activeFilter); }
          });
        });

        var bPrev = el('button', 'cso-pill-btn', '\uD83D\uDC41\uFE0F Preview');
        bPrev.type = 'button';
        bPrev.addEventListener('click', function () {
          openLivePreviewModal(g, function () {
            apiFetch('/api/admin/guides/' + encodeURIComponent(g.id), { method: 'PATCH', body: { status: 'published' } })
              .then(function () { toast('Guide published live!', 'ok'); loadList(); })
              .catch(function (e) { toast(e.message, 'crimson'); });
          });
        });

        var bDup = el('button', 'cso-pill-btn', 'Duplicate');
        bDup.type = 'button';
        bDup.addEventListener('click', function () {
          apiFetch('/api/admin/guides/' + encodeURIComponent(g.id) + '/duplicate', { method: 'POST', body: {} })
            .then(function () { toast('Guide duplicated as Draft template!', 'ok'); loadList(); })
            .catch(function (e) { toast(e.message, 'crimson'); });
        });

        var bPin = el('button', 'cso-pill-btn', g.is_pinned ? 'Unpin' : '\uD83D\uDCCC Pin');
        bPin.type = 'button';
        bPin.addEventListener('click', function () {
          apiFetch('/api/admin/guides/' + encodeURIComponent(g.id), { method: 'PATCH', body: { is_pinned: !g.is_pinned } })
            .then(function () { toast(g.is_pinned ? 'Unpinned from Homepage Latest Updates.' : 'Pinned to Homepage Latest Updates!', 'ok'); loadList(); })
            .catch(function (e) { toast(e.message, 'crimson'); });
        });

        var bTog = el('button', 'cso-pill-btn', g.status === 'published' ? 'Move to Draft' : 'Publish Live');
        bTog.type = 'button';
        bTog.addEventListener('click', function () {
          var nextSt = g.status === 'published' ? 'draft' : 'published';
          apiFetch('/api/admin/guides/' + encodeURIComponent(g.id), { method: 'PATCH', body: { status: nextSt } })
            .then(function () { toast(nextSt === 'published' ? 'Published live!' : 'Moved to Draft.', 'ok'); loadList(); })
            .catch(function (e) { toast(e.message, 'crimson'); });
        });

        var bDel = el('button', 'cso-pill-btn is-danger', 'Delete');
        bDel.type = 'button';
        bDel.addEventListener('click', function () {
          if (!window.confirm('Permanently delete "' + g.title_en + '"? This removes it from /guides/, Homepage Latest Updates, and Vectorize search.')) return;
          apiFetch('/api/admin/guides/' + encodeURIComponent(g.id), { method: 'DELETE' })
            .then(function () { toast('Guide deleted.', 'ok'); loadList(); })
            .catch(function (e) { toast(e.message, 'crimson'); });
        });

        actions.append(bEdit, bPrev, bDup, bPin, bTog);
        if (g.status === 'published') {
          var aView = el('a', 'cso-pill-btn', 'View \u2197');
          aView.href = g.url;
          aView.target = '_blank';
          aView.rel = 'noopener noreferrer';
          actions.appendChild(aView);
        }
        actions.appendChild(bDel);

        card.append(main, actions);
        listHost.appendChild(card);
      });
    }

    function loadList() {
      var qs = [];
      if (state.catFilter && state.catFilter !== 'all') qs.push('category=' + encodeURIComponent(state.catFilter));
      if (state.statusFilter) qs.push('status=' + encodeURIComponent(state.statusFilter));
      var url = '/api/admin/guides' + (qs.length ? '?' + qs.join('&') : '');
      listHost.textContent = 'Loading Informative Articles & Guides from D1\u2026';
      apiFetch(url)
        .then(function (d) {
          state.items = (d && d.items) || [];
          state.counts = (d && d.counts) || {};
          drawTabs();
          drawList();
          if (typeof window.CSOStudioUpdateGuideCounts === 'function') {
            window.CSOStudioUpdateGuideCounts(state.counts);
          }
        })
        .catch(function (e) {
          clear(listHost);
          listHost.appendChild(el('p', 'cso-ca-empty', 'Failed to load guides: ' + e.message));
        });
    }

    shell.append(tabBar, filterBar, listHost);
    root.appendChild(shell);
    drawTabs();
    loadList();
  }

  window.CSOGuidesPublishingStudio = {
    CATEGORIES: CATEGORIES,
    SUBVIEWS: SUBVIEWS,
    STARTER_TEMPLATES: STARTER_TEMPLATES,
    renderFolderView: renderFolderView,
    renderComposer: renderComposer,
    openLivePreviewModal: openLivePreviewModal
  };
})(window, document);
