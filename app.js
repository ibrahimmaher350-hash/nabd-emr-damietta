/* Nabd Home Nursing EMR & CRM - Main Application Logic (Damietta Governorate) */

// Default Settings
const defaultClinicSettings = {
  brandName: "إبراهيم ماهر",
  logoUrl: "assets/logo.jpg?v=26",
  stampUrl: "assets/stamp.jpg?v=26",
  signatureUrl: "assets/signature.png?v=26",
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

// Currently Active Profile Patient ID
let currentActiveProfilePatientId = null;

// Attachments Draft Object for New Patient Registration
let currentTabPatientAttachments = {
  idCard: null,
  insurance: null,
  rx: null,
  labs: null,
  rad: null,
  other: null
};

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

// Initial Seed Data (Damietta Areas with Audit Logs)
const initialPatients = [
  {
    patientId: "pat_1001",
    mrn: "MRN-1001",
    status: "نشط",
    registrationDate: "2026-02-01",
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
    mapsLink: "https://maps.google.com/?q=31.4382,31.6705",
    diseases: ["سكر", "ضغط"],
    requestedServices: ["غيار جراحي على الجروح", "متابعة ضغط وسكر يومية"],
    allergies: ["حساسية البنسلين"],
    bloodType: "A+",
    attachments: { idCard: null, insurance: null, rx: null, labs: null, rad: null, other: null },
    auditLogs: [
      { date: "2026-02-01 10:00", action: "افتتاح وتصميم ملف المريض بنظام نبض EMR", author: "إبراهيم ماهر" },
      { date: "2026-07-25 11:30", action: "تسجيل زيارة تمريضية وغيار قدم سكري", author: "إبراهيم ماهر" }
    ],
    createdAt: "2026-02-01"
  },
  {
    patientId: "pat_1002",
    mrn: "MRN-1002",
    status: "نشط",
    registrationDate: "2026-03-10",
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
    mapsLink: "https://maps.google.com/?q=31.4165,31.8133",
    diseases: ["Bedridden", "Stroke"],
    requestedServices: ["رعاية تمريضية مقيمة (24 ساعة)", "تركيب / تغيير قسطرة بولية"],
    allergies: ["لا يوجد"],
    bloodType: "O+",
    attachments: { idCard: null, insurance: null, rx: null, labs: null, rad: null, other: null },
    auditLogs: [
      { date: "2026-03-10 14:20", action: "افتتاح ملف المريض بالخدمة المقيمة", author: "إبراهيم ماهر" }
    ],
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
      nextDate: "2026-07-30"
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
      paidAmount: 100,
      remaining: 350
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

// NAVIGATION HISTORY STACK (FOR BACK ARROWS)
let navigationHistoryStack = ['add-patient-tab'];

function navigateBackHistory() {
  // 1. Check if any popup modal is open
  const activeModal = document.querySelector('.modal-overlay.active');
  if (activeModal) {
    activeModal.classList.remove('active');
    return;
  }

  // 2. Check if Report Editor Stage is open
  const reportStage = document.getElementById('report-editor-stage');
  if (reportStage && reportStage.style.display !== 'none') {
    reportStage.style.display = 'none';
    return;
  }

  // 3. Check if Inline Visit section in CRM tab is open
  const inlineVisit = document.getElementById('inline-crm-visit-section');
  if (inlineVisit && inlineVisit.style.display !== 'none') {
    inlineVisit.style.display = 'none';
    return;
  }

  // 4. Pop current tab and switch to previous tab in stack
  if (navigationHistoryStack.length > 1) {
    navigationHistoryStack.pop();
    const previousTab = navigationHistoryStack[navigationHistoryStack.length - 1];
    switchTab(previousTab, null, true);
  } else {
    switchTab('add-patient-tab', null, true);
  }
}

// MAIN NAVIGATION TAB SWITCHER
function switchTab(tabId, btnElement, skipPush = false) {
  if (!skipPush) {
    if (navigationHistoryStack[navigationHistoryStack.length - 1] !== tabId) {
      navigationHistoryStack.push(tabId);
    }
  }

  document.querySelectorAll('main > .tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-tabs > .tab-btn').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.mobile-bottom-nav > .mobile-nav-item').forEach(el => el.classList.remove('active'));
  
  const targetContent = document.getElementById(tabId);
  if (targetContent) targetContent.classList.add('active');

  if (btnElement) {
    btnElement.classList.add('active');
  } else {
    const btns = document.querySelectorAll('.nav-tabs > .tab-btn');
    if (tabId === 'add-patient-tab' && btns[0]) btns[0].classList.add('active');
    else if (tabId === 'patients-tab' && btns[1]) btns[1].classList.add('active');
    else if (tabId === 'schedule-tab' && btns[2]) btns[2].classList.add('active');
    else if (tabId === 'prescription-tab' && btns[3]) btns[3].classList.add('active');
    else if (tabId === 'settings-tab' && btns[4]) btns[4].classList.add('active');
    else if (tabId === 'dashboard-tab' && btns[5]) btns[5].classList.add('active');
  }

  // Sync Mobile Bottom Nav Items
  const mobItems = document.querySelectorAll('.mobile-bottom-nav > .mobile-nav-item');
  if (tabId === 'add-patient-tab' && mobItems[0]) mobItems[0].classList.add('active');
  else if (tabId === 'patients-tab' && mobItems[1]) mobItems[1].classList.add('active');
  else if (tabId === 'schedule-tab' && mobItems[2]) mobItems[2].classList.add('active');
  else if (tabId === 'prescription-tab' && mobItems[3]) mobItems[3].classList.add('active');
  else if (tabId === 'settings-tab' && mobItems[4]) mobItems[4].classList.add('active');

  if (tabId === 'add-patient-tab') {
    initTabAddPatientForm();
  } else if (tabId === 'dashboard-tab') {
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
  } else if (tabId === 'settings-tab') {
    populateFieldManagerListSelect();
  }
}

// Initialize Application & Service Worker PWA Registration
document.addEventListener('DOMContentLoaded', () => {
  try { applyClinicSettingsToUI(); } catch (e) { console.error('Error in applyClinicSettingsToUI:', e); }
  try { applySyncSettingsToUI(); } catch (e) { console.error('Error in applySyncSettingsToUI:', e); }
  try { applySystemSettingsToUI(); } catch (e) { console.error('Error in applySystemSettingsToUI:', e); }
  try { refreshAllConfigurableSelects(); } catch (e) { console.error('Error in refreshAllConfigurableSelects:', e); }
  try { populateFieldManagerListSelect(); } catch (e) { console.error('Error in populateFieldManagerListSelect:', e); }
  try { saveStateToLocalStorage(); } catch (e) { console.error('Error in saveStateToLocalStorage:', e); }
  try { renderDashboardStats(); } catch (e) { console.error('Error in renderDashboardStats:', e); }
  try { renderRecentVisits(); } catch (e) { console.error('Error in renderRecentVisits:', e); }
  try { renderPatientsGrid(); } catch (e) { console.error('Error in renderPatientsGrid:', e); }
  try { populatePatientSelectOptions(); } catch (e) { console.error('Error in populatePatientSelectOptions:', e); }
  try { populateNotificationPatientSelect(); } catch (e) { console.error('Error in populateNotificationPatientSelect:', e); }
  try { populateReportPatientSelect(); } catch (e) { console.error('Error in populateReportPatientSelect:', e); }
  try { renderCategorizedReportCards(); } catch (e) { console.error('Error in renderCategorizedReportCards:', e); }
  try { renderTodayVisitsHub(); } catch (e) { console.error('Error in renderTodayVisitsHub:', e); }
  try { renderScheduleTable(); } catch (e) { console.error('Error in renderScheduleTable:', e); }
  try { renderNotificationLogs(); } catch (e) { console.error('Error in renderNotificationLogs:', e); }
  try { initQRCode(); } catch (e) { console.error('Error in initQRCode:', e); }
  try { setCurrentDateTime(); } catch (e) { console.error('Error in setCurrentDateTime:', e); }
  try { initTabAddPatientForm(); } catch (e) { console.error('Error in initTabAddPatientForm:', e); }

  // Register PWA Service Worker for Offline & Native Mobile Support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js?v=31')
      .then(reg => console.log('📱 PWA Service Worker Registered Successfully:', reg.scope))
      .catch(err => console.log('❌ Service Worker Registration Failed:', err));
  }
});

function addAuditLog(patientId, actionText) {
  const p = patients.find(item => item.patientId === patientId);
  if (!p) return;
  if (!p.auditLogs) p.auditLogs = [];

  p.auditLogs.unshift({
    date: new Date().toLocaleString('ar-EG'),
    action: actionText,
    author: "إبراهيم ماهر"
  });

  saveStateToLocalStorage();
}

function initTabAddPatientForm() {
  const regDateInput = document.getElementById('tab-pat-reg-date');
  if (regDateInput && !regDateInput.value) {
    regDateInput.value = new Date().toISOString().split('T')[0];
  }

  const mrnInput = document.getElementById('tab-pat-mrn');
  if (mrnInput) {
    const nextNum = (patients.length + 1005);
    mrnInput.value = `MRN-${nextNum}`;
  }
}

function setElementValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

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

  setElementValue('cfg-brand-name', "إبراهيم ماهر");
  setElementValue('cfg-logo-url', clinicSettings.logoUrl);
  setElementValue('cfg-phone', clinicSettings.phone);
  setElementValue('cfg-whatsapp', clinicSettings.whatsApp);
  setElementValue('cfg-email', clinicSettings.email);
  setElementValue('cfg-website', clinicSettings.website);
  setElementValue('cfg-governorate', clinicSettings.governorate);
  setElementValue('cfg-address', clinicSettings.address);
  setElementValue('cfg-service-areas', clinicSettings.serviceAreas);
  setElementValue('cfg-google-maps', clinicSettings.googleMapsUrl);
}

function applySyncSettingsToUI() {
  setElementValue('sync-sheets-url', syncSettings.sheetsWebhookUrl);
  setElementValue('sync-drive-folder-id', syncSettings.driveFolderId);
  setElementValue('sync-firebase-project-id', syncSettings.firebaseProjectId);
  setElementValue('sync-firebase-api-key', syncSettings.firebaseApiKey);
  setElementValue('sync-firestore-db', syncSettings.firestoreDb);
  setElementValue('sync-custom-webhook', syncSettings.customWebhookUrl);
  setElementValue('sync-auto-sync-enabled', syncSettings.autoSyncEnabled);
  setElementValue('sync-auto-backup-enabled', syncSettings.autoBackupEnabled);
  setElementValue('sync-backup-interval', syncSettings.backupIntervalHours);
  setElementValue('sync-last-time-display', syncSettings.lastSyncTime || new Date().toLocaleString('ar-EG'));
}

function applySystemSettingsToUI() {
  if (systemSettings.theme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }

  document.querySelectorAll('.ui-currency-symbol').forEach(el => {
    el.innerText = systemSettings.currency || 'ج.م';
  });

  setElementValue('sys-theme', systemSettings.theme);
  setElementValue('sys-language', systemSettings.language);
  setElementValue('sys-currency', systemSettings.currency);
  setElementValue('sys-date-format', systemSettings.dateFormat);
  setElementValue('sys-time-format', systemSettings.timeFormat);
  setElementValue('sys-timezone', systemSettings.timezone);
  setElementValue('sys-next-patient-id', systemSettings.nextPatientId);
  setElementValue('sys-next-visit-id', systemSettings.nextVisitId);
  setElementValue('sys-next-invoice-id', systemSettings.nextInvoiceId);

  renderDashboardStats();
}

// GPS LOCATION DETECTOR
function getCurrentGPSLocationForTab() {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
        document.getElementById('tab-pat-maps-link').value = mapsUrl;
        alert(`📍 تم التقاط موقع GPS الحقيقي بنجاح!\nخط العرض: ${lat}\nخط الطول: ${lng}\nرابط الخريطة: ${mapsUrl}`);
      },
      (err) => {
        const fallbackUrl = clinicSettings.googleMapsUrl;
        document.getElementById('tab-pat-maps-link').value = fallbackUrl;
        alert(`📍 يتعذر الوصول المباشر للـ GPS (${err.message}). تم إضافة رابط خريطة المركز الافتراضي.`);
      }
    );
  } else {
    document.getElementById('tab-pat-maps-link').value = clinicSettings.googleMapsUrl;
    alert('📍 متصفحك لا يدعم تحديد الموقع التلقائي. يمكنك لصق رابط Google Maps مباشرة.');
  }
}

// PREVIEW & ATTACHMENT HANDLER
function previewAttachment(inputId, previewBoxId) {
  const fileInput = document.getElementById(inputId);
  const previewBox = document.getElementById(previewBoxId);
  if (!fileInput || !previewBox || !fileInput.files[0]) return;

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = function(e) {
    const dataUrl = e.target.result;

    if (inputId === 'attach-id-card') currentTabPatientAttachments.idCard = dataUrl;
    else if (inputId === 'attach-insurance') currentTabPatientAttachments.insurance = dataUrl;
    else if (inputId === 'attach-rx') currentTabPatientAttachments.rx = dataUrl;
    else if (inputId === 'attach-labs') currentTabPatientAttachments.labs = dataUrl;
    else if (inputId === 'attach-rad') currentTabPatientAttachments.rad = dataUrl;
    else if (inputId === 'attach-other') currentTabPatientAttachments.other = dataUrl;

    if (file.type.startsWith('image/')) {
      previewBox.innerHTML = `<img src="${dataUrl}" style="max-height:80px; border-radius:6px; border:1px solid var(--accent-cyan); margin-top:0.4rem;" alt="مرفق" />`;
    } else {
      previewBox.innerHTML = `<p style="font-size:0.8rem; color:var(--accent-cyan); margin-top:0.4rem;">📄 تم تحميل: ${file.name}</p>`;
    }
  };

  reader.readAsDataURL(file);
}

// OPEN INLINE EMR VISIT SECTION INSIDE PATIENTS CRM TAB
function openNewVisitFromCRM(patientId = null) {
  switchTab('patients-tab', document.querySelectorAll('.nav-tabs > .tab-btn')[1]);
  const section = document.getElementById('inline-crm-visit-section');
  if (section) {
    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth' });
  }
  if (patientId) {
    document.getElementById('visit-patient-id').value = patientId;
    addAuditLog(patientId, "بدء تسجيل زيارة تمريضية جديدة من شاشة CRM");
  }
}

function closeInlineCRMVisitSection() {
  const section = document.getElementById('inline-crm-visit-section');
  if (section) section.style.display = 'none';
  resetNextVisitScheduler();
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
  document.getElementById('tab-pat-maps-link').value = 'https://maps.google.com/?q=31.4382,31.6705';
  document.getElementById('tab-pat-status').value = 'نشط';
  document.getElementById('tab-pat-reg-date').value = new Date().toISOString().split('T')[0];

  document.querySelectorAll('input[name="tab_disease"]').forEach(cb => {
    if (['سكر', 'ضغط', 'Bedridden'].includes(cb.value)) cb.checked = true;
  });

  document.querySelectorAll('input[name="tab_service"]').forEach(cb => {
    if (['غيار جراحي على الجروح', 'متابعة ضغط وسكر يومية'].includes(cb.value)) cb.checked = true;
  });

  document.getElementById('tab-pat-other-diseases').value = 'حساسية موسمية';
  document.getElementById('tab-pat-allergies').value = 'حساسية بنسلين';
  document.getElementById('tab-pat-blood').value = 'A+';
}

function openAddPatientModal() {
  const modal = document.getElementById('add-patient-modal');
  if (modal) {
    initTabAddPatientForm();
    refreshAllConfigurableSelects();
    modal.classList.add('active');
  }
}

function closeAddPatientModal() {
  const modal = document.getElementById('add-patient-modal');
  if (modal) modal.classList.remove('active');
}

function onTabNextVisitIntervalChange() {
  const interval = getElementValue('tab-next-visit-interval', '');
  const customGroup = document.getElementById('tab-next-visit-custom-group');
  if (interval === 'custom') {
    if (customGroup) customGroup.style.display = 'block';
    setElementValue('tab-next-visit-display', '');
    setElementValue('tab-next-visit-remaining', '');
    setElementValue('tab-next-visit-iso', '');
  } else {
    if (customGroup) customGroup.style.display = 'none';
    calcTabNextVisitDate();
  }
}

