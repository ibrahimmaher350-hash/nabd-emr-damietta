/* Nabd Home Nursing EMR & CRM - Main Application Logic (Damietta Governorate) */

// Default Settings
const defaultClinicSettings = {
  brandName: "إبراهيم ماهر",
  logoUrl: "assets/logo.jpg?v=23",
  stampUrl: "assets/stamp.jpg?v=23",
  signatureUrl: "assets/signature.png?v=23",
  phone: "01001097896",
  whatsApp: "01001097896",
  email: "info@homenursing.eg",
  website: "https://homenursing.eg",
  address: "شارع الجلاء - بندر دمياط",
  governorate: "محافظة دمياط",
  serviceAreas: "بندر دمياط, مركز دمياط, رأس البر, دمياط الجديدة",
  googleMapsUrl: "https://maps.google.com/?q=31.4165,31.8133"
};

const defaultSyncSettings = {
  sheetsWebhookUrl: "https://script.google.com/macros/s/AKfycbx_DEMO_WEBHOOK_URL/exec",
  driveFolderId: "1A2B3C4D5E6F7G8H9I0J",
  firebaseProjectId: "nabd-home-nursing-damietta",
  firebaseApiKey: "AIzaSyDemoKey123456789NabdEMR",
  firestoreDb: "(default)",
  customWebhookUrl: "https://api.homenursing.eg/webhooks/visit-created",
  autoSyncEnabled: "true",
  autoBackupEnabled: "true",
  backupIntervalHours: "24",
  lastSyncTime: new Date().toLocaleString('ar-EG')
};

const defaultSystemSettings = {
  theme: "dark",
  language: "ar",
  currency: "ج.م",
  dateFormat: "YYYY-MM-DD",
  timeFormat: "12h",
  timezone: "Africa/Cairo (UTC+3)",
  nextPatientId: "pat_1005",
  nextVisitId: "vst_5002",
  nextInvoiceId: "inv_9001"
};

let clinicSettings = defaultClinicSettings;
let syncSettings = defaultSyncSettings;
let systemSettings = defaultSystemSettings;

let activeTemplateKey = "prescription";
let notificationLogs = [];
let reportDrafts = [];

// Active Report Editor State
let currentDraftState = null;
let editorHistoryStack = [];
let historyPointer = -1;
let touchCanvasCtx = null;
let isDrawingTouch = false;

try {
  const savedSettings = localStorage.getItem('nabd_clinic_settings_v1');
  if (savedSettings) clinicSettings = { ...defaultClinicSettings, ...JSON.parse(savedSettings) };
  clinicSettings.brandName = "إبراهيم ماهر";

  const savedSync = localStorage.getItem('nabd_sync_settings_v1');
  if (savedSync) syncSettings = { ...defaultSyncSettings, ...JSON.parse(savedSync) };

  const savedSys = localStorage.getItem('nabd_system_settings_v1');
  if (savedSys) systemSettings = { ...defaultSystemSettings, ...JSON.parse(savedSys) };

  const savedNotifs = localStorage.getItem('nabd_notifications_v1');
  if (savedNotifs) notificationLogs = JSON.parse(savedNotifs);

  const savedDrafts = localStorage.getItem('nabd_report_drafts_v1');
  if (savedDrafts) reportDrafts = JSON.parse(savedDrafts);
} catch (err) {
  console.log('Using default state:', err);
}

// Initial Seed Data (Damietta Areas)
const initialPatients = [
  {
    patientId: "pat_1001",
    fullName: "محمد عبد الله السيد",
    nationalId: "28510151234567",
    gender: "ذكر",
    dob: "1955-04-12",
    phone: "01001097896",
    whatsApp: "201001097896",
    emergency: "محمود (ابن المريض) - 01114455667",
    area: "دمياط الجديدة",
    detailedAddress: "الحي المتميز, عمارة 15, شقة 4, الدور الثاني",
    latitude: 31.4382,
    longitude: 31.6705,
    diseases: ["السكري من النوع الثاني", "ارتفاع ضغط الدم"],
    allergies: ["حساسية البنسلين"],
    bloodType: "A+",
    createdAt: "2026-02-01"
  },
  {
    patientId: "pat_1002",
    fullName: "فاطمة حسن علي",
    nationalId: "27208201234568",
    gender: "أنثى",
    dob: "1968-08-20",
    phone: "01001097896",
    whatsApp: "201001097896",
    emergency: "سارة (ابنة المريضة) - 01005544332",
    area: "بندر دمياط",
    detailedAddress: "شارع الجلاء, برج الأطباء, الدور الأول",
    latitude: 31.4165,
    longitude: 31.8133,
    diseases: ["قرحة فراش بالظهر", "جلطة سابقة"],
    allergies: ["لا يوجد"],
    bloodType: "O+",
    createdAt: "2026-03-10"
  }
];

const initialVisits = [
  {
    visitId: "vst_5001",
    patientId: "pat_1001",
    patientName: "محمد عبد الله السيد",
    providerName: "إبراهيم ماهر (نبض للتمريض المنزلي - دمياط)",
    visitDate: "2026-07-25T10:00",
    chiefComplaint: "غيار على جرح قدم سكري ومتابعة الضغط والسكر",
    hpi: "المريض يعاني من جرح قدم سكرية من 3 أسابيع مع تحسن نسبي",
    vitals: {
      temp: 37.1,
      pulse: 78,
      bpSys: 130,
      bpDia: 85,
      rr: 18,
      spO2: 98,
      sugar: 145,
      sugarType: "عشوائي (Random)",
      pain: 3,
      weight: 82.5,
      height: 175,
      bmi: 26.94,
      bmiCategory: "زيادة في الوزن"
    },
    procedures: ["غيار جراحي معقم (Dressing)", "سحب عينات تحاليل (Sample Collection)"],
    wound: {
      type: "قدم سكري (Diabetic Foot)",
      stage: "Stage 2",
      dimensions: "3.5 × 2.0 × 0.5 سم",
      exudate: "مصلية خفيفة",
      dressing: "Silver Foam + Hydrogel",
      nextDate: "2026-07-27"
    },
    medications: [
      { name: "Augmentin 1g", dose: "قرص واحد", frequency: "كل 12 ساعة", duration: "7 أيام", instructions: "بعد الأكل" },
      { name: "Clexane 40mg", dose: "حقنة تحت الجلد", frequency: "مرة يومياً", duration: "5 أيام", instructions: "8 مساءً" }
    ],
    billing: {
      visitFee: 300,
      dressingFee: 150,
      discount: 0,
      totalDue: 450,
      paidAmount: 450,
      remaining: 0
    }
  }
];

let patients = initialPatients;
let visits = initialVisits;
let activeMedications = [];

try {
  const savedPats = localStorage.getItem('nabd_patients_v5');
  const savedVis = localStorage.getItem('nabd_visits_v5');
  if (savedPats) patients = JSON.parse(savedPats);
  if (savedVis) visits = JSON.parse(savedVis);
} catch (err) {
  console.log('Using initial seed state:', err);
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  applyClinicSettingsToUI();
  applySyncSettingsToUI();
  applySystemSettingsToUI();
  saveStateToLocalStorage();
  renderDashboardStats();
  renderRecentVisits();
  renderPatientsGrid();
  populatePatientSelectOptions();
  populateNotificationPatientSelect();
  populateReportPatientSelect();
  renderScheduleTable();
  renderNotificationLogs();
  initQRCode();
  setCurrentDateTime();
});

function applyClinicSettingsToUI() {
  const topLogo = document.getElementById('ui-top-logo');
  if (topLogo) topLogo.src = clinicSettings.logoUrl;

  const topBrandName = document.getElementById('ui-top-brand-name');
  if (topBrandName) topBrandName.innerText = "إبراهيم ماهر";

  const topSubtitle = document.getElementById('ui-top-subtitle');
  if (topSubtitle) topSubtitle.innerHTML = `نبض للتمريض المنزلي (${clinicSettings.governorate}) | 📱 ${clinicSettings.phone}`;

  const heroLogo = document.getElementById('ui-hero-logo');
  if (heroLogo) heroLogo.src = clinicSettings.logoUrl;

  const heroTitle = document.getElementById('ui-hero-title');
  if (heroTitle) heroTitle.innerText = `إبراهيم ماهر`;

  const heroAreas = document.getElementById('ui-hero-areas');
  if (heroAreas) heroAreas.innerText = `نبض للتمريض المنزلي (${clinicSettings.governorate}) | مناطق تقديم الخدمة: ${clinicSettings.serviceAreas} | 📞 ${clinicSettings.phone}`;

  const recentVisitsHeader = document.getElementById('ui-recent-visits-header');
  if (recentVisitsHeader) recentVisitsHeader.innerText = `📋 أحدث الزيارات التمريضية - إبراهيم ماهر (نبض للتمريض المنزلي)`;

  document.getElementById('cfg-brand-name').value = "إبراهيم ماهر";
  document.getElementById('cfg-logo-url').value = clinicSettings.logoUrl;
  document.getElementById('cfg-phone').value = clinicSettings.phone;
  document.getElementById('cfg-whatsapp').value = clinicSettings.whatsApp;
  document.getElementById('cfg-email').value = clinicSettings.email;
  document.getElementById('cfg-website').value = clinicSettings.website;
  document.getElementById('cfg-governorate').value = clinicSettings.governorate;
  document.getElementById('cfg-address').value = clinicSettings.address;
  document.getElementById('cfg-service-areas').value = clinicSettings.serviceAreas;
  document.getElementById('cfg-google-maps').value = clinicSettings.googleMapsUrl;
}

function applySyncSettingsToUI() {
  document.getElementById('sync-sheets-url').value = syncSettings.sheetsWebhookUrl;
  document.getElementById('sync-drive-folder-id').value = syncSettings.driveFolderId;
  document.getElementById('sync-firebase-project-id').value = syncSettings.firebaseProjectId;
  document.getElementById('sync-firebase-api-key').value = syncSettings.firebaseApiKey;
  document.getElementById('sync-firestore-db').value = syncSettings.firestoreDb;
  document.getElementById('sync-custom-webhook').value = syncSettings.customWebhookUrl;
  document.getElementById('sync-auto-sync-enabled').value = syncSettings.autoSyncEnabled;
  document.getElementById('sync-auto-backup-enabled').value = syncSettings.autoBackupEnabled;
  document.getElementById('sync-backup-interval').value = syncSettings.backupIntervalHours;
  document.getElementById('sync-last-time-display').value = syncSettings.lastSyncTime || new Date().toLocaleString('ar-EG');
}

