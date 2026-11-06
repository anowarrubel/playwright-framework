import { test } from '../../fixtures/test-fixtures';

test.describe('DemoQA - smoke', { tag: '@demoqa' }, () => {
  test('home page shows all six category cards', async ({ demoqaHome }) => {
    await demoqaHome.open();
    await demoqaHome.expectLoaded();
    await demoqaHome.expectCategoryCount(6);
  });

  test('Elements card opens the Elements section', async ({ demoqaHome }) => {
    await demoqaHome.open();
    await demoqaHome.openElements();
    await demoqaHome.expectUrlMatches(/\/elements$/);
  });

  test('Forms card opens the Forms section', async ({ demoqaHome }) => {
    await demoqaHome.open();
    await demoqaHome.openForms();
    await demoqaHome.expectUrlMatches(/\/forms$/);
  });
});
