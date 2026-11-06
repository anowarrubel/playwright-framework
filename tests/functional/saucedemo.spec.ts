import { test } from '../../fixtures/test-fixtures';

test.describe('SauceDemo - login & cart', { tag: '@saucedemo' }, () => {
  test('valid user can log in and lands on inventory', async ({ sauceLogin, sauceInventory }) => {
    await sauceLogin.open();
    await sauceLogin.login();
    await sauceInventory.expectLoaded();
  });

  test('locked-out user sees an error', async ({ sauceLogin }) => {
    await sauceLogin.open();
    await sauceLogin.login('locked_out_user', 'secret_sauce');
    await sauceLogin.expectLoginError(/locked out/i);
  });

  test('user can add an item to the cart', async ({ sauceLogin, sauceInventory }) => {
    await sauceLogin.open();
    await sauceLogin.login();
    await sauceInventory.expectLoaded();
    await sauceInventory.addFirstItemToCart();
    await sauceInventory.expectCartCount(1);
  });

  test('user can open the cart after adding an item', async ({ sauceLogin, sauceInventory }) => {
    await sauceLogin.open();
    await sauceLogin.login();
    await sauceInventory.addFirstItemToCart();
    await sauceInventory.openCart();
    await sauceInventory.expectUrlMatches(/cart\.html/);
  });
});
