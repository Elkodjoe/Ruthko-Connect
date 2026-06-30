const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const knowledge = [
  {
    keys: ['job', 'staff', 'hire', 'employer', 'worker', 'nurse', 'recruit'],
    answer: 'Ruthko supports staffing and recruitment requests. Employers should submit the staffing request form. Candidates should submit the candidate interest form.',
    link: 'intake.html#employer',
    label: 'Start staffing request'
  },
  {
    keys: ['candidate', 'apply', 'resume', 'credential'],
    answer: 'Candidates may share their interest through the candidate form. Ruthko reviews the request and follows up with the next step.',
    link: 'intake.html#candidate',
    label: 'Candidate interest form'
  },
  {
    keys: ['event', 'summit', 'rsvp', 'attend', 'guest', 'ticket'],
    answer: 'Ruthko is also an event organizing company. Event guests may review upcoming events, RSVP, or ask about attendance details.',
    link: 'events.html',
    label: 'View Ruthko events'
  },
  {
    keys: ['sponsor', 'package', 'platinum', 'gold', 'silver', 'brand', 'visibility'],
    answer: 'Ruthko offers sponsor opportunities for events and business programs. Sponsors may review packages and submit interest for follow-up.',
    link: 'sponsors.html',
    label: 'View sponsor packages'
  },
  {
    keys: ['vendor', 'booth', 'exhibit', 'table'],
    answer: 'Vendors may request booth opportunities for Ruthko events and programs through the vendor form.',
    link: 'intake.html#vendor',
    label: 'Request vendor booth'
  },
  {
    keys: ['partner', 'partnership', 'collaborate', 'collaboration'],
    answer: 'Ruthko works with employers, sponsors, vendors, community groups, and business partners. Partner inquiries may start through the partnership page.',
    link: 'partners.html',
    label: 'Partner with Ruthko'
  },
  {
    keys: ['payment', 'pay', 'invoice', 'stripe'],
    answer: 'Ruthko payment options cover sponsor packages, vendor booths, tickets, and invoice requests.',
    link: 'payments.html',
    label: 'Open payments'
  },
  {
    keys: ['contact', 'email', 'phone', 'call'],
    answer: 'Contact Ruthko at info@ruthkojobs.com, +1-701-260-3908, or +1-240-486-5002.',
    link: 'intake.html',
    label: 'Open contact form'
  }
];

function safeQuestion(body) {
  try {
    const parsed = JSON.parse(body || '{}');
    return String(parsed.question || '').slice(0, 500);
  } catch (error) {
    return '';
  }
}

function findAnswer(question) {
  const q = question.toLowerCase();
  return knowledge.find(item => item.keys.some(key => q.includes(key))) || {
    answer: 'Ruthko Connect supports staffing, jobs, event organizing, sponsors, vendors, partners, payments, and inquiry forms. Share what you need and Ruthko will route you to the right next step.',
    link: 'intake.html',
    label: 'Submit inquiry'
  };
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
  }

  const question = safeQuestion(event.body);
  const result = findAnswer(question);
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, question, ...result })
  };
};
