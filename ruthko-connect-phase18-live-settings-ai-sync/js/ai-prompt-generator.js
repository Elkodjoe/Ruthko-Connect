
(function () {
  const templates = {
    sponsor: {
      industry: 'Event sponsorship',
      contentType: 'Sponsor proposal',
      audience: 'corporate sponsors, investors, and business leaders',
      goal: 'secure a sponsor call and present the right package',
      details: 'Platinum Sponsor $50,000, Gold Sponsor $15,000, Silver Sponsor $5,000, Vendor Booth $3,500. Emphasize branding, networking, media visibility, and business introductions.'
    },
    staffing: {
      industry: 'Healthcare staffing',
      contentType: 'Professional email',
      audience: 'nursing homes, hospitals, clinics, and healthcare HR leaders',
      goal: 'book a staffing discovery call and collect workforce needs',
      details: 'Ruthko Jobs supports employer staffing requests, candidate intake, follow-up tasks, and CRM tracking for nursing and healthcare roles.'
    },
    event: {
      industry: 'Cultural summit',
      contentType: 'Event invitation',
      audience: 'business leaders, cultural leaders, sponsors, vendors, and community guests',
      goal: 'increase RSVPs, sponsorship inquiries, and vendor booth reservations',
      details: 'Promote Cultural Handshake Summit, business networking, investor introductions, cultural exchange, vendor booths, and sponsor packages.'
    }
  };

  window.loadTemplate = function (name) {
    const t = templates[name] || templates.sponsor;
    document.getElementById('industry').value = t.industry;
    document.getElementById('contentType').value = t.contentType;
    document.getElementById('audience').value = t.audience;
    document.getElementById('goal').value = t.goal;
    document.getElementById('details').value = t.details;
    buildIndustryPrompt();
  };

  window.buildIndustryPrompt = function () {
    const industry = document.getElementById('industry').value;
    const contentType = document.getElementById('contentType').value;
    const audience = document.getElementById('audience').value;
    const goal = document.getElementById('goal').value;
    const details = document.getElementById('details').value;
    const prompt = `Act as a senior marketing strategist and administrative assistant for Ruthko Connect.

Industry: ${industry}
Content type: ${contentType}
Audience: ${audience}
Goal: ${goal}

Business context:
${details}

Create the output with:
1. A clear subject or headline.
2. A strong opening based on the audience's business need.
3. A short value proposition for Ruthko Connect.
4. Specific next step language.
5. A professional tone.
6. No hype, no vague promises, and no unsupported claims.
7. A version Ruthko can send today.

Also include:
- 3 alternative subject lines.
- 3 short follow-up messages.
- 1 CRM task title for the next action.
- 1 suggested CRM stage.`;
    document.getElementById('promptOutput').value = prompt;
    document.getElementById('promptStatus').textContent = 'Prompt generated';
  };

  window.copyPrompt = async function () {
    const text = document.getElementById('promptOutput').value;
    if (!text) buildIndustryPrompt();
    try {
      await navigator.clipboard.writeText(document.getElementById('promptOutput').value);
      document.getElementById('promptStatus').textContent = 'Copied';
    } catch (error) {
      document.getElementById('promptStatus').textContent = 'Copy failed. Select and copy manually.';
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    const params = new URLSearchParams(window.location.search);
    const industry = params.get('industry');
    if (industry && industry.toLowerCase().includes('sponsor')) loadTemplate('sponsor');
    else if (industry && industry.toLowerCase().includes('event')) loadTemplate('event');
    else if (industry && industry.toLowerCase().includes('staff')) loadTemplate('staffing');
    else buildIndustryPrompt();
  });
})();