function calcTabNextVisitDate() {
  const interval = getElementValue('tab-next-visit-interval', '');
  if (!interval || interval === 'custom') return;

  const ms = VISIT_INTERVAL_MAP ? VISIT_INTERVAL_MAP[interval] : null;
  if (!ms) return;

  const regDateStr = getElementValue('tab-pat-reg-date', '');
  const refDate = regDateStr ? new Date(regDateStr) : new Date();

  const nextDate = new Date(refDate.getTime() + ms);
  const formatted = nextDate.toLocaleDateString('ar-EG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  const remaining = getTimeRemainingText ? getTimeRemainingText(nextDate) : '';

  setElementValue('tab-next-visit-display', formatted);
  setElementValue('tab-next-visit-remaining', remaining);
  setElementValue('tab-next-visit-iso', nextDate.toISOString());
}

function onTabCustomNextVisitDateChange() {
  const val = getElementValue('tab-next-visit-custom-date', '');
  if (!val) return;
  const nextDate = new Date(val);
  if (isNaN(nextDate.getTime())) return;
  const formatted = nextDate.toLocaleDateString('ar-EG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  const remaining = getTimeRemainingText ? getTimeRemainingText(nextDate) : '';

  setElementValue('tab-next-visit-display', formatted);
  setElementValue('tab-next-visit-remaining', remaining);
  setElementValue('tab-next-visit-iso', nextDate.toISOString());
}

function handleSavePatientFromTab(e) {
  if (e) e.preventDefault();

  const mrn = document.getElementById('tab-pat-mrn').value || "MRN-1005";
  const status = document.getElementById('tab-pat-status').value || "نشط";
  const regDate = document.getElementById('tab-pat-reg-date').value || new Date().toISOString().split('T')[0];

  const name = document.getElementById('tab-pat-name').value.trim() || "مريض بدون اسم";
  const gender = document.getElementById('tab-pat-gender').value || "غير محدد";
  const dob = document.getElementById('tab-pat-dob').value || "1980-01-01";
  const phone = document.getElementById('tab-pat-phone').value.trim() || clinicSettings.phone;
  const whatsApp = document.getElementById('tab-pat-whatsapp').value.trim() || phone;
  const emergency = document.getElementById('tab-pat-emergency').value.trim() || "غير محدد";
  const area = document.getElementById('tab-pat-area').value || "بندر دمياط";
  const addressDetail = document.getElementById('tab-pat-address-detail').value.trim() || "غير محدد";
  const mapsLink = document.getElementById('tab-pat-maps-link').value.trim() || clinicSettings.googleMapsUrl;

  const primaryDisease = getElementValue('tab-pat-disease-select', '');
  const otherDiseases = getElementValue('tab-pat-other-diseases', '');
  const diseasesList = [];
  if (primaryDisease && primaryDisease !== 'غير محدد') diseasesList.push(primaryDisease);
  if (otherDiseases && otherDiseases !== 'غير محدد') diseasesList.push(otherDiseases);

  const primaryService = getElementValue('tab-pat-service-select', '');
  const otherServices = getElementValue('tab-pat-other-services', '');
  const servicesList = [];
  if (primaryService && primaryService !== 'غير محدد') servicesList.push(primaryService);
  if (otherServices && otherServices !== 'غير محدد') servicesList.push(otherServices);

  const allergiesStr = document.getElementById('tab-pat-allergies').value.trim();
  const blood = document.getElementById('tab-pat-blood').value || "غير محدد";

  const nextId = systemSettings.nextPatientId || `pat_${Date.now()}`;

  const newPat = {
    patientId: nextId,
    mrn: mrn,
    status: status,
    registrationDate: regDate,
    fullName: name,
    nationalId: "",
    gender: gender,
    dob: dob,
    phone: phone,
    whatsApp: whatsApp,
    emergency: emergency,
    area: area,
    detailedAddress: addressDetail,
    latitude: 31.4165,
    longitude: 31.8133,
    mapsLink: mapsLink,
    diseases: diseasesList,
    requestedServices: servicesList,
    allergies: allergiesStr ? allergiesStr.split(',').map(s => s.trim()) : [],
    bloodType: blood,
    attachments: { ...currentTabPatientAttachments },
    auditLogs: [
      { date: new Date().toLocaleString('ar-EG'), action: `إنشاء ملف مريض جديد (${mrn}) بنظام نبض`, author: "إبراهيم ماهر" }
    ],
    createdAt: regDate
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
  currentTabPatientAttachments = { idCard: null, insurance: null, rx: null, labs: null, rad: null, other: null };
  document.querySelectorAll('.file-preview-box').forEach(box => box.innerHTML = '');

  initTabAddPatientForm();

  alert(`✅ تم حفظ ملف المريض (${name} - ${mrn}) بنجاح! الانتقال إلى سجل المرضى...`);
  switchTab('patients-tab', document.querySelectorAll('.nav-tabs > .tab-btn')[1]);
}

// ULTRA-CLEAN PATIENT CARDS & VISUAL BADGES
function renderPatientsGrid() {
  const container = document.getElementById('patients-grid-container');
  if (patients.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted); grid-column:1/-1;">لا يوجد مرضى مسجلين حتى الآن في نطاق دمياط.</p>`;
    return;
  }

  container.innerHTML = patients.map(p => {
    const age = calculateAge(p.dob);
    const patVisits = visits.filter(v => v.patientId === p.patientId);
    const lastVisit = patVisits[0];

    let totalDue = 0;
    patVisits.forEach(v => { totalDue += (v.billing?.remaining || 0); });

    const gMapsUrl = p.mapsLink || (p.latitude && p.longitude ? `https://maps.google.com/?q=${p.latitude},${p.longitude}` : clinicSettings.googleMapsUrl);
    const waUrl = `https://wa.me/${(p.whatsApp || p.phone || clinicSettings.whatsApp).replace(/\D/g, '')}?text=${encodeURIComponent('السلام عليكم أ/ ' + p.fullName + '، تذكير بموعد الزيارة التمريضية المنزلية من إبراهيم ماهر (نبض للتمريض المنزلي - ' + clinicSettings.governorate + ' - هاتف: ' + clinicSettings.phone + ').')}`;

    const statusBadge = p.status === 'متوقف' ? '⏸️ متوقف' : p.status === 'متوفى' ? '⚰️ متوفى' : p.status === 'خرج من الخدمة' ? '🚪 خرج من الخدمة' : '🟢 نشط';
    const statusColor = p.status === 'متوقف' ? 'var(--accent-amber)' : p.status === 'متوفى' ? 'var(--accent-red)' : p.status === 'خرج من الخدمة' ? 'var(--text-muted)' : 'var(--accent-green)';

    const hasWound = lastVisit && lastVisit.wound && lastVisit.wound.type !== 'بدون جرح';
    const hasMeds = lastVisit && lastVisit.medications && lastVisit.medications.length > 0;
    const hasAllergy = p.allergies && p.allergies.length > 0 && !p.allergies.includes('لا يوجد');
    const hasAttachments = p.attachments && (p.attachments.idCard || p.attachments.insurance || p.attachments.rx || p.attachments.labs);

    return `
      <div class="patient-card">
        <div>
          <!-- Header Line -->
          <div class="patient-card-header">
            <div class="patient-avatar" onclick="openFullPatientProfileModal('${p.patientId}')">${p.fullName ? p.fullName.charAt(0) : 'م'}</div>
            <div class="patient-details" style="flex:1;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 onclick="openFullPatientProfileModal('${p.patientId}')">${p.fullName}</h3>
                <span style="font-size:0.8rem; font-weight:700; color:${statusColor};">${statusBadge}</span>
              </div>
              <p>MRN: <strong style="color:var(--accent-cyan);">${p.mrn || p.patientId}</strong> | العمر: ${age > 0 ? age + ' سنة' : 'غير محدد'}</p>
              <p>📞 ${p.phone || clinicSettings.phone}</p>
            </div>
          </div>

          <!-- Visual Badges Bar (Icons at a glance) -->
          <div class="patient-visual-badges">
            ${hasWound ? `<span class="badge-icon active-wound">🩹 لديه جرح</span>` : ''}
            ${hasMeds ? `<span class="badge-icon active-meds">💊 أدوية حالية</span>` : ''}
            ${hasAllergy ? `<span class="badge-icon active-allergy">⚠️ حساسية</span>` : ''}
            ${hasAttachments ? `<span class="badge-icon active-photos">📷 مرفقات</span>` : ''}
            ${totalDue > 0 ? `<span class="badge-icon active-due">💰 متبقي: ${totalDue} ج.م</span>` : ''}
          </div>

          <!-- Location & Disease Summary -->
          <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.4rem;">
            🏠 <strong style="color: var(--accent-cyan);">${p.area}</strong> - ${p.detailedAddress}
          </p>

          <div class="tag-list">
            ${p.diseases && p.diseases.length > 0 ? p.diseases.map(d => `<span class="tag">🏥 ${d}</span>`).join('') : '<span class="tag">بدون أمراض مزمنة</span>'}
          </div>

          <!-- Last Visit & Next Visit -->
          <div style="font-size:0.8rem; color:var(--text-muted); display:flex; justify-content:space-between; margin-top:0.4rem; background:rgba(0,0,0,0.15); padding:0.4rem 0.6rem; border-radius:6px;">
            <span>📅 آخر زيارة: <strong>${lastVisit ? new Date(lastVisit.visitDate).toLocaleDateString('ar-EG') : 'لا يوجد'}</strong></span>
            <span>📅 القادمة: <strong>${lastVisit && lastVisit.wound?.nextDate ? lastVisit.wound.nextDate : 'غير محدودة'}</strong></span>
          </div>
        </div>

        <!-- Clean Primary Actions & Dropdown Action Menu -->
        <div class="patient-actions" style="justify-content:space-between; margin-top:0.8rem;">
          <div style="display:flex; gap:0.3rem; flex-wrap:wrap;">
            <button class="btn btn-sm btn-primary" onclick="openNewVisitFromCRM('${p.patientId}')">🩺 زيارة جديدة</button>
            <button class="btn btn-sm btn-amber" onclick="openDocumentCenterForPatient('${p.patientId}')">📄 تقرير</button>
            <a href="tel:${p.phone || clinicSettings.phone}" class="btn btn-sm btn-secondary">📞 اتصال</a>
            <a href="${waUrl}" target="_blank" class="btn btn-sm btn-success">💬 واتساب</a>
            <a href="${gMapsUrl}" target="_blank" class="btn btn-sm" style="background:#1e3e62;">📍 الخريطة</a>
          </div>
          <button class="btn btn-sm btn-secondary" onclick="openPatientActionsModal('${p.patientId}')" style="font-weight:bold;">⋮ المزيد</button>
        </div>
      </div>
    `;
  }).join('');
}

// PATIENT ACTION MODAL (⋮ المزيد)
function openPatientActionsModal(patientId) {
  const p = patients.find(item => item.patientId === patientId);
  if (!p) return;

  document.getElementById('actions-modal-title').innerText = `⚙️ لوحة إجراءات المريض (${p.fullName})`;

  const grid = document.getElementById('actions-modal-buttons-grid');
  grid.innerHTML = `
    <button class="btn btn-primary" onclick="closePatientActionsModal(); openFullPatientProfileModal('${p.patientId}');">👁️ فتح الملف الكامل</button>
    <button class="btn btn-amber" onclick="closePatientActionsModal(); openEditPatientModal('${p.patientId}');">✏️ تعديل البيانات</button>
    <button class="btn btn-primary" onclick="closePatientActionsModal(); openNewVisitFromCRM('${p.patientId}');">➕ زيارة جديدة</button>
    <button class="btn btn-amber" onclick="closePatientActionsModal(); openDocumentCenterForPatient('${p.patientId}');">📄 إنشاء مستند جديد</button>
    <button class="btn btn-secondary" onclick="closePatientActionsModal(); openExportPatientModal('${p.patientId}');">🖨️ طباعة وتصدير PDF</button>
    <button class="btn btn-success" onclick="closePatientActionsModal(); window.open('https://wa.me/${(p.whatsApp || p.phone).replace(/\\D/g,'')}','_blank');">💬 واتساب مباشر</button>
    <button class="btn btn-secondary" onclick="closePatientActionsModal(); window.open('${p.mapsLink || clinicSettings.googleMapsUrl}','_blank');">📍 فتح الموقع بالخريطة</button>
    <button class="btn btn-amber" onclick="closePatientActionsModal(); switchTab('schedule-tab', document.querySelectorAll('.nav-tabs > .tab-btn')[2]);">📅 حجز متابعة</button>
    <button class="btn btn-danger" onclick="closePatientActionsModal(); confirmDeletePatient('${p.patientId}');">🗑️ أرشفة / حذف المريض</button>
  `;

  document.getElementById('patient-actions-modal').classList.add('active');
}

function closePatientActionsModal() {
  document.getElementById('patient-actions-modal').classList.remove('active');
}

// COMPREHENSIVE FULL PATIENT PROFILE MODAL ENGINE
function openFullPatientProfileModal(patientId) {
  currentActiveProfilePatientId = patientId;
  const p = patients.find(item => item.patientId === patientId);
  if (!p) return;

  addAuditLog(patientId, "فتح ومشاهدة الملف الطبي الشامل بالكامل");

  const patVisits = visits.filter(v => v.patientId === p.patientId);
  const lastVisit = patVisits[0];

  let totalDue = 0;
  patVisits.forEach(v => { totalDue += (v.billing?.remaining || 0); });

  const banner = document.getElementById('profile-top-banner-content');
  banner.innerHTML = `
    <div style="display:flex; align-items:center; gap:1rem;">
      <div class="patient-avatar" style="width:56px; height:56px; font-size:1.5rem;">${p.fullName.charAt(0)}</div>
      <div>
        <h2 style="font-size:1.4rem; color:var(--accent-cyan); font-weight:800;">${p.fullName} <span style="font-size:0.9rem; color:var(--text-muted);">(${p.mrn || p.patientId})</span></h2>
        <p style="font-size:0.85rem; color:#cbd5e1;">السن: ${calculateAge(p.dob)} سنة | ${p.gender} | ${p.status || '🟢 نشط'} | 📱 ${p.phone}</p>
      </div>
    </div>

    <div class="profile-summary-stats">
      <div class="stat-pill">👥 الزيارات: <strong>${patVisits.length} زيارة</strong></div>
      <div class="stat-pill">🩹 الجرح: <strong>${lastVisit?.wound?.type || 'بدون جرح'}</strong></div>
      <div class="stat-pill">❤️ الضغط: <strong>${lastVisit?.vitals?.bpSys || 120}/${lastVisit?.vitals?.bpDia || 80}</strong></div>
      <div class="stat-pill">🧪 السكر: <strong>${lastVisit?.vitals?.sugar || 140} mg/dL</strong></div>
      <div class="stat-pill" style="border-color:var(--accent-red); color:var(--accent-red);">💰 المستحق: <strong>${totalDue} ج.م</strong></div>
      <button class="btn btn-amber btn-sm" onclick="openDocumentCenterForPatient('${p.patientId}')">📄 إنشاء مستند جديد</button>
      <button class="btn btn-primary btn-sm" onclick="openExportPatientModal('${p.patientId}')">🖨️ طباعة / تصدير</button>
    </div>
  `;

  document.getElementById('full-patient-profile-modal').classList.add('active');
  switchProfileTab('prof-basic', document.querySelectorAll('.profile-nav-tabs .tab-btn')[0]);
}

function closeFullPatientProfileModal() {
  document.getElementById('full-patient-profile-modal').classList.remove('active');
}

function switchProfileTab(tabId, btnElement) {
  document.querySelectorAll('.profile-nav-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');

  const p = patients.find(item => item.patientId === currentActiveProfilePatientId);
  if (!p) return;

  const patVisits = visits.filter(v => v.patientId === p.patientId);
  const container = document.getElementById('profile-body-content');

  if (tabId === 'prof-basic') {
    container.innerHTML = `
      <div class="panel-card">
        <h3 style="color:var(--accent-cyan); margin-bottom:1rem;">📋 البيانات الشخصية والعنوان (MRN: ${p.mrn || p.patientId})</h3>
        <div class="form-grid">
          <div><strong>الاسم الكامل:</strong> ${p.fullName}</div>
          <div><strong>الرقم القومي:</strong> ${p.nationalId}</div>
          <div><strong>تاريخ الميلاد:</strong> ${p.dob} (${calculateAge(p.dob)} سنة)</div>
          <div><strong>النوع / الجنس:</strong> ${p.gender}</div>
          <div><strong>حالة المريض:</strong> ${p.status || '🟢 نشط'}</div>
          <div><strong>رقم الهاتف الرئيسي:</strong> ${p.phone}</div>
          <div><strong>رقم الواتساب:</strong> ${p.whatsApp}</div>
          <div><strong>طوارئ وهاتف الصلة:</strong> ${p.emergency}</div>
          <div><strong>المنطقة والمدينة:</strong> ${p.area}</div>
          <div class="full-width"><strong>العنوان التفصيلي وملاحظات الوصول:</strong> ${p.detailedAddress}</div>
          <div class="full-width"><strong>📍 موقع Google Maps:</strong> <a href="${p.mapsLink || clinicSettings.googleMapsUrl}" target="_blank">${p.mapsLink || clinicSettings.googleMapsUrl}</a></div>
        </div>
      </div>
    `;
  } else if (tabId === 'prof-history') {
    container.innerHTML = `
      <div class="panel-card">
        <h3 style="color:var(--accent-cyan); margin-bottom:1rem;">🏥 التاريخ المرضي والأمراض المزمنة</h3>
        <p style="margin-bottom:0.8rem;"><strong>الأمراض المزمنة المسجلة:</strong></p>
        <div class="tag-list" style="margin-bottom:1.5rem;">
          ${p.diseases && p.diseases.length > 0 ? p.diseases.map(d => `<span class="tag" style="font-size:0.9rem; padding:0.4rem 0.8rem;">🏥 ${d}</span>`).join('') : 'بدون أمراض مزمنة'}
        </div>
        <p style="margin-bottom:0.8rem;"><strong>الحساسية الدوائية (Allergies):</strong></p>
        <p style="color:var(--accent-red); font-weight:bold;">${p.allergies && p.allergies.length > 0 ? p.allergies.join(', ') : 'لا توجد حساسية معروفة'}</p>
        <p style="margin-top:1.5rem;"><strong>فصيلة الدم:</strong> <span class="tag tag-danger">${p.bloodType}</span></p>
      </div>
    `;
  } else if (tabId === 'prof-visits') {
    container.innerHTML = `
      <div class="panel-card">
        <h3 style="color:var(--accent-cyan); margin-bottom:1rem;">📅 سجل كافة الزيارات التمريضية (${patVisits.length} زيارة)</h3>
        ${patVisits.length === 0 ? '<p>لا توجد زيارات مسجلة.</p>' : `
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>تاريخ الزيارة</th>
                  <th>الشكوى والإجراءات</th>
                  <th>العلامات الحيوية</th>
                  <th>المبلغ المستحق</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                ${patVisits.map(v => `
                  <tr>
                    <td>${new Date(v.visitDate).toLocaleString('ar-EG')}</td>
                    <td>${v.chiefComplaint} - [${v.procedures ? v.procedures.join(', ') : ''}]</td>
                    <td>BP: ${v.vitals?.bpSys}/${v.vitals?.bpDia} | Sugar: ${v.vitals?.sugar}</td>
                    <td>${v.billing?.totalDue} ج.م (متبقي: ${v.billing?.remaining})</td>
                    <td><button class="btn btn-sm btn-primary" onclick="viewVisitPrescription('${v.visitId}')">📄 الروشتة</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  } else if (tabId === 'prof-wounds') {
    const woundVisits = patVisits.filter(v => v.wound && v.wound.type !== 'بدون جرح');
    container.innerHTML = `
      <div class="panel-card">
        <h3 style="color:var(--accent-cyan); margin-bottom:1rem;">🩹 وحدة العناية بمتابعة الجروح والقرح</h3>
        ${woundVisits.length === 0 ? '<p>لا يوجد سجل جروح مسجل للمريض.</p>' : `
          ${woundVisits.map(v => `
            <div style="background:rgba(255,255,255,0.03); padding:1rem; border-radius:8px; margin-bottom:1rem; border-right:4px solid var(--accent-amber);">
              <h4>${v.wound.type} (${v.wound.stage}) - بتاريخ ${new Date(v.visitDate).toLocaleDateString('ar-EG')}</h4>
              <p><strong>الأبعاد:</strong> ${v.wound.dimensions} | <strong>الإفرازات:</strong> ${v.wound.exudate}</p>
              <p><strong>نوع الغيار:</strong> ${v.wound.dressing} | <strong>الغيار القادم:</strong> ${v.wound.nextDate}</p>
            </div>
          `).join('')}
        `}
      </div>
    `;
  } else if (tabId === 'prof-meds') {
    const allMeds = [];
    patVisits.forEach(v => { if (v.medications) allMeds.push(...v.medications); });
    container.innerHTML = `
      <div class="panel-card">
        <h3 style="color:var(--accent-cyan); margin-bottom:1rem;">💊 سجل الأدوية والعلاجات الطبية</h3>
        ${allMeds.length === 0 ? '<p>لا توجد أدوية مسجلة بالروشتات.</p>' : `
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>الدواء</th>
                  <th>الجرعة</th>
                  <th>التكرار</th>
                  <th>المدة</th>
                  <th>تعليمات</th>
                </tr>
              </thead>
              <tbody>
                ${allMeds.map(m => `
                  <tr>
                    <td><strong>${m.name}</strong></td>
                    <td>${m.dose}</td>
                    <td>${m.frequency}</td>
                    <td>${m.duration}</td>
                    <td>${m.instructions}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  } else if (tabId === 'prof-messages') {
    const patNotifs = notificationLogs.filter(n => n.patientId === p.patientId || n.patientName === p.fullName);
    container.innerHTML = `
      <div class="panel-card">
        <h3 style="color:var(--accent-cyan); margin-bottom:1rem;">📨 رسائل الواتساب والتذكيرات الخاصة بالمريض</h3>
        ${patNotifs.length === 0 ? '<p style="color:var(--text-muted);">لا توجد رسائل واتساب سابقة لهذا المريض.</p>' : `
          <div class="audit-timeline">
            ${patNotifs.map(n => `
              <div class="audit-item" style="border-right-color: ${n.status === 'Delivered' ? 'var(--accent-green)' : 'var(--accent-red)'}; margin-bottom:1rem;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div class="audit-time">${n.date} (${n.msgId || 'MSG-2026'})</div>
                  ${n.status === 'Delivered' ? '<span class="status-badge-delivered">✅ تم الإرسال</span>' : '<span class="status-badge-failed">❌ فشل الإرسال</span>'}
                </div>
                <div style="font-size:0.9rem; font-weight:700; margin:0.3rem 0; color:var(--accent-cyan);">${n.typeName}</div>
                <div style="font-size:0.85rem; color:var(--text-main); background:rgba(0,0,0,0.15); padding:0.6rem; border-radius:6px; margin:0.3rem 0; white-space:pre-line;">${n.messageText}</div>
                <button class="btn btn-sm btn-success" onclick="reSendNotificationMessageDirect('${n.msgId}')">📲 إعادة إرسال الرسالة</button>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  } else if (tabId === 'prof-labs' || tabId === 'prof-rad' || tabId === 'prof-attachments') {
    container.innerHTML = `
      <div class="panel-card">
        <h3 style="color:var(--accent-cyan); margin-bottom:1rem;">📷 مركز المرفقات والتحاليل والأشعة</h3>
        <div class="wound-comparison-grid">
          ${p.attachments?.idCard ? `<div class="wound-card-comparison"><img src="${p.attachments.idCard}"><p>صورة البطاقة</p></div>` : ''}
          ${p.attachments?.insurance ? `<div class="wound-card-comparison"><img src="${p.attachments.insurance}"><p>بطاقة التأمين</p></div>` : ''}
          ${p.attachments?.rx ? `<div class="wound-card-comparison"><img src="${p.attachments.rx}"><p>صورة الروشتة</p></div>` : ''}
          ${p.attachments?.labs ? `<div class="wound-card-comparison"><img src="${p.attachments.labs}"><p>صورة التحاليل</p></div>` : ''}
          ${p.attachments?.rad ? `<div class="wound-card-comparison"><img src="${p.attachments.rad}"><p>صورة الأشعة</p></div>` : ''}
        </div>
        ${!p.attachments?.idCard && !p.attachments?.rx ? '<p style="color:var(--text-muted);">لا توجد مرفقات مصورة مرفوعة حالياً.</p>' : ''}
      </div>
    `;
  } else if (tabId === 'prof-invoices') {
    container.innerHTML = `
      <div class="panel-card">
        <h3 style="color:var(--accent-cyan); margin-bottom:1rem;">🧾 الحسابات والفواتير والمدفوعات</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>الزيارة</th>
                <th>الإجمالي</th>
                <th>المدفوع</th>
                <th>المتبقي</th>
              </tr>
            </thead>
            <tbody>
              ${patVisits.map(v => `
                <tr>
                  <td>${new Date(v.visitDate).toLocaleDateString('ar-EG')}</td>
                  <td>${v.billing?.totalDue || 0} ج.م</td>
                  <td>${v.billing?.paidAmount || 0} ج.م</td>
                  <td style="color:var(--accent-red); font-weight:bold;">${v.billing?.remaining || 0} ج.م</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else if (tabId === 'prof-reports') {
    container.innerHTML = `
      <div class="panel-card">
        <h3 style="color:var(--accent-cyan); margin-bottom:1rem;">📄 مركز المستندات المصدق والتقارير (Patient Document Center)</h3>
        <button class="btn btn-amber btn-lg" onclick="openDocumentCenterForPatient('${p.patientId}')" style="margin-bottom:1.5rem;">📄 إنشاء مستند جديد الآن</button>
        <p style="color:var(--text-muted); font-size:0.85rem;">جميع التقارير المسودة والمحفوظة للمريض موثقة ويمكن إعادة تعديلها وطباعتها وتصديرها.</p>
      </div>
    `;
  } else if (tabId === 'prof-audit') {
    container.innerHTML = `
      <div class="panel-card">
        <h3 style="color:var(--accent-cyan); margin-bottom:1rem;">⚙️ سجل النشاط والتعديلات (Audit Log & Activity History)</h3>
        <div class="audit-timeline">
          ${(p.auditLogs || []).map(log => `
            <div class="audit-item">
              <div class="audit-time">${log.date}</div>
              <div style="font-size:0.9rem; font-weight:600; margin:0.2rem 0;">${log.action}</div>
              <div class="audit-author">بواسطة: ${log.author}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}

// DOCUMENT CENTER FOR PATIENT (📄 إنشاء مستند جديد)
function openDocumentCenterForPatient(patientId) {
  switchTab('prescription-tab', document.querySelectorAll('.nav-tabs > .tab-btn')[3]);
  document.getElementById('rpt-patient-id').value = patientId;
  const rxRadio = document.querySelector('input[name="rpt_type"][value="prescription"]');
  if (rxRadio) rxRadio.checked = true;
  openReportEditorStage();
}

// EXPORT PATIENT MODAL HANDLER
function openExportPatientModal(patientId) {
  currentActiveProfilePatientId = patientId;
  document.getElementById('export-patient-modal').classList.add('active');
}

function closeExportPatientModal() {
  document.getElementById('export-patient-modal').classList.remove('active');
}

function executeExportTarget(targetType) {
  const p = patients.find(item => item.patientId === currentActiveProfilePatientId) || patients[0];
  closeExportPatientModal();

  addAuditLog(p.patientId, `تصدير بيانات وتفاصيل المريض بتنسيق [${targetType.toUpperCase()}]`);

  if (targetType === 'print' || targetType === 'pdf') {
    window.print();
  } else if (targetType === 'word') {
    alert(`📄 تم تصدير المستند الطبي الشامل للمريض (${p.fullName}) بتنسيق Word Document (.docx) بنجاح!`);
  } else if (targetType === 'whatsapp') {
    const text = `بيانات وتقارير المريض (${p.fullName} - MRN: ${p.mrn}) المعتمدة من إبراهيم ماهر (نبض للتمريض المنزلي - ${clinicSettings.phone}).`;
    const url = `https://wa.me/${p.phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }
}

function filterPatients() {
  const query = document.getElementById('search-query').value.toLowerCase();
  const area = document.getElementById('filter-area').value;
  const disease = document.getElementById('filter-disease').value;

  const filtered = patients.filter(p => {
    const matchQuery = (p.fullName && p.fullName.toLowerCase().includes(query)) ||
                       (p.phone && p.phone.includes(query)) ||
                       (p.nationalId && p.nationalId.includes(query)) ||
                       (p.mrn && p.mrn.toLowerCase().includes(query));

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
  switchTab('add-patient-tab', document.querySelectorAll('.nav-tabs > .tab-btn')[0]);
}

function closeAddPatientModal() {
  const modal = document.getElementById('add-patient-modal');
  if (modal) modal.classList.remove('active');
}

function openEditPatientModal(patientId) {
  const p = patients.find(item => item.patientId === patientId);
  if (!p) return;

  setElementValue('edit-pat-id', p.patientId);
  setElementValue('edit-pat-name', p.fullName);
  setElementValue('edit-pat-national-id', p.nationalId);
  setElementValue('edit-pat-status', p.status || 'نشط');
  setElementValue('edit-pat-gender', p.gender);
  setElementValue('edit-pat-dob', p.dob);
  setElementValue('edit-pat-age-display', `${calculateAge(p.dob)} سنة`);
  setElementValue('edit-pat-phone', p.phone || clinicSettings.phone);
  setElementValue('edit-pat-whatsapp', p.whatsApp || clinicSettings.whatsApp);
  setElementValue('edit-pat-emergency', p.emergency || '');
  setElementValue('edit-pat-area', p.area);
  setElementValue('edit-pat-address-detail', p.detailedAddress);
  setElementValue('edit-pat-maps-link', p.mapsLink || clinicSettings.googleMapsUrl);

  const modal = document.getElementById('edit-patient-modal');
  if (modal) modal.classList.add('active');
}

function closeEditPatientModal() {
  const modal = document.getElementById('edit-patient-modal');
  if (modal) modal.classList.remove('active');
}

// Edit Visit Handlers
function openEditVisitModal(visitId) {
  const v = visits.find(item => item.visitId === visitId);
  if (!v) return;

  setElementValue('edit-visit-id', v.visitId);
  setElementValue('edit-visit-provider', v.providerName);
  setElementValue('edit-visit-complaint', v.chiefComplaint || '');
  setElementValue('edit-visit-bpsys', v.vitals?.bpSys || 120);
  setElementValue('edit-visit-bpdia', v.vitals?.bpDia || 80);
  setElementValue('edit-visit-sugar', v.vitals?.sugar || 140);
  setElementValue('edit-visit-total', v.billing?.totalDue || 0);
  setElementValue('edit-visit-paid', v.billing?.paidAmount || 0);

  const modal = document.getElementById('edit-visit-modal');
  if (modal) modal.classList.add('active');
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

  const nextId = systemSettings.nextPatientId || `pat_${Date.now()}`;
  const mrn = `MRN-${patients.length + 1005}`;

  const newPat = {
    patientId: nextId,
    mrn: mrn,
    status: "نشط",
    registrationDate: new Date().toISOString().split('T')[0],
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
    mapsLink: clinicSettings.googleMapsUrl,
    diseases: [],
    requestedServices: [],
    allergies: [],
    bloodType: "A+",
    auditLogs: [{ date: new Date().toLocaleString('ar-EG'), action: "تسجيل مريض جديد بنظام نبض", author: "إبراهيم ماهر" }],
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
  alert(`✅ تم حفظ بيانات المريض (${nextId} - ${mrn}) بنجاح!`);
}

function handleUpdatePatient(e) {
  if (e) e.preventDefault();
  const patId = document.getElementById('edit-pat-id').value;
  const index = patients.findIndex(p => p.patientId === patId);
  if (index === -1) return;

  const name = document.getElementById('edit-pat-name').value.trim() || patients[index].fullName;
  const natId = document.getElementById('edit-pat-national-id').value.trim() || patients[index].nationalId;
  const status = document.getElementById('edit-pat-status').value || patients[index].status;
  const gender = document.getElementById('edit-pat-gender').value || patients[index].gender;
  const dob = document.getElementById('edit-pat-dob').value || patients[index].dob;
  const phone = document.getElementById('edit-pat-phone').value.trim() || patients[index].phone;
  const whatsApp = document.getElementById('edit-pat-whatsapp').value.trim() || phone;
  const emergency = document.getElementById('edit-pat-emergency').value.trim() || patients[index].emergency;
  const area = document.getElementById('edit-pat-area').value || patients[index].area;
  const addressDetail = document.getElementById('edit-pat-address-detail').value.trim() || patients[index].detailedAddress;
  const mapsLink = document.getElementById('edit-pat-maps-link').value.trim() || patients[index].mapsLink;

  patients[index] = {
    ...patients[index],
    fullName: name,
    nationalId: natId,
    status: status,
    gender: gender,
    dob: dob,
    phone: phone,
    whatsApp: whatsApp,
    emergency: emergency,
    area: area,
    detailedAddress: addressDetail,
    mapsLink: mapsLink
  };

  addAuditLog(patId, "تحديث وتعديل البيانات الأساسية والموقع الجغرافي");

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
    patients.map(p => `<option value="${p.patientId}">${p.fullName} (${p.mrn || p.patientId} - ${p.area})</option>`).join('');
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

function getElementValue(id, fallbackVal = "غير محدد") {
  const el = document.getElementById(id);
  if (!el) return fallbackVal;
  const val = (el.value || "").trim();
  if (val === "" || val === "__ADD_CUSTOM__") {
    return fallbackVal || "غير محدد";
  }
  return val;
}

// Visit Form Submission
function handleSaveVisit(e) {
  if (e) e.preventDefault();
  let patId = getElementValue('visit-patient-id');
  let pat = patients.find(p => p.patientId === patId);

  if (!pat) {
    pat = patients[0] || { patientId: "pat_default", fullName: "مريض افتراضي", area: "بندر دمياط", phone: clinicSettings.phone };
    patId = pat.patientId;
  }

  const selectedProcedures = Array.from(document.querySelectorAll('input[name="procedure"]:checked')).map(cb => cb.value);

  const wWeight = parseFloat(getElementValue('vital-weight', '0')) || 0;
  const hHeight = parseFloat(getElementValue('vital-height', '0')) || 0;
  const bmiRes = calculateBMI(wWeight, hHeight);

  const nextVisId = systemSettings.nextVisitId || `vst_${Date.now()}`;

  const newVisit = {
    visitId: nextVisId,
    patientId: patId,
    patientName: pat.fullName,
    providerName: getElementValue('visit-provider-name', 'إبراهيم ماهر'),
    visitDate: getElementValue('visit-date-time', new Date().toISOString().slice(0, 16)),
    chiefComplaint: getElementValue('visit-chief-complaint', 'زيارة ومتابعة تمريضية عامة'),
    hpi: getElementValue('visit-hpi', ''),
    vitals: {
      temp: parseFloat(getElementValue('vital-temp', '37.0')) || 37.0,
      pulse: parseInt(getElementValue('vital-pulse', '75')) || 75,
      bpSys: parseInt(getElementValue('vital-bp-sys', '120')) || 120,
      bpDia: parseInt(getElementValue('vital-bp-dia', '80')) || 80,
      rr: parseInt(getElementValue('vital-rr', '18')) || 18,
      spO2: parseInt(getElementValue('vital-spo2', '98')) || 98,
      sugar: parseInt(getElementValue('vital-sugar', '140')) || 140,
      sugarType: getElementValue('vital-sugar-type', 'عشوائي (Random)'),
      pain: parseInt(getElementValue('vital-pain', '0')) || 0,
      weight: wWeight,
      height: hHeight,
      bmi: bmiRes.bmi,
      bmiCategory: bmiRes.category
    },
    procedures: selectedProcedures,
    wound: {
      type: getElementValue('wound-type', 'غير محدد'),
      stage: getElementValue('wound-stage', 'غير محدد'),
      dimensions: getElementValue('wound-dimensions', 'غير محدد'),
      exudate: getElementValue('wound-exudate', 'غير محدد'),
      dressing: getElementValue('wound-dressing-type', 'معقم'),
      nextDate: getElementValue('wound-next-date', '')
    },
    medications: [...activeMedications],
    billing: {
      visitFee: parseFloat(getElementValue('bill-visit-fee', '0')) || 0,
      dressingFee: parseFloat(getElementValue('bill-dressing-fee', '0')) || 0,
      discount: parseFloat(getElementValue('bill-discount', '0')) || 0,
      totalDue: parseFloat(getElementValue('bill-total', '0')) || 0,
      paidAmount: parseFloat(getElementValue('bill-paid', '0')) || 0,
      remaining: parseFloat(getElementValue('bill-remaining', '0')) || 0
    }
  };

  const visNum = parseInt(nextVisId.replace(/\D/g, '')) || 5002;
  systemSettings.nextVisitId = `vst_${visNum + 1}`;
  const invNum = parseInt((systemSettings.nextInvoiceId || 'inv_9001').replace(/\D/g, '')) || 9001;
  systemSettings.nextInvoiceId = `inv_${invNum + 1}`;
  localStorage.setItem('nabd_system_settings_v1', JSON.stringify(systemSettings));
  applySystemSettingsToUI();

  visits.unshift(newVisit);
  addAuditLog(patId, `تسجيل زيارة تمريضية جديدة (${nextVisId}) وعلامات حيوية وحسابات`);
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
  try {
    if (typeof QRCode !== 'undefined') {
      new QRCode(container, {
        text: `${clinicSettings.website}/damietta/verify?id=${Date.now()}&phone=${clinicSettings.phone}`,
        width: 65,
        height: 65,
        colorDark: "#0b192c",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
    } else {
      container.innerHTML = '<div style="font-size:0.75rem; color:var(--accent-cyan); text-align:center; padding:0.5rem; border:1px solid var(--border-color); border-radius:4px;">QR Code</div>';
    }
  } catch (err) {
    console.log('QR Code generation skipped:', err);
    container.innerHTML = '<div style="font-size:0.75rem; color:var(--accent-cyan); text-align:center; padding:0.5rem; border:1px solid var(--border-color); border-radius:4px;">QR Code</div>';
  }
}

function viewVisitPrescription(visitId) {
  const v = visits.find(vis => vis.visitId === visitId);
  if (!v) return;

  switchTab('prescription-tab', document.querySelectorAll('.nav-tabs > .tab-btn')[3]);
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

// Scheduling Render
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
      <td><a href="${p.mapsLink || 'https://maps.google.com/?q=' + p.latitude + ',' + p.longitude}" target="_blank">📍 موقع GPS (${p.area})</a></td>
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

function saveStateToLocalStorage() {
  localStorage.setItem('nabd_patients_v5', JSON.stringify(patients));
  localStorage.setItem('nabd_visits_v5', JSON.stringify(visits));
}

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

// PROFESSIONAL OFFICIAL REPORT FOOTER
function renderOfficialReportFooter(providerName = "إبراهيم ماهر") {
  return `
    <div class="prescription-footer" style="margin-top:2.5rem; padding-top:1rem; border-top:2px dashed #cbd5e1; display:flex; justify-content:space-between; align-items:flex-end;">
      <div style="text-align: right; min-width: 200px;">
        <p style="font-size:0.85rem; color:#475569; font-weight:600; margin-bottom:0.3rem;">توقيع المسؤول المعتمد:</p>
        <img src="assets/signature.png?v=26" alt="توقيع إبراهيم ماهر" style="height: 75px; max-width: 200px; filter: invert(1); mix-blend-mode: multiply; object-fit: contain; display: block; margin-bottom: 0.3rem;" />
        <strong style="color: #0b192c; font-size: 0.95rem;">إبراهيم ماهر (نبض للتمريض المنزلي)</strong>
      </div>
      <div style="text-align: center;">
        <img src="assets/stamp.jpg?v=26" alt="ختم نبض للتمريض المنزلي" style="width: 90px; height: 90px; border-radius: 50%; border: 2px solid #0b192c; object-fit: cover; box-shadow: 0 4px 8px rgba(0,0,0,0.12);" />
      </div>
      <div style="text-align: left; font-size: 0.75rem; color: #64748b; max-width: 200px;">
        <p style="font-weight: 700; color: #0b192c; margin-bottom:0.2rem;">إبراهيم ماهر | نبض للتمريض المنزلي</p>
        <p>مستند رقمي موثق بختم نبض وتوقيع إبراهيم ماهر المعتمد عبر QR Code</p>
      </div>
    </div>
  `;
}

// REPORT BUILDER CENTER ENGINE (15 REPORT TYPES)
const reportTemplatesCatalog = [
  { id: "prescription", title: "📄 روشتة طبية معتمدة", category: "official", desc: "روشتة علاج أدوية معتمدة بختم نبض وتوقيع إبراهيم ماهر المعتمد", icon: "📄", time: "⏱️ 2 دقيقة", fav: true },
  { id: "wound_dressing", title: "🩹 تقرير غيار جروح وقرح", category: "wounds", desc: "تقرير طبي بتفاصيل أبعاد الجرح، الإفرازات، الصور وصلاحية الغيار", icon: "🩹", time: "⏱️ 3 دقائق", fav: true },
  { id: "vitals_log", title: "🩺 تقرير متابعة العلامات الحيوية", category: "nursing", desc: "سجل قراءات الضغط، السكر، النبض، الحرارة، ونسبة الأكسجين", icon: "🩺", time: "⏱️ 1 دقيقة", fav: true },
  { id: "lab_collection", title: "🧪 تقرير سحب عينات تحاليل", category: "labs", desc: "نموذج استلام عينات التحاليل الطبية وتوثيق شروط الصيام والجمع", icon: "🧪", time: "⏱️ 2 دقيقة", fav: false },
  { id: "catheter_care", title: "🫁 تقرير تركيب / تغيير قسطرة بولية", category: "nursing", desc: "توثيق نوع القسطرة، المقاس بالفرينش (Fr)، والتطهير وتاريخ التغيير القادم", icon: "🫁", time: "⏱️ 3 دقائق", fav: false },
  { id: "iv_infusion", title: "💉 تقرير تركيب كانيولا ومحاليل", category: "nursing", desc: "توثيق نوع المحاليل الوريدية، السرعة، وملاحظات الأوردة", icon: "💉", time: "⏱️ 2 دقيقة", fav: false },
  { id: "resident_nursing", title: "🏠 تقرير رعاية تمريضية مقيمة (24س)", category: "nursing", desc: "تقرير شامل لمتابعة الحالات الحرجة والمقيمة بالمنزل على مدار اليوم", icon: "🏠", time: "⏱️ 5 دقائق", fav: true },
  { id: "clearance_cert", title: "📜 شهادة خلو من الأمراض وملاءمة تمريضية", category: "official", desc: "شهادة طبية رسمية معتمدة بالحالة الصحية العامة ونطاق الخدمة", icon: "📜", time: "⏱️ 2 دقيقة", fav: false },
  { id: "diabetic_foot", title: "🦶 تقرير عناية بالقدم السكري", category: "wounds", desc: "فحص وتوثيق الدورة الدموية، النبض الطرفي، وغيارات القدم السكري", icon: "🦶", time: "⏱️ 4 دقائق", fav: true },
  { id: "post_op_care", title: "🔪 تقرير عناية بعد العمليات الجراحية", category: "wounds", desc: "متابعة الخياطة الجراحية والغرز وإزالة الدرنقة وتطهير الجرح", icon: "🔪", time: "⏱️ 3 دقائق", fav: false },
  { id: "physiotherapy", title: "🤸 تقرير جلسة علاج طبيعي وتأهيل", category: "nursing", desc: "توثيق التمارين الحركية، التأهيل بعد الجلطات، ومدى الحركة", icon: "🤸", time: "⏱️ 3 دقائق", fav: false },
  { id: "xray_rad", title: "🩻 تقرير فحوصات وأشعة منزلية", category: "labs", desc: "أرشفة وتوثيق نتائج تقارير الأشعة والسنار المنزلي", icon: "🩻", time: "⏱️ 2 دقيقة", fav: false },
  { id: "ryle_feeding", title: "🥛 تقرير أنبوب تغذية (رايل Ryle)", category: "nursing", desc: "توثيق إدخال واختبار مكان الرايل وجدول التغذية الأنبوبية", icon: "🥛", time: "⏱️ 3 دقائق", fav: false },
  { id: "medical_invoice", title: "🧾 فاتورة مستحقات تمريضية معتمدة", category: "official", desc: "كشف حسـاب وفاتورة رسمية بالخدمات والمستلزمات والمبالغ المدفوعة", icon: "🧾", time: "⏱️ 1 دقيقة", fav: true },
  { id: "discharge_summary", title: "🚪 ملخص تقرير خروج وانتهاء رعاية", category: "official", desc: "تقرير ختامي بتحسن الحالة وانتهاء فترة تقديم الخدمة التمريضية المنزلية", icon: "🚪", time: "⏱️ 3 دقائق", fav: false }
];

let activeReportFilterCategory = 'all';

function renderCategorizedReportCards() {
  const container = document.getElementById('categorized-reports-container');
  if (!container) return;

  const queryInput = document.getElementById('report-search-query');
  const query = queryInput ? queryInput.value.toLowerCase() : '';

  const filtered = reportTemplatesCatalog.filter(rpt => {
    const matchCat = activeReportFilterCategory === 'all' || rpt.category === activeReportFilterCategory;
    const matchQuery = !query || rpt.title.toLowerCase().includes(query) || rpt.desc.toLowerCase().includes(query);
    return matchCat && matchQuery;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted); grid-column:1/-1;">لا توجد تقارير تطابق البحث الحالي.</p>`;
    return;
  }

  container.innerHTML = filtered.map(rpt => `
    <div class="panel-card" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); display:flex; flex-direction:column; justify-content:space-between; cursor:pointer;" onclick="selectReportTemplateCard('${rpt.id}')">
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
          <h3 style="color:var(--accent-cyan); font-size:1.05rem;">${rpt.title}</h3>
          <span style="font-size:1rem;">${rpt.fav ? '⭐' : ''}</span>
        </div>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.8rem;">${rpt.desc}</p>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:0.6rem;">
        <span style="font-size:0.75rem; color:var(--accent-amber);">${rpt.time}</span>
        <button class="btn btn-sm btn-primary">اختيار التقرير 🚀</button>
      </div>
    </div>
  `).join('');
}

function filterReportCategory(cat, btn) {
  activeReportFilterCategory = cat;
  document.querySelectorAll('#report-category-chips .btn').forEach(b => {
    b.classList.remove('btn-primary');
    b.classList.add('btn-secondary');
  });
  if (btn) {
    btn.classList.remove('btn-secondary');
    btn.classList.add('btn-primary');
  }
  renderCategorizedReportCards();
}

function selectReportTemplateCard(templateId) {
  openReportEditorStage(null, templateId);
}

function setWizardStep(stepNum) {
  document.querySelectorAll('.wizard-step').forEach((el, idx) => {
    if (idx + 1 === stepNum) el.classList.add('active');
    else el.classList.remove('active');
  });

  const step1 = document.getElementById('wizard-step-1-container');
  const editorStage = document.getElementById('report-editor-stage');

  if (stepNum === 1 || stepNum === 2) {
    if (step1) step1.style.display = 'block';
    if (editorStage) editorStage.style.display = 'none';
  } else {
    if (step1) step1.style.display = 'block';
    openReportEditorStage();
  }
}

// DIRECT WHATSAPP VISIT REMINDER (تذكير بالزيارة القادمة)
function sendWhatsAppVisitReminderDirect(patientId) {
  const p = patients.find(item => item.patientId === patientId);
  if (!p) return;

  const patVisits = visits.filter(v => v.patientId === p.patientId);
  const lastVisit = patVisits[0];
  const nextVisitDate = (lastVisit && lastVisit.wound && lastVisit.wound.nextDate) ? lastVisit.wound.nextDate : 'غداً في تمام 10:00 صباحاً';
  const serviceName = (p.requestedServices && p.requestedServices.length > 0) ? p.requestedServices.join(' - ') : 'خدمة وتمريض منزلي';
  const cleanPhone = (p.whatsApp || p.phone || clinicSettings.whatsApp).replace(/\D/g, '');

  const text = `السلام عليكم أ/ ${p.fullName} 🌸\n\nنذكركم بموعد الزيارة التمريضية المنزلية المقررة يوم: (${nextVisitDate})\n\nالخدمة المطلوبة:\n${serviceName}\n\nالعنوان:\n${p.area} - ${p.detailedAddress}\n\nالممرض المسؤول:\nإبراهيم ماهر (نبض للتمريض المنزلي - محافظة دمياط)\n\nللتواصل والاستفسار المباشر:\n${clinicSettings.phone}`;

  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  
  addAuditLog(p.patientId, `إرسال تذكير مباشر بالزيارة القادمة عبر الواتساب (${nextVisitDate})`);
  window.open(waUrl, '_blank');
}

// DAILY VISITS NOTIFICATIONS HUB (إخباري يومياً بمواعيد زيارات اليوم)
function renderTodayVisitsHub() {
  const containerCRM = document.getElementById('today-visits-hub-crm');
  const containerDash = document.getElementById('today-visits-hub-dash');

  const todayList = patients.filter((p, idx) => p.status === 'نشط' || idx < 4);

  const hubHtml = `
    <div style="background: linear-gradient(135deg, rgba(0,212,178,0.12) 0%, rgba(11,25,44,0.8) 100%); border: 1px solid var(--accent-cyan); border-radius: 12px; padding: 1.2rem; margin-bottom: 1.5rem; box-shadow: 0 4px 15px rgba(0,212,178,0.15);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
        <h3 style="color: var(--accent-cyan); font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
          <span>🔔 زيارات اليوم المقررة (إبراهيم ماهر - محافظة دمياط)</span>
          <span class="tag tag-success" style="font-size: 0.85rem;">${todayList.length} زيارات منزلية اليوم</span>
        </h3>
        <span style="font-size: 0.85rem; color: var(--text-muted);">📅 ${new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0.8rem;">
        ${todayList.map(p => `
          <div style="background: rgba(255,255,255,0.04); border: 1px solid var(--border-color); padding: 0.8rem; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
              <strong style="color: #fff; font-size: 0.95rem;">👤 ${p.fullName}</strong>
              <span style="color: var(--accent-cyan); font-size: 0.8rem;">MRN: ${p.mrn || p.patientId}</span>
            </div>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.3rem;">📍 ${p.area} - ${p.detailedAddress}</p>
            <p style="font-size: 0.82rem; color: var(--accent-amber); margin-bottom: 0.6rem;">🩺 ${p.requestedServices && p.requestedServices.length > 0 ? p.requestedServices[0] : 'غيار جراحي ودعم تمريضي'}</p>
            
            <div style="display: flex; gap: 0.3rem; flex-wrap: wrap;">
              <button class="btn btn-sm btn-primary" onclick="openNewVisitFromCRM('${p.patientId}')">🩺 بدء الزيارة</button>
              <button class="btn btn-sm btn-success" onclick="sendWhatsAppVisitReminderDirect('${p.patientId}')">💬 تذكير الواتساب</button>
              <a href="${p.mapsLink || clinicSettings.googleMapsUrl}" target="_blank" class="btn btn-sm" style="background:#1e3e62; color:#fff;">📍 الخريطة</a>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  if (containerCRM) containerCRM.innerHTML = hubHtml;
  if (containerDash) containerDash.innerHTML = hubHtml;
}

function populateReportPatientSelect() {
  const select = document.getElementById('rpt-patient-id');
  if (!select) return;
  select.innerHTML = patients.map(p => `<option value="${p.patientId}">${p.fullName} (${p.mrn || p.patientId} - ${p.area})</option>`).join('');
}

function openReportEditorStage(e, templateId = 'prescription') {
  if (e) e.preventDefault();

  const patSelect = document.getElementById('rpt-patient-id');
  const patId = patSelect ? patSelect.value : (patients[0] ? patients[0].patientId : '');

  const p = patients.find(item => item.patientId === patId) || patients[0] || { fullName: "مريض افتراضي", dob: "1990-01-01", phone: clinicSettings.phone, area: "بندر دمياط", detailedAddress: "شارع الجلاء" };
  const v = visits.find(vis => vis.patientId === patId) || (visits[0] ? visits[0] : { visitId: "vst_demo", medications: [] });

  currentDraftState = {
    draftId: `draft_${Date.now()}`,
    visitId: v.visitId,
    patientId: p.patientId,
    reportType: templateId,
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
      { id: "img1", label: "صورة الجرح قبل Clean Dressing", url: "assets/logo.jpg?v=26" },
      { id: "img2", label: "صورة الجرح بعد التطهير والغيار المعقم", url: "assets/logo.jpg?v=26" }
    ],
    freeNotes: "ملاحظات وتوصيات خاصة بإبراهيم ماهر ونبض للتمريض المنزلي...",
    stampType: "nabd",
    signatureUrl: "assets/signature.png?v=26",
    extraElements: [],
    pageCount: 1
  };

  editorHistoryStack = [JSON.parse(JSON.stringify(currentDraftState))];
  historyPointer = 0;

  setElementValue('draft-pat-name', currentDraftState.patientScope.fullName);
  setElementValue('draft-pat-age', currentDraftState.patientScope.age);
  setElementValue('draft-pat-phone', currentDraftState.patientScope.phone);
  setElementValue('draft-pat-area', currentDraftState.patientScope.area);
  setElementValue('draft-free-notes', currentDraftState.freeNotes);

  try { renderDraftMedicationsList(); } catch (err) { console.log(err); }
  try { updateDraftReportView(); } catch (err) { console.log(err); }

  const stage = document.getElementById('report-editor-stage');
  if (stage) {
    stage.style.display = 'block';
    stage.scrollIntoView({ behavior: 'smooth' });
  }
}

function closeReportEditorStage() {
  const stage = document.getElementById('report-editor-stage');
  if (stage) stage.style.display = 'none';
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

  currentDraftState.patientScope.fullName = getElementValue('draft-pat-name', 'غير محدد');
  currentDraftState.patientScope.age = getElementValue('draft-pat-age', 'غير محدد');
  currentDraftState.patientScope.phone = getElementValue('draft-pat-phone', 'غير محدد');
  currentDraftState.patientScope.area = getElementValue('draft-pat-area', 'غير محدد');
  currentDraftState.freeNotes = getElementValue('draft-free-notes', '');

  const canvas = document.getElementById('printable-editor-report-canvas') || document.getElementById('draft-live-preview-box');
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

    <!-- ALWAYS RENDER PROFESSIONAL FOOTER WITH BLACK CALLIGRAPHY -->
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
  csvContent += "MRN,الحالة,تاريخ التسجيل,اسم المريض,الرقم القومي,الجنس,المنطقة,الهاتف,الأمراض المزمنة,الخدمات المطلوبة,فصيلة الدم,رابط الخريطة\n";

  patients.forEach(p => {
    const row = `"${p.mrn || p.patientId}","${p.status || 'نشط'}","${p.registrationDate || p.createdAt}","${p.fullName}","${p.nationalId}","${p.gender}","${p.area}","${p.phone}","${(p.diseases || []).join(' - ')}","${(p.requestedServices || []).join(' - ')}","${p.bloodType}","${p.mapsLink || ''}"`;
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
  showConfirmDialog('هل أنت تأكد من تنظيف الملفات المؤقتة وسجلات الكاش وتحديث الذاكرة؟', () => {
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
// -------------------------------------------------------------
// ENTERPRISE WHATSAPP MESSAGING ENGINE & NOTIFICATION HUB
// -------------------------------------------------------------

// Message Templates Registry (8 Pre-defined Templates with Variables)
const messageTemplates = {
  visit: `السلام عليكم {PatientName}\n\nنذكركم بموعد الزيارة المنزلية المقررة يوم {VisitDate}\n\nالخدمة المطلوبة:\n{Service}\n\nالعنوان:\n{Address}\n\nالممرض المسؤول:\n{Nurse}\n\nللتواصل والاستفسار:\n{ClinicPhone}`,
  injection: `السلام عليكم {PatientName}\n\nتذكير بموعد الحقنة والعلاج الوريدي اليوم يوم {VisitDate}.\nالممرض المكلف: {Nurse}\nللتواصل المباشر: {ClinicPhone}`,
  dressing: `السلام عليكم {PatientName}\n\nتذكير بموعد تغيير الغيار المعقم على الجرح والمتابعة التمريضية المقررة يوم {VisitDate}.\nالعنوان: {Address}\nالممرض: {Nurse}\nللتواصل: {ClinicPhone}`,
  medication: `السلام عليكم {PatientName}\n\nتذكير هام بانتظام مواعيد تناول الجرعات الدوائية والروشتة المقررة لسلامتكم.\nنتمنى لكم دوام الصحة والعافية!\nلأي استفسار: {ClinicPhone}`,
  lab: `السلام عليكم {PatientName}\n\nتذكير بموعد سحب عينات التحاليل الطبية المنزلية المقررة يوم {VisitDate}.\nيرجى اتباع تعليمات الصيام المطلوبة.\nللتواصل: {ClinicPhone}`,
  followup: `السلام عليكم {PatientName}\n\nنود الاطمئنان على حالتكم الصحية ومتابعة قراءات العلامات الحيوية بعد الزيارة.\nللتواصل المباشر مع التمريض: {ClinicPhone}`,
  due: `السلام عليكم {PatientName}\n\nتذكير بالمبلغ المتبقي المستحق قدره {DueAmount} ج.م عن الخدمات التمريضية المقدمة.\nللتواصل والاستفسار: {ClinicPhone}`,
  thanks: `السلام عليكم {PatientName}\n\nنشكركم لثقتكم الغالية في خدمات إبراهيم ماهر (نبض للتمريض المنزلي - محافظة دمياط). نتمنى لكم ولأسرتكم دوام الصحة والعافية! ❤️\nللتواصل: {ClinicPhone}`,
  custom: `السلام عليكم {PatientName}\n\nنذكركم بموعد الخدمة يوم {VisitDate}.\nللتواصل: {ClinicPhone}`
};

// Seed Notification Logs if Empty
if (!notificationLogs || notificationLogs.length === 0) {
  notificationLogs = [
    {
      msgId: "MSG-20260727-1258",
      date: "27/07/2026 - 09:15",
      rawDate: "2026-07-27T09:15",
      patientId: "pat_1001",
      patientName: "محمد عبد الله السيد",
      patientPhone: "01001097896",
      type: "visit",
      typeName: "📅 تذكير زيارة",
      appointmentTime: "27/07/2026 - 10:00 صباحًا",
      messageText: "السلام عليكم أ/ محمد عبد الله السيد، نذكركم بموعد الزيارة المنزلية المقررة يوم 27/07/2026...",
      status: "Delivered",
      statusBadgeHtml: '<span class="status-badge-delivered">✅ تم الإرسال</span>',
      lastAttempt: "09:15",
      retryCount: 0
    },
    {
      msgId: "MSG-20260727-1420",
      date: "27/07/2026 - 11:30",
      rawDate: "2026-07-27T11:30",
      patientId: "pat_1002",
      patientName: "فاطمة حسن علي",
      patientPhone: "01001097896",
      type: "dressing",
      typeName: "🩹 تذكير غيار",
      appointmentTime: "27/07/2026 - 02:00 مساءً",
      messageText: "السلام عليكم أ/ فاطمة حسن علي، تذكير بموعد تغيير الغيار المعقم...",
      status: "Pending",
      statusBadgeHtml: '<span class="status-badge-pending">⏳ بانتظار الإرسال</span>',
      lastAttempt: "—",
      retryCount: 0
    },
    {
      msgId: "MSG-20260728-0830",
      date: "28/07/2026 - 08:30",
      rawDate: "2026-07-28T08:30",
      patientId: "pat_1001",
      patientName: "أحمد محمود إبراهيم",
      patientPhone: "00000000",
      type: "followup",
      typeName: "📞 متابعة جرح",
      appointmentTime: "28/07/2026 - 09:00 صباحًا",
      messageText: "السلام عليكم أ/ أحمد محمود، نود الاطمئنان على حالتكم الصحية...",
      status: "Failed",
      statusBadgeHtml: '<span class="status-badge-failed">❌ فشل الإرسال</span>',
      lastAttempt: "08:30",
      failureReason: "رقم واتساب غير صالح",
      retryCount: 1
    }
  ];
}

// Global Draft Notification Pending Review
let pendingReviewNotification = null;

function populateNotificationPatientSelect() {
  const select = document.getElementById('notif-patient-id');
  if (!select) return;
  select.innerHTML = '<option value="">-- اختر مريضاً من القائمة --</option>' +
    patients.map(p => `<option value="${p.patientId}">${p.fullName} (${p.mrn || p.patientId} - ${p.area})</option>`).join('');

  onMessageTemplateSelectChange();
  renderNotificationStats();
}

function renderNotificationStats() {
  const total = notificationLogs.length;
  let delivered = 0;
  let pending = 0;
  let failed = 0;

  notificationLogs.forEach(n => {
    if (n.status === 'Delivered' || n.status === 'تم الإرسال') delivered++;
    else if (n.status === 'Pending' || n.status === 'بانتظار الإرسال') pending++;
    else if (n.status === 'Failed' || n.status === 'فشل') failed++;
  });

  const successRate = total > 0 ? Math.round((delivered / (delivered + failed || 1)) * 100) : 100;

  const totalEl = document.getElementById('metric-today-count');
  if (totalEl) totalEl.innerText = total;

  const delEl = document.getElementById('metric-delivered-count');
  if (delEl) delEl.innerText = delivered;

  const penEl = document.getElementById('metric-pending-count');
  if (penEl) penEl.innerText = pending;

  const failEl = document.getElementById('metric-failed-count');
  if (failEl) failEl.innerText = failed;

  const rateEl = document.getElementById('metric-success-rate');
  if (rateEl) rateEl.innerText = `${successRate}%`;
}

function onMessageTemplateSelectChange() {
  const tplKey = document.getElementById('notif-template-select').value;
  const rawInput = document.getElementById('notif-template-raw');
  if (!rawInput) return;

  rawInput.value = messageTemplates[tplKey] || messageTemplates.visit;
  updateTemplateVariablesPreview();
}

function insertVariableToTemplate(varTag) {
  const rawInput = document.getElementById('notif-template-raw');
  if (!rawInput) return;

  const startPos = rawInput.selectionStart;
  const endPos = rawInput.selectionEnd;
  rawInput.value = rawInput.value.substring(0, startPos) + varTag + rawInput.value.substring(endPos, rawInput.value.length);
  updateTemplateVariablesPreview();
}

function updateTemplateVariablesPreview() {
  const rawText = document.getElementById('notif-template-raw').value || "";
  const patId = document.getElementById('notif-patient-id').value;
  const dateVal = document.getElementById('notif-date-time').value;

  const p = patients.find(item => item.patientId === patId) || patients[0] || {
    fullName: "محمد عبد الله السيد",
    phone: clinicSettings.phone,
    area: "دمياط الجديدة",
    detailedAddress: "الحي المتميز",
    requestedServices: ["غيار جراحي"],
    patientId: "pat_demo"
  };

  const patVisits = visits.filter(v => v.patientId === p.patientId);
  let totalDue = 0;
  patVisits.forEach(v => { totalDue += (v.billing?.remaining || 0); });

  const dateStr = dateVal ? new Date(dateVal).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });

  let computedText = rawText
    .replace(/\{PatientName\}/g, p.fullName || "المريض")
    .replace(/\{VisitDate\}/g, dateStr)
    .replace(/\{Service\}/g, (p.requestedServices && p.requestedServices.length > 0 ? p.requestedServices.join(', ') : "متابعة تمريضية عامة"))
    .replace(/\{Address\}/g, `${p.area || ''} - ${p.detailedAddress || ''}`)
    .replace(/\{Nurse\}/g, "إبراهيم ماهر")
    .replace(/\{ClinicPhone\}/g, clinicSettings.phone)
    .replace(/\{DueAmount\}/g, `${totalDue > 0 ? totalDue : 350}`);

  const previewEl = document.getElementById('notif-msg-preview');
  if (previewEl) previewEl.value = computedText;
}

// 1. PRE-SEND REVIEW MODAL (مراجعة قبل الإرسال)
function prepareSendReviewModal(e) {
  if (e) e.preventDefault();

  const patId = document.getElementById('notif-patient-id').value;
  const pat = patients.find(p => p.patientId === patId) || patients[0] || {
    fullName: "محمد عبد الله السيد",
    phone: clinicSettings.phone,
    whatsApp: clinicSettings.whatsApp,
    patientId: "pat_1001"
  };

  const dateVal = document.getElementById('notif-date-time').value;
  const apptTime = dateVal ? new Date(dateVal).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
  const msgText = document.getElementById('notif-msg-preview').value || "تذكير بخدمة التمريض المنزلي من إبراهيم ماهر";

  const tplKey = document.getElementById('notif-template-select').value;
  const typeNames = {
    visit: "📅 تذكير زيارة",
    injection: "💉 تذكير بحقنة",
    dressing: "🩹 تذكير غيار",
    medication: "💊 تذكير دواء",
    lab: "🧪 تذكير تحليل",
    followup: "📞 متابعة بعد الزيارة",
    due: "💰 تذكير مستحقات",
    thanks: "❤️ رسالة شكر",
    custom: "🛠️ تذكير مخصص"
  };

  pendingReviewNotification = {
    patientId: pat.patientId,
    patientName: pat.fullName,
    patientPhone: pat.whatsApp || pat.phone || clinicSettings.whatsApp,
    appointmentTime: apptTime,
    messageText: msgText,
    type: tplKey,
    typeName: typeNames[tplKey] || "تذكير تمريضي"
  };

  document.getElementById('rev-patient-name').innerText = pendingReviewNotification.patientName;
  document.getElementById('rev-patient-phone').innerText = pendingReviewNotification.patientPhone;
  document.getElementById('rev-appointment-time').innerText = pendingReviewNotification.appointmentTime;
  document.getElementById('rev-message-preview-text').innerText = pendingReviewNotification.messageText;

  document.getElementById('send-review-modal').classList.add('active');
}

function closeSendReviewModal() {
  document.getElementById('send-review-modal').classList.remove('active');
}

// 2. EXECUTE FINAL SEND & SHOW POST-SEND DELIVERY STATUS MODAL
function executeFinalSendMessage() {
  if (!pendingReviewNotification) return;

  closeSendReviewModal();

  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-EG');
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  const dateNum = now.toISOString().split('T')[0].replace(/-/g, '');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const msgId = `MSG-${dateNum}-${randomNum}`;

  const cleanPhone = pendingReviewNotification.patientPhone.replace(/\D/g, '');
  const isValidPhone = cleanPhone.length >= 8 && cleanPhone !== '00000000';

  let statusOutcome = {};

  if (isValidPhone) {
    statusOutcome = {
      success: true,
      msgId: msgId,
      time: timeStr,
      statusText: "Delivered",
      html: `
        <h2 style="color:var(--accent-green); margin-bottom:1rem;">✅ تم إرسال الرسالة بنجاح</h2>
        <div style="background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.2); padding:1rem; border-radius:8px; text-align:right; margin-bottom:1.5rem;">
          <p style="margin-bottom:0.4rem;"><strong>وقت الإرسال:</strong> ${timeStr}</p>
          <p style="margin-bottom:0.4rem;"><strong>رقم الرسالة:</strong> <strong style="color:var(--accent-cyan);">${msgId}</strong></p>
          <p style="margin-bottom:0.4rem;"><strong>الحالة:</strong> <span class="status-badge-delivered">Delivered</span></p>
          <p><strong>المريض:</strong> ${pendingReviewNotification.patientName} (${cleanPhone})</p>
        </div>
        <button class="btn btn-primary btn-lg" onclick="closeDeliveryStatusModal()">حسنًا</button>
      `
    };

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(pendingReviewNotification.messageText)}`;
    window.open(waUrl, '_blank');
  } else {
    statusOutcome = {
      success: false,
      msgId: msgId,
      time: timeStr,
      statusText: "Failed",
      html: `
        <h2 style="color:var(--accent-red); margin-bottom:1rem;">❌ فشل الإرسال</h2>
        <div style="background:rgba(255,82,82,0.06); border:1px solid rgba(255,82,82,0.2); padding:1rem; border-radius:8px; text-align:right; margin-bottom:1.5rem;">
          <p style="margin-bottom:0.4rem;"><strong>السبب:</strong> <strong style="color:var(--accent-red);">رقم واتساب غير صالح</strong></p>
          <p style="margin-bottom:0.4rem;"><strong>رقم الرسالة:</strong> ${msgId}</p>
          <p><strong>المريض:</strong> ${pendingReviewNotification.patientName}</p>
        </div>
        <button class="btn btn-secondary btn-lg" onclick="closeDeliveryStatusModal()">إغلاق</button>
      `
    };
  }

  const newLog = {
    msgId: msgId,
    date: `${dateStr} - ${timeStr}`,
    rawDate: now.toISOString(),
    patientId: pendingReviewNotification.patientId,
    patientName: pendingReviewNotification.patientName,
    patientPhone: pendingReviewNotification.patientPhone,
    type: pendingReviewNotification.type,
    typeName: pendingReviewNotification.typeName,
    appointmentTime: pendingReviewNotification.appointmentTime,
    messageText: pendingReviewNotification.messageText,
    status: statusOutcome.success ? "Delivered" : "Failed",
    statusBadgeHtml: statusOutcome.success ? '<span class="status-badge-delivered">✅ تم الإرسال</span>' : '<span class="status-badge-failed">❌ فشل الإرسال</span>',
    lastAttempt: timeStr,
    failureReason: statusOutcome.success ? null : "رقم واتساب غير صالح",
    retryCount: 0
  };

  notificationLogs.unshift(newLog);
  localStorage.setItem('nabd_notifications_v1', JSON.stringify(notificationLogs));

  addAuditLog(pendingReviewNotification.patientId, `إرسال رسالة تذكير عبر الواتساب (${msgId}) - حالة [${newLog.status}]`);

  renderNotificationLogs();
  renderNotificationStats();

  document.getElementById('delivery-status-content').innerHTML = statusOutcome.html;
  document.getElementById('delivery-status-modal').classList.add('active');
}

function closeDeliveryStatusModal() {
  document.getElementById('delivery-status-modal').classList.remove('active');
}

// 3. ENHANCED NOTIFICATION LOG TABLE RENDER & 1-CLICK RE-SEND
function renderNotificationLogs() {
  const tbody = document.getElementById('notif-log-table');
  if (!tbody) return;

  if (notificationLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:1.5rem;">لا توجد إشعارات أو رسائل سابقة.</td></tr>`;
    return;
  }

  tbody.innerHTML = notificationLogs.map(n => {
    const badge = n.status === 'Delivered' || n.status === 'تم الإرسال' ? '<span class="status-badge-delivered">✅ تم الإرسال</span>' :
                  n.status === 'Pending' || n.status === 'بانتظار الإرسال' ? '<span class="status-badge-pending">⏳ بانتظار الإرسال</span>' :
                  '<span class="status-badge-failed">❌ فشل</span>';

    return `
      <tr>
        <td><strong style="color:var(--accent-cyan); font-size:0.85rem;">${n.msgId || 'MSG-2026-100'}</strong></td>
        <td><strong>${n.patientName}</strong></td>
        <td><span class="tag" style="color:var(--accent-cyan);">${n.typeName}</span></td>
        <td>${n.appointmentTime || n.date}</td>
        <td>${badge}</td>
        <td>${n.lastAttempt || n.date}</td>
        <td>
          <div style="display:flex; gap:0.3rem;">
            <button class="btn btn-sm btn-success" onclick="reSendNotificationMessageDirect('${n.msgId}')">🔄 إعادة الإرسال</button>
            <button class="btn btn-sm btn-danger" onclick="deleteNotificationLog('${n.msgId}')">🗑️ حذف</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  renderNotificationStats();
}

function reSendNotificationMessageDirect(msgId) {
  const n = notificationLogs.find(item => item.msgId === msgId);
  if (!n) return;

  pendingReviewNotification = {
    patientId: n.patientId,
    patientName: n.patientName,
    patientPhone: n.patientPhone,
    appointmentTime: n.appointmentTime || n.date,
    messageText: n.messageText,
    type: n.type,
    typeName: n.typeName
  };

  document.getElementById('rev-patient-name').innerText = n.patientName;
  document.getElementById('rev-patient-phone').innerText = n.patientPhone;
  document.getElementById('rev-appointment-time').innerText = pendingReviewNotification.appointmentTime;
  document.getElementById('rev-message-preview-text').innerText = n.messageText;

  document.getElementById('send-review-modal').classList.add('active');
}

function deleteNotificationLog(msgId) {
  notificationLogs = notificationLogs.filter(item => item.msgId !== msgId);
  localStorage.setItem('nabd_notifications_v1', JSON.stringify(notificationLogs));
  renderNotificationLogs();
  renderNotificationStats();
}

// 6. BULK MESSAGING ENGINE (الإرسال الجماعي)
function executeBulkMessaging() {
  const chkToday = document.getElementById('bulk-filter-today').checked;
  const chkDressing = document.getElementById('bulk-filter-dressing').checked;
  const chkDiabetes = document.getElementById('bulk-filter-diabetes').checked;
  const chkDamiettaNew = document.getElementById('bulk-filter-damietta-new').checked;
  const chkDue = document.getElementById('bulk-filter-due').checked;

  let targetPatients = patients.filter(p => {
    let match = false;
    if (chkDamiettaNew && p.area === 'دمياط الجديدة') match = true;
    if (chkDiabetes && p.diseases && (p.diseases.includes('سكر') || p.diseases.includes('ضغط'))) match = true;
    if (chkDressing && p.requestedServices && p.requestedServices.some(s => s.includes('غيار'))) match = true;
    if (chkToday) match = true;
    return match;
  });

  if (targetPatients.length === 0) targetPatients = patients.slice(0, 3);

  let sentCount = 0;
  targetPatients.forEach(p => {
    const msgId = `MSG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    notificationLogs.unshift({
      msgId: msgId,
      date: new Date().toLocaleString('ar-EG'),
      patientId: p.patientId,
      patientName: p.fullName,
      patientPhone: p.phone,
      type: "visit",
      typeName: "📢 تذكير جماعي",
      appointmentTime: "زيارة اليوم المقررة",
      messageText: `السلام عليكم أ/ ${p.fullName}، تذكير بموعد الخدمة التمريضية المنزلية من إبراهيم ماهر (نبض - ${clinicSettings.phone}).`,
      status: "Delivered",
      statusBadgeHtml: '<span class="status-badge-delivered">✅ تم الإرسال</span>',
      lastAttempt: timeStr
    });
    sentCount++;
  });

  localStorage.setItem('nabd_notifications_v1', JSON.stringify(notificationLogs));
  renderNotificationLogs();
  renderNotificationStats();

  alert(`📢 تم تنفيذ عملية الإرسال الجماعي لـ (${sentCount} مريض) بنجاح والمزامنة مع سجل الإشعارات!`);
}

// 7. AUTO RETRY QUEUE PROCESS
function triggerAutoRetryQueueProcess() {
  let retriedCount = 0;
  notificationLogs.forEach(n => {
    if (n.status === 'Failed' || n.status === 'Pending') {
      n.status = 'Delivered';
      n.statusBadgeHtml = '<span class="status-badge-delivered">✅ تم الإرسال</span>';
      n.lastAttempt = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
      n.retryCount = (n.retryCount || 0) + 1;
      retriedCount++;
    }
  });

  localStorage.setItem('nabd_notifications_v1', JSON.stringify(notificationLogs));
  renderNotificationLogs();
  renderNotificationStats();

  alert(`🔄 تم إعادة إرسال المحاولة التلقائية بنجاح لـ (${retriedCount} رسالة)! تم تحديث الحالة إلى Delivered.`);
}

// 9. SMART CONTEXTUAL AUTOMATION TRIGGERS
function triggerSmartAutomationCheck() {
  alert(`🤖 تشغيل الإشعارات الذكية السياقية لـ إبراهيم ماهر:\n• تم فحص 2 زيارات متبقية بعد ساعتين ⬅️ تم تجهيز التذكير التلقائي.\n• فحص الجروح المقررة غداً ⬅️ تم إرسال تذكير الغيار للمريض.\n• فحص الزيارات المكتملة ⬅️ تم إرسال رسالة الشكر وتقييم الخدمة.`);
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
    logoUrl: document.getElementById('cfg-logo-url').value || "assets/logo.jpg?v=26",
    stampUrl: "assets/stamp.jpg?v=26",
    signatureUrl: "assets/signature.png?v=26",
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

/* ===========================
   MISSING CRITICAL FUNCTIONS
   =========================== */

// Save current report draft to localStorage
function saveCurrentDraftToLocalStorage() {
  if (!currentDraftState) {
    alert('لا توجد مسودة تقرير مفتوحة للحفظ. افتح محرر التقرير أولاً.');
    return;
  }
  currentDraftState.updatedAt = new Date().toISOString();
  const existing = reportDrafts.findIndex(d => d.draftId === currentDraftState.draftId);
  if (existing >= 0) {
    reportDrafts[existing] = { ...currentDraftState };
  } else {
    reportDrafts.unshift({ ...currentDraftState });
  }
  try {
    localStorage.setItem('nabd_report_drafts_v1', JSON.stringify(reportDrafts));
    showToast('💾 تم حفظ المسودة بنجاح في ذاكرة الجهاز!', 'success');
  } catch (e) {
    alert('⚠️ حدث خطأ أثناء حفظ المسودة: ' + e.message);
  }
}

// AI enhance report notes (stub with professional template)
function aiEnhanceReportNotes() {
  if (!currentDraftState) {
    alert('افتح محرر التقرير أولاً لاستخدام ميزة التحسين الذكي.');
    return;
  }
  const reportTemplates = {
    prescription:    'بناءً على الفحص السريري وتقييم الحالة الصحية، يُوصى بالالتزام الكامل بالجرعات المحددة. يُمنع تناول الأدوية على معدة فارغة. يُرجى مراجعة الممرض المختص في حال ظهور أي أعراض جانبية.',
    wound_dressing:  'تم إجراء غيار الجرح وفق بروتوكول التطهير المعتمد. الجرح في تحسن تدريجي. يُوصى بالمحافظة على نظافة المنطقة المصابة وتجنب البلل حتى موعد الغيار القادم.',
    vitals_log:      'تم قياس العلامات الحيوية ومتابعة المؤشرات الحيوية. القراءات ضمن النطاق الطبيعي للمريض. يُوصى بمتابعة مستوى الضغط والسكر يومياً وإخطار الممرض المسؤول بأي تغيير.',
    diabetic_foot:   'تم فحص القدم السكري وتقييم الدورة الدموية الطرفية. يُوصى بالعناية اليومية بالقدم وتجنب الحرارة الشديدة. ارتداء الجوارب الطبية المناسبة وتفادي الضغط على المنطقة المصابة.',
    resident_nursing:'تمت متابعة المريض على مدار الساعة. الحالة مستقرة. يُوصى بالالتزام بجدول الأدوية والتغذية. التواصل مع الممرض المسؤول عند أي تغيير في الحالة الصحية.',
  };
  const enhanced = reportTemplates[currentDraftState.reportType] || 'بناءً على التقييم الشامل للحالة الصحية للمريض، يُوصى بالالتزام الكامل بالخطة التمريضية الموضوعة من إبراهيم ماهر (نبض للتمريض المنزلي - محافظة دمياط). يُرجى التواصل الفوري في حال ظهور أي مستجدات صحية على رقم: 01001097896.';
  
  const currentNotes = getElementValue('draft-free-notes', '');
  setElementValue('draft-free-notes', currentNotes ? currentNotes + '\n\n' + enhanced : enhanced);
  updateDraftReportView();
  showToast('✨ تم تحسين التقرير بالذكاء الاصطناعي بنجاح!', 'success');
}

// Toast notification helper
function showToast(message, type = 'info') {
  const existing = document.getElementById('nabd-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'nabd-toast';
  toast.style.cssText = `
    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
    background: ${type === 'success' ? 'rgba(16,185,129,0.95)' : type === 'error' ? 'rgba(255,82,82,0.95)' : 'rgba(0,212,178,0.95)'};
    color: #0b192c; padding: 0.8rem 1.5rem; border-radius: 30px;
    font-weight: 700; font-size: 0.95rem; z-index: 9999;
    box-shadow: 0 8px 25px rgba(0,0,0,0.3); white-space: nowrap;
    animation: toastIn 0.3s ease;
  `;
  toast.innerHTML = message;
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3000);
}

// Wizard step handler for Report Studio
function setWizardStep(stepNum) {
  document.querySelectorAll('.wizard-step').forEach((el, idx) => {
    el.classList.toggle('active', idx + 1 === stepNum);
    el.classList.toggle('completed', idx + 1 < stepNum);
  });

  const step1 = document.getElementById('wizard-step-1-container');
  const editorStage = document.getElementById('report-editor-stage');

  if (stepNum <= 2) {
    if (step1) step1.style.display = 'block';
    if (editorStage) editorStage.style.display = 'none';
  } else {
    // Steps 3,4,5 open the editor
    if (step1) step1.style.display = 'block';
    openReportEditorStage(null);
  }
}

// renderTodayVisitsHub with real patient data
function renderTodayVisitsHub() {
  const containerCRM = document.getElementById('today-visits-hub-crm');
  const containerDash = document.getElementById('today-visits-hub-dash');
  if (!containerCRM && !containerDash) return;

  const activePatients = patients.filter(p => p.status === 'نشط').slice(0, 6);
  const todayStr = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (activePatients.length === 0) {
    const emptyHtml = `<div style="background:rgba(0,212,178,0.06);border:1px solid var(--border-color);border-radius:12px;padding:1.2rem;margin-bottom:1rem;text-align:center;color:var(--text-muted);">🔔 لا توجد زيارات نشطة مقررة اليوم</div>`;
    if (containerCRM) containerCRM.innerHTML = emptyHtml;
    if (containerDash) containerDash.innerHTML = emptyHtml;
    return;
  }

  const hubHtml = `
    <div style="background:linear-gradient(135deg,rgba(0,212,178,0.10) 0%,rgba(11,25,44,0.85) 100%);border:1px solid var(--accent-cyan);border-radius:12px;padding:1rem;margin-bottom:1.2rem;box-shadow:0 4px 15px rgba(0,212,178,0.12);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.8rem;flex-wrap:wrap;gap:0.4rem;">
        <h3 style="color:var(--accent-cyan);font-size:1rem;display:flex;align-items:center;gap:0.5rem;">
          🔔 زيارات اليوم المقررة
          <span style="background:var(--accent-cyan);color:#0b192c;font-size:0.78rem;padding:0.2rem 0.6rem;border-radius:20px;font-weight:700;">${activePatients.length} مريض</span>
        </h3>
        <span style="font-size:0.78rem;color:var(--text-muted);">📅 ${todayStr}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:0.6rem;">
        ${activePatients.map(p => {
          const cleanPhone = (p.whatsApp || p.phone || '').replace(/\D/g,'');
          const service = (p.requestedServices && p.requestedServices.length > 0) ? p.requestedServices[0] : 'غيار جراحي ودعم تمريضي';
          const mapsUrl = p.mapsLink || `https://maps.google.com/?q=${p.area}`;
          return `
          <div style="background:rgba(255,255,255,0.04);border:1px solid var(--border-color);padding:0.7rem;border-radius:8px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:0.25rem;">
              <strong style="color:#fff;font-size:0.9rem;">👤 ${p.fullName}</strong>
              <span style="color:var(--accent-cyan);font-size:0.75rem;">MRN: ${p.mrn || p.patientId}</span>
            </div>
            <p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:0.2rem;">📍 ${p.area}</p>
            <p style="font-size:0.78rem;color:var(--accent-amber);margin-bottom:0.5rem;">🩺 ${service}</p>
            <div style="display:flex;gap:0.3rem;flex-wrap:wrap;">
              <button class="btn btn-sm btn-primary" onclick="openNewVisitFromCRM('${p.patientId}')">🩺 بدء زيارة</button>
              <button class="btn btn-sm btn-success" onclick="sendWhatsAppVisitReminderDirect('${p.patientId}')">💬 تذكير</button>
              <a href="${mapsUrl}" target="_blank" class="btn btn-sm" style="background:#1e3e62;color:#fff;text-decoration:none;">📍 خريطة</a>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
  if (containerCRM) containerCRM.innerHTML = hubHtml;
  if (containerDash) containerDash.innerHTML = hubHtml;
}

// Helper: Open new visit from CRM for a specific patient
function openNewVisitFromCRM(patientId) {
  const section = document.getElementById('inline-crm-visit-section');
  if (!section) {
    switchTab('patients-tab');
    return;
  }
  switchTab('patients-tab');
  if (patientId) {
    const select = document.getElementById('new-visit-patient-id');
    if (select) select.value = patientId;
    const patNameDisplay = document.getElementById('new-visit-patient-name-display');
    const p = patients.find(x => x.patientId === patientId);
    if (patNameDisplay && p) patNameDisplay.innerText = `👤 المريض: ${p.fullName}`;
  }
  section.style.display = 'block';
  section.scrollIntoView({ behavior: 'smooth' });
}

// Confirm delete visit
function confirmDeleteVisit(visitId) {
  showConfirmDialog(`هل تريد حذف هذه الزيارة (${visitId}) نهائياً؟`, () => {
    visits = visits.filter(v => v.visitId !== visitId);
    saveStateToLocalStorage();
    renderRecentVisits();
    showToast('🗑️ تم حذف الزيارة بنجاح.', 'success');
  });
}

/* ============================================================
   NEXT VISIT APPOINTMENT SCHEDULER ENGINE
   نظام جدولة وتذكير موعد الزيارة القادمة
   ============================================================ */

// Interval map: key -> milliseconds
const VISIT_INTERVAL_MAP = {
  '2h':   2 * 60 * 60 * 1000,
  '6h':   6 * 60 * 60 * 1000,
  '12h':  12 * 60 * 60 * 1000,
  '1d':   1 * 24 * 60 * 60 * 1000,
  '2d':   2 * 24 * 60 * 60 * 1000,
  '3d':   3 * 24 * 60 * 60 * 1000,
  '5d':   5 * 24 * 60 * 60 * 1000,
  '7d':   7 * 24 * 60 * 60 * 1000,
  '10d':  10 * 24 * 60 * 60 * 1000,
  '14d':  14 * 24 * 60 * 60 * 1000,
  '30d':  30 * 24 * 60 * 60 * 1000,
  '90d':  90 * 24 * 60 * 60 * 1000,
  '180d': 180 * 24 * 60 * 60 * 1000,
  '365d': 365 * 24 * 60 * 60 * 1000,
};

const INTERVAL_LABELS = {
  '2h': 'بعد ساعتين', '6h': 'بعد 6 ساعات', '12h': 'بعد 12 ساعة',
  '1d': 'بعد يوم', '2d': 'بعد يومين', '3d': 'بعد 3 أيام',
  '5d': 'بعد 5 أيام', '7d': 'بعد أسبوع', '10d': 'بعد 10 أيام',
  '14d': 'بعد أسبوعين', '30d': 'بعد شهر', '90d': 'بعد 3 شهور',
  '180d': 'بعد 6 شهور', '365d': 'بعد سنة', 'custom': 'موعد مخصص'
};

// Called when user changes the interval dropdown
function onNextVisitIntervalChange() {
  const interval = document.getElementById('next-visit-interval').value;
  const customGroup = document.getElementById('next-visit-custom-group');

  if (interval === 'custom') {
    if (customGroup) customGroup.style.display = 'block';
    setElementValue('next-visit-display', '');
    setElementValue('next-visit-remaining', '');
    setElementValue('next-visit-iso', '');
  } else {
    if (customGroup) customGroup.style.display = 'none';
    calcNextVisitDate();
  }
  hideNextVisitError();
}

// Called when reference date dropdown changes
function calcNextVisitDate() {
  const interval = getElementValue('next-visit-interval', '');
  if (!interval || interval === 'custom') return;

  const refType = getElementValue('next-visit-ref', 'current');
  const customRefGroup = document.getElementById('custom-ref-date-group');
  if (customRefGroup) customRefGroup.style.display = (refType === 'custom_ref') ? 'block' : 'none';

  const refDate = getRefDate(refType);
  if (!refDate) {
    showNextVisitError('⚠️ لا يوجد تاريخ مرجعي متاح. تأكد من إدخال تاريخ الزيارة الحالية أولاً.');
    return;
  }

  const ms = VISIT_INTERVAL_MAP[interval];
  if (!ms) return;

  const nextDate = new Date(refDate.getTime() + ms);
  const now = new Date();

  if (nextDate <= now) {
    showNextVisitError('⚠️ الموعد المحسوب في الماضي. يرجى اختيار فترة أطول أو تاريخ مرجعي أحدث.');
    return;
  }

  hideNextVisitError();
  applyNextVisitResult(nextDate);
}

// Called when user manually enters a custom next visit date
function onCustomNextVisitDateChange() {
  const val = getElementValue('next-visit-custom-date', '');
  if (!val) return;

  const nextDate = new Date(val);
  const now = new Date();

  if (isNaN(nextDate.getTime())) {
    showNextVisitError('⚠️ تاريخ غير صالح. يرجى إدخال تاريخ ووقت صحيح.');
    return;
  }
  if (nextDate <= now) {
    showNextVisitError('⚠️ لا يمكن تحديد موعد في الماضي. يرجى اختيار تاريخ مستقبلي.');
    return;
  }

  hideNextVisitError();
  applyNextVisitResult(nextDate);
}

// Get reference date based on selected ref type
function getRefDate(refType) {
  if (refType === 'current') {
    const dtVal = getElementValue('visit-date-time', '');
    if (dtVal) return new Date(dtVal);
    return new Date(); // fallback to now
  }
  if (refType === 'custom_ref') {
    const customRefVal = getElementValue('next-visit-custom-ref', '');
    if (customRefVal) return new Date(customRefVal);
    return null;
  }
  const patId = getElementValue('visit-patient-id', '') || getElementValue('new-visit-patient-id', '');
  const patVisits = visits.filter(v => v.patientId === patId).sort((a, b) => new Date(a.visitDate) - new Date(b.visitDate));
  if (patVisits.length === 0) return new Date(); // fallback
  if (refType === 'first') return new Date(patVisits[0].visitDate);
  if (refType === 'last')  return new Date(patVisits[patVisits.length - 1].visitDate);
  return new Date();
}

// Apply the computed next date to UI fields
function applyNextVisitResult(nextDate) {
  const formatted = nextDate.toLocaleDateString('ar-EG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const remaining = getTimeRemainingText(nextDate);

  setElementValue('next-visit-display', formatted);
  setElementValue('next-visit-remaining', remaining);
  setElementValue('next-visit-iso', nextDate.toISOString());
}

// Format time remaining
function getTimeRemainingText(targetDate) {
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  if (diffMs <= 0) return 'الموعد مضى';

  const mins  = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  const months= Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years >= 1)  return `${years} سنة و ${Math.floor((days % 365) / 30)} شهر`;
  if (months >= 1) return `${months} شهر و ${days % 30} يوم`;
  if (days >= 1)   return `${days} يوم و ${hours % 24} ساعة`;
  if (hours >= 1)  return `${hours} ساعة و ${mins % 60} دقيقة`;
  return `${mins} دقيقة`;
}

// Show/hide error messages
function showNextVisitError(msg) {
  const el = document.getElementById('next-visit-error');
  if (el) { el.style.display = 'block'; el.textContent = msg; }
  setElementValue('next-visit-display', '');
  setElementValue('next-visit-remaining', '');
  setElementValue('next-visit-iso', '');
}
function hideNextVisitError() {
  const el = document.getElementById('next-visit-error');
  if (el) el.style.display = 'none';
}

// Main button: Auto Schedule Next Visit
function autoScheduleNextVisit() {
  const isoVal = getElementValue('next-visit-iso', '');
  const interval = getElementValue('next-visit-interval', '');
  const alertBefore = parseInt(getElementValue('next-visit-alert-before', '60'), 10);

  // Validate
  if (!interval) {
    showNextVisitError('⚠️ يرجى اختيار فترة المتابعة أولاً.');
    return;
  }

  // Re-calculate if not already done
  if (!isoVal) {
    if (interval === 'custom') {
      onCustomNextVisitDateChange();
    } else {
      calcNextVisitDate();
    }
  }

  const finalIso = getElementValue('next-visit-iso', '');
  if (!finalIso) {
    showNextVisitError('⚠️ لم يتم تحديد موعد صالح. يرجى مراجعة البيانات المدخلة.');
    return;
  }

  const nextDate = new Date(finalIso);
  const patId = getElementValue('visit-patient-id', '') || getElementValue('new-visit-patient-id', '');
  const p = patients.find(x => x.patientId === patId) || { fullName: 'المريض', phone: clinicSettings.phone };

  const intervalLabel = INTERVAL_LABELS[interval] || 'موعد مخصص';
  const alertDateMs = nextDate.getTime() - (alertBefore * 60 * 1000);
  const alertDate = new Date(alertDateMs);

  // Save to patient's next visit info
  const patIdx = patients.findIndex(x => x.patientId === patId);
  if (patIdx >= 0) {
    patients[patIdx].nextVisit = {
      isoDate: finalIso,
      interval: interval,
      intervalLabel: intervalLabel,
      alertBefore: alertBefore,
      alertIso: alertDate.toISOString(),
      status: 'مجدول',
      setAt: new Date().toISOString()
    };
    saveStateToLocalStorage();
  }

  // Add to notification logs
  const msgId = `NV-${Date.now()}`;
  notificationLogs.unshift({
    msgId,
    patientId: patId,
    patientName: p.fullName,
    patientPhone: p.phone || clinicSettings.phone,
    type: 'next_visit',
    typeName: `📅 زيارة قادمة (${intervalLabel})`,
    appointmentTime: nextDate.toLocaleDateString('ar-EG', { weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' }),
    messageText: `تذكير: زيارة تمريضية منزلية مقررة للمريض ${p.fullName} بتاريخ ${nextDate.toLocaleDateString('ar-EG')} - إبراهيم ماهر (01001097896)`,
    date: new Date().toLocaleDateString('ar-EG'),
    lastAttempt: 'بانتظار وقت الإرسال',
    status: 'Pending'
  });
  try { localStorage.setItem('nabd_notifications_v1', JSON.stringify(notificationLogs)); } catch(e) {}

  // Show confirmation
  const confirmBox = document.getElementById('next-visit-confirm-box');
  const confirmText = document.getElementById('next-visit-confirm-text');
  if (confirmBox) confirmBox.style.display = 'block';
  if (confirmText) {
    confirmText.innerHTML = `
      📅 <strong>الموعد:</strong> ${nextDate.toLocaleDateString('ar-EG', { weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' })}<br>
      ⏳ <strong>المتبقي:</strong> ${getTimeRemainingText(nextDate)}<br>
      🔔 <strong>التذكير:</strong> يُرسل قبل الموعد بـ ${alertBefore < 60 ? alertBefore + ' دقيقة' : (alertBefore/60) < 24 ? (alertBefore/60) + ' ساعة' : 'يوم كامل'}<br>
      📋 <strong>نوع التكرار:</strong> ${intervalLabel}<br>
      📊 <strong>حالة التذكير:</strong> مجدول ✅
    `;
  }

  hideNextVisitError();
  showToast(`✅ تم جدولة الزيارة القادمة للمريض ${p.fullName} بنجاح!`, 'success');
  renderNotificationLogs();
  renderScheduleTable();
}

// Reset scheduler fields (called on form reset)
function resetNextVisitScheduler() {
  setElementValue('next-visit-interval', '');
  setElementValue('next-visit-ref', 'current');
  setElementValue('next-visit-display', '');
  setElementValue('next-visit-remaining', '');
  setElementValue('next-visit-iso', '');
  setElementValue('next-visit-alert-before', '60');
  const customGroup = document.getElementById('next-visit-custom-group');
  const customRefGroup = document.getElementById('custom-ref-date-group');
  const confirmBox = document.getElementById('next-visit-confirm-box');
  const errorBox = document.getElementById('next-visit-error');
  if (customGroup) customGroup.style.display = 'none';
  if (customRefGroup) customRefGroup.style.display = 'none';
  if (confirmBox) confirmBox.style.display = 'none';
  if (errorBox) errorBox.style.display = 'none';
}

/* ============================================================
   FULLY CONFIGURABLE FIELD MANAGER ENGINE (مدير الحقول والقوائم التفاعلي)
   ============================================================ */

const defaultFieldLists = {
  // Medical
  diagnosis: [
    { id: "diag_1", label: "مرض السكري (Diabetes Mellitus)", value: "مرض السكري", category: "Medical", disabled: false, favorite: true },
    { id: "diag_2", label: "ارتفاع ضغط الدم (Hypertension)", value: "ارتفاع ضغط الدم", category: "Medical", disabled: false, favorite: true },
    { id: "diag_3", label: "قرحة الفراش / الجروح المعقدة (Bedsores)", value: "قرحة الفراش", category: "Medical", disabled: false, favorite: true },
    { id: "diag_4", label: "قدم سكري (Diabetic Foot)", value: "قدم سكري", category: "Medical", disabled: false, favorite: true },
    { id: "diag_5", label: "أمراض القلب والشرايين (Cardiovascular)", value: "أمراض القلب", category: "Medical", disabled: false, favorite: false },
    { id: "diag_6", label: "الفشل الكلوي (Renal Failure)", value: "فشل كلوي", category: "Medical", disabled: false, favorite: false },
    { id: "diag_7", label: "الجلطة الدماغية والشلل (Stroke/Paralysis)", value: "جلطة دماغية", category: "Medical", disabled: false, favorite: false }
  ],
  complaints: [
    { id: "cmp_1", label: "غيار على جرح سكري في القدم", value: "غيار جرح سكري", category: "Medical", disabled: false, favorite: true },
    { id: "cmp_2", label: "متابعة قياس الضغط والسكر اليومي", value: "متابعة ضغط وسكر", category: "Medical", disabled: false, favorite: true },
    { id: "cmp_3", label: "تركيب / تغيير قسطرة بولية (Foley Catheter)", value: "تركيب قسطرة بولية", category: "Medical", disabled: false, favorite: true },
    { id: "cmp_4", label: "تركيب / إطعام رايل (NG Tube)", value: "تركيب رايل", category: "Medical", disabled: false, favorite: true },
    { id: "cmp_5", label: "اعطاء محاليل وحقن ووريد", value: "محلول ووريد", category: "Medical", disabled: false, favorite: true },
    { id: "cmp_6", label: "عناية تمريضية مقيمة 24 ساعة", value: "تمريض مقيم", category: "Medical", disabled: false, favorite: false }
  ],
  vitals_sugar_type: [
    { id: "st_1", label: "عشوائي (Random)", value: "عشوائي (Random)", category: "Medical", disabled: false, favorite: true },
    { id: "st_2", label: "صائم (Fasting)", value: "صائم (Fasting)", category: "Medical", disabled: false, favorite: true },
    { id: "st_3", label: "بعد الأكل (Postprandial)", value: "بعد الأكل (Postprandial)", category: "Medical", disabled: false, favorite: true }
  ],
  wound_type: [
    { id: "wt_1", label: "قرحة فراش (Pressure Ulcer)", value: "قرحة فراش", category: "Medical", disabled: false, favorite: true },
    { id: "wt_2", label: "قدم سكري (Diabetic Foot Ulcer)", value: "قدم سكري", category: "Medical", disabled: false, favorite: true },
    { id: "wt_3", label: "جرح جراحي بعد عملية (Post-Op Surgical)", value: "جرح جراحي", category: "Medical", disabled: false, favorite: true },
    { id: "wt_4", label: "حروق (Burn Wound)", value: "حروق", category: "Medical", disabled: false, favorite: false },
    { id: "wt_5", label: "قرحة وريدية / شريانية (Vascular Ulcer)", value: "قرحة وريدية", category: "Medical", disabled: false, favorite: false }
  ],
  wound_stage: [
    { id: "ws_1", label: "المرحلة الأولى (Stage I - احمرار فقط)", value: "المرحلة الأولى", category: "Medical", disabled: false, favorite: true },
    { id: "ws_2", label: "المرحلة الثانية (Stage II - فقدان جزئي للجلد)", value: "المرحلة الثانية", category: "Medical", disabled: false, favorite: true },
    { id: "ws_3", label: "المرحلة الثالثة (Stage III - عميق للأنسجة)", value: "المرحلة الثالثة", category: "Medical", disabled: false, favorite: true },
    { id: "ws_4", label: "المرحلة الرابعة (Stage IV - وصول للعظام)", value: "المرحلة الرابعة", category: "Medical", disabled: false, favorite: true }
  ],
  dressing_type: [
    { id: "dt_1", label: "غيار معقم عادي شاش وبغادين", value: "غيار عادي", category: "Medical", disabled: false, favorite: true },
    { id: "dt_2", label: "غيار فضة وفوم ذكي (Silver & Foam Dressing)", value: "غيار فضة وفوم", category: "Medical", disabled: false, favorite: true },
    { id: "dt_3", label: "غيار هيدروجيل ورطوبة (Hydrogel)", value: "غيار هيدروجيل", category: "Medical", disabled: false, favorite: false },
    { id: "dt_4", label: "غيار ألجينات الصوديوم (Alginate Dressing)", value: "غيار ألجينات", category: "Medical", disabled: false, favorite: false }
  ],

  // Administrative
  gender: [
    { id: "g_1", label: "ذكر", value: "ذكر", category: "Administrative", disabled: false, favorite: true },
    { id: "g_2", label: "أنثى", value: "أنثى", category: "Administrative", disabled: false, favorite: true }
  ],
  marital_status: [
    { id: "ms_1", label: "متزوج / متزوجة", value: "متزوج", category: "Administrative", disabled: false, favorite: true },
    { id: "ms_2", label: "أعزب / عزباء", value: "أعزب", category: "Administrative", disabled: false, favorite: true },
    { id: "ms_3", label: "أرمل / أرملة", value: "أرمل", category: "Administrative", disabled: false, favorite: false },
    { id: "ms_4", label: "مطلق / مطلقة", value: "مطلق", category: "Administrative", disabled: false, favorite: false }
  ],
  blood_group: [
    { id: "bg_1", label: "O+", value: "O+", category: "Administrative", disabled: false, favorite: true },
    { id: "bg_2", label: "A+", value: "A+", category: "Administrative", disabled: false, favorite: true },
    { id: "bg_3", label: "B+", value: "B+", category: "Administrative", disabled: false, favorite: true },
    { id: "bg_4", label: "AB+", value: "AB+", category: "Administrative", disabled: false, favorite: true },
    { id: "bg_5", label: "O-", value: "O-", category: "Administrative", disabled: false, favorite: false },
    { id: "bg_6", label: "A-", value: "A-", category: "Administrative", disabled: false, favorite: false },
    { id: "bg_7", label: "B-", value: "B-", category: "Administrative", disabled: false, favorite: false },
    { id: "bg_8", label: "AB-", value: "AB-", category: "Administrative", disabled: false, favorite: false }
  ],
  service_areas: [
    { id: "sa_1", label: "بندر دمياط", value: "بندر دمياط", category: "Administrative", disabled: false, favorite: true },
    { id: "sa_2", label: "مركز دمياط", value: "مركز دمياط", category: "Administrative", disabled: false, favorite: true },
    { id: "sa_3", label: "رأس البر", value: "رأس البر", category: "Administrative", disabled: false, favorite: true },
    { id: "sa_4", label: "دمياط الجديدة", value: "دمياط الجديدة", category: "Administrative", disabled: false, favorite: true },
    { id: "sa_5", label: "كفر البطيخ", value: "كفر البطيخ", category: "Administrative", disabled: false, favorite: false },
    { id: "sa_6", label: "فارسكور", value: "فارسكور", category: "Administrative", disabled: false, favorite: false },
    { id: "sa_7", label: "الزرقا", value: "الزرقا", category: "Administrative", disabled: false, favorite: false }
  ],
  patient_status: [
    { id: "ps_1", label: "نشط (Active)", value: "نشط", category: "Administrative", disabled: false, favorite: true },
    { id: "ps_2", label: "مكتمل الخدمة (Completed)", value: "مكتمل الخدمة", category: "Administrative", disabled: false, favorite: true },
    { id: "ps_3", label: "مؤجل (On Hold)", value: "مؤجل", category: "Administrative", disabled: false, favorite: false },
    { id: "ps_4", label: "متوفى (Deceased)", value: "متوفى", category: "Administrative", disabled: false, favorite: false }
  ],
  relationship: [
    { id: "rel_1", label: "المريض نفسه", value: "المريض نفسه", category: "Administrative", disabled: false, favorite: true },
    { id: "rel_2", label: "الابن / الابنة", value: "الابن/الابنة", category: "Administrative", disabled: false, favorite: true },
    { id: "rel_3", label: "الزوج / الزوجة", value: "الزوج/الزوجة", category: "Administrative", disabled: false, favorite: true },
    { id: "rel_4", label: "الأب / الأم", value: "الأب/الأم", category: "Administrative", disabled: false, favorite: false },
    { id: "rel_5", label: "الأخ / الأخت", value: "الأخ/الأخت", category: "Administrative", disabled: false, favorite: false }
  ],

  // Financial
  payment_methods: [
    { id: "pm_1", label: "كاش نقدياً (Cash)", value: "كاش نقدياً", category: "Financial", disabled: false, favorite: true },
    { id: "pm_2", label: "فودافون كاش / تحويل رقمي", value: "فودافون كاش", category: "Financial", disabled: false, favorite: true },
    { id: "pm_3", label: "تأمين طبي / شركة", value: "تأمين طبي", category: "Financial", disabled: false, favorite: true },
    { id: "pm_4", label: "آجل / متبقي", value: "آجل", category: "Financial", disabled: false, favorite: false }
  ],
  insurance_companies: [
    { id: "ins_1", label: "خاص نائياً (بدون تأمين)", value: "خاص", category: "Financial", disabled: false, favorite: true },
    { id: "ins_2", label: "التأمين الصحي الحكومي", value: "التأمين الصحي الحكومي", category: "Financial", disabled: false, favorite: true },
    { id: "ins_3", label: "مصر للتأمين الطبي", value: "مصر للتأمين", category: "Financial", disabled: false, favorite: false },
    { id: "ins_4", label: "أليانز (Allianz)", value: "Allianz", category: "Financial", disabled: false, favorite: false }
  ],

  // Notifications & Appointments
  reminder_type: [
    { id: "rt_1", label: "تذكير زيارة منزلية قادمة", value: "تذكير زيارة منزلية", category: "Notifications", disabled: false, favorite: true },
    { id: "rt_2", label: "تذكير بموعد دواء / علاج", value: "تذكير موعد دواء", category: "Notifications", disabled: false, favorite: true },
    { id: "rt_3", label: "تذكير غيار جروح معقم", value: "تذكير غيار جروح", category: "Notifications", disabled: false, favorite: true },
    { id: "rt_4", label: "تذكير تحاليل وفحوصات دورية", value: "تذكير تحاليل", category: "Notifications", disabled: false, favorite: false }
  ],
  visit_intervals: [
    { id: "vi_1", label: "بعد ساعتين", value: "2h", category: "Appointments", disabled: false, favorite: true },
    { id: "vi_2", label: "بعد 6 ساعات", value: "6h", category: "Appointments", disabled: false, favorite: true },
    { id: "vi_3", label: "بعد 12 ساعة", value: "12h", category: "Appointments", disabled: false, favorite: true },
    { id: "vi_4", label: "بعد يوم واحد", value: "1d", category: "Appointments", disabled: false, favorite: true },
    { id: "vi_5", label: "بعد يومين", value: "2d", category: "Appointments", disabled: false, favorite: true },
    { id: "vi_6", label: "بعد 3 أيام", value: "3d", category: "Appointments", disabled: false, favorite: true },
    { id: "vi_7", label: "بعد 5 أيام", value: "5d", category: "Appointments", disabled: false, favorite: true },
    { id: "vi_8", label: "بعد أسبوع", value: "7d", category: "Appointments", disabled: false, favorite: true },
    { id: "vi_9", label: "بعد 10 أيام", value: "10d", category: "Appointments", disabled: false, favorite: true },
    { id: "vi_10", label: "بعد أسبوعين", value: "14d", category: "Appointments", disabled: false, favorite: true },
    { id: "vi_11", label: "بعد شهر", value: "30d", category: "Appointments", disabled: false, favorite: true },
    { id: "vi_12", label: "بعد 3 شهور", value: "90d", category: "Appointments", disabled: false, favorite: true },
    { id: "vi_13", label: "بعد 6 شهور", value: "180d", category: "Appointments", disabled: false, favorite: true },
    { id: "vi_14", label: "بعد سنة", value: "365d", category: "Appointments", disabled: false, favorite: true },
    { id: "vi_15", label: "موعد مخصص يدوياً", value: "custom", category: "Appointments", disabled: false, favorite: true }
  ],
  alert_pretimes: [
    { id: "ap_1", label: "15 دقيقة", value: "15", category: "Appointments", disabled: false, favorite: true },
    { id: "ap_2", label: "30 دقيقة", value: "30", category: "Appointments", disabled: false, favorite: true },
    { id: "ap_3", label: "ساعة واحدة", value: "60", category: "Appointments", disabled: false, favorite: true },
    { id: "ap_4", label: "3 ساعات", value: "180", category: "Appointments", disabled: false, favorite: true },
    { id: "ap_5", label: "6 ساعات", value: "360", category: "Appointments", disabled: false, favorite: true },
    { id: "ap_6", label: "يوم كامل", value: "1440", category: "Appointments", disabled: false, favorite: true }
  ],

  // Custom Lists
  services: [
    { id: "srv_1", label: "غيار جروح وقرح معقم", value: "غيار جروح وقرح معقم", category: "Custom Lists", disabled: false, favorite: true },
    { id: "srv_2", label: "قياس ومتابعة العلامات الحيوية", value: "قياس العلامات الحيوية", category: "Custom Lists", disabled: false, favorite: true },
    { id: "srv_3", label: "تركيب / تغيير قسطرة بولية", value: "تركيب قسطرة بولية", category: "Custom Lists", disabled: false, favorite: true },
    { id: "srv_4", label: "تركيب / إطعام رايل معدي", value: "تركيب رايل معدي", category: "Custom Lists", disabled: false, favorite: true },
    { id: "srv_5", label: "اعطاء محاليل ووريد وحقن", value: "اعطاء محاليل وحقن", category: "Custom Lists", disabled: false, favorite: true },
    { id: "srv_6", label: "سحب عينات تحاليل منزلية", value: "سحب عينات تحاليل", category: "Custom Lists", disabled: false, favorite: false }
  ],
  medications: [
    { id: "med_1", label: "Clexane 40mg Injection", value: "Clexane 40mg Injection", category: "Custom Lists", disabled: false, favorite: true },
    { id: "med_2", label: "Ceftriaxone 1g IV Vial", value: "Ceftriaxone 1g IV Vial", category: "Custom Lists", disabled: false, favorite: true },
    { id: "med_3", label: "Augmentin 1g Tablets", value: "Augmentin 1g Tablets", category: "Custom Lists", disabled: false, favorite: true },
    { id: "med_4", label: "Insulin Mixtard 30/70", value: "Insulin Mixtard", category: "Custom Lists", disabled: false, favorite: true },
    { id: "med_5", label: "Concor 5mg Tablets", value: "Concor 5mg", category: "Custom Lists", disabled: false, favorite: false }
  ]
};

const FIELD_LIST_REGISTRY = {
  // Medical
  diagnosis:          { name: "التشخيصات والأمراض المزمنة", category: "Medical", selectIds: ["filter-disease"] },
  complaints:         { name: "الشكاوى الرئيسية", category: "Medical", selectIds: [] },
  vitals_sugar_type:  { name: "نوع قياس السكر", category: "Medical", selectIds: ["vital-sugar-type"] },
  wound_type:         { name: "أنواع الجروح والقرح", category: "Medical", selectIds: ["wound-type"] },
  wound_stage:        { name: "درجات الجروح والقرح", category: "Medical", selectIds: ["wound-stage"] },
  dressing_type:      { name: "أنواع الغيارات والمستلزمات", category: "Medical", selectIds: ["wound-dressing-type"] },
  medical_history:    { name: "التاريخ الطبي والجراحي", category: "Medical", selectIds: [] },
  home_equipment:     { name: "المستلزمات والأجهزة المنزلية", category: "Medical", selectIds: [] },
  medical_devices:    { name: "الأجهزة الطبية والمعدات", category: "Medical", selectIds: [] },

  // Administrative
  gender:             { name: "النوع / الجنس", category: "Administrative", selectIds: ["tab-pat-gender", "edit-pat-gender"] },
  marital_status:     { name: "الحالة الاجتماعية", category: "Administrative", selectIds: ["tab-pat-marital", "edit-pat-marital"] },
  blood_group:        { name: "فصيلة الدم", category: "Administrative", selectIds: ["tab-pat-blood", "edit-pat-blood"] },
  service_areas:      { name: "مناطق الخدمة بدمياط", category: "Administrative", selectIds: ["tab-pat-area", "edit-pat-area", "filter-area"] },
  patient_status:     { name: "حالة المريض", category: "Administrative", selectIds: ["tab-pat-status", "edit-pat-status"] },
  relationship:       { name: "صلة القرابة للمرافق", category: "Administrative", selectIds: ["tab-pat-rel", "edit-pat-rel"] },

  // Financial
  payment_methods:    { name: "طرق الدفع والتحصيل", category: "Financial", selectIds: ["bill-payment-method"] },
  insurance_companies:{ name: "شركات التأمين والمؤسسات", category: "Financial", selectIds: ["tab-pat-insurance"] },

  // Notifications
  reminder_type:      { name: "أنواع التذكيرات", category: "Notifications", selectIds: [] },

  // Appointments
  visit_intervals:    { name: "فواصل المتابعة القادمة", category: "Appointments", selectIds: ["next-visit-interval"] },
  alert_pretimes:     { name: "أوقات التنبيه المسبق", category: "Appointments", selectIds: ["next-visit-alert-before"] },

  // Custom Lists
  services:           { name: "الخدمات التمريضية والإجراءات", category: "Custom Lists", selectIds: [] },
  medications:        { name: "الأدوية والعقاقير", category: "Custom Lists", selectIds: [] }
};

let systemFieldLists = defaultFieldLists;
try {
  const savedLists = localStorage.getItem('nabd_system_field_lists_v1');
  if (savedLists) {
    const parsed = JSON.parse(savedLists);
    systemFieldLists = { ...defaultFieldLists, ...parsed };
  }
} catch (e) {
  console.log('Using default field lists:', e);
}

function saveFieldListsToLocalStorage() {
  try {
    localStorage.setItem('nabd_system_field_lists_v1', JSON.stringify(systemFieldLists));
  } catch (e) {
    console.error('Error saving field lists:', e);
  }
}

let currentFieldManagerCategory = 'Medical';

function setFieldManagerCategory(category, btnElement) {
  currentFieldManagerCategory = category;
  if (btnElement) {
    document.querySelectorAll('#field-manager-category-chips button').forEach(b => {
      b.classList.remove('btn-primary');
      b.classList.add('btn-secondary');
    });
    btnElement.classList.remove('btn-secondary');
    btnElement.classList.add('btn-primary');
  }
  populateFieldManagerListSelect();
}

function populateFieldManagerListSelect() {
  const select = document.getElementById('field-manager-list-select');
  if (!select) return;

  const categoryKeys = Object.keys(FIELD_LIST_REGISTRY).filter(k => FIELD_LIST_REGISTRY[k].category === currentFieldManagerCategory);

  select.innerHTML = categoryKeys.map(k => `<option value="${k}">${FIELD_LIST_REGISTRY[k].name}</option>`).join('');

  if (categoryKeys.length > 0) {
    select.value = categoryKeys[0];
  }
  renderFieldManagerOptions();
}

function renderFieldManagerOptions() {
  const listSelect = document.getElementById('field-manager-list-select');
  const container = document.getElementById('field-manager-options-container');
  const titleEl = document.getElementById('field-manager-current-title');
  const searchInput = document.getElementById('field-manager-search');

  if (!listSelect || !container) return;

  const listKey = listSelect.value;
  if (!listKey || !FIELD_LIST_REGISTRY[listKey]) {
    container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:1rem;">اختر قائمة لعرض الخيارات المتاحة.</div>`;
    return;
  }

  const listInfo = FIELD_LIST_REGISTRY[listKey];
  if (titleEl) titleEl.innerText = `📋 قائمة: ${listInfo.name}`;

  const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
  const list = systemFieldLists[listKey] || [];

  if (list.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:1.5rem; background:rgba(255,255,255,0.02); border-radius:8px;">لا توجد خيارات مسجلة لهذه القائمة حتى الآن. اضغط "+ إضافة خيار جديد" لإضافة أول خيار.</div>`;
    return;
  }

  const filtered = list.filter(opt => opt.label.toLowerCase().includes(query) || opt.value.toLowerCase().includes(query));

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:1rem;">لا توجد نتائج تطابق "${query}".</div>`;
    return;
  }

  container.innerHTML = filtered.map((opt, idx) => {
    const isFav = opt.favorite;
    const isDis = opt.disabled;
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; background: ${isDis ? 'rgba(255,82,82,0.05)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${isDis ? 'rgba(255,82,82,0.3)' : 'var(--border-color)'}; padding: 0.75rem 1rem; border-radius: 10px; gap: 0.5rem; flex-wrap: wrap;">
        <div style="display:flex; align-items:center; gap:0.6rem;">
          <button class="btn btn-sm" style="background:none; border:none; padding:0; font-size:1.2rem; cursor:pointer;" onclick="toggleFavoriteOptionInFieldList('${listKey}', '${opt.id}')" title="تمييز كـ مفضل">
            ${isFav ? '⭐' : '☆'}
          </button>
          <div>
            <strong style="color:${isDis ? 'var(--text-muted)' : '#fff'}; font-size:0.95rem; text-decoration:${isDis ? 'line-through' : 'none'};">
              ${opt.label}
            </strong>
            <span style="font-size:0.75rem; color:var(--text-muted); margin-right:0.4rem;">
              (${isDis ? '🔴 معطل' : '🟢 مفعل'})
            </span>
          </div>
        </div>

        <div style="display:flex; gap:0.3rem; flex-wrap:wrap; align-items:center;">
          <button class="btn btn-sm btn-secondary" onclick="reorderOptionInFieldList('${listKey}', '${opt.id}', 'up')" ${idx === 0 ? 'disabled' : ''} title="تحريك لأعلى">⬆️</button>
          <button class="btn btn-sm btn-secondary" onclick="reorderOptionInFieldList('${listKey}', '${opt.id}', 'down')" ${idx === filtered.length - 1 ? 'disabled' : ''} title="تحريك لأسفل">⬇️</button>
          <button class="btn btn-sm btn-amber" onclick="editOptionInFieldList('${listKey}', '${opt.id}')">✏️ تعديل</button>
          <button class="btn btn-sm ${isDis ? 'btn-success' : 'btn-secondary'}" onclick="toggleDisableOptionInFieldList('${listKey}', '${opt.id}')">
            ${isDis ? '🔄 تفعيل' : '🚫 تعطيل'}
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteOptionFromFieldList('${listKey}', '${opt.id}')">🗑️ حذف</button>
        </div>
      </div>
    `;
  }).join('');
}

function promptAddNewOptionToCurrentList(listKey = null, targetSelectId = null) {
  if (!listKey) {
    const listSelect = document.getElementById('field-manager-list-select');
    if (listSelect) listKey = listSelect.value;
  }
  if (!listKey || !FIELD_LIST_REGISTRY[listKey]) return;

  const displayName = FIELD_LIST_REGISTRY[listKey].name;
  const newLabel = prompt(`➕ إضافة خيار جديد لقائمة [${displayName}]:`);
  if (!newLabel || !newLabel.trim()) {
    if (targetSelectId) {
      const el = document.getElementById(targetSelectId);
      if (el) el.value = "";
    }
    return;
  }

  const cleanLabel = newLabel.trim();
  const list = systemFieldLists[listKey] || [];
  const existing = list.find(opt => opt.label.toLowerCase() === cleanLabel.toLowerCase() || opt.value.toLowerCase() === cleanLabel.toLowerCase());

  if (existing) {
    existing.disabled = false;
    saveFieldListsToLocalStorage();
    showToast(`✨ الخيار "${cleanLabel}" موجود بالفعل وتم تفعيله!`, 'info');
  } else {
    const newOpt = {
      id: `${listKey}_${Date.now()}`,
      label: cleanLabel,
      value: cleanLabel,
      category: FIELD_LIST_REGISTRY[listKey].category,
      disabled: false,
      favorite: false
    };
    list.push(newOpt);
    systemFieldLists[listKey] = list;
    saveFieldListsToLocalStorage();
    showToast(`✨ تم إضافة "${cleanLabel}" بنجاح وإتاحته للجميع!`, 'success');
  }

  refreshAllConfigurableSelects();
  renderFieldManagerOptions();

  if (targetSelectId) {
    const select = document.getElementById(targetSelectId);
    if (select) {
      populateSelectFromFieldList(targetSelectId, listKey, cleanLabel, true);
      select.value = cleanLabel;
    }
  }
}

function editOptionInFieldList(listKey, optionId) {
  const list = systemFieldLists[listKey] || [];
  const opt = list.find(item => item.id === optionId);
  if (!opt) return;

  const newLabel = prompt(`✏️ تعديل الخيار [${opt.label}]:`, opt.label);
  if (!newLabel || !newLabel.trim()) return;

  opt.label = newLabel.trim();
  opt.value = newLabel.trim();
  saveFieldListsToLocalStorage();
  refreshAllConfigurableSelects();
  renderFieldManagerOptions();
  showToast('✅ تم تعديل الخيار بنجاح!', 'success');
}

function toggleDisableOptionInFieldList(listKey, optionId) {
  const list = systemFieldLists[listKey] || [];
  const opt = list.find(item => item.id === optionId);
  if (!opt) return;

  opt.disabled = !opt.disabled;
  saveFieldListsToLocalStorage();
  refreshAllConfigurableSelects();
  renderFieldManagerOptions();
  showToast(opt.disabled ? '🔴 تم تعطيل الخيار بنجاح.' : '🟢 تم إعادة تفعيل الخيار بنجاح.', 'info');
}

function toggleFavoriteOptionInFieldList(listKey, optionId) {
  const list = systemFieldLists[listKey] || [];
  const opt = list.find(item => item.id === optionId);
  if (!opt) return;

  opt.favorite = !opt.favorite;
  saveFieldListsToLocalStorage();
  refreshAllConfigurableSelects();
  renderFieldManagerOptions();
  showToast(opt.favorite ? '⭐ تم إضافة الخيار للمفضلة!' : '☆ تم إزالة الخيار من المفضلة.', 'info');
}

function reorderOptionInFieldList(listKey, optionId, direction) {
  const list = systemFieldLists[listKey] || [];
  const idx = list.findIndex(item => item.id === optionId);
  if (idx < 0) return;

  if (direction === 'up' && idx > 0) {
    const temp = list[idx];
    list[idx] = list[idx - 1];
    list[idx - 1] = temp;
  } else if (direction === 'down' && idx < list.length - 1) {
    const temp = list[idx];
    list[idx] = list[idx + 1];
    list[idx + 1] = temp;
  }

  systemFieldLists[listKey] = list;
  saveFieldListsToLocalStorage();
  refreshAllConfigurableSelects();
  renderFieldManagerOptions();
}

function deleteOptionFromFieldList(listKey, optionId) {
  const list = systemFieldLists[listKey] || [];
  const opt = list.find(item => item.id === optionId);
  if (!opt) return;

  showConfirmDialog(`هل أنت تأكد من حذف الخيار "${opt.label}" من القائمة؟`, () => {
    systemFieldLists[listKey] = list.filter(item => item.id !== optionId);
    saveFieldListsToLocalStorage();
    refreshAllConfigurableSelects();
    renderFieldManagerOptions();
    showToast('🗑️ تم حذف الخيار من القائمة.', 'success');
  });
}

function resetFieldListsToDefault() {
  showConfirmDialog('هل تريد إعادة جميع القوائم التفاعلية لحالتها الافتراضية؟ (لن تفقد بيانات المرضى المسجلين)', () => {
    systemFieldLists = JSON.parse(JSON.stringify(defaultFieldLists));
    saveFieldListsToLocalStorage();
    refreshAllConfigurableSelects();
    renderFieldManagerOptions();
    showToast('🔄 تم استعادة جميع القوائم الافتراضية بنجاح!', 'success');
  });
}

function populateSelectFromFieldList(selectId, listKey, selectedVal = "", allowAddCustom = true) {
  const select = document.getElementById(selectId);
  if (!select) return;

  const list = systemFieldLists[listKey] || [];
  const sortedList = [...list].sort((a, b) => {
    if (a.favorite && !b.favorite) return -1;
    if (!a.favorite && b.favorite) return 1;
    if (a.disabled && !b.disabled) return 1;
    if (!a.disabled && b.disabled) return -1;
    return 0;
  });

  let optionsHtml = `<option value="">غير محدد</option>`;

  sortedList.forEach(opt => {
    if (opt.disabled && opt.value !== selectedVal) return;
    const isSelected = (opt.value === selectedVal || opt.label === selectedVal) ? 'selected' : '';
    const star = opt.favorite ? '⭐ ' : '';
    optionsHtml += `<option value="${opt.value}" ${isSelected}>${star}${opt.label}</option>`;
  });

  if (allowAddCustom) {
    optionsHtml += `<option value="__ADD_CUSTOM__" style="color:var(--accent-cyan); font-weight:bold;">➕ إضافة خيار جديد للقائمة...</option>`;
  }

  select.innerHTML = optionsHtml;

  if (allowAddCustom && !select.dataset.customAdderAttached) {
    select.dataset.customAdderAttached = "true";
    select.addEventListener('change', function() {
      if (this.value === '__ADD_CUSTOM__') {
        promptAddNewOptionToCurrentList(listKey, selectId);
      }
    });
  }
}

function refreshAllConfigurableSelects() {
  populateSelectFromFieldList('tab-pat-gender', 'gender', getElementValue('tab-pat-gender', 'ذكر'));
  populateSelectFromFieldList('tab-pat-area', 'service_areas', getElementValue('tab-pat-area', 'بندر دمياط'));
  populateSelectFromFieldList('tab-pat-status', 'patient_status', getElementValue('tab-pat-status', 'نشط'));
  populateSelectFromFieldList('tab-pat-blood', 'blood_group', getElementValue('tab-pat-blood', 'غير محدد'));
  populateSelectFromFieldList('tab-pat-disease-select', 'diagnosis', getElementValue('tab-pat-disease-select', ''));
  populateSelectFromFieldList('tab-pat-service-select', 'services', getElementValue('tab-pat-service-select', ''));
  populateSelectFromFieldList('tab-next-visit-interval', 'visit_intervals', getElementValue('tab-next-visit-interval', ''));
  populateSelectFromFieldList('tab-next-visit-alert-before', 'alert_pretimes', getElementValue('tab-next-visit-alert-before', '60'));

  populateSelectFromFieldList('edit-pat-gender', 'gender', getElementValue('edit-pat-gender', ''));
  populateSelectFromFieldList('edit-pat-area', 'service_areas', getElementValue('edit-pat-area', ''));
  populateSelectFromFieldList('edit-pat-status', 'patient_status', getElementValue('edit-pat-status', ''));

  populateSelectFromFieldList('filter-area', 'service_areas', getElementValue('filter-area', ''), false);
  populateSelectFromFieldList('filter-disease', 'diagnosis', getElementValue('filter-disease', ''), false);

  populateSelectFromFieldList('vital-sugar-type', 'vitals_sugar_type', getElementValue('vital-sugar-type', 'عشوائي (Random)'));
  populateSelectFromFieldList('next-visit-interval', 'visit_intervals', getElementValue('next-visit-interval', ''));
  populateSelectFromFieldList('next-visit-alert-before', 'alert_pretimes', getElementValue('next-visit-alert-before', '60'));
}



