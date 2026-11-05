import {test,expect} from '@playwright/test';
const metric=(current:number)=>({current,previous:current,change:0});
const metrics={totalRequests:metric(12400),successRate:metric(99.4),avgLatency:metric(84),errorRate:metric(0.6),webhookEvents:metric(320),requestsByMethod:[{method:'GET',count:9400,percentage:75.8},{method:'POST',count:3000,percentage:24.2}],topEndpoints:[{name:'List orders',tag:'list-orders',method:'GET',calls:9400,avgLatency:72},{name:'Create order',tag:'create-order',method:'POST',calls:3000,avgLatency:120}],activityTimeline:[],latencyTimeline:[],outcomeTimeline:[]};
const measure={calls:12400,failures:74,measured:12380,slowCalls:180,errorRatePercent:0.6,totalLatencyMs:1040000,averageLatencyMs:84,maxLatencyMs:4200,p50LatencyMs:42,p95LatencyMs:280,p99LatencyMs:1100};
const operation={...measure,calls:9400,measured:9380,failures:20,errorRatePercent:20/9400*100,totalLatencyMs:700000,operation:'list-orders',fingerprint:null};
const report={window:{start:'2026-11-05T12:00:00Z',end:'2026-11-05T13:00:00Z',bucketMs:60000,slowMs:1000},summary:{...measure,callsPerMinute:12400/60},previous:{...measure,p95LatencyMs:350},coverage:{measured:12380,missingLatency:20,fingerprinted:0,latestAt:'2026-11-05T12:59:00Z',percentileMethod:'approximate',sampled:false,totalQueryGroups:2,rankingLimit:20,slowSampleLimit:30,slowRankingMinimumCalls:3},timeline:Array.from({length:60},(_,i)=>({...measure,calls:140+(i%12)*12,failures:i%4,p50LatencyMs:30+i%20,p95LatencyMs:190+(i%9)*15,p99LatencyMs:700+(i%7)*85,timestamp:new Date(Date.parse('2026-11-05T12:00:00Z')+i*60000).toISOString()})),rankings:{mostUsed:[operation,{...operation,operation:'create-order',calls:3000,measured:3000,failures:54,errorRatePercent:1.8,totalLatencyMs:340000}],slowest:[operation],mostTime:[operation],failing:[operation]},histogram:[{_id:0,calls:1200},{_id:10,calls:4300},{_id:50,calls:3900},{_id:100,calls:1500},{_id:250,calls:900},{_id:500,calls:400},{_id:1000,calls:180}],slowSamples:[{timestamp:'2026-11-05T12:58:00Z',operation:'create-order',fingerprint:null,duration:4200,failed:1,trace_id:'sample-trace-001'}]};
test.beforeEach(async({page})=>{
 await page.route('**/log/v1/**',route=>route.fulfill({json:{data:route.request().url().includes('/app/performance/')?report:metrics}}));
});
test('actual app overview retains metrics, version and period controls',async({page})=>{
 await page.goto('/e2e/fixtures/app-overview.html');
 await expect(page.locator('[data-resource-overview-metric]')).toHaveCount(11);
 await expect(page.getByText('12,400',{exact:true}).first()).toBeVisible();
 await expect(page.getByText('84ms',{exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Top Endpoints',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:/GET List orders 9,400 calls/})).toBeVisible();
 await page.getByRole('button',{name:'1 month',exact:true}).click();
 await expect(page.getByRole('button',{name:'1 month',exact:true})).toHaveClass(/bg-primary/);
 await page.setViewportSize({width:1440,height:2600});
 await page.locator('section[aria-label="API performance"]').screenshot({path:'/tmp/ductape-app-analytics.png',animations:'disabled'});
 await page.screenshot({path:'/tmp/ductape-app-overview-desktop.png',fullPage:true,animations:'disabled'});
});
test('product app overview fits mobile dark mode and preserves scope',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/e2e/fixtures/app-overview.html?dark=1&product=1');
 await expect(page.locator('[data-resource-overview-metric]')).toHaveCount(11);
 await expect(page.getByRole('heading',{name:'Orders API in Shop',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Product environments',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:'/tmp/ductape-app-overview-mobile.png',fullPage:true,animations:'disabled'});
});

test('app performance ranks endpoints and narrows request scope',async({page})=>{
 const requests:string[]=[];
 page.on('request',request=>{if(request.url().includes('/app/performance/')) requests.push(request.url());});
 await page.goto('/e2e/fixtures/app-overview.html?product=1');
 await expect(page.getByText('p99 latency',{exact:true})).toBeVisible();
 await expect(page.getByText('Throughput',{exact:true})).toBeVisible();
 await expect(page.getByText('Latency distribution',{exact:true})).toBeVisible();
 await expect.poll(()=>requests.some(url=>new URL(url).searchParams.get('product_tag')==='shop')).toBeTruthy();
 await page.getByLabel('Endpoint ranking').selectOption('slowest');
 await page.getByRole('button',{name:'list-orders HTTP request operation',exact:true}).click();
 await expect.poll(()=>requests.some(url=>new URL(url).searchParams.get('operation')==='list-orders')).toBeTruthy();
 expect(requests.every(url=>!new URL(url).searchParams.has('unfingerprinted'))).toBeTruthy();
 await page.getByLabel('Clear endpoint filter').click();
 await expect(page.getByText('Inspecting list-orders',{exact:false})).toHaveCount(0);
});
