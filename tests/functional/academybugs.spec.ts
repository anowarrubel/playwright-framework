import { test } from '../../fixtures/test-fixtures';

test.describe('Academy Bugs - smoke', { tag: '@academybugs' }, () => {
  test('home page shows the bug examples and main navigation', async ({ academybugsHome }) => {
    await academybugsHome.open();
    await academybugsHome.expectLoaded();
  });

  test('Find Bugs link opens the Find Bugs page', async ({ academybugsHome }) => {
    await academybugsHome.open();
    await academybugsHome.openFindBugs();
    await academybugsHome.expectUrlMatches(/\/find-bugs\/?$/);
  });
});