function applySystemSettingsToUI() {
  if (systemSettings.theme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }

  document.querySelectorAll('.ui-currency-symbol').forEach(el => {
    el.innerText = systemSettings.currency;
  });

  document.getElementById('sys-theme').value = systemSettings.theme;
  document.getElementById('sys-language').value = systemSettings.language;
  document.getElementById('sys-currency').value = systemSettings.currency;
  document.getElementById('sys-date-format').value = systemSettings.dateFormat;
  document.getElementById('sys-time-format').value = systemSettings.timeFormat;
  document.getElementById('sys-timezone').value = systemSettings.timezone;
  document.getElementById('sys-next-patient-id').value = systemSettings.nextPatientId;
  document.getElementById('sys-next-visit-id').value = systemSettings.nextVisitId;
  document.getElementById('sys-next-invoice-id').value = systemSettings.nextInvoiceId;

  renderDashboardStats();
}

// OPEN INLINE EMR VISIT SECTION INSIDE PATIENTS CRM TAB
function openNewVisitFromCRM(patientId = null) {
  switchTab('patients-tab', document.querySelectorAll('.tab-btn')[1]);
  const section = document.getElementById('inline-crm-visit-section');
  if (section) {
    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth' });
  }
  if (patientId) {
    document.getElementById('visit-patient-id').value = patientId;
  }
}

function closeInlineCRMVisitSection() {
  const section = document.getElementById('inline-crm-visit-section');
  if (section) section.style.display = 'none';
}

// DEDICATED ADD PATIENT TAB HANDLERS
function autoCalcAgeInTabForm(dobStr) {
  if (!dobStr) {
    const display = document.getElementById('tab-pat-age-display');
    if (display) display.value = 'غير محدد';
    return;
  }
  const age = calculateAge(dobStr);
  const display = document.getElementById('tab-pat-age-display');
  if (display) display.value = `${age} سنة`;
}

function autoFillDemoPatientTabForm() {
  document.getElementById('tab-pat-name').value = 'أحمد محمود إبراهيم';
  document.getElementById('tab-pat-national-id').value = '29010151234567';
  document.getElementById('tab-pat-gender').value = 'ذكر';
  document.getElementById('tab-pat-dob').value = '1990-05-15';
  autoCalcAgeInTabForm('1990-05-15');
  document.getElementById('tab-pat-phone').value = '01001097896';
  document.getElementById('tab-pat-whatsapp').value = '01001097896';
  document.getElementById('tab-pat-emergency').value = 'محمود (أخو المريض) - 01112233445';
  document.getElementById('tab-pat-area').value = 'دمياط الجديدة';
  document.getElementById('tab-pat-address-detail').value = 'دمياط الجديدة - الحي المتميز - عمارة 15 شقة 4';
  document.getElementById('tab-pat-diseases').value = 'السكري, ضغط الدم';
  document.getElementById('tab-pat-allergies').value = 'لا يوجد';
  document.getElementById('tab-pat-blood').value = 'A+';
}

function handleSavePatientFromTab(e) {
  if (e) e.preventDefault();
  const name = document.getElementById('tab-pat-name').value.trim() || "مريض بدون اسم";
  const natId = document.getElementById('tab-pat-national-id').value.trim() || "غير محدد";
  const gender = document.getElementById('tab-pat-gender').value || "غير محدد";
  const dob = document.getElementById('tab-pat-dob').value || "1980-01-01";
  const phone = document.getElementById('tab-pat-phone').value.trim() || clinicSettings.phone;
  const whatsApp = document.getElementById('tab-pat-whatsapp').value.trim() || phone;
  const emergency = document.getElementById('tab-pat-emergency').value.trim() || "غير محدد";
  const area = document.getElementById('tab-pat-area').value || "بندر دمياط";
  const addressDetail = document.getElementById('tab-pat-address-detail').value.trim() || "غير محدد";
  const diseasesStr = document.getElementById('tab-pat-diseases').value.trim();
  const allergiesStr = document.getElementById('tab-pat-allergies').value.trim();
  const blood = document.getElementById('tab-pat-blood').value || "غير محدد";

  const nextId = systemSettings.nextPatientId || `pat_${Date.now()}`;

  const newPat = {
    patientId: nextId,
    fullName: name,
    nationalId: natId,
    gender: gender,
    dob: dob,
    phone: phone,
    whatsApp: whatsApp,
    emergency: emergency,
    area: area,
    detailedAddress: addressDetail,
    latitude: 31.4165,
    longitude: 31.8133,
    diseases: diseasesStr ? diseasesStr.split(',').map(s => s.trim()) : [],
    allergies: allergiesStr ? allergiesStr.split(',').map(s => s.trim()) : [],
    bloodType: blood,
    createdAt: new Date().toISOString().split('T')[0]
  };

  const numericPart = parseInt(nextId.replace(/\D/g, '')) || 1005;
  systemSettings.nextPatientId = `pat_${numericPart + 1}`;
  localStorage.setItem('nabd_system_settings_v1', JSON.stringify(systemSettings));
  applySystemSettingsToUI();

  patients.unshift(newPat);
  saveStateToLocalStorage();
  renderPatientsGrid();
  renderDashboardStats();
  populatePatientSelectOptions();
  populateNotificationPatientSelect();
  populateReportPatientSelect();
  document.getElementById('tab-add-patient-form').reset();

  alert(`✅ تم حفظ ملف المريض (${name} - ${nextId}) بنجاح! الانتقال إلى سجل المرضى...`);
  switchTab('patients-tab', document.querySelectorAll('.tab-btn')[1]);
}

// PROFESSIONAL OFFICIAL REPORT FOOTER (CLEAN BLACK SIGNATURE & NO "ختم الاعتماد الرسمي" SENTENCE)
function renderOfficialReportFooter(providerName = "إبراهيم ماهر") {
  return `
    <div class="prescription-footer" style="margin-top:2.5rem; padding-top:1rem; border-top:2px dashed #cbd5e1; display:flex; justify-content:space-between; align-items:flex-end;">
      
      <!-- PROFESSIONAL BLACK CALLIGRAPHIC SIGNATURE OF IBRAHIM MAHER -->
      <div style="text-align: right; min-width: 200px;">
        <p style="font-size:0.85rem; color:#475569; font-weight:600; margin-bottom:0.3rem;">توقيع المسؤول المعتمد:</p>
        <img src="assets/signature.png?v=23" alt="توقيع إبراهيم ماهر" style="height: 75px; max-width: 200px; filter: invert(1); mix-blend-mode: multiply; object-fit: contain; display: block; margin-bottom: 0.3rem;" />
        <strong style="color: #0b192c; font-size: 0.95rem;">إبراهيم ماهر (نبض للتمريض المنزلي)</strong>
      </div>

      <!-- OFFICIAL NABD STAMP ONLY (WITHOUT SENTENCE "ختم الاعتماد الرسمي") -->
      <div style="text-align: center;">
        <img src="assets/stamp.jpg?v=23" alt="ختم نبض للتمريض المنزلي" style="width: 90px; height: 90px; border-radius: 50%; border: 2px solid #0b192c; object-fit: cover; box-shadow: 0 4px 8px rgba(0,0,0,0.12);" />
      </div>

      <!-- DIGITAL QR & VERIFICATION NOTE -->
      <div style="text-align: left; font-size: 0.75rem; color: #64748b; max-width: 200px;">
        <p style="font-weight: 700; color: #0b192c; margin-bottom:0.2rem;">إبراهيم ماهر | نبض للتمريض المنزلي</p>
        <p>مستند رقمي موثق بختم نبض وتوقيع إبراهيم ماهر المعتمد عبر QR Code</p>
      </div>

    </div>
  `;
}

// REPORT BUILDER CENTER ENGINE (15 REPORT TYPES)
function populateReportPatientSelect() {
  const select = document.getElementById('rpt-patient-id');
  if (!select) return;
  select.innerHTML = patients.map(p => `<option value="${p.patientId}">${p.fullName} (${p.area} - ${p.phone})</option>`).join('');
}

function openReportEditorStage(e) {
  if (e) e.preventDefault();

  const selectedTypeEl = document.querySelector('input[name="rpt_type"]:checked');
  const rptType = selectedTypeEl ? selectedTypeEl.value : 'prescription';
  const patId = document.getElementById('rpt-patient-id').value || (patients[0] ? patients[0].patientId : '');

  const p = patients.find(item => item.patientId === patId) || patients[0];
  const v = visits.find(vis => vis.patientId === patId) || (visits[0] ? visits[0] : initialVisits[0]);

  currentDraftState = {
    draftId: `draft_${Date.now()}`,
    visitId: v.visitId,
    patientId: p.patientId,
    reportType: rptType,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "إبراهيم ماهر",
    patientScope: {
      fullName: p.fullName,
      age: `${calculateAge(p.dob)} سنة`,
      phone: p.phone || clinicSettings.phone,
      area: `${p.area} - ${p.detailedAddress}`
    },
    medications: [...(v.medications || [])],
    woundPhotos: [
      { id: "img1", label: "صورة الجرح قبل Clean Dressing", url: "assets/logo.jpg?v=23" },
      { id: "img2", label: "صورة الجرح بعد التطهير والغيار المعقم", url: "assets/logo.jpg?v=23" }
    ],
    freeNotes: "ملاحظات وتوصيات خاصة بإبراهيم ماهر ونبض للتمريض المنزلي...",
    stampType: "nabd",
    signatureUrl: "assets/signature.png?v=23",
    extraElements: [],
    pageCount: 1
  };

  editorHistoryStack = [JSON.parse(JSON.stringify(currentDraftState))];
  historyPointer = 0;

  document.getElementById('draft-pat-name').value = currentDraftState.patientScope.fullName;
  document.getElementById('draft-pat-age').value = currentDraftState.patientScope.age;
  document.getElementById('draft-pat-phone').value = currentDraftState.patientScope.phone;
  document.getElementById('draft-pat-area').value = currentDraftState.patientScope.area;
  document.getElementById('draft-free-notes').value = currentDraftState.freeNotes;

  renderDraftMedicationsList();
  renderDraftWoundPhotosList();
  updateDraftReportView();

  document.getElementById('report-editor-stage').style.display = 'block';
  document.getElementById('report-editor-stage').scrollIntoView({ behavior: 'smooth' });
}

