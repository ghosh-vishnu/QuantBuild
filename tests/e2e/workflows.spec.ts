import { test, expect } from '@playwright/test';
import { authenticate, backend, student } from './mock';

test('login requires the second-step OTP before creating a session', async ({ page }) => {
  await backend(page);
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.screenshot({
    path: 'artifacts/login-desktop.png',
    fullPage: true,
  });
  await page.getByLabel('Email address or phone number').fill('vishnu@example.com');
  await page.getByLabel('Password', { exact: true }).fill('StrongPass123!');
  await page.getByRole('button', { name: 'Continue securely' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  await expect(page.getByRole('note')).toContainText('Email verification code (testing):');
  await expect(page.getByRole('note')).toContainText('123456');
  expect(await page.evaluate(() => sessionStorage.getItem('quantibuild.session'))).toBeNull();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', { name: 'Verify & sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Good to see you, Vishnu.' })).toBeVisible();
  await expect(page.getByText('Sunrise Residential Tower', { exact: true })).toBeVisible();
  await page.screenshot({
    path: 'artifacts/overview-desktop.png',
    fullPage: true,
  });
});

test('pending account sees review status and cannot open project workspace', async ({ page }) => {
  const state = await backend(page, true);
  await authenticate(page);
  await page.goto('/app');
  await expect(page.getByText('Your account is under review', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'My projects', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your account is under review' })).toBeVisible();
  expect(state.requests.filter((r: any) => r.path === '/api/v1/projects/')).toHaveLength(0);
});

test('registration verifies both contacts before multipart student signup', async ({ page }) => {
  const state = await backend(page);
  await page.goto('/signup');
  await page.getByRole('button', { name: /Student Learn/ }).click();
  for (const [label, value] of [
    ['First name', 'Vishnu'],
    ['Last name', 'Kumar'],
    ['Email address', 'vishnu@example.com'],
    ['Phone number', '9999999999'],
    ['Password', 'StrongPass123!'],
    ['Confirm password', 'StrongPass123!'],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Email verification code', { exact: true }).fill('123456');
  await page.getByLabel('Phone verification code', { exact: true }).fill('654321');
  await page.getByRole('button', { name: 'Verify contacts' }).click();
  for (const [label, value] of [
    ['College / university', 'ABC Engineering College'],
    ['College city', 'Jaipur'],
    ['Department', 'Civil'],
    ['College ID', 'STU001'],
    ['Course', 'B.Tech'],
    ['Current year / semester', 'Semester 3'],
  ])
    await page.getByLabel(label, { exact: false }).fill(value);
  await page
    .locator('input[type=file]')
    .nth(1)
    .setInputFiles({
      name: 'id.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 student ID'),
    });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  const sent = state.requests.find((r: any) => r.path === '/api/v1/auth/signup');
  expect(sent.raw).toContain('college_id_card');
  expect(sent.raw).toContain('email-id');
  expect(sent.raw).toContain('STUDENT');
});

test('project wizard submits server-defined project type and tool IDs', async ({ page }) => {
  const state = await backend(page);
  await authenticate(page);
  await page.goto('/app/projects/new');
  await page.getByLabel('Project name', { exact: true }).fill('Green Valley Complex');
  await page.getByLabel('Project type', { exact: true }).selectOption('1');
  for (const [label, value] of [
    ['Project category', 'Commercial'],
    ['Contract type', 'Turnkey'],
    ['Client / owner', 'ABC Construction'],
    ['Start date', '2026-11-05'],
    ['Completion date', '2027-11-05'],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole('button', { name: 'Next step' }).click();
  for (const [label, value] of [
    ['State', 'Jharkhand'],
    ['City', 'Ranchi'],
    ['PIN / postal code', '834001'],
    ['Address line 1', 'Main Road'],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel('Site coordinates', { exact: true }).fill('23.3441, 85.3096');
  await page.getByRole('button', { name: 'Next step' }).click();
  for (const [label, value] of [
    ['Built-up area (sq. ft.)', '1200'],
    ['Total floors', '2'],
    ['Number of units', '4'],
    ['Project area (acres)', '1.2'],
    ['Land area (sq. ft.)', '1800'],
    ['Construction area (sq. ft.)', '1200'],
    ['Structure type', 'RCC Frame'],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole('button', { name: 'Next step' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Next step' }).click();
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/projects\/2$/);
  const sent = state.requests.find(
    (r: any) => r.path === '/api/v1/projects/' && r.method === 'POST',
  );
  expect(sent.body.project_type_id).toBe(1);
  expect(sent.body.module_ids).toEqual([11]);
  expect(sent.body.site_coordinates).toBe('23.3441, 85.3096');
  expect(sent.body).not.toHaveProperty('document_size');
  expect(sent.body).not.toHaveProperty('latitude');
});

test('admin-defined category and formula render dynamic inputs and save its revision', async ({
  page,
}) => {
  const state = await backend(page);
  await authenticate(page);
  await page.goto('/app/projects/1/calculations');
  await expect(page.getByLabel('Calculation category', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByLabel('Calculation category', { exact: true }).selectOption('21');
  await page.getByLabel('Calculation formula', { exact: true }).selectOption('31');
  await page.getByLabel('Item name', { exact: true }).fill('Outer wall');
  await page.getByLabel('Length (m)', { exact: true }).fill('20');
  await page.getByLabel('Height (m)', { exact: true }).fill('3');
  await page.getByLabel('Thickness (m)', { exact: true }).fill('0.23');
  await page.getByRole('button', { name: 'Calculate & save' }).click();
  await expect(page.getByRole('heading', { name: 'Outer wall', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Formula & working' }).click();
  await expect(page.getByRole('heading', { name: '20 * 3 * 0.23' })).toBeVisible();
  const sent = state.requests.find(
    (r: any) => r.path === '/api/v1/calculation-sheets/10/items/' && r.method === 'POST',
  );
  expect(sent.body.input_data).toEqual({ length: '20', height: '3', thickness: '0.23' });
  expect(sent.body.formula_id).toBe(31);
  expect(sent.body.formula_revision).toBe(2);
  expect(sent.body).not.toHaveProperty('formula');
});

test('team invitation searches registered email and assigns project role', async ({ page }) => {
  const state = await backend(page);
  await authenticate(page);
  await page.goto('/app/projects/1/team');
  await page.getByRole('button', { name: 'Invite member' }).click();
  await page.getByLabel('Student email', { exact: true }).fill('ravi@example.com');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByText('Ravi Sharma', { exact: true }).last()).toBeVisible();
  await page.getByLabel('Invitation role', { exact: true }).selectOption('1');
  await page.getByRole('button', { name: 'Send invitation' }).click();
  await expect(
    page.getByText('Invitation created. The member can accept it from Invitations.'),
  ).toBeVisible();
  const sent = state.requests.find(
    (r: any) => r.path === '/api/v1/projects/1/invitations/' && r.method === 'POST',
  );
  expect(sent.body).toEqual({ email: 'ravi@example.com', role_id: 1 });
});

test('chat authenticates the socket and deduplicates ack and broadcast', async ({ page }) => {
  await backend(page);
  await authenticate(page);
  await page.routeWebSocket('**/ws/projects/*/chat/groups/*/', (socket) => {
    socket.onMessage((raw) => {
      const data = JSON.parse(String(raw));
      if (data.type === 'auth')
        socket.send(JSON.stringify({ type: 'auth.ok', project_id: 1, group_id: 1 }));
      if (data.type === 'message.send') {
        const message = {
          id: 1,
          group_id: 1,
          client_message_id: data.client_message_id,
          text: data.text,
          sender: student,
          created_at: '2026-11-03T10:30:00Z',
        };
        socket.send(JSON.stringify({ type: 'message.ack', created: true, message }));
        socket.send(JSON.stringify({ type: 'message.created', message }));
      }
    });
    socket.send(JSON.stringify({ type: 'auth.required' }));
  });
  await page.goto('/app/projects/1/chat');
  await expect(page.getByText('Live', { exact: true })).toBeVisible();
  await page.getByLabel('Message', { exact: true }).fill('Ready for the site review.');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('Ready for the site review.', { exact: true })).toHaveCount(1);
  // The composer and privacy note must fit inside the chat card at every breakpoint.
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.locator('.chat-layout').scrollIntoViewIfNeeded();
    const bounds = await page.locator('.chat-layout').evaluate((card) => {
      const rect = card.getBoundingClientRect();
      const composer = card.querySelector('.message-composer')!.getBoundingClientRect();
      const note = card.querySelector('.chat-note')!.getBoundingClientRect();
      const list = card.querySelector('.message-list')!.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        right: rect.right,
        composerBottom: composer.bottom,
        composerRight: composer.right,
        noteBottom: note.bottom,
        listBottom: list.bottom,
        composerTop: composer.top,
        pageWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });
    expect(bounds.composerBottom).toBeLessThanOrEqual(bounds.bottom);
    expect(bounds.noteBottom).toBeLessThanOrEqual(bounds.bottom);
    expect(bounds.composerRight).toBeLessThanOrEqual(bounds.right);
    expect(bounds.listBottom).toBeLessThanOrEqual(bounds.composerTop + 1);
    expect(bounds.pageWidth).toBeLessThanOrEqual(bounds.viewportWidth);
  }

  await expect(page.getByText('Sending…')).toHaveCount(0);
});

test('admin rejection requires reason and sends the review PATCH body', async ({ page }) => {
  const state = await backend(page, true);
  await authenticate(page, 'ADMIN');
  await page.goto('/app/admin/students');
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  await page.getByRole('button', { name: 'Reject', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Confirm rejection' })).toBeDisabled();
  await page.getByLabel('Rejection reason').fill('Please provide a readable college ID.');
  await page.getByRole('button', { name: 'Confirm rejection' }).click();
  await expect(page.getByText('Review decision saved. The student email is queued.')).toBeVisible();
  const sent = state.requests.find((r: any) => r.path === '/api/accounts/admin/users/4/approval/');
  expect(sent.method).toBe('PATCH');
  expect(sent.body.reason).toContain('readable');
});

test('admin screens load real API shapes and read notifications disappear', async ({ page }) => {
  await backend(page);
  await authenticate(page, 'ADMIN');
  for (const path of [
    '/app/admin/access',
    '/app/admin/setup',
    '/app/admin/plans',
    '/app/subscription',
    '/app/profile',
  ]) {
    await page.goto(path);
    await expect(page.locator('main.page-content h1').first()).toBeVisible();
    await expect(page.getByText('Let’s try that again.')).toHaveCount(0);
  }
  await page.goto('/app/admin/notifications');
  await page.getByRole('button', { name: 'Mark read' }).click();
  await expect(page.getByRole('heading', { name: 'Nothing needs your attention' })).toBeVisible();
});

test('mobile navigation and authentication layout stay within viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await backend(page);
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Good to see you again.' })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
  await authenticate(page);
  await page.goto('/app');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('link', { name: 'My projects', exact: true })).toBeInViewport();
  await page.getByRole('link', { name: 'My projects', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My projects', exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
});

test('phone login supports the backend response-only development OTP mode', async ({ page }) => {
  await backend(page);
  await page.goto('/login');
  await page.getByLabel('Email address or phone number').fill('9999999999');
  await page.getByLabel('Password', { exact: true }).fill('StrongPass123!');
  await page.getByRole('button', { name: 'Continue securely' }).click();
  await expect(page.getByRole('heading', { name: 'Check your phone' })).toBeVisible();
  await expect(page.getByRole('note')).toContainText('123456');
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', { name: 'Verify & sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Good to see you, Vishnu.' })).toBeVisible();
});

test('invitation email destination survives OTP login', async ({ page }) => {
  await backend(page);
  await page.goto('/app/invitations');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email address or phone number').fill('vishnu@example.com');
  await page.getByLabel('Password', { exact: true }).fill('StrongPass123!');
  await page.getByRole('button', { name: 'Continue securely' }).click();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', { name: 'Verify & sign in' }).click();
  await expect(page).toHaveURL(/\/app\/invitations$/);
});

test('admin configures a formula and numeric inputs without source code changes', async ({
  page,
}) => {
  await backend(page);
  await authenticate(page, 'ADMIN');
  const formulas: any[] = [];
  const submitted: any[] = [];
  await page.route('**/api/v1/admin/calculation-*/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let data: any = [];
    if (path.includes('calculation-sheets'))
      data = [{ id: 1, name: 'Walls', code: 'WALLS', is_active: true }];
    if (path.includes('calculation-categories'))
      data = [{ id: 21, name: 'Brick Wall', sheet_definition: 1, is_active: true }];
    if (path.includes('calculation-formulas')) {
      if (request.method() === 'POST') {
        submitted.push(request.postDataJSON());
        formulas.push({ id: 31, revision: 1, ...request.postDataJSON() });
      }
      data = request.method() === 'POST' ? formulas[formulas.length - 1] : formulas;
    }
    await route.fulfill({ json: data, status: request.method() === 'POST' ? 201 : 200 });
  });
  await page.goto('/app/admin/calculations');
  await page.getByLabel('Setup sheet').selectOption('1');
  await page.getByLabel('Setup category').selectOption('21');
  await page.getByRole('button', { name: 'Add formula', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Wall width');
  await page.getByLabel('Formula expression', { exact: true }).fill('width * 2');
  await page.getByLabel('Result label', { exact: true }).fill('Width');
  await page.getByLabel('Result unit', { exact: true }).fill('m');
  await page.getByLabel('Input 1 key').fill('width');
  await page.getByLabel('Input 1 label').fill('Width');
  await page.getByRole('button', { name: 'Save formula', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Wall width', exact: true })).toBeVisible();
  expect(submitted[0]).toMatchObject({
    category: 21,
    expression: 'width * 2',
    input_fields: [{ key: 'width', label: 'Width', required: true }],
  });
});
