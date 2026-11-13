import { expect, type Page } from '@playwright/test';
export const student = {
  id: 4,
  name: 'Vishnu Kumar',
  email: 'vishnu@example.com',
  role: 'STUDENT',
};
export const admin = {
  id: 1,
  name: 'Platform Admin',
  email: 'admin@example.com',
  role: 'ADMIN',
};
export const project = {
  id: 1,
  name: 'Sunrise Residential Tower',
  code: 'PRJ-2026-001',
  owner_id: 4,
  project_type: { id: 1, name: 'Residential' },
  category: 'Apartment / Tower',
  contract_type: 'Turnkey',
  client_name: 'ABC Construction',
  start_date: '2026-11-01',
  completion_date: '2027-11-01',
  description: 'A learning project',
  country: 'India',
  state: 'Jharkhand',
  city: 'Jamshedpur',
  pincode: '831001',
  address_line_1: 'Bistupur Main Road',
  address_line_2: '',
  site_coordinates: '22.8046, 86.2029',
  built_up_area_sqft: '120000',
  total_floors: 12,
  number_of_units: 120,
  project_area_acres: '1.8',
  land_area_sqft: '7800',
  construction_area_sqft: '120000',
  structure_type: 'RCC Frame',
  module_ids: [11],
  document_url: null,
  document_name: '',
  created_at: '2026-11-03T10:00:00Z',
};
export async function authenticate(page: Page, role = 'STUDENT') {
  await page.addInitScript(
    (user) => {
      sessionStorage.setItem(
        'quantibuild.session',
        JSON.stringify({
          access: 'mock-access',
          refresh: 'mock-refresh',
          user,
        }),
      );
    },
    role === 'ADMIN' ? admin : student,
  );
}
export async function backend(page: Page, pending = false) {
  const state: any = {
    requests: [],
    projects: [{ ...project }],
    items: [],
    groups: [
      {
        id: 1,
        project_id: 1,
        name: 'Site Team',
        created_by: student,
        member_count: 2,
        created_at: '2026-11-03T10:00:00Z',
      },
    ],
    roles: [
      {
        id: 1,
        name: 'Site Engineer',
        permissions: ['project.view', 'project.edit', 'modules.use'],
        module_ids: [11],
      },
    ],
    invitations: [],
    notifications: [
      {
        id: 1,
        title: 'New Student Registration Pending Approval',
        message: 'Vishnu Kumar registered and is awaiting review.',
        created_at: '2026-11-03T10:00:00Z',
      },
    ],
    review: pending ? 'PENDING' : 'APPROVED',
    plans: [
      {
        id: 1,
        code: 'free',
        name: 'Free',
        description: 'A strong start.',
        is_free: true,
        is_active: true,
        modules: [
          {
            module_id: 1,
            code: 'my-projects',
            name: 'My Projects',
            limits: { max_saved_projects: 2 },
          },
          {
            module_id: 2,
            code: 'calculations',
            name: 'Calculations',
            limits: { calculations_per_month: 20 },
          },
        ],
      },
    ],
  };
  const platform = [
    { id: 1, code: 'my-projects', name: 'My Projects' },
    { id: 2, code: 'calculations', name: 'Calculations' },
    { id: 3, code: 'inventory', name: 'Inventory' },
    { id: 4, code: 'reports', name: 'Reports' },
    { id: 5, code: 'drawing-referer', name: 'Drawing & Reference' },
  ].map((m, i) => ({
    ...m,
    is_active: true,
    display_order: i,
    description: '',
  }));
  const sheet = {
    id: 10,
    project_id: 1,
    definition: {
      id: 1,
      code: 'WALLS',
      name: 'Walls',
      is_active: true,
      calculation_available: true,
    },
    status: 'NOT_STARTED',
    item_count: 0,
  };
  await page.route('**/api/**', async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname,
      method = req.method();
    let body: any = {};
    try {
      body = req.postDataJSON() || {};
    } catch {}
    state.requests.push({ path, method, body, raw: req.postData() });
    let data: any = {};
    let status = 200;
    if (path === '/api/accounts/login/' || path === '/api/accounts/resend-login-otp/')
      data = {
        challenge_id: 'login-challenge',
        channel: String(body.identifier).includes('@') ? 'email' : 'phone',
        ...(String(body.identifier).includes('@')
          ? { email: body.identifier, delivery: 'email', debug_otp: '123456' }
          : { phone: body.identifier, delivery: 'response_only', otp: '123456' }),
        delivery_status: 'queued',
      };
    else if (path === '/api/accounts/verify-login-otp/') {
      if (body.otp !== '123456') {
        status = 400;
        data = { message: 'Invalid OTP.' };
      } else
        data = {
          tokens: { access: 'mock-access', refresh: 'mock-refresh' },
          user: student,
          account: { approval_status: state.review },
        };
    } else if (path === '/api/v1/auth/signup/send-otp')
      data = {
        email_challenge_id: 'email-id',
        phone_challenge_id: 'phone-id',
        email_delivery_status: 'queued',
      };
    else if (path === '/api/v1/auth/signup/verify-otp') {
      if (!body.email_challenge_id || !body.phone_challenge_id) {
        status = 400;
        data = { message: 'Both challenge IDs are required.' };
      } else data = { email_verified: true, phone_verified: true };
    } else if (path === '/api/v1/auth/signup') {
      status = 201;
      data = { user: student, message: 'Registration complete.' };
    } else if (path === '/api/v1/modules/')
      data = {
        account: {
          approval_status: state.review,
          review_message:
            state.review === 'PENDING'
              ? 'Your account is under review. Please wait for admin verification.'
              : null,
        },
        plan: state.plans[0],
        modules: platform.map((m) => ({
          ...m,
          allowed: !pending && m.id <= 3,
          message: pending
            ? 'Awaiting review.'
            : m.id > 3
              ? 'Plan upgrade required.'
              : 'Access granted.',
        })),
      };
    else if (path === '/api/v1/projects/summary/')
      data = {
        projects: {
          total: state.projects.length,
          owned: state.projects.length,
          shared: 0,
        },
        team: { unique_collaborators: 1 },
      };
    else if (path === '/api/v1/projects/options/')
      data = {
        project_types: [{ id: 1, name: 'Residential' }],
        modules: [
          {
            id: 11,
            name: 'Wall Calculations',
            platform_module_id: 2,
            description: 'Calculate and understand wall areas.',
            allowed: true,
          },
        ],
        permissions: [
          { code: 'project.view', name: 'View project' },
          { code: 'project.edit', name: 'Edit project details' },
          { code: 'documents.view', name: 'Download project document' },
          {
            code: 'documents.manage',
            name: 'Upload or replace project document',
          },
          { code: 'modules.use', name: 'Use assigned project modules' },
        ],
      };
    else if (path === '/api/v1/projects/') {
      if (method === 'POST') {
        const p = { ...project, ...body, id: state.projects.length + 1 };
        state.projects.push(p);
        status = 201;
        data = p;
      } else
        data = {
          count: state.projects.length,
          results: state.projects,
          next: null,
          previous: null,
        };
    } else if (path === '/api/v1/projects/invitations/') data = [];
    else if (path === '/api/v1/projects/member-search/')
      data = [{ id: 5, name: 'Ravi Sharma', email: 'ravi@example.com' }];
    else if (/\/projects\/\d+\/summary\/$/.test(path))
      data = {
        project,
        location: {
          country: project.country,
          state: project.state,
          city: project.city,
          pincode: project.pincode,
          address_line_1: project.address_line_1,
          site_coordinates: project.site_coordinates,
        },
        project_details: {
          total_floors: 12,
          number_of_units: 120,
          structure_type: 'RCC Frame',
        },
        team: {
          total_members: 2,
          active_members: 2,
          pending_invitations: state.invitations.length,
          roles: state.roles,
        },
        modules: [
          {
            id: 11,
            name: 'Wall Calculations',
            description: 'Shared calculation tools',
          },
        ],
        access: {
          is_owner: true,
          permissions: ['project.view', 'project.edit', 'documents.manage', 'modules.use'],
        },
        calculations: { total_items: state.items.length },
      };
    else if (/\/projects\/\d+\/team\/$/.test(path))
      data = {
        owner: student,
        total_members: 2,
        active_members: 2,
        pending_invitations: state.invitations.length,
        members: [
          {
            id: 3,
            user_id: 5,
            name: 'Ravi Sharma',
            email: 'ravi@example.com',
            role_id: 1,
            role_name: 'Site Engineer',
            joined_at: '2026-11-03T10:00:00Z',
          },
        ],
      };
    else if (/\/projects\/\d+\/roles\/$/.test(path)) {
      if (method === 'POST') {
        data = { ...body, id: state.roles.length + 1 };
        state.roles.push(data);
        status = 201;
      } else data = state.roles;
    } else if (/\/projects\/\d+\/invitations\/$/.test(path)) {
      if (method === 'POST') {
        data = {
          ...body,
          id: 'invitation-id',
          status: 'PENDING',
          effective_status: 'PENDING',
          email_status: 'QUEUED',
          expires_at: '2026-11-10T10:00:00Z',
        };
        state.invitations.push(data);
        status = 201;
      } else data = state.invitations;
    } else if (/\/projects\/\d+\/calculation-sheets\/$/.test(path))
      data = [
        { ...sheet, item_count: state.items.length },
        {
          id: 11,
          project_id: 1,
          definition: {
            id: 2,
            code: 'PIPES',
            name: 'Pipes',
            calculation_available: false,
          },
          status: 'NOT_STARTED',
          item_count: 0,
        },
      ];
    else if (/\/calculation-sheets\/\d+\/categories\/$/.test(path))
      data = [{ id: 21, sheet_definition: 1, name: 'Brick Wall', is_active: true }];
    else if (/\/calculation-sheets\/\d+\/categories\/\d+\/formulas\/$/.test(path))
      data = [
        {
          id: 31,
          category: 21,
          name: 'Brick volume',
          expression: 'length * height * thickness',
          revision: 2,
          result_label: 'Volume',
          result_unit: 'm3',
          input_fields: [
            { key: 'length', label: 'Length', unit: 'm', required: true, min_value: '0.000001' },
            { key: 'height', label: 'Height', unit: 'm', required: true, min_value: '0.000001' },
            {
              key: 'thickness',
              label: 'Thickness',
              unit: 'm',
              required: true,
              min_value: '0.000001',
            },
          ],
        },
      ];
    else if (/\/calculation-sheets\/\d+\/items\/$/.test(path)) {
      if (method === 'POST') {
        if (
          !body.formula_id ||
          !body.formula_revision ||
          !body.input_data?.length ||
          !body.input_data?.height ||
          !body.input_data?.thickness
        ) {
          status = 400;
          data = { message: 'Length and height required.' };
        } else {
          data = {
            id: state.items.length + 1,
            ...body,
            calculation_sheet_id: 10,
            created_by: student,
            updated_by: student,
            formula: 'length * height * thickness',
            working: `${body.input_data.length} * ${body.input_data.height} * ${body.input_data.thickness}`,
            result_data: {
              area: String(
                Number(body.input_data.length) *
                  Number(body.input_data.height) *
                  Number(body.input_data.thickness),
              ),
            },
            final_quantity: String(
              Number(body.input_data.length) *
                Number(body.input_data.height) *
                Number(body.input_data.thickness),
            ),
            unit: 'm²',
          };
          state.items.push(data);
          status = 201;
        }
      } else
        data = {
          count: state.items.length,
          results: state.items,
          next: null,
          previous: null,
        };
    } else if (/\/calculation-items\/\d+\/formula\/$/.test(path)) {
      const item = state.items.find((i: any) => i.id === Number(path.split('/')[4]));
      data = { ...item, result: item?.final_quantity };
    } else if (/\/projects\/\d+\/activities\/$/.test(path))
      data = { count: 0, results: [], next: null, previous: null };
    else if (/\/projects\/\d+\/chat\/groups\/$/.test(path)) {
      if (method === 'POST') {
        data = {
          id: state.groups.length + 1,
          project_id: 1,
          name: body.name,
          member_count: body.user_ids.length + 1,
          created_by: student,
        };
        state.groups.push(data);
        status = 201;
      } else data = state.groups;
    } else if (/\/chat\/groups\/\d+\/members\/$/.test(path))
      data = [
        { user: student },
        { user: { id: 5, name: 'Ravi Sharma', email: 'ravi@example.com' } },
      ];
    else if (/\/chat\/groups\/\d+\/messages\/$/.test(path))
      data = { messages: [], next_before_id: null };
    else if (/\/projects\/\d+\/$/.test(path)) {
      data = state.projects.find((p: any) => p.id === Number(path.split('/')[4])) || project;
    } else if (path === '/api/accounts/profile/')
      data = {
        ...student,
        user_id: 4,
        first_name: 'Vishnu',
        last_name: 'Kumar',
        mobile: '+919876543210',
        college_university: 'ABC Engineering College',
        approval_status: state.review,
      };
    else if (path === '/api/accounts/admin/students/')
      data = [
        {
          ...student,
          first_name: 'Vishnu',
          last_name: 'Kumar',
          college_university: 'ABC Engineering College',
          course: 'B.Tech',
          approval_status: state.review,
          is_active: true,
          created_at: '2026-11-03T10:00:00Z',
        },
      ];
    else if (/\/admin\/students\/\d+\/$/.test(path))
      data = {
        ...student,
        first_name: 'Vishnu',
        last_name: 'Kumar',
        college_university: 'ABC Engineering College',
        course: 'B.Tech',
        branch: 'Civil',
        mobile: '+919876543210',
        approval_status: state.review,
        is_active: true,
      };
    else if (/\/admin\/users\/\d+\/approval\/$/.test(path)) {
      if (body.approval_status === 'REJECTED' && !body.reason?.trim()) {
        status = 400;
        data = { reason: 'Required' };
      } else {
        state.review = body.approval_status;
        data = {
          approval_status: state.review,
          email_delivery_status: 'queued',
        };
      }
    } else if (path === '/api/accounts/admin/notifications/')
      data = {
        unread_count: state.notifications.length,
        notifications: state.notifications,
      };
    else if (/\/admin\/notifications\/\d+\/read\/$/.test(path)) {
      state.notifications = [];
      data = { message: 'Read' };
    } else if (path === '/api/v1/admin/modules/') data = platform;
    else if (path === '/api/v1/admin/roles/')
      data = [
        {
          id: 2,
          role: 'STUDENT',
          module_codes: ['my-projects', 'calculations'],
        },
      ];
    else if (path === '/api/v1/admin/plans/') {
      if (method === 'POST') {
        data = { ...body, id: state.plans.length + 1 };
        state.plans.push(data);
        status = 201;
      } else data = state.plans;
    } else if (path === '/api/v1/admin/subscriptions/')
      data = { count: 0, results: [], next: null, previous: null };
    else if (path === '/api/v1/projects/admin/types/')
      data = [
        {
          id: 1,
          name: 'Residential',
          description: '',
          is_active: true,
          sort_order: 0,
        },
      ];
    else if (path === '/api/v1/projects/admin/modules/')
      data = [
        {
          id: 11,
          name: 'Wall Calculations',
          description: '',
          is_active: true,
          platform_module_id: 2,
          sort_order: 0,
        },
      ];
    else if (path === '/api/v1/plans/') data = state.plans;
    else if (path === '/api/v1/subscription/')
      data = {
        plan: state.plans[0],
        subscription: null,
        usage: [
          {
            module_code: 'my-projects',
            metric: 'max_saved_projects',
            limit: 2,
            used: 1,
            remaining: 1,
            period: null,
          },
        ],
      };
    else if (['/api/v1/inventory/', '/api/v1/reports/', '/api/v1/drawings/'].includes(path))
      data = { success: true };
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(data),
    });
  });
  await page.route('**/*.tile.openstreetmap.org/**', (route) => route.abort());
  return state;
}
