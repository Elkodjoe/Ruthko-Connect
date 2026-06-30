(function () {
  'use strict';

  async function convertToStaffingOrder(submission) {
    var svc = window.ruthkoJobBoard;
    if (!svc) return { ok: false, error: 'Job board service not loaded' };
    return svc.convertIntakeToOrder(submission);
  }

  async function createJobPostFromOrder(order, jobData) {
    var svc = window.ruthkoJobBoard;
    if (!svc) return { ok: false, error: 'Job board service not loaded' };
    var post = Object.assign({
      staffing_order_id: order.id,
      company_name: order.company_name,
      city: order.job_location_city,
      state: order.job_location_state,
      country: order.job_location_country || 'United States',
      shift_type: order.shift_type,
      housing_support: order.housing_support,
      transportation_support: order.transportation_support,
      start_date: order.desired_start_date,
      pay_range: order.pay_range,
      status: 'draft'
    }, jobData);
    var result = await svc.createJobPost(post);
    if (result.ok && order.id) {
      await svc.updateStaffingOrder(order.id, { order_status: 'recruiting' });
    }
    return result;
  }

  async function updateOrderStatus(id, status) {
    var svc = window.ruthkoJobBoard;
    if (!svc) return { ok: false, error: 'Job board service not loaded' };
    return svc.updateStaffingOrder(id, { order_status: status });
  }

  async function getWorkflowStats() {
    var svc = window.ruthkoJobBoard;
    if (!svc) return {};
    try {
      var orders  = await svc.getStaffingOrders({ limit: 500 });
      var posts   = await svc.getAllJobPosts({ limit: 500 });
      var apps    = await svc.getApplications({ limit: 500 });
      return {
        totalOrders:      orders.length,
        activeOrders:     orders.filter(function (o) { return ['recruiting','approved','reviewing'].indexOf(o.order_status) !== -1; }).length,
        publishedJobs:    posts.filter(function (p) { return p.status === 'published'; }).length,
        totalJobs:        posts.length,
        totalApplications: apps.length,
        newApplications:  apps.filter(function (a) { return a.status === 'new'; }).length,
        hiredCount:       apps.filter(function (a) { return a.status === 'hired'; }).length
      };
    } catch (_) {
      return {};
    }
  }

  window.ruthkoStaffingWorkflow = {
    convertToStaffingOrder: convertToStaffingOrder,
    createJobPostFromOrder: createJobPostFromOrder,
    updateOrderStatus: updateOrderStatus,
    getWorkflowStats: getWorkflowStats
  };
})();
