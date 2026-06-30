(function () {
  const adminPlaybooks = {
    dailyBrief: `Create a Ruthko admin daily brief with these sections:\n\n1. Top staffing leads to follow up today.\n2. Event organizing priorities.\n3. Sponsor and vendor opportunities.\n4. CRM overdue tasks.\n5. Emails to send today.\n6. Social media post ideas.\n7. One executive decision Ruthko should make today.`,
    frontDesk: `Act as the Ruthko front desk assistant. Answer public questions using only Ruthko services: staffing, jobs, events, sponsors, vendors, partnerships, payments, and contact forms. Keep answers short. Always route users to the correct page. Never mention internal CRM, pipeline values, admin tools, or private workflows.`,
    crmEmail: `Act as Ruthko CRM assistant. Write a professional follow-up email based on this lead type. Include a clear next step, warm tone, and CRM task title. Lead type: employer, candidate, sponsor, vendor, event guest, or partner.`,
    socialPlan: `Create a 7-day Ruthko social media plan. Include staffing posts, event organizing posts, sponsor posts, vendor booth posts, and partnership posts. Use short captions and practical calls to action.`,
    eventUpdate: `Create an event update for Ruthko. Include event purpose, guest value, sponsor value, vendor value, RSVP call to action, and contact details.`
  };

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  }

  window.loadAdminPlaybook = function (name) {
    setText('adminAiOutput', adminPlaybooks[name] || adminPlaybooks.dailyBrief);
  };

  window.copyAdminAiOutput = async function () {
    const el = document.getElementById('adminAiOutput');
    if (!el) return;
    try {
      await navigator.clipboard.writeText(el.value);
      document.getElementById('adminAiStatus').textContent = 'Copied';
    } catch (error) {
      document.getElementById('adminAiStatus').textContent = 'Copy manually';
    }
  };

  window.generatePublicAssistantScript = function () {
    const topic = document.getElementById('publicAssistantTopic').value;
    const tone = document.getElementById('publicAssistantTone').value;
    const output = `Public Ruthko Assistant instruction:\n\nAnswer visitors who ask about ${topic}. Use a ${tone} tone.\n\nRules:\n1. Answer only from Ruthko public services.\n2. Route employers to intake.html#employer.\n3. Route candidates to intake.html#candidate.\n4. Route event guests to events.html or intake.html#event.\n5. Route sponsors to sponsors.html or intake.html#sponsor.\n6. Route vendors to intake.html#vendor.\n7. Route partners to partners.html.\n8. Share contact details only when needed: info@ruthkojobs.com, +1-701-260-3908, +1-240-486-5002.\n9. Do not reveal admin dashboard, CRM, reports, campaigns, tasks, automation settings, or private business data.\n10. End with one clear next step.`;
    setText('publicAssistantOutput', output);
  };

  window.copyPublicAssistantScript = async function () {
    const el = document.getElementById('publicAssistantOutput');
    if (!el) return;
    try {
      await navigator.clipboard.writeText(el.value);
      document.getElementById('publicAssistantStatus').textContent = 'Copied';
    } catch (error) {
      document.getElementById('publicAssistantStatus').textContent = 'Copy manually';
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    loadAdminPlaybook('dailyBrief');
    generatePublicAssistantScript();
  });
})();
