// scratch/restore-emr67-draft.js — restore draft 222 form data to the state captured before the API probe
require('dotenv').config();
const { chromium, request } = require('@playwright/test');
const BASE = (process.env.BASE_URL || '').replace(/\/+$/, '');

// Exact `data` object the app itself sent before the probe, with children counts cleared.
const ORIGINAL = {"source":"","reasonForAdmission":"","admissionNotes":"","presentingComplaint":"","historyOfPresentingComplaint":"","associatedSymptoms":[],"pastMedicalProblems":[],"consultant":"","pastSurgicalProblems":[],"allergies":[],"bloodGroup":"","investigationTemplateId":null,"investigationSections":null,"investigationDates":[{"id":"col_1","date":""}],"investigationResults":{},"investigationTemplateStore":{},"investigationStudies":{},"systemicInquiry":{},"systemicInquiryDetails":{},"systemicInquiryDurations":{},"systemicInquiryScores":{},"familyHistory":[],"socialHistory":{},"drugHistory":[],"examination":{},"dateOfSurgery":"","admissionReports":[],"patientName":"","patientDob":"","occupation":"","marritalStatus":"","dependentChildrenMale":"","dependentChildrenFemale":"","dependentChildrenCount":"","independentChildrenMale":"","independentChildrenFemale":"","independentChildrenCount":"","smoking":{},"alcohol":{},"generalExaminationFindings":"","generalExaminationAdditionalNotes":"","parameters":{},"cvsFindings":"","respiratoryFindings":"","dominantHand":"","allensTestRS":"","allensTestLS":"","upperLimbsFindings":"","varicoseVeinsRS":"","varicoseVeinsLS":"","lowerLimbsFindings":"","pulses":{},"admissionId":222,"version":1,"currentStep":0,"completedSteps":[],"gender":"Male"};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ storageState: '.auth/user.json', baseURL: BASE })).newPage();
  let auth = null;
  page.on('request', (r) => { if (r.url().includes('stg_api') && r.headers().authorization) auth = r.headers().authorization; });
  await page.goto('/admin/admissions', { waitUntil: 'networkidle' });
  await browser.close();

  const api = await request.newContext({ extraHTTPHeaders: { authorization: auth, 'content-type': 'application/json' } });
  const url = 'https://stg_api.amerck.care/admissions/form/222';
  const before = (await (await api.get(url)).json()).payload.formData;
  console.log('formData BEFORE restore:', JSON.stringify(before).slice(0, 400));
  const r = await api.put(url, { data: { currentStep: 0, data: ORIGINAL, version: 1, status: 'draft' } });
  console.log('PUT', r.status());
  const after = (await (await api.get(url)).json()).payload.formData;
  const d = after.data || after;
  const missing = Object.keys(ORIGINAL).filter((k) => JSON.stringify(d[k]) !== JSON.stringify(ORIGINAL[k]));
  console.log('formData keys:', Object.keys(after));
  console.log('mismatched keys after restore:', missing);
  await api.dispose();
})();
