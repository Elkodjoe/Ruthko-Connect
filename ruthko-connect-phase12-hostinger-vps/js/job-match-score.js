(function () {
  'use strict';

  // Score weights (total = 100)
  var WEIGHTS = {
    job_category:    25,
    location:        15,
    experience:      15,
    skills:          20,
    certifications:  10,
    availability:     5,
    shift:            5,
    work_auth:        3,
    language:         2
  };

  var EXPERIENCE_RANKS = { 'entry': 1, 'junior': 2, 'mid': 3, 'senior': 4, 'lead': 5, 'executive': 6 };

  function normalize(s) { return String(s || '').toLowerCase().trim(); }

  function scoreJobCategory(profile, job) {
    var pType = normalize(profile.desired_job_type);
    var jCat  = normalize(job.job_category);
    if (!pType || !jCat) return 0;
    if (pType === jCat) return WEIGHTS.job_category;
    // partial keyword overlap
    var pWords = pType.split(/\s+/);
    var jWords = jCat.split(/\s+/);
    var overlap = pWords.filter(function (w) { return jWords.indexOf(w) !== -1; }).length;
    return overlap > 0 ? Math.round(WEIGHTS.job_category * 0.5) : 0;
  }

  function scoreLocation(profile, job) {
    var pLoc = normalize(profile.preferred_location || (profile.city + ' ' + profile.state));
    var jCity  = normalize(job.city);
    var jState = normalize(job.state);
    if (!pLoc) return Math.round(WEIGHTS.location * 0.3);
    if (pLoc.includes(jCity) || jCity.includes(pLoc)) return WEIGHTS.location;
    if (pLoc.includes(jState) || jState.includes(pLoc)) return Math.round(WEIGHTS.location * 0.7);
    if (normalize(profile.city) === jCity || normalize(profile.state) === jState) return Math.round(WEIGHTS.location * 0.6);
    return 0;
  }

  function scoreExperience(profile, job) {
    var pExp = normalize(profile.experience_level);
    if (!pExp) return Math.round(WEIGHTS.experience * 0.5);
    var pRank = EXPERIENCE_RANKS[pExp] || 3;
    // job doesn't always carry explicit experience requirement — award partial if field exists
    var reqExp = normalize((job.requirements_json && job.requirements_json.experience) || '');
    if (!reqExp) return Math.round(WEIGHTS.experience * 0.6);
    var rRank = EXPERIENCE_RANKS[reqExp] || 2;
    if (pRank >= rRank) return WEIGHTS.experience;
    if (pRank === rRank - 1) return Math.round(WEIGHTS.experience * 0.6);
    return Math.round(WEIGHTS.experience * 0.2);
  }

  function scoreSkills(profile, job) {
    var profileSkills = (profile.skills || []).map(function (s) { return normalize(typeof s === 'string' ? s : (s.skill_name || '')); });
    var jobReqs = [];
    if (Array.isArray(job.requirements_json)) {
      jobReqs = job.requirements_json.map(function (r) { return normalize(typeof r === 'string' ? r : (r.skill || r.name || '')); });
    }
    if (!jobReqs.length || !profileSkills.length) return Math.round(WEIGHTS.skills * 0.3);
    var matched = profileSkills.filter(function (s) {
      return jobReqs.some(function (r) { return r && s && (r.includes(s) || s.includes(r)); });
    }).length;
    return Math.round(WEIGHTS.skills * Math.min(matched / jobReqs.length, 1));
  }

  function scoreCertifications(profile, job) {
    var certs = (profile.certifications || []).map(function (c) { return normalize(typeof c === 'string' ? c : (c.certification_name || '')); });
    if (!certs.length) return Math.round(WEIGHTS.certifications * 0.2);
    // Award full points if profile has any certs relevant to the job category
    var cat = normalize(job.job_category || '');
    var healthcareCategories = ['cna', 'lpn', 'rn', 'caregiver'];
    if (healthcareCategories.indexOf(cat) !== -1) {
      var healthcareCerts = ['cna', 'bls', 'cpr', 'lpn', 'rn', 'caregiver', 'first aid', 'phlebotomy'];
      var hasHealthcare = certs.some(function (c) { return healthcareCerts.some(function (hc) { return c.includes(hc); }); });
      if (hasHealthcare) return WEIGHTS.certifications;
    }
    return certs.length > 0 ? Math.round(WEIGHTS.certifications * 0.5) : 0;
  }

  function scoreAvailability(profile, job) {
    if (!profile.availability_date || !job.start_date) return Math.round(WEIGHTS.availability * 0.5);
    var avail = new Date(profile.availability_date);
    var start = new Date(job.start_date);
    if (isNaN(avail) || isNaN(start)) return Math.round(WEIGHTS.availability * 0.5);
    var diffDays = (avail - start) / 86400000;
    if (diffDays <= 0) return WEIGHTS.availability;           // available before start
    if (diffDays <= 14) return Math.round(WEIGHTS.availability * 0.7);  // within 2 weeks
    if (diffDays <= 30) return Math.round(WEIGHTS.availability * 0.4);  // within 1 month
    return 0;
  }

  function scoreShift(profile, job) {
    var pShift = normalize(profile.preferred_shift);
    var jShift = normalize(job.shift_type);
    if (!pShift || !jShift) return Math.round(WEIGHTS.shift * 0.5);
    if (pShift === jShift) return WEIGHTS.shift;
    if (pShift === 'flexible' || jShift === 'flexible') return Math.round(WEIGHTS.shift * 0.8);
    return 0;
  }

  function scoreWorkAuth(profile, job) {
    var auth = normalize(profile.work_authorization_status || '');
    if (!auth) return Math.round(WEIGHTS.work_auth * 0.5);
    // Employment type that indicates sponsorship needed
    var jobType = normalize(job.employment_type || '');
    if (jobType.includes('sponsorship') || jobType.includes('international')) {
      if (auth.includes('citizen') || auth.includes('permanent') || auth.includes('green card')) return WEIGHTS.work_auth;
      return Math.round(WEIGHTS.work_auth * 0.3);
    }
    if (auth !== 'unauthorized') return WEIGHTS.work_auth;
    return 0;
  }

  function scoreLanguage(profile, job) {
    var pLang = normalize(profile.preferred_language || 'en');
    var jLang = normalize(job.language || 'en');
    return pLang === jLang ? WEIGHTS.language : Math.round(WEIGHTS.language * 0.5);
  }

  function getLabel(score) {
    if (score >= 90) return 'Excellent match';
    if (score >= 75) return 'Strong match';
    if (score >= 60) return 'Possible match';
    return 'Weak match';
  }

  function getLabelClass(score) {
    if (score >= 90) return 'bg-green-900 text-green-300';
    if (score >= 75) return 'bg-blue-900 text-blue-300';
    if (score >= 60) return 'bg-yellow-900 text-yellow-300';
    return 'bg-zinc-800 text-zinc-400';
  }

  function scoreCandidate(profile, jobPost) {
    var breakdown = {
      job_category:   scoreJobCategory(profile, jobPost),
      location:       scoreLocation(profile, jobPost),
      experience:     scoreExperience(profile, jobPost),
      skills:         scoreSkills(profile, jobPost),
      certifications: scoreCertifications(profile, jobPost),
      availability:   scoreAvailability(profile, jobPost),
      shift:          scoreShift(profile, jobPost),
      work_auth:      scoreWorkAuth(profile, jobPost),
      language:       scoreLanguage(profile, jobPost)
    };
    var total = Object.values(breakdown).reduce(function (sum, v) { return sum + v; }, 0);
    var score = Math.min(Math.max(Math.round(total), 0), 100);
    return { score: score, label: getLabel(score), labelClass: getLabelClass(score), breakdown: breakdown };
  }

  function rankCandidates(profiles, jobPost) {
    return profiles.map(function (profile) {
      var result = scoreCandidate(profile, jobPost);
      return Object.assign({}, profile, { _matchScore: result.score, _matchLabel: result.label, _matchLabelClass: result.labelClass, _matchBreakdown: result.breakdown });
    }).sort(function (a, b) { return b._matchScore - a._matchScore; });
  }

  window.ruthkoJobMatchScore = {
    scoreCandidate: scoreCandidate,
    rankCandidates: rankCandidates,
    getLabel: getLabel,
    getLabelClass: getLabelClass,
    WEIGHTS: WEIGHTS
  };
})();
