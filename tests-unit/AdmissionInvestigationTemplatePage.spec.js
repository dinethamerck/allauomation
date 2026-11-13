// tests-unit/AdmissionInvestigationTemplatePage.spec.js
const { test, expect } = require('@playwright/test');
const { AdmissionInvestigationTemplatePage } = require('../pages/AdmissionInvestigationTemplatePage');
const { mockApp } = require('./helpers/mockApp');

const ICON = (cls) => `<svg class="${cls}" width="10" height="10"><rect width="10" height="10"/></svg>`;

/**
 * Fixture for /admin/admission-investigations.
 * Row buttons: [edit, copy, delete]. When `confirmDelete` is true a confirm dialog is shown before deleting.
 */
const TEMPLATES_HTML = ({ confirmDelete = true } = {}) => `
  <h1>Admission Investigation Templates</h1>
  <button id="open">+ Create Template</button>
  <input placeholder="Search templates...">
  <table><tbody id="rows"></tbody></table>

  <div role="dialog" id="create" class="hidden">
    <input placeholder="e.g. General Surgery Investigation Template">
    <textarea placeholder="Enter description"></textarea>
    <button>Add Section</button><button>Add Parameter</button><button>Add Group</button>
    <button id="cancel">Cancel</button>
    <button id="save">Create Template</button>
  </div>

  <div role="dialog" id="confirm" class="hidden">
    <p>Are you sure?</p><button id="confirm-del">Delete</button>
  </div>

  <script>
    window.__created = [];
    const rows = document.getElementById('rows');
    const create = document.getElementById('create');
    const confirmBox = document.getElementById('confirm');
    let pending = null;
    function addRow(name) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td class="name"></td><td>' +
        '<button aria-label="Edit template">${ICON('lucide-pencil')}</button>' +
        '<button aria-label="Duplicate template">${ICON('lucide-copy')}</button>' +
        '<button aria-label="Remove template">${ICON('lucide-trash-2')}</button></td>';
      tr.querySelector('.name').textContent = name;
      const [, copyBtn, delBtn] = tr.querySelectorAll('button');
      copyBtn.onclick = () => addRow(name + ' (Copy)');
      delBtn.onclick = () => {
        if (${confirmDelete}) { pending = tr; confirmBox.classList.remove('hidden'); }
        else tr.remove();
      };
      rows.appendChild(tr);
    }
    ['CBC Panel', 'Liver Function'].forEach(addRow);
    document.getElementById('open').onclick = () => create.classList.remove('hidden');
    document.getElementById('cancel').onclick = () => create.classList.add('hidden');
    document.getElementById('save').onclick = () => {
      const name = create.querySelector('input').value;
      const description = create.querySelector('textarea').value;
      window.__created.push({ name, description });
      addRow(name);
      create.classList.add('hidden');
      create.querySelector('input').value = '';
      create.querySelector('textarea').value = '';
    };
    document.getElementById('confirm-del').onclick = () => {
      pending && pending.remove();
      confirmBox.classList.add('hidden');
    };
  </script>`;

async function setup(page, opts) {
  await mockApp(page, { '/admin/admission-investigations': TEMPLATES_HTML(opts) });
  const tp = new AdmissionInvestigationTemplatePage(page);
  await tp.goto();
  return tp;
}

test.describe('AdmissionInvestigationTemplatePage', () => {
  test('AIT-01 constructor sets the template route', async ({ page }) => {
    expect(new AdmissionInvestigationTemplatePage(page).url).toBe('/admin/admission-investigations');
  });

  test('AIT-02 goto() opens the templates page', async ({ page }) => {
    const tp = await setup(page);
    expect(new URL(page.url()).pathname).toBe('/admin/admission-investigations');
    await expect(tp.createTemplateButton).toBeVisible();
    await expect(tp.searchTemplateInput).toBeVisible();
    await expect(tp.templateTable).toBeVisible();
  });

  test('AIT-03 openCreateModal() shows the create dialog and its controls', async ({ page }) => {
    const tp = await setup(page);
    await expect(tp.modalDialog).toBeHidden();
    await tp.openCreateModal();
    await expect(tp.modalDialog).toBeVisible();
    for (const el of [tp.templateNameInput, tp.descriptionInput, tp.addSectionButton,
      tp.addParameterButton, tp.addGroupButton, tp.saveTemplateButton, tp.cancelButton]) {
      await expect(el).toBeVisible();
    }
  });

  test('AIT-04 createTemplate(name, description) submits both fields', async ({ page }) => {
    const tp = await setup(page);
    await tp.createTemplate('Cardiac Panel', 'Troponin and CK-MB');
    expect(await page.evaluate(() => window.__created))
      .toEqual([{ name: 'Cardiac Panel', description: 'Troponin and CK-MB' }]);
    await expect(tp.modalDialog).toBeHidden();
    expect(await tp.isTemplateListed('Cardiac Panel')).toBe(true);
  });

  test('AIT-05 createTemplate(name) leaves the description empty', async ({ page }) => {
    const tp = await setup(page);
    await tp.createTemplate('Renal Panel');
    expect(await page.evaluate(() => window.__created)).toEqual([{ name: 'Renal Panel', description: '' }]);
  });

  test('AIT-06 getTemplateRow() matches a row case-insensitively', async ({ page }) => {
    const tp = await setup(page);
    await expect(tp.getTemplateRow('cbc panel')).toContainText('CBC Panel');
    await expect(tp.getTemplateRow('LIVER')).toContainText('Liver Function');
  });

  test('AIT-07 getTemplateRow() resolves to nothing for an unknown template', async ({ page }) => {
    const tp = await setup(page);
    await expect(tp.getTemplateRow('Does Not Exist')).toHaveCount(0);
  });

  test('AIT-08 isTemplateListed() returns true/false correctly', async ({ page }) => {
    const tp = await setup(page);
    expect(await tp.isTemplateListed('CBC Panel')).toBe(true);
    expect(await tp.isTemplateListed('Thyroid Panel')).toBe(false);
  });

  test('AIT-09 deleteTemplate() deletes after confirming the dialog', async ({ page }) => {
    const tp = await setup(page, { confirmDelete: true });
    await tp.deleteTemplate('CBC Panel');
    expect(await tp.isTemplateListed('CBC Panel')).toBe(false);
    expect(await tp.isTemplateListed('Liver Function')).toBe(true);
  });

  test('AIT-10 deleteTemplate() works when no confirm dialog appears', async ({ page }) => {
    const tp = await setup(page, { confirmDelete: false });
    await tp.deleteTemplate('Liver Function');
    expect(await tp.isTemplateListed('Liver Function')).toBe(false);
    expect(await tp.isTemplateListed('CBC Panel')).toBe(true);
  });

  test('AIT-11 copyTemplate() clicks the copy action for the row', async ({ page }) => {
    const tp = await setup(page);
    await tp.copyTemplate('CBC Panel');
    expect(await tp.isTemplateListed('CBC Panel \\(Copy\\)')).toBe(true);
    await expect(page.locator('#rows tr')).toHaveCount(3);
  });
});
