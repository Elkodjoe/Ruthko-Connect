const RuthkoIntake = (() => {
  const redirectsTo = 'thank-you.html';

  function getClient() {
    return window.getRuthkoSupabaseClient ? window.getRuthkoSupabaseClient() : null;
  }

  function formObject(form) {
    const data = {};
    new FormData(form).forEach((value, key) => {
      if (key !== 'form-name') data[key] = String(value || '').trim();
    });
    return data;
  }

  function packageValue(text) {
    const value = String(text || '').toLowerCase();
    if (value.includes('platinum')) return 50000;
    if (value.includes('gold')) return 15000;
    if (value.includes('silver')) return 5000;
    if (value.includes('vendor')) return 3500;
    return 0;
  }

  function noteLine(label, value) {
    return value ? `${label}: ${value}` : '';
  }


  function addDays(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function taskTemplates(formType, lead) {
    const common = {
      lead_id: lead.id,
      owner: 'Ruthko Admin',
      status: 'Open'
    };

    const templates = {
      employer: [
        { title: `Call ${lead.name} about staffing request`, task_type: 'Call', priority: 'High', due_date: addDays(1), notes: 'Confirm worker type, number needed, start date, location, sponsorship options, and decision timeline.' },
        { title: `Send employer staffing checklist to ${lead.name}`, task_type: 'Email', priority: 'Medium', due_date: addDays(2), notes: 'Send job description request, wage details, worksite details, and sponsorship pathway checklist.' }
      ],
      candidate: [
        { title: `Review candidate profile for ${lead.name}`, task_type: 'Review', priority: 'Medium', due_date: addDays(1), notes: 'Check profession, experience, visa interest, country, and missing credentials.' },
        { title: `Request resume and credentials from ${lead.name}`, task_type: 'Email', priority: 'High', due_date: addDays(2), notes: 'Ask for resume, license, education documents, passport page, and preferred job category.' }
      ],
      sponsor: [
        { title: `Prepare sponsor follow-up for ${lead.name}`, task_type: 'Proposal', priority: lead.value >= 15000 ? 'High' : 'Medium', due_date: addDays(1), notes: 'Send sponsor package, benefits, invoice option, payment link, and event visibility details.' },
        { title: `Schedule sponsor call with ${lead.name}`, task_type: 'Call', priority: 'High', due_date: addDays(3), notes: 'Discuss sponsorship goals, brand placement, booth needs, and decision date.' }
      ],
      vendor: [
        { title: `Confirm booth needs for ${lead.name}`, task_type: 'Call', priority: 'Medium', due_date: addDays(2), notes: 'Confirm product category, booth size, power needs, payment status, and setup requirements.' },
        { title: `Send vendor booth payment details to ${lead.name}`, task_type: 'Email', priority: 'High', due_date: addDays(1), notes: 'Send booth price, invoice option, payment link, and deadline.' }
      ],
      event: [
        { title: `Confirm event RSVP for ${lead.name}`, task_type: 'Email', priority: 'Medium', due_date: addDays(1), notes: 'Confirm event interest, attendee type, guest count if needed, and next event details.' },
        { title: `Add ${lead.name} to event follow-up list`, task_type: 'Admin', priority: 'Low', due_date: addDays(3), notes: 'Add attendee to event list and future campaign segment.' }
      ]
    };

    return (templates[formType] || [
      { title: `Follow up with ${lead.name}`, task_type: 'Follow-up', priority: 'Medium', due_date: addDays(2), notes: 'Review this lead and decide the next best action.' }
    ]).map(task => ({ ...common, ...task, created_at: new Date().toISOString() }));
  }

  function buildRecords(formType, data) {
    const now = new Date().toISOString();
    let lead = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      lead_type: 'Partner',
      name: 'New Lead',
      contact_person: '',
      email: '',
      phone: '',
      status: 'New',
      value: 0,
      source: 'Public intake form',
      notes: '',
      marketing_consent: data.marketing_consent === 'true' || data.marketing_consent === 'on',
      marketing_status: (data.marketing_consent === 'true' || data.marketing_consent === 'on') ? 'Subscribed' : 'Unknown',
      created_at: now
    };
    let detailTable = null;
    let detailPayload = null;

    if (formType === 'employer') {
      lead = {
        ...lead,
        lead_type: 'Employer',
        name: data.company || 'Employer Lead',
        contact_person: data.contact_person || '',
        email: data.email || '',
        phone: data.phone || '',
        source: 'Employer staffing request',
        notes: [
          noteLine('Industry', data.industry),
          noteLine('Location', data.location),
          noteLine('Staffing need', data.staffing_need)
        ].filter(Boolean).join('\n')
      };
      detailTable = 'employers';
      detailPayload = {
        company_name: data.company || 'Employer Lead',
        contact_person: data.contact_person || '',
        email: data.email || '',
        phone: data.phone || '',
        staffing_need: [
          noteLine('Industry', data.industry),
          noteLine('Location', data.location),
          noteLine('Need', data.staffing_need)
        ].filter(Boolean).join('\n'),
        visa_category: '',
        status: 'New'
      };
    }

    if (formType === 'candidate') {
      lead = {
        ...lead,
        lead_type: 'Candidate',
        name: data.full_name || 'Candidate Lead',
        contact_person: data.full_name || '',
        email: data.email || '',
        phone: data.phone || '',
        source: 'Candidate interest form',
        notes: [
          noteLine('Profession', data.profession),
          noteLine('Country', data.country),
          noteLine('Visa interest', data.visa_interest),
          noteLine('Experience', data.experience)
        ].filter(Boolean).join('\n')
      };
      detailTable = 'candidates';
      detailPayload = {
        full_name: data.full_name || 'Candidate Lead',
        email: data.email || '',
        phone: data.phone || '',
        profession: [data.profession, data.country].filter(Boolean).join(' | '),
        visa_interest: data.visa_interest || '',
        resume_url: '',
        status: 'New'
      };
    }

    if (formType === 'sponsor') {
      const amount = packageValue(data.package_interest);
      lead = {
        ...lead,
        lead_type: 'Sponsor',
        name: data.organization || 'Sponsor Lead',
        contact_person: data.contact_person || '',
        email: data.email || '',
        phone: data.phone || '',
        value: amount,
        source: 'Sponsor interest form',
        notes: [
          noteLine('Package', data.package_interest),
          noteLine('Goals', data.goals)
        ].filter(Boolean).join('\n')
      };
      detailTable = 'sponsors';
      detailPayload = {
        organization_name: data.organization || 'Sponsor Lead',
        contact_person: data.contact_person || '',
        email: data.email || '',
        phone: data.phone || '',
        sponsor_package: data.package_interest || '',
        pledge_amount: amount,
        payment_status: 'Pending'
      };
    }

    if (formType === 'vendor') {
      lead = {
        ...lead,
        lead_type: 'Vendor',
        name: data.business_name || 'Vendor Lead',
        contact_person: data.contact_person || '',
        email: data.email || '',
        phone: data.phone || '',
        value: 3500,
        source: 'Vendor booth request',
        notes: [
          noteLine('Product or service', data.product_or_service),
          noteLine('Booth needs', data.booth_needs)
        ].filter(Boolean).join('\n')
      };
      detailTable = 'vendors';
      detailPayload = {
        business_name: data.business_name || 'Vendor Lead',
        contact_person: data.contact_person || '',
        email: data.email || '',
        phone: data.phone || '',
        booth_type: [data.product_or_service, data.booth_needs].filter(Boolean).join(' | '),
        payment_status: 'Pending'
      };
    }

    if (formType === 'event') {
      lead = {
        ...lead,
        lead_type: 'Event',
        name: data.full_name || 'Event Lead',
        contact_person: data.full_name || '',
        email: data.email || '',
        phone: data.phone || '',
        source: 'Event RSVP form',
        notes: [
          noteLine('Event interest', data.event_interest),
          noteLine('Attendee type', data.attendee_type),
          noteLine('Message', data.message)
        ].filter(Boolean).join('\n')
      };
      detailTable = 'event_registrations';
      detailPayload = {
        full_name: data.full_name || 'Event Lead',
        email: data.email || '',
        phone: data.phone || '',
        event_interest: data.event_interest || '',
        attendee_type: data.attendee_type || '',
        message: data.message || '',
        status: 'New'
      };
    }

    const intakeSubmission = {
      form_type: formType,
      lead_type: lead.lead_type,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      payload: data,
      status: 'New'
    };

    const tasks = taskTemplates(formType, lead);

    return { lead, detailTable, detailPayload, intakeSubmission, tasks };
  }

  function saveLocal(records) {
    const leads = JSON.parse(localStorage.getItem('ruthkoLocalLeads') || '[]');
    leads.unshift(records.lead);
    localStorage.setItem('ruthkoLocalLeads', JSON.stringify(leads));

    const submissions = JSON.parse(localStorage.getItem('ruthkoPublicIntakeSubmissions') || '[]');
    submissions.unshift({ ...records.intakeSubmission, id: records.lead.id, created_at: new Date().toISOString() });
    localStorage.setItem('ruthkoPublicIntakeSubmissions', JSON.stringify(submissions));

    const tasks = JSON.parse(localStorage.getItem('ruthkoLocalTasks') || '[]');
    records.tasks.forEach((task) => {
      tasks.unshift({ ...task, id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()) });
    });
    localStorage.setItem('ruthkoLocalTasks', JSON.stringify(tasks));
  }

  async function saveLive(client, records) {
    const leadPayload = { ...records.lead };
    delete leadPayload.id;

    const { data: leadData, error: leadError } = await client.from('leads').insert([leadPayload]).select('id').single();
    if (leadError) throw leadError;

    if (records.detailTable && records.detailPayload) {
      const { error: detailError } = await client.from(records.detailTable).insert([records.detailPayload]);
      if (detailError) throw detailError;
    }

    const submission = {
      ...records.intakeSubmission,
      lead_id: leadData ? leadData.id : null
    };
    const { error: submissionError } = await client.from('intake_submissions').insert([submission]);
    if (submissionError) throw submissionError;

    const taskPayloads = records.tasks.map((task) => ({
      ...task,
      lead_id: leadData ? leadData.id : null
    }));
    const { error: taskError } = await client.from('tasks').insert(taskPayloads);
    if (taskError) throw taskError;
  }


  async function notifyAdmin(records, formType) {
    try {
      const response = await fetch('/.netlify/functions/notify-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formType,
          lead: records.lead,
          intakeSubmission: records.intakeSubmission
        })
      });

      if (!response.ok) {
        console.warn('Email notification did not send. Lead was still saved.');
      }
    } catch (error) {
      console.warn('Email notification skipped. Lead was still saved.', error);
    }
  }


  async function sendAutoReply(records, formType) {
    try {
      const response = await fetch('/.netlify/functions/send-auto-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formType,
          lead: records.lead,
          intakeSubmission: records.intakeSubmission
        })
      });

      if (!response.ok) {
        console.warn('Auto-reply did not send. Lead was still saved.');
      }
    } catch (error) {
      console.warn('Auto-reply skipped. Lead was still saved.', error);
    }
  }

  function setFormState(form, message, type) {
    const target = form.querySelector('[data-form-message]');
    if (!target) return;
    target.textContent = message;
    target.className = type === 'error' ? 'text-sm font-bold text-red-400' : 'text-sm font-bold text-green-400';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formType = form.dataset.ruthkoForm;
    const button = form.querySelector('button[type="submit"]');
    const originalText = button ? button.textContent : '';

    if (button) {
      button.disabled = true;
      button.textContent = 'Saving...';
    }
    setFormState(form, 'Saving your information...', 'success');

    try {
      const records = buildRecords(formType, formObject(form));
      const client = getClient();
      if (client) {
        await saveLive(client, records);
      } else {
        saveLocal(records);
      }

      await notifyAdmin(records, formType);
      await sendAutoReply(records, formType);
      form.reset();
      setFormState(form, 'Saved. Redirecting to thank-you page.', 'success');
      window.location.href = redirectsTo;
    } catch (error) {
      console.error(error);
      setFormState(form, 'Save failed. Check Supabase setup or try again.', 'error');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  }

  function init() {
    const forms = document.querySelectorAll('form[data-ruthko-form]');
    forms.forEach((form) => form.addEventListener('submit', handleSubmit));

    const status = document.getElementById('databaseStatus');
    if (status) {
      const client = getClient();
      status.textContent = client ? 'Connected to Supabase CRM database.' : 'Sample mode. Forms save to browser storage until Supabase keys are added.';
      status.className = client ? 'text-xs text-green-400 mt-3' : 'text-xs text-yellow-400 mt-3';
    }
  }

  return { init };
})();

window.addEventListener('DOMContentLoaded', RuthkoIntake.init);