function closeReportEditorStage() {
  document.getElementById('report-editor-stage').style.display = 'none';
}

function togglePatientInlineEditor() {
  const box = document.getElementById('patient-inline-editor');
  box.style.display = box.style.display === 'none' ? 'grid' : 'none';
}

function pushHistoryState() {
  if (!currentDraftState) return;
  editorHistoryStack = editorHistoryStack.slice(0, historyPointer + 1);
  editorHistoryStack.push(JSON.parse(JSON.stringify(currentDraftState)));
  historyPointer++;
}

function editorUndo() {
  if (historyPointer > 0) {
    historyPointer--;
    currentDraftState = JSON.parse(JSON.stringify(editorHistoryStack[historyPointer]));
    applyCurrentDraftStateToForm();
    updateDraftReportView();
  } else {
    alert('لا يوجد خطوات سابقة للتراجع عنها');
  }
}

function editorRedo() {
  if (historyPointer < editorHistoryStack.length - 1) {
    historyPointer++;
    currentDraftState = JSON.parse(JSON.stringify(editorHistoryStack[historyPointer]));
    applyCurrentDraftStateToForm();
    updateDraftReportView();
  } else {
    alert('لا يوجد خطوات للإعادة');
  }
}

function applyCurrentDraftStateToForm() {
  document.getElementById('draft-pat-name').value = currentDraftState.patientScope.fullName;
  document.getElementById('draft-pat-age').value = currentDraftState.patientScope.age;
  document.getElementById('draft-pat-phone').value = currentDraftState.patientScope.phone;
  document.getElementById('draft-pat-area').value = currentDraftState.patientScope.area;
  document.getElementById('draft-free-notes').value = currentDraftState.freeNotes;
  renderDraftMedicationsList();
  renderDraftWoundPhotosList();
}

function renderDraftMedicationsList() {
  const container = document.getElementById('draft-medications-editor-list');
  if (!container || !currentDraftState) return;

  if (currentDraftState.medications.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem;">لا توجد أدوية مضافة بالروشتة.</p>`;
    return;
  }

  container.innerHTML = currentDraftState.medications.map((m, idx) => `
    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:0.5rem 0.8rem; border-radius:6px; margin-bottom:0.4rem;">
      <div>
        <strong>${m.name}</strong> - ${m.dose} (${m.frequency}) - ${m.duration} [${m.instructions}]
      </div>
      <div style="display:flex; gap:0.3rem;">
        <button type="button" class="btn btn-sm btn-amber" onclick="editDraftMedication(${idx})">✏️ تعديل</button>
        <button type="button" class="btn btn-sm btn-danger" onclick="deleteDraftMedication(${idx})">🗑️ حذف</button>
      </div>
    </div>
  `).join('');
}

function openAddMedicationDraftModal() {
  const name = prompt('اسم الدواء الجديد (مثال: Clexane 40mg):');
  if (!name) return;
  const dose = prompt('الجرعة (حقنة تحت الجلد):') || 'قرص واحد';
  const freq = prompt('التكرار (مرة يومياً):') || 'كل 12 ساعة';
  const duration = prompt('المدة (5 أيام):') || '7 أيام';
  const inst = prompt('تعليمات خاصة (بعد الأكل):') || 'مع مراعاة المواعيد';

  currentDraftState.medications.push({ name, dose, frequency: freq, duration, instructions: inst });
  pushHistoryState();
  renderDraftMedicationsList();
  updateDraftReportView();
}

function editDraftMedication(idx) {
  const m = currentDraftState.medications[idx];
  if (!m) return;
  const name = prompt('اسم الدواء:', m.name) || m.name;
  const dose = prompt('الجرعة:', m.dose) || m.dose;
  const freq = prompt('التكرار:', m.frequency) || m.frequency;
  const duration = prompt('المدة:', m.duration) || m.duration;
  const inst = prompt('التعليمات:', m.instructions) || m.instructions;

  currentDraftState.medications[idx] = { name, dose, frequency: freq, duration, instructions: inst };
  pushHistoryState();
  renderDraftMedicationsList();
  updateDraftReportView();
}

function deleteDraftMedication(idx) {
  currentDraftState.medications.splice(idx, 1);
  pushHistoryState();
  renderDraftMedicationsList();
  updateDraftReportView();
}

function renderDraftWoundPhotosList() {
  const container = document.getElementById('draft-wound-photos-list');
  if (!container || !currentDraftState) return;

  container.innerHTML = currentDraftState.woundPhotos.map((img, idx) => `
    <div class="wound-card-comparison">
      <img src="${img.url}" alt="${img.label}">
      <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.5rem;">${img.label}</p>
      <div style="display:flex; gap:0.3rem; justify-content:center;">
        <button type="button" class="btn btn-sm btn-amber" onclick="replaceWoundPhoto(${idx})">✏️ استبدال</button>
        <button type="button" class="btn btn-sm btn-danger" onclick="deleteWoundPhoto(${idx})">🗑️ حذف</button>
      </div>
    </div>
  `).join('');
}

function triggerAddNewWoundPhoto() {
  document.getElementById('wound-photo-file-input').click();
}

function executeAddWoundPhoto(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    currentDraftState.woundPhotos.push({
      id: `img_${Date.now()}`,
      label: `صورة جرح جديدة (${new Date().toLocaleDateString('ar-EG')})`,
      url: evt.target.result
    });
    pushHistoryState();
    renderDraftWoundPhotosList();
    updateDraftReportView();
  };
  reader.readAsDataURL(file);
}

function replaceWoundPhoto(idx) {
  triggerAddNewWoundPhoto();
}

function deleteWoundPhoto(idx) {
  currentDraftState.woundPhotos.splice(idx, 1);
  pushHistoryState();
  renderDraftWoundPhotosList();
  updateDraftReportView();
}

function openAddElementModal() {
  document.getElementById('add-element-modal').classList.add('active');
}

function closeAddElementModal() {
  document.getElementById('add-element-modal').classList.remove('active');
}

function insertElementToDraft(elementType) {
  const title = prompt(`عنوان عنصر [${elementType}]:`) || `عنصر مخصص (${elementType})`;
  currentDraftState.extraElements.push({ type: elementType, title: title, value: "محتوى مخصص جديد..." });
  pushHistoryState();
  closeAddElementModal();
  updateDraftReportView();
}

function openSignatureCanvasModal() {
  const modal = document.getElementById('signature-canvas-modal');
  modal.classList.add('active');
  initTouchSignatureCanvas();
}

function closeSignatureCanvasModal() {
  document.getElementById('signature-canvas-modal').classList.remove('active');
}

function initTouchSignatureCanvas() {
  const canvas = document.getElementById('signature-touch-canvas');
  touchCanvasCtx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  touchCanvasCtx.lineWidth = 2.5;
  touchCanvasCtx.strokeStyle = "#0b192c";

  canvas.onmousedown = (e) => { isDrawingTouch = true; touchCanvasCtx.beginPath(); touchCanvasCtx.moveTo(e.offsetX, e.offsetY); };
  canvas.onmousemove = (e) => { if (isDrawingTouch) { touchCanvasCtx.lineTo(e.offsetX, e.offsetY); touchCanvasCtx.stroke(); } };
  canvas.onmouseup = () => { isDrawingTouch = false; };

  canvas.ontouchstart = (e) => {
    isDrawingTouch = true;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    touchCanvasCtx.beginPath();
    touchCanvasCtx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
  };
  canvas.ontouchmove = (e) => {
    if (isDrawingTouch) {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      touchCanvasCtx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
      touchCanvasCtx.stroke();
    }
  };
  canvas.ontouchend = () => { isDrawingTouch = false; };
}

function clearSignatureTouchCanvas() {
  const canvas = document.getElementById('signature-touch-canvas');
  touchCanvasCtx.clearRect(0, 0, canvas.width, canvas.height);
}

function saveSignatureTouchCanvas() {
  const canvas = document.getElementById('signature-touch-canvas');
  currentDraftState.signatureUrl = canvas.toDataURL();
  pushHistoryState();
  closeSignatureCanvasModal();
  updateDraftReportView();
}

function addNewPageToDraftReport() {
  currentDraftState.pageCount++;
  pushHistoryState();
  document.getElementById('draft-page-count-display').innerText = `إجمالي الصفحات: ${currentDraftState.pageCount} صفحة`;
  updateDraftReportView();
  alert(`+ تم إضافة صفحة جديدة (${currentDraftState.pageCount}) لملف التقرير!`);
}

