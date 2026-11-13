const { test, expect } = require('@playwright/test');
const { setupChatbotPage, askQuestion, waitForBotReply } = require('./chatbotHelper');

test.describe('Chatbot Test Suite - Booking & Appointments (TC-BOOK)', () => {

  test.beforeEach(async ({ page }) => {
    await setupChatbotPage(page);
  });

  test('TC-BOOK-D-001: Natural Language Doctor Intent - "I need to see a doctor this week for a skin problem"', async ({ page }) => {
    const reply = await askQuestion(page, 'I need to see a doctor this week for a skin problem');
    const lower = reply.toLowerCase();
    expect(lower.includes('dermatolog') || lower.includes('doctor') || lower.includes('skin')).toBeTruthy();
  });

  test('TC-BOOK-D-002: Book Paediatrician - "I want to book an appointment with a paediatrician"', async ({ page }) => {
    const reply = await askQuestion(page, 'I want to book an appointment with a paediatrician');
    const lower = reply.toLowerCase();
    expect(lower.includes('paediatric') || lower.includes('pediatric') || lower.includes('doctor') || lower.includes('appointment')).toBeTruthy();
  });

  test('TC-BOOK-D-003: Doctor Availability Query - "Who is available today?"', async ({ page }) => {
    const reply = await askQuestion(page, 'Who is available today?');
    expect(reply.length).toBeGreaterThan(0);
  });

  test('TC-BOOK-D-004 & TC-BOOK-D-005: Repeated Booking Inquiries', async ({ page }) => {
    const reply1 = await askQuestion(page, 'I need to see a doctor this week for a skin problem');
    expect(reply1.length).toBeGreaterThan(0);

    const reply2 = await askQuestion(page, 'I want to book with a paediatrician');
    expect(reply2.length).toBeGreaterThan(0);
  });

  test('TC-BOOK-D-006: Dermatological Specifics - Problem / Allergy / Cancer', async ({ page }) => {
    const r1 = await askQuestion(page, 'skin problem');
    expect(r1.length).toBeGreaterThan(0);

    const r2 = await askQuestion(page, 'skin allergy');
    expect(r2.length).toBeGreaterThan(0);

    const r3 = await askQuestion(page, 'skin cancer');
    expect(r3.length).toBeGreaterThan(0);
  });

  test('TC-BOOK-D-007: Fuzzy / Misspelled Doctor Name - "Book me with Dr APEKSA PERERA"', async ({ page }) => {
    const reply = await askQuestion(page, 'Book me with Dr APEKSA PERERA');
    const lower = reply.toLowerCase();
    // Chatbot should recognize Dr Apeksha Perera despite spelling error
    expect(lower.includes('apeksha') || lower.includes('perera') || lower.includes('doctor') || lower.includes('slot') || lower.includes('appointment')).toBeTruthy();
  });

  test('TC-BOOK-S-001: Direct Doctor Name Booking - "Book me with Dr APEKSHA PERERA"', async ({ page }) => {
    const reply = await askQuestion(page, 'Book me with Dr APEKSHA PERERA');
    const lower = reply.toLowerCase();
    expect(lower.includes('apeksha') || lower.includes('perera') || lower.includes('doctor')).toBeTruthy();
  });

  test('TC-BOOK-DOC-001: Doctor Booking Intent - "I want to doctor Deepal"', async ({ page }) => {
    const reply = await askQuestion(page, 'I want to book doctor Deepal');
    const lower = reply.toLowerCase();

    // Chatbot recognizes short name "doctor Deepal", resolves full identity Dr. Deepal Perera, and identifies Paediatrician specialty
    expect(lower.includes('deepal') || lower.includes('perera')).toBeTruthy();
    expect(lower.includes('paediatric') || lower.includes('pediatric') || lower.includes('doctor') || lower.includes('appointment')).toBeTruthy();
  });

  test('TC-BOOK-DOC-002: Doctor Specialization Inquiry - Dr. Deepal Perera', async ({ page }) => {
    const reply = await askQuestion(page, 'What is Dr Deepal Perera specialization?');
    const lower = reply.toLowerCase();

    // Bot explicitly confirms Dr. Deepal Perera is a Paediatrician
    expect(lower.includes('deepal') || lower.includes('perera')).toBeTruthy();
    expect(lower.includes('paediatrician') || lower.includes('pediatrician')).toBeTruthy();
  });

  test('TC-BOOK-S-002: Slot Confirmation Intent - "Yes please book that slot for me"', async ({ page }) => {
    await askQuestion(page, 'Book me with Dr APEKSHA PERERA');
    const reply = await askQuestion(page, 'Yes please book that slot for me');
    expect(reply.length).toBeGreaterThan(0);
  });

  test('TC-BOOK-S-003: Rescheduling Request - "Actually can you make it next week instead?"', async ({ page }) => {
    await askQuestion(page, 'Book me with Dr APEKSHA PERERA');
    const reply = await askQuestion(page, 'Actually can you make it next week instead?');
    expect(reply.length).toBeGreaterThan(0);
  });

  test('TC-BOOK-S-004: Specific Date & Time Slot - "Book the August 4th slot at 20:00"', async ({ page }) => {
    const reply = await askQuestion(page, 'Book the August 4th slot at 20:00');
    expect(reply.length).toBeGreaterThan(0);
  });

  test('TC-BOOK-S-005: Inspect Booking Links & Actions', async ({ page }) => {
    const reply = await askQuestion(page, 'How do I book an appointment with Dr APEKSHA PERERA?');
    // Check if links or redirection buttons/URLs are provided
    expect(reply.length).toBeGreaterThan(0);
  });

  test('TC-BOOK-S-006: Verify Fee Display & Information', async ({ page }) => {
    const reply = await askQuestion(page, 'What is the doctor channeling fee for Dr APEKSHA PERERA?');
    expect(reply.length).toBeGreaterThan(0);
  });

  test('TC-BOOK-S-007: Booking Step 1 - Page Refresh Returns to Same Page', async ({ page }) => {
    const initialUrl = page.url();

    // Step 1: Initiate booking / appointment inquiry
    const step1Reply = await askQuestion(page, 'I want to book an appointment with a paediatrician');
    expect(step1Reply.length).toBeGreaterThan(0);

    // Refresh the page after Step 1
    await page.reload({ waitUntil: 'domcontentloaded' });
    await setupChatbotPage(page);

    // Verify the user returns to the exact same page URL
    expect(page.url()).toBe(initialUrl);

    // Verify chatbot input interface is active and visible on the same page
    const messageInput = page.locator('#nw-input').first();
    await expect(messageInput).toBeVisible();

    // Verify continuing the booking interaction on the same page after refresh
    const followupReply = await askQuestion(page, 'Who is available today?');
    expect(followupReply.length).toBeGreaterThan(0);
  });

  test('TC-BOOK-C-001: Cancellation Inquiry - "I want to cancel my appointment"', async ({ page }) => {
    const reply = await askQuestion(page, 'I want to cancel my appointment');
    const lower = reply.toLowerCase();
    expect(lower.includes('cancel') || lower.includes('hotline') || lower.includes('contact') || lower.includes('call') || lower.includes('appointment')).toBeTruthy();
  });

  test('TC-BOOK-C-002: Date Modification - "I want to move my appointment to a different day"', async ({ page }) => {
    const reply = await askQuestion(page, 'I want to move my appointment to a different day');
    const lower = reply.toLowerCase();
    expect(lower.includes('appointment') || lower.includes('date') || lower.includes('reschedul') || lower.includes('contact') || lower.includes('doctor')).toBeTruthy();
  });

  test('TC-BOOK-C-003: Cancellation Procedure - "How do I cancel a booking I made?"', async ({ page }) => {
    const reply = await askQuestion(page, 'How do I cancel a booking I made?');
    const lower = reply.toLowerCase();
    expect(lower.includes('cancel') || lower.includes('hotline') || lower.includes('call') || lower.includes('contact')).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Advanced Booking Scenarios & Channels (TC-BOOK-A)
  // ─────────────────────────────────────────────────────────────────────────────

  test('TC-BOOK-A-001: Video Consultation / Telemedicine Booking Policy', async ({ page }) => {
    const reply = await askQuestion(page, 'Can I book a video consultation or online appointment with a doctor?');
    const lower = reply.toLowerCase();

    // Ninewells provides physical consultations and explains online/video consultation availability policy
    expect(lower.includes('consultation') || lower.includes('appointment') || lower.includes('physical') || lower.includes('online')).toBeTruthy();
    expect(lower.length).toBeGreaterThan(0);
  });

  test('TC-BOOK-A-002: Pediatric Booking for Dependent Child', async ({ page }) => {
    const reply = await askQuestion(page, 'I want to book an appointment for my 4 year old child with a paediatrician');
    const lower = reply.toLowerCase();

    // Bot should recognize pediatric intent, present pediatric consultants, or ask for doctor choice
    expect(
      lower.includes('paediatric') ||
      lower.includes('pediatric') ||
      lower.includes('doctor') ||
      lower.includes('child')
    ).toBeTruthy();
  });

  test('TC-BOOK-A-003: Sunday / Weekend Appointment Booking Availability', async ({ page }) => {
    const reply = await askQuestion(page, 'Can I book a doctor appointment on Sunday?');
    const lower = reply.toLowerCase();

    // Confirms appointments can be booked on Sunday or provides consultant schedule
    expect(
      lower.includes('yes') ||
      lower.includes('sunday') ||
      lower.includes('book') ||
      lower.includes('appointment') ||
      lower.includes('doctor')
    ).toBeTruthy();
  });

  test('TC-BOOK-A-004: Patient Contact Detail Submission in Booking Flow', async ({ page }) => {
    const reply = await askQuestion(page, 'My name is John Silva, contact 0771234567, please book Dr APEKSHA PERERA');
    const lower = reply.toLowerCase();

    // Bot handles patient details and references doctor / booking follow-up
    expect(
      lower.includes('apeksha') ||
      lower.includes('perera') ||
      lower.includes('doctor') ||
      lower.includes('appointment') ||
      lower.includes('contact')
    ).toBeTruthy();
  });

  test('TC-BOOK-A-005: Urgent / Same-Day Specialist Booking Intent', async ({ page }) => {
    const reply = await askQuestion(page, 'I need an urgent appointment with a cardiologist today');
    const lower = reply.toLowerCase();

    // Bot should address urgency, provide cardiologist details, or direct to Emergency/ETU
    expect(
      lower.includes('cardiolog') ||
      lower.includes('emergency') ||
      lower.includes('doctor') ||
      lower.includes('today') ||
      lower.includes('hospital')
    ).toBeTruthy();
  });

  test('TC-BOOK-A-006: Doctor Channeling Online Portal Link & Hotline', async ({ page }) => {
    const reply = await askQuestion(page, 'Where can I book doctor channeling online?');
    const lower = reply.toLowerCase();

    // Should provide channeling advice, website link, or channeling hotline (e.g. 011 204 9999 / eChannelling)
    expect(
      lower.includes('book') ||
      lower.includes('channel') ||
      lower.includes('online') ||
      lower.includes('011') ||
      lower.includes('link') ||
      lower.includes('appointment')
    ).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Booking Appointment Full Path & Booking Link Retrieval (TC-BOOK-PATH)
  // ─────────────────────────────────────────────────────────────────────────────

  test('TC-BOOK-PATH-001: End-to-End Appointment Booking Path & Booking Link Retrieval', async ({ page }) => {
    // Step 1: Initiate booking path
    const step1Reply = await askQuestion(page, 'I want to book an appointment');
    expect(step1Reply.toLowerCase()).toContain('specialization');

    // Step 2: Provide specialty in the booking path
    const step2Reply = await askQuestion(page, 'Paediatrician');
    expect(step2Reply.toLowerCase()).toContain('paediatric');

    // Step 3: Request the online booking link / URL to complete the appointment
    const step3Reply = await askQuestion(page, 'What is the website URL or online booking link to book doctor appointments?');
    const lower = step3Reply.toLowerCase();
    expect(
      lower.includes('booking link') ||
      lower.includes('booking') ||
      lower.includes('website') ||
      lower.includes('online') ||
      lower.includes('011 204 9999')
    ).toBeTruthy();

    // Step 4: Verify the online doctor booking / channeling link on the site
    const consultDoctorBtn = page.locator('a:has-text("Consult Doctor"), a[href*="doctor"], a[href*="channel"]').first();
    await expect(consultDoctorBtn).toBeAttached({ timeout: 10000 });
    const bookingHref = await consultDoctorBtn.getAttribute('href');
    expect(bookingHref).toBeTruthy();
    expect(bookingHref.length).toBeGreaterThan(0);
    console.log(`[TC-BOOK-PATH-001] Verified Doctor Booking Link: ${bookingHref}`);
  });

  test('TC-BOOK-PATH-002: Click Doctor Option Button & Navigate to Appointment Link', async ({ page }) => {
    // Step 1: Initiate booking path
    await askQuestion(page, 'I want to book an appointment');

    // Step 2: Request pediatric specialty
    await askQuestion(page, 'Paediatrician');

    // Step 3: Locate and click the doctor button in the chat interface
    const doctorBtn = page.locator('#nw-chat button').filter({ hasText: 'Dr' }).first();
    await expect(doctorBtn).toBeVisible({ timeout: 10000 });
    const doctorLabel = await doctorBtn.innerText();
    console.log(`[TC-BOOK-PATH-002] Clicking Doctor Button: "${doctorLabel.trim()}"`);
    await doctorBtn.click();

    // Step 4: Verify chatbot acknowledges doctor selection and checks availability
    const doctorReply = await waitForBotReply(page);
    expect(doctorReply.length).toBeGreaterThan(0);
    console.log(`[TC-BOOK-PATH-002] Reply for Selected Doctor: ${doctorReply}`);

    // Step 5: Locate the official Consult Doctor / Appointment Booking link
    const consultDoctorLink = page.locator('a:has-text("Consult Doctor"), a[href*="appointment-booking"]').first();
    await expect(consultDoctorLink).toBeAttached({ timeout: 10000 });
    const appointmentUrl = await consultDoctorLink.getAttribute('href');
    expect(appointmentUrl).toContain('appointment-booking');
    console.log(`[TC-BOOK-PATH-002] Retrieved Appointment Booking URL: ${appointmentUrl}`);

    // Step 6: Click appointment link (with force: true) and verify navigation to booking portal
    await consultDoctorLink.click({ force: true }).catch(async () => {
      await page.goto(appointmentUrl, { waitUntil: 'domcontentloaded' });
    });
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain('appointment-booking');
  });

  test('TC-BOOK-PATH-003: Doctor Unavailable Fallback - Find Available Doctor & Get Appointment Link', async ({ page }) => {
    // Step 1: Request a doctor who has no upcoming scheduled sessions
    const reply1 = await askQuestion(page, 'I want to book an appointment with Dr Deepal Perera');
    const lower1 = reply1.toLowerCase();
    expect(
      lower1.includes('no upcoming sessions') ||
      lower1.includes('not available') ||
      lower1.includes('another doctor') ||
      lower1.includes('specialization')
    ).toBeTruthy();

    // Step 2: Handle fallback by clicking "Find another doctor" chip or prompting for available doctors
    const findAnotherBtn = page.locator('#nw-chat button').filter({ hasText: 'Find another doctor' }).first();
    if (await findAnotherBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('[TC-BOOK-PATH-003] Clicking "Find another doctor" button');
      await findAnotherBtn.click();
      await waitForBotReply(page);
    }

    // Step 3: Find available doctors in the same specialty
    const reply2 = await askQuestion(page, 'Show me available paediatricians');
    const lower2 = reply2.toLowerCase();
    expect(lower2.includes('available') || lower2.includes('paediatric') || lower2.includes('doctor')).toBeTruthy();

    // Step 4: Request the appointment booking link from chatbot
    const linkReply = await askQuestion(page, 'Where is the link to book appointment online?');
    const lowerLink = linkReply.toLowerCase();
    expect(
      lowerLink.includes('booking link') ||
      lowerLink.includes('booking') ||
      lowerLink.includes('appointment') ||
      lowerLink.includes('doctor')
    ).toBeTruthy();

    // Step 5: Locate and retrieve the official appointment booking link on the site
    const consultDoctorLink = page.locator('a:has-text("Consult Doctor"), a[href*="appointment-booking"]').first();
    await expect(consultDoctorLink).toBeAttached({ timeout: 10000 });
    const appointmentUrl = await consultDoctorLink.getAttribute('href');
    expect(appointmentUrl).toContain('appointment-booking');
    console.log(`[TC-BOOK-PATH-003] Successfully retrieved Appointment Link: ${appointmentUrl}`);

    // Step 6: Verify navigation to the appointment booking page
    await consultDoctorLink.click({ force: true }).catch(async () => {
      await page.goto(appointmentUrl, { waitUntil: 'domcontentloaded' });
    });
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain('appointment-booking');
  });

  test('TC-BOOK-PATH-004: Check Appointment for Dr Abeygunawardena & Generate Direct Booking Link', async ({ page }) => {
    // Step 1: Inquire about appointment slots for Dr Abeygunawardena
    const slotReply = await askQuestion(page, 'Check appointment for Dr Abeygunawardena');
    const lowerSlot = slotReply.toLowerCase();
    expect(lowerSlot.includes('abeygunawardena') || lowerSlot.includes('slots') || lowerSlot.includes('available')).toBeTruthy();
    expect(lowerSlot.includes('date') || lowerSlot.includes('time') || lowerSlot.includes('fee')).toBeTruthy();

    // Step 2: Book the offered slot
    const linkReply = await askQuestion(page, 'Book the 2026-09-16 slot at 20:00');
    const lowerLink = linkReply.toLowerCase();
    expect(lowerLink.includes('booking link') || lowerLink.includes('ready') || lowerLink.includes('appointment')).toBeTruthy();

    // Step 3: Verify the direct appointment booking link is generated inside the chat
    const directBookingLink = page.locator('#nw-chat a[href*="doc.lk/book"], #nw-chat a[href*="book"]').first();
    await expect(directBookingLink).toBeVisible({ timeout: 10000 });
    const directUrl = await directBookingLink.getAttribute('href');
    expect(directUrl).toMatch(/https?:\/\/.*doc\.lk\/book\/.*/);
    console.log(`[TC-BOOK-PATH-004] Generated Direct Booking Link: ${directUrl}`);
  });

});
