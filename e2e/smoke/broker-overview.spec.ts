import {test,expect} from '@playwright/test';
const measure={calls:12400,failures:74,measured:12380,slowCalls:180,errorRatePercent:0.6,totalLatencyMs:1040000,averageLatencyMs:84,maxLatencyMs:4200,p50LatencyMs:42,p95LatencyMs:280,p99LatencyMs:1100};
const operation={...measure,operation:'consumer:orders',fingerprint:null};
const report={window:{start:'2026-11-05T12:00:00Z',end:'2026-11-05T13:00:00Z',bucketMs:60000,slowMs:1000},summary:{...measure,callsPerMinute:12400/60},previous:{...measure,p95LatencyMs:350},coverage:{measured:12380,missingLatency:20,fingerprinted:0,latestAt:'2026-11-05T12:59:00Z',percentileMethod:'approximate',sampled:false,totalQueryGroups:2,rankingLimit:20,slowSampleLimit:30,slowRankingMinimumCalls:3},timeline:Array.from({length:60},(_,i)=>({...measure,calls:140+(i%12)*12,failures:i%4,timestamp:new Date(Date.parse('2026-11-05T12:00:00Z')+i*60000).toISOString()})),rankings:{mostUsed:[operation],slowest:[operation],mostTime:[operation],failing:[operation]},histogram:[{_id:0,calls:1200},{_id:10,calls:4300},{_id:50,calls:3900},{_id:100,calls:1500},{_id:250,calls:900},{_id:500,calls:400},{_id:1000,calls:180}],slowSamples:[{timestamp:'2026-11-05T12:58:00Z',operation:'consumer:orders',fingerprint:null,duration:4200,failed:1,trace_id:'sample-trace-001'}]};
test.beforeEach(async({page})=>{
 await page.route('**/log/v1/**',route=>route.fulfill({json:{data:route.request().url().includes('/performance/')?report:{activityTimeline:[],latencyTimeline:[],outcomeTimeline:[]}}}));
});
test('actual broker overview shows scoped performance and no invented trends',async({page})=>{
 const requests:string[]=[];
 page.on('request',request=>{if(request.url().includes('/log/v1/') && request.url().includes('/performance/')) requests.push(request.url());});
 await page.goto('/e2e/fixtures/broker-overview.html');
 await expect(page.getByRole('heading',{name:'Broker performance',exact:true})).toBeVisible();
 await expect(page.getByText('p99 latency',{exact:true})).toBeVisible();
 await expect(page.getByText('Latency distribution',{exact:true})).toBeVisible();
 await expect(page.getByText('Trend unavailable',{exact:true})).toHaveCount(2);
 expect(requests[0]).toContain('/products/shop/resources/message_broker/orders-broker/performance/000000000000000000000001');
 expect(new URL(requests[0]).searchParams.get('env')).toBe('snd');
 await page.getByLabel('Query ranking').selectOption('slowest');
 await page.getByRole('button',{name:'consumer:orders Broker operation / topic',exact:true}).click();
 await expect.poll(()=>requests.some(url=>new URL(url).searchParams.get('operation')==='consumer:orders')).toBeTruthy();
 expect(requests.every(url=>!new URL(url).searchParams.has('unfingerprinted'))).toBeTruthy();
 await page.getByLabel('Clear query filter').click();
 await page.setViewportSize({width:1440,height:3200});
 await page.locator('section[aria-label="Broker performance"]').screenshot({path:'/tmp/ductape-broker-analytics.png',animations:'disabled'});
});
test('broker overview fits mobile dark mode',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/e2e/fixtures/broker-overview.html?dark=1');
 await expect(page.getByRole('heading',{name:'Broker performance',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:'/tmp/ductape-broker-mobile.png',animations:'disabled'});
});