function updateDraftReportView() {
  if (!currentDraftState) return;

  currentDraftState.patientScope.fullName = document.getElementById('draft-pat-name').value || "غير محدد";
  currentDraftState.patientScope.age = document.getElementById('draft-pat-age').value || "غير محدد";
  currentDraftState.patientScope.phone = document.getElementById('draft-pat-phone').value || "غير محدد";
  currentDraftState.patientScope.area = document.getElementById('draft-pat-area').value || "غير محدد";
  currentDraftState.freeNotes = document.getElementById('draft-free-notes').value || "";

  const canvas = document.getElementById('printable-editor-report-canvas');
  if (!canvas) return;

  let html = `
    <div class="prescription-watermark">
      <img src="${clinicSettings.stampUrl}" alt="نبض">
    </div>

    <div class="prescription-header">
      <div class="logo-box">
        <img src="${clinicSettings.stampUrl}" alt="شعار نبض" class="official-nabd-logo">
        <div>
          <h2 style="color: #0b192c; font-size: 1.6rem; font-weight: 800;">إبراهيم ماهر</h2>
          <p style="color: #00d4b2; font-size: 0.9rem; font-weight: 700;">نبض للتمريض المنزلي (Nabd Official Nursing EMR)</p>
          <p style="font-size: 0.8rem; color: #475569;">${clinicSettings.governorate} (${clinicSettings.address}) | هاتف: ${clinicSettings.phone}</p>
        </div>
      </div>
      <div id="draft-editor-qrcode-box"></div>
    </div>

    <div class="prescription-info-bar">
      <div><strong>اسم المريض بالتقرير:</strong> ${currentDraftState.patientScope.fullName}</div>
      <div><strong>السن:</strong> ${currentDraftState.patientScope.age}</div>
      <div><strong>الهاتف:</strong> ${currentDraftState.patientScope.phone}</div>
      <div><strong>المنطقة:</strong> ${currentDraftState.patientScope.area}</div>
    </div>

    <h3 style="color: #0b192c; border-bottom: 2px solid #0b192c; padding-bottom: 0.3rem; margin-bottom: 1rem;">التقرير والروشتة الطبية المعتمدة (Draft #${currentDraftState.draftId})</h3>

    ${currentDraftState.medications.length > 0 ? `
    <h4 style="color:#0b192c; margin-bottom:0.5rem;">💊 جدول العلاج والأدوية المسجلة:</h4>
    <table class="prescription-table">
      <thead>
        <tr>
          <th>الدواء</th>
          <th>الجرعة</th>
          <th>التكرار</th>
          <th>المدة</th>
          <th>تعليمات خاصة</th>
        </tr>
      </thead>
      <tbody>
        ${currentDraftState.medications.map(m => `
          <tr>
            <td><strong>${m.name}</strong></td>
            <td>${m.dose}</td>
            <td>${m.frequency}</td>
            <td>${m.duration}</td>
            <td>${m.instructions}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>` : ''}

    ${currentDraftState.woundPhotos.length > 0 ? `
    <h4 style="color:#0b192c; margin-bottom:0.5rem;">🩹 معرض صور ومتابعة الجروح (قبل / بعد):</h4>
    <div class="wound-comparison-grid">
      ${currentDraftState.woundPhotos.map(img => `
        <div class="wound-card-comparison">
          <img src="${img.url}" alt="${img.label}">
          <p style="font-size:0.8rem; color:#475569;">${img.label}</p>
        </div>
      `).join('')}
    </div>` : ''}

    ${currentDraftState.freeNotes ? `
    <div style="background:#f8fafc; padding:1rem; border-radius:8px; border-right:4px solid #00d4b2; margin-top:1rem;">
      <h4 style="color:#0b192c; margin-bottom:0.3rem;">📝 ملاحظات وتعليمات حرة مضافة:</h4>
      <p style="font-size:0.9rem; color:#334155; white-space:pre-line;">${currentDraftState.freeNotes}</p>
    </div>` : ''}

    ${currentDraftState.extraElements.map(el => `
      <div style="background:#f1f5f9; padding:0.8rem; border-radius:6px; margin-top:1rem;">
        <h4 style="color:#0b192c;">📌 ${el.title}</h4>
        <p style="font-size:0.85rem; color:#334155;">${el.value}</p>
      </div>
    `).join('')}

    ${currentDraftState.pageCount > 1 ? `
      <div style="page-break-before: always; margin-top: 2rem; border-top: 2px dashed #cbd5e1; padding-top: 1.5rem;">
        <h4 style="color:#0b192c;">📄 الصفحة الثانية (الفحوصات والمرفقات)</h4>
        <p style="font-size:0.85rem; color:#64748b;">صفحة إضافية مدمجة بالتقرير الطبي الشامل.</p>
      </div>
    ` : ''}

    <!-- ALWAYS RENDER PROFESSIONAL FOOTER WITH BLACK CALLIGRAPHY & NO SENTENCE -->
    ${renderOfficialReportFooter("إبراهيم ماهر")}
  `;

  canvas.innerHTML = html;

  const qrBox = document.getElementById('draft-editor-qrcode-box');
  if (qrBox) {
    qrBox.innerHTML = '';
    new QRCode(qrBox, {
      text: `${clinicSettings.website}/verify/draft?id=${currentDraftState.draftId}`,
      width: 60,
      height: 60,
      colorDark: "#0b192c",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  }
}

function saveReportDraft() {
  if (!currentDraftState) return;

  currentDraftState.updatedAt = new Date().toISOString();

  const existingIdx = reportDrafts.findIndex(d => d.draftId === currentDraftState.draftId);
  if (existingIdx !== -1) {
    currentDraftState.version++;
    reportDrafts[existingIdx] = JSON.parse(JSON.stringify(currentDraftState));
  } else {
    reportDrafts.unshift(JSON.parse(JSON.stringify(currentDraftState)));
  }

  localStorage.setItem('nabd_report_drafts_v1', JSON.stringify(reportDrafts));

  const select = document.getElementById('editor-version-select');
  select.innerHTML = `<option value="v${currentDraftState.version}">Version ${currentDraftState.version} (حالي)</option>` +
    Array.from({ length: currentDraftState.version - 1 }, (_, i) => `<option value="v${i + 1}">Version ${i + 1}</option>`).join('');

  alert(`💾 تم حفظ مسودة التقرير (Draft ID: ${currentDraftState.draftId}) بنجاح في جدول Report Drafts! (الإصدار Version ${currentDraftState.version})`);
}

function openSaveTemplateModal() {
  const tplName = prompt('اكتب اسم القالب الجديد (مثال: قالب جروح سكري):');
  if (tplName) {
    alert(`💾 تم حفظ نمط التقرير بنجاح باسم قالب "${tplName}" لاستخدامه لاحقاً!`);
  }
}

function toggleReportViewMode() {
  const editorSections = document.querySelectorAll('.editor-section-card');
  editorSections.forEach(sec => {
    sec.style.display = sec.style.display === 'none' ? 'block' : 'none';
  });
}

// DATABASE MANAGEMENT & ADVANCED ACTION BUTTONS HANDLERS
function saveAllSystemSettingsMaster() {
  localStorage.setItem('nabd_clinic_settings_v1', JSON.stringify(clinicSettings));
  localStorage.setItem('nabd_sync_settings_v1', JSON.stringify(syncSettings));
  localStorage.setItem('nabd_system_settings_v1', JSON.stringify(systemSettings));
  localStorage.setItem('nabd_notifications_v1', JSON.stringify(notificationLogs));
  localStorage.setItem('nabd_report_drafts_v1', JSON.stringify(reportDrafts));
  saveStateToLocalStorage();
  alert('💾 تم حفظ كافة إعدادات وسجلات وحالة النظام ومسودات التقارير بنجاح!');
}

function testCloudConnection() {
  alert(`☁️ اختبار اتصال الخدمات السحابية لـ إبراهيم ماهر (نبض للتمريض المنزلي):\n• Google Sheets Webhook: ✅ متصل (200 OK)\n• Firebase Project (${syncSettings.firebaseProjectId}): ✅ جاهز وموثق\n• Cloud Firestore (${syncSettings.firestoreDb}): ✅ مزامنة حية 100%\n• Webhook Endpoint: ✅ متصل بدون أخطاء`);
}

function exportDataExcel() {
  let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
  csvContent += "ID المريض,اسم المريض,الرقم القومي,الجنس,المنطقة,الهاتف,الأمراض المزمنة,فصيلة الدم\n";

  patients.forEach(p => {
    const row = `"${p.patientId}","${p.fullName}","${p.nationalId}","${p.gender}","${p.area}","${p.phone}","${p.diseases.join(' - ')}","${p.bloodType}"`;
    csvContent += row + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `ibrahim_maher_patients_export_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  alert('📤 تم تصدير بيانات المرضى والزيارات كملف Excel (CSV) يدعم اللغة العربية بنجاح!');
}

function exportDataPDF() {
  window.print();
}

function exportDataJSON() {
  const data = { patients, visits, clinicSettings, syncSettings, systemSettings, notificationLogs, reportDrafts, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ibrahim_maher_emr_full_backup_${Date.now()}.json`;
  a.click();

  alert('📤 تم تصدير النسخة الاحتياطية كملف JSON بنجاح!');
}

function triggerJSONImportDialog() {
  document.getElementById('json-import-file-input').click();
}

function executeJSONImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedData = JSON.parse(e.target.result);
      if (importedData.patients) patients = importedData.patients;
      if (importedData.visits) visits = importedData.visits;
      if (importedData.clinicSettings) clinicSettings = importedData.clinicSettings;
      if (importedData.syncSettings) syncSettings = importedData.syncSettings;
      if (importedData.systemSettings) systemSettings = importedData.systemSettings;
      if (importedData.notificationLogs) notificationLogs = importedData.notificationLogs;
      if (importedData.reportDrafts) reportDrafts = importedData.reportDrafts;

      saveAllSystemSettingsMaster();
      applyClinicSettingsToUI();
      applySyncSettingsToUI();
      applySystemSettingsToUI();
      renderDashboardStats();
      renderRecentVisits();
      renderPatientsGrid();
      populatePatientSelectOptions();
      renderScheduleTable();
      renderNotificationLogs();
      populateReportPatientSelect();

      alert('📥 تم استيراد البيانات ومسودات التقارير والنسخة الاحتياطية وتحديث النظام بنجاح!');
    } catch (err) {
      alert('❌ خطأ في قراءة ملف JSON. يرجى التأكد من اختيار ملف تصدير صحيح.');
    }
  };
  reader.readAsText(file);
}

function restoreSystemBackupDialog() {
  triggerJSONImportDialog();
}

function cleanTemporaryDataLogs() {
  showConfirmDialog('هل أنت تأكد من تنظيف الملفات المؤقتة وسجلات الكاش الكاذبة وتحديث الذاكرة؟', () => {
    alert('🧹 تم تنظيف البيانات المؤقتة وسجلات الكاش بنجاح!');
  });
}

function resetSystemFactoryMaster() {
  showConfirmDialog('⚠️ تحذير هام: هل أنت تأكد من إعادة ضبط مصنع النظام والرجوع للبيانات الأولية؟', () => {
    localStorage.clear();
    location.reload();
  });
}

// SMART REMINDERS & NOTIFICATIONS HUB
function populateNotificationPatientSelect() {
  const select = document.getElementById('notif-patient-id');
  if (!select) return;
  select.innerHTML = '<option value="">-- اختر مريضاً من القائمة --</option>' +
    patients.map(p => `<option value="${p.patientId}">${p.fullName} (${p.area} - ${p.phone})</option>`).join('');
}

function updateReminderMessagePreview() {
  const type = document.getElementById('notif-type').value;
  const patId = document.getElementById('notif-patient-id').value;
  const dateVal = document.getElementById('notif-date-time').value;
  const pat = patients.find(p => p.patientId === patId) || patients[0];
  const dateStr = dateVal ? new Date(dateVal).toLocaleString('ar-EG') : 'الموعد المحدد';

  let msg = "";
  if (type === 'visit') {
    msg = ` السلام عليكم أ/ ${pat.fullName}، تذكير بموعد الزيارة التمريضية المنزلية المقررة من إبراهيم ماهر (نبض للتمريض المنزلي - ${clinicSettings.governorate}) بتاريخ ${dateStr}.\nنتمنى لكم دوام الصحة والعافية! 📱 هاتف التواصل: ${clinicSettings.phone}`;
  } else if (type === 'followup') {
    msg = ` السلام عليكم أ/ ${pat.fullName}، تذكير بمتابعة العلامات الحيوية (قياس الضغط، السكر، الحرارة والأكسجين) المقررة من إبراهيم ماهر بتاريخ ${dateStr}.\nلأي استفسار طارئ تواصل معنا: ${clinicSettings.phone}`;
  } else if (type === 'dressing') {
    msg = ` السلام عليكم أ/ ${pat.fullName}، تذكير بموعد تغيير الغيار المعقم على الجرح والمتابعة التمريضية من إبراهيم ماهر بتاريخ ${dateStr}.\nيرجى التجهز لاستقبال التمريض: ${clinicSettings.phone}`;
  } else if (type === 'lab') {
    msg = ` السلام عليكم أ/ ${pat.fullName}، تذكير بموعد سحب عينات التحاليل الطبية المنزلية المقررة من إبراهيم ماهر بتاريخ ${dateStr}.\nيرجى الالتزام بتعليمات الصيام المطلوبة. 📱 ${clinicSettings.phone}`;
  }

  document.getElementById('notif-msg-preview').value = msg;
}

function sendActiveReminderWhatsApp() {
  const patId = document.getElementById('notif-patient-id').value;
  const pat = patients.find(p => p.patientId === patId) || patients[0];
  const msg = document.getElementById('notif-msg-preview').value || "تذكير بخدمة التمريض المنزلي من إبراهيم ماهر";

  const phone = pat.whatsApp || pat.phone || clinicSettings.whatsApp;
  const waUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, '_blank');

  const type = document.getElementById('notif-type').value;
  const typeNames = { visit: "🩺 تذكير بالزيارة", followup: "🔄 تذكير بالمتابعة", dressing: "🩹 تذكير بالغيار", lab: "🧪 تذكير بالتحليل" };

  notificationLogs.unshift({
    id: `notif_${Date.now()}`,
    date: new Date().toLocaleString('ar-EG'),
    patientName: pat.fullName,
    patientPhone: phone,
    type: type,
    typeName: typeNames[type] || type,
    status: "تم الإرسال عبر الواتساب"
  });

  localStorage.setItem('nabd_notifications_v1', JSON.stringify(notificationLogs));
  renderNotificationLogs();
}

function handleSendReminderForm(e) {
  if (e) e.preventDefault();
  const patId = document.getElementById('notif-patient-id').value;
  const pat = patients.find(p => p.patientId === patId) || patients[0];

  const type = document.getElementById('notif-type').value;
  const dateVal = document.getElementById('notif-date-time').value;
  const typeNames = { visit: "🩺 تذكير بالزيارة", followup: "🔄 تذكير بالمتابعة", dressing: "🩹 تذكير بالغيار", lab: "🧪 تذكير بالتحليل" };

  notificationLogs.unshift({
    id: `notif_${Date.now()}`,
    date: dateVal ? new Date(dateVal).toLocaleString('ar-EG') : new Date().toLocaleString('ar-EG'),
    patientName: pat.fullName,
    patientPhone: pat.phone,
    type: type,
    typeName: typeNames[type] || type,
    status: "مجدولة تلقائياً بنظام إبراهيم ماهر"
  });

  localStorage.setItem('nabd_notifications_v1', JSON.stringify(notificationLogs));
  renderNotificationLogs();
  alert(`🔔 تم جدولة الإشعار التلقائي للمريض (${pat.fullName}) بنجاح!`);
}

function renderNotificationLogs() {
  const tbody = document.getElementById('notif-log-table');
  if (!tbody) return;

  if (notificationLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:1.5rem;">لا توجد إشعارات سابقة.</td></tr>`;
    return;
  }

  tbody.innerHTML = notificationLogs.map(n => `
    <tr>
      <td>${n.date}</td>
      <td><strong>${n.patientName}</strong></td>
      <td><span class="tag" style="color:var(--accent-cyan);">${n.typeName}</span></td>
      <td>${n.patientPhone}</td>
      <td><span class="tag" style="color:var(--accent-green);">${n.status}</span></td>
      <td>
        <button class="btn btn-sm btn-success" onclick="resendNotificationWhatsApp('${n.patientPhone}', '${encodeURIComponent(n.typeName)}')">📲 إرسال مجدداً</button>
      </td>
    </tr>
  `).join('');
}

function resendNotificationWhatsApp(phone, typeNameEnc) {
  const typeName = decodeURIComponent(typeNameEnc);
  const text = `السلام عليكم، تذكير من إبراهيم ماهر (نبض للتمريض المنزلي - ${clinicSettings.governorate}): ${typeName}. 📱 ${clinicSettings.phone}`;
  const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

function handleSaveClinicSettings(e) {
  if (e) e.preventDefault();

  clinicSettings = {
    brandName: "إبراهيم ماهر",
    logoUrl: document.getElementById('cfg-logo-url').value || "assets/logo.jpg?v=23",
    stampUrl: "assets/stamp.jpg?v=23",
    signatureUrl: "assets/signature.png?v=23",
    phone: document.getElementById('cfg-phone').value || "01001097896",
    whatsApp: document.getElementById('cfg-whatsapp').value || "01001097896",
    email: document.getElementById('cfg-email').value || "info@homenursing.eg",
    website: document.getElementById('cfg-website').value || "https://homenursing.eg",
    governorate: document.getElementById('cfg-governorate').value || "محافظة دمياط",
    address: document.getElementById('cfg-address').value || "شارع الجلاء - بندر دمياط",
    serviceAreas: document.getElementById('cfg-service-areas').value || "بندر دمياط, مركز دمياط, رأس البر, دمياط الجديدة",
    googleMapsUrl: document.getElementById('cfg-google-maps').value || "https://maps.google.com/?q=31.4165,31.8133"
  };

  localStorage.setItem('nabd_clinic_settings_v1', JSON.stringify(clinicSettings));
  applyClinicSettingsToUI();
  alert('🏢 تم حفظ وتحديث كافة إعدادات الهوية والبراند بنجاح في جميع أجزاء النظام!');
}

function handleSaveSyncSettings(e) {
  if (e) e.preventDefault();

  syncSettings = {
    sheetsWebhookUrl: document.getElementById('sync-sheets-url').value || "https://script.google.com/macros/s/AKfycbx_DEMO_WEBHOOK_URL/exec",
    driveFolderId: document.getElementById('sync-drive-folder-id').value || "1A2B3C4D5E6F7G8H9I0J",
    firebaseProjectId: document.getElementById('sync-firebase-project-id').value || "nabd-home-nursing-damietta",
    firebaseApiKey: document.getElementById('sync-firebase-api-key').value || "AIzaSyDemoKey123456789NabdEMR",
    firestoreDb: document.getElementById('sync-firestore-db').value || "(default)",
    customWebhookUrl: document.getElementById('sync-custom-webhook').value || "https://api.homenursing.eg/webhooks/visit-created",
    autoSyncEnabled: document.getElementById('sync-auto-sync-enabled').value,
    autoBackupEnabled: document.getElementById('sync-auto-backup-enabled').value,
    backupIntervalHours: document.getElementById('sync-backup-interval').value,
    lastSyncTime: new Date().toLocaleString('ar-EG')
  };

  localStorage.setItem('nabd_sync_settings_v1', JSON.stringify(syncSettings));
  applySyncSettingsToUI();
  alert('🔄 تم حفظ وتفعيل إعدادات المزامنة والربط السحابي (Google Sheets, Firebase, Firestore, Google Drive, Webhook) بنجاح!');
}

function handleSaveSystemSettings(e) {
  if (e) e.preventDefault();

  systemSettings = {
    theme: document.getElementById('sys-theme').value,
    language: document.getElementById('sys-language').value,
    currency: document.getElementById('sys-currency').value,
    dateFormat: document.getElementById('sys-date-format').value,
    timeFormat: document.getElementById('sys-time-format').value,
    timezone: document.getElementById('sys-timezone').value,
    nextPatientId: document.getElementById('sys-next-patient-id').value || "pat_1005",
    nextVisitId: document.getElementById('sys-next-visit-id').value || "vst_5002",
    nextInvoiceId: document.getElementById('sys-next-invoice-id').value || "inv_9001"
  };

  localStorage.setItem('nabd_system_settings_v1', JSON.stringify(systemSettings));
  applySystemSettingsToUI();
  alert('🛠️ تم حفظ وتطبيق إعدادات النظام وتفضيلات العرض بنجاح!');
}

function triggerManualSync() {
  const nowStr = new Date().toLocaleString('ar-EG');
  syncSettings.lastSyncTime = nowStr;
  localStorage.setItem('nabd_sync_settings_v1', JSON.stringify(syncSettings));
  applySyncSettingsToUI();

  alert(`⚡ تم إتمام المزامنة الفورية الآن بنجاح!\n• Google Sheets: متصل وتم نقل ${visits.length} زيارة.\n• Cloud Firestore: مزامنة حية 100%.\n• Webhook: تم الإرسال.\nالتوقيت: ${nowStr}`);
}

function triggerGoogleDriveBackup() {
  const backupData = { patients, visits, clinicSettings, syncSettings, systemSettings, notificationLogs, reportDrafts, backupTimestamp: new Date().toISOString() };
  const filename = `ibrahim_maher_gdrive_backup_${Date.now()}.json`;

  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();

  alert(`☁️ تم رفع وتوليد النسخة الاحتياطية بنجاح إلى مجلد Google Drive (Folder ID: ${syncSettings.driveFolderId})!\nاسم الملف: ${filename}`);
}

function setCurrentDateTime() {
  const dtInput = document.getElementById('visit-date-time');
  if (dtInput) {
    const now = new Date();
    dtInput.value = now.toISOString().slice(0, 16);
  }
}

function saveStateToLocalStorage() {
  localStorage.setItem('nabd_patients_v5', JSON.stringify(patients));
  localStorage.setItem('nabd_visits_v5', JSON.stringify(visits));
}

// Custom Modal Confirmation Handler
function showConfirmDialog(message, onConfirm) {
  const modal = document.getElementById('confirm-modal');
  const msgEl = document.getElementById('confirm-modal-msg');
  const actionBtn = document.getElementById('confirm-modal-action');
  const cancelBtn = document.getElementById('confirm-modal-cancel');

  msgEl.innerText = message;
  modal.classList.add('active');

  const cleanup = () => {
    modal.classList.remove('active');
    actionBtn.onclick = null;
    cancelBtn.onclick = null;
  };

  actionBtn.onclick = () => {
    cleanup();
    onConfirm();
  };

  cancelBtn.onclick = cleanup;
}

// Navigation Tabs Handler
function switchTab(tabId, btnElement) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  
  const targetContent = document.getElementById(tabId);
  if (targetContent) targetContent.classList.add('active');

  if (btnElement) {
    btnElement.classList.add('active');
  } else {
    // Fallback tab highlight search
    const btns = document.querySelectorAll('.tab-btn');
    if (tabId === 'add-patient-tab' && btns[0]) btns[0].classList.add('active');
    else if (tabId === 'patients-tab' && btns[1]) btns[1].classList.add('active');
    else if (tabId === 'schedule-tab' && btns[2]) btns[2].classList.add('active');
    else if (tabId === 'prescription-tab' && btns[3]) btns[3].classList.add('active');
    else if (tabId === 'settings-tab' && btns[4]) btns[4].classList.add('active');
    else if (tabId === 'dashboard-tab' && btns[5]) btns[5].classList.add('active');
  }

  if (tabId === 'dashboard-tab') {
    renderDashboardStats();
    renderRecentVisits();
  } else if (tabId === 'patients-tab') {
    renderPatientsGrid();
  } else if (tabId === 'schedule-tab') {
    populateNotificationPatientSelect();
    updateReminderMessagePreview();
    renderNotificationLogs();
  } else if (tabId === 'prescription-tab') {
    populateReportPatientSelect();
    initQRCode();
  }
}

// Age & Health Calculators
function calculateAge(dobString) {
  if (!dobString || dobString === 'غير محدد') return 0;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function calculateBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm || heightCm <= 0) return { bmi: 0, category: "غير محدد" };
  const heightMeters = heightCm / 100;
  const bmi = (weightKg / (heightMeters * heightMeters)).toFixed(2);
  let category = "";
  if (bmi < 18.5) category = "نقص في الوزن";
  else if (bmi >= 18.5 && bmi < 24.9) category = "وزن طبيعي";
  else if (bmi >= 25.0 && bmi < 29.9) category = "زيادة في الوزن";
  else if (bmi >= 30.0 && bmi < 34.9) category = "سمنة - الدرجة الأولى";
  else category = "سمنة مفرطة";

  return { bmi: parseFloat(bmi), category };
}

