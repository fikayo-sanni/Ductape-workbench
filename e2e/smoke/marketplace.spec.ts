import {test,expect} from '@playwright/test';
const domains=[{_id:'payments',domain_name:'payments',parent_domain_id:null,parents:[]},{_id:'developer',domain_name:'developer-tools',parent_domain_id:null,parents:[]}];
const apps=[{_id:'stripe',app_name:'Stripe',tag:'stripe',description:'Accept payments and manage subscriptions.',author:'Stripe',domains:['payments'],latest_version:'1.2.0',created_at:'2026-01-01',updated_at:'2026-01-01'},{_id:'github',app_name:'GitHub',tag:'github',description:'Manage repositories, issues and pull requests.',author:'GitHub',domains:['developer'],latest_version:'2.0.0',created_at:'2026-02-01',updated_at:'2026-02-01'}];
test.beforeEach(async({page})=>{
 await page.route(/\/apps\/v1\/domains(?:\/[^?]*)?(?:\?.*)?$/,route=>{const category=new URL(route.request().url()).pathname.split('/').pop();return route.fulfill({json:{data:category==='domains'?domains:category==='all'?apps:apps.filter(app=>app.domains.includes(category!))}})});
});
test('instance catalogue search, categories, sorting and layouts',async({page})=>{
 await page.goto('/e2e/fixtures/marketplace.html');
 await expect(page.locator('article')).toHaveCount(2);
 await expect(page.locator('article').first()).toContainText('GitHub');
 await page.getByRole('textbox',{name:'Search integrations'}).fill('subscriptions');
 await expect(page.locator('article')).toHaveCount(1);
 await expect(page.locator('article')).toContainText('Stripe');
 await page.getByRole('button',{name:'Clear search'}).click();
 await page.getByRole('button',{name:'Payments',exact:true}).click();
 await expect(page.locator('article')).toHaveCount(1);
 await page.getByRole('button',{name:'Clear category'}).click();
 await expect(page.locator('article')).toHaveCount(2);
 await page.getByRole('button',{name:'List view',exact:true}).click();
 await expect(page.getByRole('button',{name:'List view',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('article').first()).toHaveClass(/sm:flex-row/);
 await page.getByRole('combobox',{name:'Sort integrations'}).selectOption('created');
 await expect(page.locator('article').first()).toContainText('GitHub');
 await page.getByRole('button',{name:'Grid view',exact:true}).click();
 await page.screenshot({path:'/tmp/ductape-marketplace-desktop.png',fullPage:true,animations:'disabled'});
});
test('mobile dark catalogue navigation and empty state',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/e2e/fixtures/marketplace.html?dark=1');
 await expect(page.locator('article')).toHaveCount(2);
 await page.getByRole('button',{name:'Categories',exact:true}).click();
 await page.getByRole('button',{name:'Payments',exact:true}).click();
 await expect(page.locator('article')).toHaveCount(1);
 await page.getByRole('textbox',{name:'Search integrations'}).fill('nothing matches');
 await expect(page.getByText('No integrations found',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Reset filters'}).click();
 await expect(page.locator('article')).toHaveCount(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:'/tmp/ductape-marketplace-mobile.png',fullPage:true,animations:'disabled'});
});
test('empty category list still loads integrations',async({page})=>{
 await page.route('**/apps/v1/domains',route=>route.fulfill({json:{data:[]}}));
 await page.goto('/e2e/fixtures/marketplace.html');
 await expect(page.locator('article')).toHaveCount(2);
});
test('catalogue failure is recoverable',async({page})=>{
 let failed=true;
 await page.route('**/apps/v1/domains/all',route=>route.fulfill(failed?{status:503,json:{message:'Unavailable'}}:{json:{data:apps}}));
 await page.goto('/e2e/fixtures/marketplace.html');
 await expect(page.getByRole('alert')).toContainText('Integrations could not be loaded');
 failed=false;
 await page.getByRole('button',{name:'Try again'}).click();
 await expect(page.locator('article')).toHaveCount(2);
});
test('hosted catalogue preserves pagination and search',async({page})=>{
 await page.route('**/apps/v1/remote/status*',route=>route.fulfill({json:{data:{enabled:true,reason:null,max_apps:10,imported:1}}}));
 await page.route('**/apps/v1/remote/catalog?*',route=>{
  const params=new URL(route.request().url()).searchParams;
  const item=apps[params.get('page')==='2'?0:1];
  return route.fulfill({json:{data:{apps:[{...item,remote_app_id:item._id,publisher:item.author,imported:false,local_app_id:null,imported_version:null,update_available:false}],total:2,page:Number(params.get('page')||1),pages:2}}});
 });
 await page.goto('/e2e/fixtures/marketplace.html?hosted=1');
 await expect(page.locator('article')).toContainText('GitHub');
 await page.getByRole('button',{name:'Next',exact:true}).click();
 await expect(page.locator('article')).toContainText('Stripe');
 await expect(page.getByText('Page 2 of 2')).toBeVisible();
 await page.getByRole('textbox',{name:'Search integrations'}).fill('payments');
 await expect(page.getByText('Page 1 of 2')).toBeVisible();
 await page.getByRole('button',{name:'List view',exact:true}).click();
 await expect(page.locator('article')).toHaveClass(/sm:flex-row/);
 await page.screenshot({path:'/tmp/ductape-marketplace-hosted.png',fullPage:true,animations:'disabled'});
});
