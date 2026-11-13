// Status labels as rendered in the Optical Shop (order detail + list filter).
const ORDER_STATUS_LABEL = {
  notStarted: 'Not Started',
  pendingAdvance: 'Pending Advance',
  advancePaid: 'Advance Paid',
  inProgress: 'In Progress',
  qcFailed: 'QC Failed',
  qcPassed: 'QC Passed',
  ready: 'Ready',
  collected: 'Collected',
  cancelled: 'Cancelled',
};

// Order.status values returned by /optical-system/orders (observed on QA).
const ORDER_STATUS = {
  notStarted: 'not_started',
  pendingAdvance: 'pending_advance',
  ready: 'ready_for_pickup',
  collected: 'collected',
  cancelled: 'cancelled',
};

// Next-visit options in the "Mark Order as Collected" popup -> value stored in order.metadata.next_visit_option.
const NEXT_VISIT_OPTIONS = {
  '1 Min': { key: '1_min', minutes: 1 },
  '2 Min': { key: '2_min', minutes: 2 },
  '4 Min': { key: '4_min', minutes: 4 },
};

// sms log metadata.type. Welcome and Ready-for-Pickup SMS are logged WITHOUT a type
// (metadata only has order_id), so they are identified by order + checkpoint instead.
const SMS_TYPE = {
  orderCollected: 'order_collected',
  nextVisitReminder: 'scheduled_next_visit_reminder',
  untyped: null,
};

// sms log `status`: the SMS Log page renders 0 as "Delivered".
const SMS_LOG_STATUS = { delivered: 0 };

// /sms/scheduled `status` values; UI filter buttons are "scheduled", "on hold", "not delivered".
const SCHEDULED_STATUS = {
  scheduled: 'scheduled',
  onHold: 'on_hold',
  notDelivered: 'not_delivered',
};

// Settings > Configuration: UI label -> configuration keys.
const SMS_SETTINGS = {
  welcome: {
    label: 'Optical System - Welcome SMS text',
    textKey: 'optical_welcome_sms',
    enabledKey: 'optical_welcome_sms_enabled',
  },
  pickup: {
    label: 'Optical System - Ready for Pickup SMS text',
    textKey: 'optical_pickup_sms',
    enabledKey: 'optical_pickup_sms_enabled',
  },
  thankYou: {
    label: 'Optical System - Thank you SMS text',
    textKey: 'optical_thank_you_sms',
    enabledKey: 'optical_thank_you_sms_enabled',
  },
  thankYouWalkIn: {
    label: 'Optical System - Thank you SMS text (walk-in customers)',
    textKey: 'optical_thank_you_sms_walk_in',
    enabledKey: 'optical_thank_you_sms_enabled_walk_in',
  },
  reminder: {
    label: 'Optical System - Next Visit Reminder SMS text',
    textKey: 'optical_reminder_sms',
    enabledKey: 'optical_reminder_sms_enabled',
  },
};

const NEXT_VISIT_POPUP = {
  label: 'Optical System - Next Visit Recommendation popup',
  enabledKey: 'optical_next_visit_recommendation_enabled',
};

// Everything off: tests switch on only what they need, so unrelated SMS never muddy assertions.
const ALL_SMS_OFF = Object.fromEntries(Object.values(SMS_SETTINGS).map(s => [s.enabledKey, false]));

const DEFAULT_ITEM = { code: 'OPT-001', name: 'Single Vision Lens', price: 2360 };

module.exports = {
  ORDER_STATUS_LABEL,
  ORDER_STATUS,
  NEXT_VISIT_OPTIONS,
  SMS_TYPE,
  SMS_LOG_STATUS,
  SCHEDULED_STATUS,
  SMS_SETTINGS,
  NEXT_VISIT_POPUP,
  ALL_SMS_OFF,
  DEFAULT_ITEM,
};