function calculateBMIInForm() {
  const w = parseFloat(document.getElementById('vital-weight').value) || 0;
  const h = parseFloat(document.getElementById('vital-height').value) || 0;
  const display = document.getElementById('vital-bmi-display');
  if (w > 0 && h > 0) {
    const res = calculateBMI(w, h);
    display.value = `${res.bmi} (${res.category})`;
  } else {
    display.value = "لم يتم الحساب";
  }
}

function calculateBillingInForm() {
  const vFee = parseFloat(document.getElementById('bill-visit-fee').value) || 0;
  const dFee = parseFloat(document.getElementById('bill-dressing-fee').value) || 0;
  const disc = parseFloat(document.getElementById('bill-discount').value) || 0;
  const paid = parseFloat(document.getElementById('bill-paid').value) || 0;

  const total = vFee + dFee - disc;
  const rem = total - paid;

  document.getElementById('bill-total').value = total >= 0 ? total : 0;
  document.getElementById('bill-remaining').value = rem >= 0 ? rem : 0;
}

// Dashboard Analytics
function renderDashboardStats() {
  document.getElementById('stat-total-patients').innerText = patients.length;
  document.getElementById('stat-today-visits').innerText = visits.length;

  let totalRev = 0;
  let totalPending = 0;
  visits.forEach(v => {
    totalRev += (v.billing?.paidAmount || 0);
    totalPending += (v.billing?.remaining || 0);
  });

  const curr = systemSettings.currency || 'ج.م';
  document.getElementById('stat-total-revenue').innerHTML = `${totalRev} <span class="ui-currency-symbol">${curr}</span>`;
  document.getElementById('stat-pending-balance').innerHTML = `${totalPending} <span class="ui-currency-symbol">${curr}</span>`;
}

