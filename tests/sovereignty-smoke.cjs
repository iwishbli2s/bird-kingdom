const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const mobile=!!process.env.BIRD_MOBILE,context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.BIRD_TEST_URL||'http://127.0.0.1:5175');
 await page.getByRole('button',{name:'튜토리얼 건너뛰기',exact:true}).click();await page.getByRole('button',{name:'공화국 운영 시작',exact:true}).click();
 const state=()=>page.evaluate(()=>window.birdKingdomDebug.getGameState());
 const nav=async label=>{const menu=page.getByRole('button',{name:'메뉴 열기',exact:true});if(await menu.isVisible())await menu.click();await page.getByRole('navigation',{name:'정부 운영 메뉴'}).getByRole('button',{name:label,exact:true}).click();};
 await page.evaluate(()=>{const d=window.birdKingdomDebug;d.setMortalityRisk(0);d.setEventRoll(.999999);d.setCrisisRoll(.999999);d.setElectionRoll(0);d.setStrategicAIEnabled(false);});
 const capture=async target=>{
  const result=await page.evaluate(async target=>{const {occupiedWar}=await import('/simulation/sovereigntyScenarios.ts');const {sovereignTerritories}=await import('/src/game/territory.ts');const d=window.birdKingdomDebug,g=d.getGameState();const r=sovereignTerritories(g.world,target)[0];const s=occupiedWar(g,g.player.controlledCountryId,target,r);d.setGameState(s.game);return {warId:s.warId,region:r,control:s.game.world.warfare.wars[s.warId].fronts[0].control,decisive:s.game.world.warfare.wars[s.warId].fronts[0].decisiveMonths};},target);
  assert.ok(result.control>=90&&result.decisive>=3);await nav('군사');await page.getByRole('button',{name:'목표 영토 이전',exact:true}).click();console.log('REAL DECLARE / MONTHLY OCCUPATION / UI PEACE',result);
 };
 for(let i=0;i<4;i++)await capture('pigeon');
 let g=await state();assert.equal(g.world.countries.pigeon,undefined);assert.deepEqual(Object.keys(g.world.countries),['sparrow']);assert.ok(g.achievements.unlocked.some(u=>u.achievementId==='world-unification'));assert.equal(g.gameOverReason,null);
 await nav('업적');await page.locator('[data-achievement="world-unification"].unlocked').waitFor();const turn=g.turn;await page.getByRole('button',{name:'다음 달',exact:true}).click();assert.equal((await state()).turn,turn+1);
 await page.getByRole('button',{name:'저장 / 불러오기',exact:true}).click();await page.locator('[data-slot="manual-1"]').getByRole('button',{name:'저장',exact:true}).click();await page.getByText('저장되었습니다.',{exact:true}).waitFor();await page.keyboard.press('Escape');await page.reload();await page.getByRole('button',{name:'이어하기',exact:true}).click();await page.locator('[data-slot="manual-1"]').getByRole('button',{name:'불러오기',exact:true}).click();assert.ok((await state()).achievements.unlocked.some(u=>u.achievementId==='world-unification'));console.log('PASS world unification, extra month, actual UI save reload');
 await page.evaluate(async()=>{const {independentScenario}=await import('/simulation/sovereigntyScenarios.ts');window.birdKingdomDebug.setGameState(independentScenario('eagle-state'));});
 await page.waitForFunction(()=>window.birdKingdomDebug.getGameState()?.player.origin?.startingStateId==='eagle-state');
 assert.equal((await state()).player.origin.startingStateId,'eagle-state');assert.equal((await state()).player.career.office,'president');assert.equal((await state()).world.countries.pigeon.identity.isDynamic,false);
 await nav('업적');assert.equal(await page.getByText('역전된 연방',{exact:true}).count(),0);
 for(let i=0;i<3;i++)await capture('pigeon');
 g=await state();assert.equal(g.world.countries.pigeon,undefined);assert.ok(g.history.countries.pigeon.dissolvedDate);assert.equal(g.achievements.unlocked.find(u=>u.achievementId==='reverse-federation').score,2800);assert.equal(g.gameOverReason,null);
 await nav('업적');await page.getByRole('heading',{name:'역전된 연방',exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'.test-output/sovereignty-'+(mobile?'mobile':'desktop')+'.png',fullPage:true});
 const t=g.turn;await page.getByRole('button',{name:'다음 달',exact:true}).click();assert.equal((await state()).turn,t+1);assert.deepEqual(errors,[]);console.log('PASS eagle real independence, three legal wars, direct federal absorption, hidden reveal and continuation');console.log('SOVEREIGNTY_BROWSER_RESULT 0',mobile?'mobile':'desktop');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
