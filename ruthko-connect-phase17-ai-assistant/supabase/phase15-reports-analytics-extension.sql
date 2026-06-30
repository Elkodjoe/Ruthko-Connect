-- Phase 15 Reports & Analytics Extension
-- Run after Phase 14 if you want database-level reporting views.

create or replace view report_lead_summary as
select
  lead_type,
  status,
  count(*) as total_leads,
  coalesce(sum(value), 0) as total_value
from leads
group by lead_type, status;

create or replace view report_payment_summary as
select
  payment_type,
  payment_status,
  count(*) as total_payments,
  coalesce(sum(amount), 0) as total_amount
from payments
group by payment_type, payment_status;

create or replace view report_monthly_revenue as
select
  date_trunc('month', created_at)::date as month_start,
  payment_type,
  payment_status,
  coalesce(sum(amount), 0) as total_amount,
  count(*) as transaction_count
from payments
group by date_trunc('month', created_at)::date, payment_type, payment_status
order by month_start desc;

create or replace view report_event_operations_summary as
select
  ep.id as event_id,
  ep.title,
  ep.event_type,
  ep.event_date,
  ep.city,
  ep.status,
  coalesce(count(distinct esa.id), 0) as attendee_count,
  coalesce(count(distinct evb.id), 0) as booth_count,
  coalesce(count(distinct esd.id), 0) as sponsor_count,
  coalesce(sum(distinct esd.amount), 0) as sponsor_value
from event_programs ep
left join event_attendees esa on esa.event_id = ep.id
left join event_vendor_booths evb on evb.event_id = ep.id
left join event_sponsor_deliverables esd on esd.event_id = ep.id
group by ep.id, ep.title, ep.event_type, ep.event_date, ep.city, ep.status;

create or replace view report_task_health as
select
  status,
  count(*) as task_count
from tasks
group by status;

-- These are read-only views. Keep table RLS policies active on the source tables.