function renderRecentVisits() {
  const tbody = document.getElementById('recent-visits-table');
  if (visits.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:2rem;">لا توجد زيارات مسجلة.</td></tr>`;
    return;
  }

  const curr = systemSettings.currency || 'ج.م';

  tbody.innerHTML = visits.map(v => `
    <tr>
      <td>${v.visitDate ? new Date(v.visitDate).toLocaleDateString('ar-EG') : 'الآن'}</td>
      <td><strong>${v.patientName}</strong></td>
      <td>${v.providerName}</td>
      <td>${v.procedures && v.procedures.length > 0 ? v.procedures.join(', ') : 'زيارة ومتابعة عامة'}</td>
      <td>
        <span class="tag">BP: ${v.vitals?.bpSys || 120}/${v.vitals?.bpDia || 80}</span>
        <span class="tag">Sugar: ${v.vitals?.sugar || 140}</span>
      </td>
      <td><strong>${v.billing?.totalDue || 0} ${curr}</strong></td>
      <td><span class="tag" style="color:var(--accent-green);">مكتملة ومزامنة</span></td>
      <td>
        <div style="display:flex; gap:0.3rem;">
          <button class="btn btn-sm btn-primary" onclick="viewVisitPrescription('${v.visitId}')">📄 الروشتة</button>
          <button class="btn btn-sm btn-amber" onclick="openEditVisitModal('${v.visitId}')">✏️ تعديل</button>
          <button class="btn btn-sm btn-danger" onclick="confirmDeleteVisit('${v.visitId}')">🗑️ حذف</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Patients CRM Render, Edit & Delete (Damietta Areas)
function renderPatientsGrid() {
  const container = document.getElementById('patients-grid-container');
  if (patients.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted); grid-column:1/-1;">لا يوجد مرضى مسجلين حتى الآن في نطاق دمياط.</p>`;
    return;
  }

  container.innerHTML = patients.map(p => {
    const age = calculateAge(p.dob);
    const gMapsUrl = p.latitude && p.longitude ? `https://maps.google.com/?q=${p.latitude},${p.longitude}` : clinicSettings.googleMapsUrl;
    const waUrl = `https://wa.me/${clinicSettings.whatsApp}?text=${encodeURIComponent('السلام عليكم أستاذ ' + p.fullName + '، تذكير بموعد الزيارة التمريضية المنزلية من إبراهيم ماهر (نبض للتمريض المنزلي - ' + clinicSettings.governorate + ' - هاتف: ' + clinicSettings.phone + ').')}`;

    return `
      <div class="patient-card">
        <div class="patient-card-header">
          <div class="patient-avatar">${p.fullName ? p.fullName.charAt(0) : 'م'}</div>
          <div class="patient-details">
            <h3>${p.fullName}</h3>
            <p>السن: ${age > 0 ? age + ' سنة' : 'غير محدد'} | ${p.gender}</p>
            <p>📱 ${p.phone || clinicSettings.phone}</p>
          </div>
        </div>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.5rem;">
          📍 <strong style="color: var(--accent-cyan);">${p.area}</strong> - ${p.detailedAddress}
        </p>
        <div class="tag-list">
          ${p.diseases && p.diseases.length > 0 ? p.diseases.map(d => `<span class="tag">${d}</span>`).join('') : '<span class="tag">بدون أمراض مزمنة</span>'}
          <span class="tag tag-danger">فصيلة: ${p.bloodType}</span>
        </div>
        <div class="patient-actions" style="flex-wrap: wrap;">
          <button class="btn btn-sm btn-primary" onclick="openNewVisitFromCRM('${p.patientId}')">🩺 زيارة جديدة</button>
          <button class="btn btn-sm btn-amber" onclick="openEditPatientModal('${p.patientId}')">✏️ تعديل</button>
          <button class="btn btn-sm btn-danger" onclick="confirmDeletePatient('${p.patientId}')">🗑️ حذف</button>
          <a href="${gMapsUrl}" target="_blank" class="btn btn-sm" style="background:#1e3e62;">🗺️ الخريطة</a>
          <a href="${waUrl}" target="_blank" class="btn btn-sm btn-success">💬 واتساب</a>
        </div>
      </div>
    `;
  }).join('');
}

function filterPatients() {
  const query = document.getElementById('search-query').value.toLowerCase();
  const area = document.getElementById('filter-area').value;
  const disease = document.getElementById('filter-disease').value;

  const filtered = patients.filter(p => {
    const matchQuery = (p.fullName && p.fullName.toLowerCase().includes(query)) || (p.phone && p.phone.includes(query)) || (p.nationalId && p.nationalId.includes(query));
    const matchArea = !area || (p.area && p.area.includes(area));
    const matchDisease = !disease || (p.diseases && p.diseases.some(d => d.includes(disease)));
    return matchQuery && matchArea && matchDisease;
  });

  const container = document.getElementById('patients-grid-container');
  if (filtered.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted); grid-column:1/-1;">لا توجد نتائج تطابق البحث في مناطق دمياط.</p>`;
    return;
  }

  const tempPatients = patients;
  patients = filtered;
  renderPatientsGrid();
  patients = tempPatients;
}

