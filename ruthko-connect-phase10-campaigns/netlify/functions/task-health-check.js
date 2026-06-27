exports.handler = async function () {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      message: 'Phase 9 task automation is active. Use tasks.html to review open, overdue, and high-priority follow-up tasks.'
    })
  };
};