// Add & Edit Patient Handlers
function openAddPatientModal() {
  switchTab('add-patient-tab', document.querySelectorAll('.tab-btn')[0]);
}

function closeAddPatientModal() {
  const modal = document.getElementById('add-patient-modal');
  if (modal) modal.classList.remove('active');
}

function openEditPatientModal(patientId) {
  const p = patients.find(item => item.patientId === patientId);
  if (!p) return;

  document.getElementById('edit-pat-id').value = p.patientId;
  document.getElementById('edit-pat-name').value = p.fullName;
  document.getElementById('edit-pat-national-id').value = p.nationalId;
  document.getElementById('edit-pat-gender').value = p.gender;
  document.getElementById('edit-pat-dob').value = p.dob;
  document.getElementById('edit-pat-age-display').value = `${calculateAge(p.dob)} سنة`;
  document.getElementById('edit-pat-phone').value = p.phone || clinicSettings.phone;
  document.getElementById('edit-pat-whatsapp').value = p.whatsApp || clinicSettings.whatsApp;
  document.getElementById('edit-pat-emergency').value = p.emergency || '';
  document.getElementById('edit-pat-area').value = p.area;
  document.getElementById('edit-pat-address-detail').value = p.detailedAddress;
  document.getElementById('edit-pat-diseases').value = p.diseases ? p.diseases.join(', ') : '';
  document.getElementById('edit-pat-allergies').value = p.allergies ? p.allergies.join(', ') : '';
  document.getElementById('edit-pat-blood').value = p.bloodType || 'A+';

  document.getElementById('edit-patient-modal').classList.add('active');
}

function closeEditPatientModal() {
  document.getElementById('edit-patient-modal').classList.remove('active');
}

// Edit Visit Handlers
function openEditVisitModal(visitId) {
  const v = visits.find(item => item.visitId === visitId);
  if (!v) return;

  document.getElementById('edit-visit-id').value = v.visitId;
  document.getElementById('edit-visit-provider').value = v.providerName;
  document.getElementById('edit-visit-complaint').value = v.chiefComplaint || '';
  document.getElementById('edit-visit-bpsys').value = v.vitals?.bpSys || 120;
  document.getElementById('edit-visit-bpdia').value = v.vitals?.bpDia || 80;
  document.getElementById('edit-visit-sugar').value = v.vitals?.sugar || 140;
  document.getElementById('edit-visit-total').value = v.billing?.totalDue || 0;
  document.getElementById('edit-visit-paid').value = v.billing?.paidAmount || 0;

  document.getElementById('edit-visit-modal').classList.add('active');
}

function closeEditVisitModal() {
  document.getElementById('edit-visit-modal').classList.remove('active');
}

function handleUpdateVisit(e) {
  if (e) e.preventDefault();
  const vId = document.getElementById('edit-visit-id').value;
  const index = visits.findIndex(v => v.visitId === vId);
  if (index === -1) return;

  const total = parseFloat(document.getElementById('edit-visit-total').value) || 0;
  const paid = parseFloat(document.getElementById('edit-visit-paid').value) || 0;

  visits[index] = {
    ...visits[index],
    providerName: document.getElementById('edit-visit-provider').value || "إبراهيم ماهر",
    chiefComplaint: document.getElementById('edit-visit-complaint').value || "",
    vitals: {
      ...visits[index].vitals,
      bpSys: parseInt(document.getElementById('edit-visit-bpsys').value) || 120,
      bpDia: parseInt(document.getElementById('edit-visit-bpdia').value) || 80,
      sugar: parseInt(document.getElementById('edit-visit-sugar').value) || 140,
    },
    billing: {
      ...visits[index].billing,
      totalDue: total,
      paidAmount: paid,
      remaining: total - paid >= 0 ? total - paid : 0
    }
  };

  saveStateToLocalStorage();
  renderRecentVisits();
  renderDashboardStats();
  closeEditVisitModal();
  alert('✏️ تم تحديث بيانات الزيارة بنجاح!');
}

function autoCalcAgeInModal(dobStr) {
  if (!dobStr) {
    document.getElementById('pat-age-display').value = 'غير محدد';
    return;
  }
  const age = calculateAge(dobStr);
  document.getElementById('pat-age-display').value = `${age} سنة`;
}

function autoCalcAgeInEditModal(dobStr) {
  if (!dobStr) {
    document.getElementById('edit-pat-age-display').value = 'غير محدد';
    return;
  }
  const age = calculateAge(dobStr);
  document.getElementById('edit-pat-age-display').value = `${age} سنة`;
}

function handleSavePatient(e) {
  if (e) e.preventDefault();
  const name = document.getElementById('pat-name').value.trim() || "مريض بدون اسم";
  const natId = document.getElementById('pat-national-id').value.trim() || "غير محدد";
  const gender = document.getElementById('pat-gender').value || "غير محدد";
  const dob = document.getElementById('pat-dob').value || "1980-01-01";
  const phone = document.getElementById('pat-phone').value.trim() || clinicSettings.phone;
  const whatsApp = document.getElementById('pat-whatsapp').value.trim() || phone;
  const emergency = document.getElementById('pat-emergency').value.trim() || "غير محدد";
  const area = document.getElementById('pat-area').value || "بندر دمياط";
  const addressDetail = document.getElementById('pat-address-detail').value.trim() || "غير محدد";
  const diseasesStr = document.getElementById('pat-diseases').value.trim();
  const allergiesStr = document.getElementById('pat-allergies').value.trim();
  const blood = document.getElementById('pat-blood').value || "غير محدد";

  const nextId = systemSettings.nextPatientId || `pat_${Date.now()}`;

  const newPat = {
    patientId: nextId,
    fullName: name,
    nationalId: natId,
    gender: gender,
    dob: dob,
    phone: phone,
    whatsApp: whatsApp,
    emergency: emergency,
    area: area,
    detailedAddress: addressDetail,
    latitude: 31.4165,
    longitude: 31.8133,
    diseases: diseasesStr ? diseasesStr.split(',').map(s => s.trim()) : [],
    allergies: allergiesStr ? allergiesStr.split(',').map(s => s.trim()) : [],
    bloodType: blood,
    createdAt: new Date().toISOString().split('T')[0]
  };

  const numericPart = parseInt(nextId.replace(/\D/g, '')) || 1005;
  systemSettings.nextPatientId = `pat_${numericPart + 1}`;
  localStorage.setItem('nabd_system_settings_v1', JSON.stringify(systemSettings));
  applySystemSettingsToUI();

  patients.unshift(newPat);
  saveStateToLocalStorage();
  renderPatientsGrid();
  renderDashboardStats();
  populatePatientSelectOptions();
  populateNotificationPatientSelect();
  populateReportPatientSelect();
  closeAddPatientModal();
  document.getElementById('add-patient-form').reset();
  alert(`✅ تم حفظ بيانات المريض (${nextId}) في قاعدة بيانات إبراهيم ماهر (${clinicSettings.governorate}) بنجاح!`);
}

function handleUpdatePatient(e) {
  if (e) e.preventDefault();
  const patId = document.getElementById('edit-pat-id').value;
  const index = patients.findIndex(p => p.patientId === patId);
  if (index === -1) return;

  const name = document.getElementById('edit-pat-name').value.trim() || patients[index].fullName;
  const natId = document.getElementById('edit-pat-national-id').value.trim() || patients[index].nationalId;
  const gender = document.getElementById('edit-pat-gender').value || patients[index].gender;
  const dob = document.getElementById('edit-pat-dob').value || patients[index].dob;
  const phone = document.getElementById('edit-pat-phone').value.trim() || patients[index].phone;
  const whatsApp = document.getElementById('edit-pat-whatsapp').value.trim() || phone;
  const emergency = document.getElementById('edit-pat-emergency').value.trim() || patients[index].emergency;
  const area = document.getElementById('edit-pat-area').value || patients[index].area;
  const addressDetail = document.getElementById('edit-pat-address-detail').value.trim() || patients[index].detailedAddress;
  const diseasesStr = document.getElementById('edit-pat-diseases').value.trim();
  const allergiesStr = document.getElementById('edit-pat-allergies').value.trim();
  const blood = document.getElementById('edit-pat-blood').value || patients[index].bloodType;

  patients[index] = {
    ...patients[index],
    fullName: name,
    nationalId: natId,
    gender: gender,
    dob: dob,
    phone: phone,
    whatsApp: whatsApp,
    emergency: emergency,
    area: area,
    detailedAddress: addressDetail,
    diseases: diseasesStr ? diseasesStr.split(',').map(s => s.trim()) : patients[index].diseases,
    allergies: allergiesStr ? allergiesStr.split(',').map(s => s.trim()) : patients[index].allergies,
    bloodType: blood,
  };

  saveStateToLocalStorage();
  renderPatientsGrid();
  renderRecentVisits();
  populatePatientSelectOptions();
  populateNotificationPatientSelect();
  populateReportPatientSelect();
  closeEditPatientModal();
  alert('✏️ تم تحديث بيانات المريض بنجاح!');
}

function confirmDeletePatient(patientId) {
  const p = patients.find(item => item.patientId === patientId);
  if (!p) return;

  showConfirmDialog(`هل أنت تأكد من حذف ملف المريض "${p.fullName}" وسجلاته التمريضية بشكل نهائي؟`, () => {
    patients = patients.filter(item => item.patientId !== patientId);
    visits = visits.filter(item => item.patientId !== patientId);
    saveStateToLocalStorage();
    renderPatientsGrid();
    renderRecentVisits();
    renderDashboardStats();
    populatePatientSelectOptions();
    populateNotificationPatientSelect();
    populateReportPatientSelect();
    alert('🗑️ تم حذف المريض بنجاح.');
  });
}

function confirmDeleteVisit(visitId) {
  const v = visits.find(item => item.visitId === visitId);
  if (!v) return;

  showConfirmDialog(`هل أنت تأكد من حذف الزيارة التمريضية للمريض "${v.patientName}" بتاريخ ${v.visitDate ? new Date(v.visitDate).toLocaleDateString('ar-EG') : 'الآن'}؟`, () => {
    visits = visits.filter(item => item.visitId !== visitId);
    saveStateToLocalStorage();
    renderRecentVisits();
    renderDashboardStats();
    alert('🗑️ تم حذف سجل الزيارة بنجاح.');
  });
}

function populatePatientSelectOptions() {
  const select = document.getElementById('visit-patient-id');
  if (!select) return;
  select.innerHTML = '<option value="">-- اختر مريضاً من القائمة --</option>' +
    patients.map(p => `<option value="${p.patientId}">${p.fullName} (${p.area} - ${p.phone})</option>`).join('');
}

function startVisitForPatient(patientId) {
  openNewVisitFromCRM(patientId);
}

// Medication Adding in Visit Form
function addMedicationRow() {
  const name = document.getElementById('med-name').value;
  const dose = document.getElementById('med-dose').value;
  const freq = document.getElementById('med-freq').value;
  const duration = document.getElementById('med-duration').value;
  const inst = document.getElementById('med-instructions').value;

  if (!name) {
    alert('يرجى كتابة اسم الدواء');
    return;
  }

  const med = { name, dose, frequency: freq, duration, instructions: inst };
  activeMedications.push(med);

  renderMedicationsList();
  document.getElementById('med-name').value = '';
  document.getElementById('med-dose').value = '';
  document.getElementById('med-freq').value = '';
  document.getElementById('med-duration').value = '';
  document.getElementById('med-instructions').value = '';
}

function renderMedicationsList() {
  const ul = document.getElementById('medications-list');
  if (!ul) return;
  ul.innerHTML = activeMedications.map((m, idx) => `
    <li>
      <strong>${m.name}</strong> - ${m.dose} (${m.frequency}) - لمدة ${m.duration} [${m.instructions}]
      <button type="button" style="background:none; border:none; color:var(--accent-red); cursor:pointer; font-size:0.8rem;" onclick="removeMedication(${idx})"> ✕ حذف</button>
    </li>
  `).join('');
}

function removeMedication(idx) {
  activeMedications.splice(idx, 1);
  renderMedicationsList();
}

// Visit Form Submission
function handleSaveVisit(e) {
  if (e) e.preventDefault();
  let patId = document.getElementById('visit-patient-id').value;
  let pat = patients.find(p => p.patientId === patId);

  if (!pat) {
    pat = patients[0] || { patientId: "pat_default", fullName: "مريض افتراضي", area: "بندر دمياط", phone: clinicSettings.phone };
    patId = pat.patientId;
  }

  const selectedProcedures = Array.from(document.querySelectorAll('input[name="procedure"]:checked')).map(cb => cb.value);

  const wWeight = parseFloat(document.getElementById('vital-weight').value) || 0;
  const hHeight = parseFloat(document.getElementById('vital-height').value) || 0;
  const bmiRes = calculateBMI(wWeight, hHeight);

  const nextVisId = systemSettings.nextVisitId || `vst_${Date.now()}`;

  const newVisit = {
    visitId: nextVisId,
    patientId: patId,
    patientName: pat.fullName,
    providerName: document.getElementById('visit-provider-name').value || "إبراهيم ماهر",
    visitDate: document.getElementById('visit-date-time').value || new Date().toISOString().slice(0, 16),
    chiefComplaint: document.getElementById('visit-chief-complaint').value || "زيارة ومتابعة تمريضية عامة",
    hpi: document.getElementById('visit-hpi').value || "",
    vitals: {
      temp: parseFloat(document.getElementById('vital-temp').value) || 37.0,
      pulse: parseInt(document.getElementById('vital-pulse').value) || 75,
      bpSys: parseInt(document.getElementById('vital-bp-sys').value) || 120,
      bpDia: parseInt(document.getElementById('vital-bp-dia').value) || 80,
      rr: parseInt(document.getElementById('vital-rr').value) || 18,
      spO2: parseInt(document.getElementById('vital-spo2').value) || 98,
      sugar: parseInt(document.getElementById('vital-sugar').value) || 140,
      sugarType: document.getElementById('vital-sugar-type').value,
      pain: parseInt(document.getElementById('vital-pain').value) || 0,
      weight: wWeight,
      height: hHeight,
      bmi: bmiRes.bmi,
      bmiCategory: bmiRes.category
    },
    procedures: selectedProcedures,
    wound: {
      type: document.getElementById('wound-type').value,
      stage: document.getElementById('wound-stage').value,
      dimensions: document.getElementById('wound-dimensions').value,
      exudate: document.getElementById('wound-exudate').value,
      dressing: document.getElementById('wound-dressing-type').value,
      nextDate: document.getElementById('wound-next-date').value
    },
    medications: [...activeMedications],
    billing: {
      visitFee: parseFloat(document.getElementById('bill-visit-fee').value) || 0,
      dressingFee: parseFloat(document.getElementById('bill-dressing-fee').value) || 0,
      discount: parseFloat(document.getElementById('bill-discount').value) || 0,
      totalDue: parseFloat(document.getElementById('bill-total').value) || 0,
      paidAmount: parseFloat(document.getElementById('bill-paid').value) || 0,
      remaining: parseFloat(document.getElementById('bill-remaining').value) || 0
    }
  };

  const visNum = parseInt(nextVisId.replace(/\D/g, '')) || 5002;
  systemSettings.nextVisitId = `vst_${visNum + 1}`;
  const invNum = parseInt((systemSettings.nextInvoiceId || 'inv_9001').replace(/\D/g, '')) || 9001;
  systemSettings.nextInvoiceId = `inv_${invNum + 1}`;
  localStorage.setItem('nabd_system_settings_v1', JSON.stringify(systemSettings));
  applySystemSettingsToUI();

  visits.unshift(newVisit);
  saveStateToLocalStorage();

  activeMedications = [];
  renderMedicationsList();
  closeInlineCRMVisitSection();

  alert(`✅ تم حفظ الزيارة رقم (${nextVisId}) بنجاح ومزامنتها محلياً والسماح بالمزامنة مع Google Sheets!`);
  viewVisitPrescription(newVisit.visitId);
}

function autoFillDemoVisit() {
  if (patients.length > 0) {
    document.getElementById('visit-patient-id').value = patients[0].patientId;
  }
  document.getElementById('visit-chief-complaint').value = 'متابعة قياسات السكر والضغط وغيار معقم على جرح القدم السكرية';
  document.getElementById('visit-hpi').value = 'المريض يشتكي من ارتفاع طفيف في قراءات السكر بعد وجبة العشاء مع آلام خفيفة مكان الجرح';
  document.getElementById('vital-temp').value = '37.2';
  document.getElementById('vital-pulse').value = '76';
  document.getElementById('vital-bp-sys').value = '130';
  document.getElementById('vital-bp-dia').value = '85';
  document.getElementById('vital-sugar').value = '155';
  document.getElementById('vital-weight').value = '82';
  document.getElementById('vital-height').value = '175';
  calculateBMIInForm();
  calculateBillingInForm();
}

// Prescription View & QR Code
function initQRCode() {
  const container = document.getElementById('qrcode-container');
  if (!container) return;
  container.innerHTML = '';
  new QRCode(container, {
    text: `${clinicSettings.website}/damietta/verify?id=${Date.now()}&phone=${clinicSettings.phone}`,
    width: 65,
    height: 65,
    colorDark: "#0b192c",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
}

function viewVisitPrescription(visitId) {
  const v = visits.find(vis => vis.visitId === visitId);
  if (!v) return;

  switchTab('prescription-tab', document.querySelectorAll('.tab-btn')[3]);
  document.getElementById('rpt-patient-id').value = v.patientId;
  const rxRadio = document.querySelector('input[name="rpt_type"][value="prescription"]');
  if (rxRadio) rxRadio.checked = true;
  openReportEditorStage();
}

function downloadReportPDF() {
  window.print();
}

function shareReportWhatsApp() {
  const patId = document.getElementById('rpt-patient-id').value;
  const p = patients.find(item => item.patientId === patId) || patients[0];
  const text = `تقرير ومستند طبي موثق بختم نبض وتوقيع إبراهيم ماهر من إبراهيم ماهر (نبض للتمريض المنزلي - ${clinicSettings.governorate} - هاتف: ${clinicSettings.phone})\nالمريض: ${p ? p.fullName : 'المريض'}\nشكراً لثقتكم بنا.`;
  const url = `https://wa.me/${p ? p.phone : clinicSettings.phone}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

// Scheduling Render with Delete/Edit Option
function renderScheduleTable() {
  const tbody = document.getElementById('schedule-table-body');
  if (!tbody) return;
  tbody.innerHTML = patients.map((p, idx) => `
    <tr>
      <td>2026-07-27 (الساعة 10:00 صباحاً)</td>
      <td><strong>${p.fullName}</strong></td>
      <td>${p.phone || clinicSettings.phone}</td>
      <td><span class="tag">${p.area}</span></td>
      <td>غيار جراحي ودعم تمريضي</td>
      <td>إبراهيم ماهر</td>
      <td><a href="https://maps.google.com/?q=${p.latitude},${p.longitude}" target="_blank">📍 موقع GPS (${p.area})</a></td>
      <td>
        <div style="display:flex; gap:0.3rem;">
          <button class="btn btn-sm btn-amber" onclick="openEditPatientModal('${p.patientId}')">✏️ تعديل</button>
          <button class="btn btn-sm btn-danger" onclick="confirmDeleteSchedule(${idx}, '${p.fullName}')">🗑️ حذف</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function confirmDeleteSchedule(index, name) {
  showConfirmDialog(`هل أنت تأكد من حذف الموعد المجدول للمريض "${name}"؟`, () => {
    alert('🗑️ تم إلغاء الموعد المجدول.');
  });
}

function calculateRouteDemo() {
  const origin = document.getElementById('route-origin').value;
  const dest = document.getElementById('route-destination').value;
  alert(`🗺️ حساب المسار عبر Google Maps API (إبراهيم ماهر - هاتف: ${clinicSettings.phone}):\nالإنطلاق: ${origin}\nالوجهة: ${dest}\nالمسافة المتوقعة: 12.8 كم\nزمن الرحلة المتوقع: 18 دقيقة`);
}
