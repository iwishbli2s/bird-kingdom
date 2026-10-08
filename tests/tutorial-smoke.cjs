const {chromium}=require(process.env.BIRD_PLAYWRIGHT_PATH||'C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const url=process.env.BIRD_TEST_URL||'http://127.0.0.1:5175';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const context=await browser.newContext({viewport:process.env.BIRD_MOBILE?{width:390,height:844}:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('status of 404'))errors.push(m.text());});
 const state=()=>page.evaluate(()=>window.birdKingdomDebug.getGameState());
 const guide=()=>page.locator('.tutorial-guide'),navigate=async()=>{const b=guide().getByRole('button',{name:'안내 화면으로 이동',exact:true});if(await b.count())await b.click();};
 const help=async()=>{await page.getByRole('button',{name:'현재 화면 도움말'}).click();await page.locator('.help-dialog').waitFor();await page.keyboard.press('Tab');assert.ok(await page.locator('.help-dialog').evaluate(el=>el.contains(document.activeElement)));await page.keyboard.press('Escape');await page.locator('.help-dialog').waitFor({state:'hidden'});};
 const settleProposal=async()=>{if(await page.locator('.foreign-proposal').count())await page.getByRole('button',{name:'제안 거절',exact:true}).click();if(await page.getByRole('heading',{name:'방위조약 참전 요청'}).count())await page.getByRole('button',{name:'불참',exact:true}).click();};
 await page.goto(url);await page.getByRole('button',{name:'처음부터 배우기',exact:true}).click();
 const seen=[];
 for(let i=0;i<90;i++){
  await settleProposal();const g=await state();if(g.tutorial.mode==='completed'){assert.equal(g.gameOverReason,null);assert.deepEqual(g.date,{year:2034,month:1});break;}
  const id=g.tutorial.stepId;if(!seen.includes(id)){seen.push(id);console.log('STEP',id,g.turn);}if(id!=='event')await navigate();
  if(['overview','economy','population','society','species','crisis','emergency','risk','election-prep'].includes(id)){
   if(id==='species')await page.getByRole('tab',{name:'종족 정치',exact:true}).click();
   if(id==='emergency')await page.getByRole('tab',{name:'예산 편성',exact:true}).click();
   if(id==='overview'){assert.ok(await page.locator('.command-summary.tutorial-highlight').count());await help();await page.screenshot({path:'.test-output/tutorial-desktop.png',fullPage:true});}
   if(id==='crisis'){assert.equal(Object.values(g.world.crises.activeCrises).find(c=>c.sourceEventId==='tutorial:storm').severity,60);}
   await guide().getByRole('button',{name:'확인했어요',exact:true}).click();
  }else if(id==='month')await page.getByRole('button',{name:'다음 달',exact:true}).click();
  else if(id==='tax'){
   const before=g.world.countries.sparrow.fiscal.taxPolicy.incomeTaxRate;await page.locator('#incomeTaxRate').focus();await page.keyboard.press('ArrowRight');assert.equal((await state()).world.countries.sparrow.fiscal.taxPolicy.incomeTaxRate,before);await page.getByRole('button',{name:'세율 적용',exact:true}).click();assert.equal((await state()).world.countries.sparrow.fiscal.taxPolicy.incomeTaxRate,before+.5);
  }else if(id==='budget'){
   await page.getByRole('tab',{name:'예산 편성',exact:true}).click();await page.getByRole('spinbutton',{name:'인프라 예산 변경 비율',exact:true}).fill((g.world.countries.sparrow.fiscal.budgetPolicy.infrastructure+.3).toFixed(1));await page.getByRole('button',{name:'예산안 적용',exact:true}).click();
  }else if(id==='technology'){
   await page.getByRole('button',{name:'연구 중단 · 진척 보존',exact:true}).first().click();assert.equal((await state()).tutorial.stepId,'technology');const b=page.getByRole('button',{name:'우선 연구 지정',exact:true}).filter({visible:true});let picked=false;for(let j=0;j<await b.count();j++)if(await b.nth(j).isEnabled()){await b.nth(j).click();picked=true;break;}assert.ok(picked);
  }else if(id==='diplomacy')await page.getByRole('button',{name:'관계 개선 사절단',exact:true}).click();
  else if(id==='event'){
   await page.locator('.event-dialog').getByRole('button').first().click();assert.equal((await state()).tutorial.stepId,'technology');
  }else {
   await guide().getByRole('button',{name:'다음 안내까지 진행',exact:true}).click();
   await page.waitForFunction(step=>{const g=window.birdKingdomDebug.getGameState();return g.tutorial.stepId!==step||g.gameOverReason||g.events.pendingEvent||g.world.foreignProposals?.length||g.world.warfare.allyRequests.some(p=>p.status==='pending'&&p.allyCountryId==='sparrow');},id,{timeout:30000});
  }
 }
 const completed=await state();assert.equal(completed.tutorial.mode,'completed');assert.equal(completed.turn,49);assert.equal(completed.tutorial.completedStepIds.length,19);assert.equal(completed.tutorial.scriptedScenarioEnabled,false);
 if(await page.locator('.election-result').count())await page.getByRole('button',{name:'계속 운영',exact:true}).click();await page.getByRole('button',{name:'자유 플레이 계속',exact:true}).click();
 fs.writeFileSync('.test-output/tutorial-e2e-state.json',JSON.stringify({date:completed.date,election:completed.player.career.lastElection,tutorial:completed.tutorial,seen},null,2));console.log('PASS full tutorial natural RNG, actual APIs, 2034January re-election, free play, no UI errors');
 await page.reload();assert.equal(await page.locator('.tutorial-offer').count(),0);await page.getByRole('button',{name:'튜토리얼 다시 시작',exact:true}).click();assert.equal((await state()).tutorial.stepId,'overview');
 await guide().getByRole('button',{name:'확인했어요'}).click();await page.getByRole('button',{name:'다음 달',exact:true}).click();await navigate();await guide().getByRole('button',{name:'확인했어요'}).click();await navigate();await page.locator('#incomeTaxRate').focus();await page.keyboard.press('ArrowRight');await page.getByRole('button',{name:'세율 적용'}).click();
 const beforeSkip=await state();assert.equal(beforeSkip.tutorial.stepId,'budget');await page.getByRole('button',{name:'저장 / 불러오기',exact:true}).click();await page.locator('[data-slot="manual-1"]').getByRole('button',{name:'저장',exact:true}).click();await page.getByText('저장되었습니다.',{exact:true}).waitFor();await page.keyboard.press('Escape');await page.locator('.save-dialog').waitFor({state:'hidden'});await page.reload();await page.getByRole('button',{name:'이어하기',exact:true}).click();await page.locator('[data-slot="manual-1"]').getByRole('button',{name:'불러오기',exact:true}).click();await guide().waitFor();assert.equal((await state()).tutorial.stepId,'budget');console.log('PASS active tutorial save/reload/load same guide and scripts');
 await page.setViewportSize({width:390,height:844});await navigate();await page.getByRole('tab',{name:'예산 편성',exact:true}).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'.test-output/tutorial-mobile.png',fullPage:true});
 const before=await state();await guide().getByRole('button',{name:'튜토리얼 종료',exact:true}).click();await page.getByRole('button',{name:'자유 플레이 시작',exact:true}).click();const after=await state();assert.equal(after.tutorial.mode,'skipped');for(const key of ['world','date','player','random','events'])assert.deepEqual(after[key],before[key]);assert.equal(await guide().count(),0);console.log('PASS mobile target visible/no overflow, mid-budget skip preserves state/RNG, manual replay');
 const second=await browser.newContext(),p2=await second.newPage();await p2.goto(url);await p2.getByRole('button',{name:'튜토리얼 건너뛰기',exact:true}).click();await p2.getByRole('button',{name:'공화국 운영 시작',exact:true}).click();assert.equal(await p2.evaluate(()=>window.birdKingdomDebug.getGameState().tutorial),undefined);await p2.reload();assert.equal(await p2.locator('.tutorial-offer').count(),0);console.log('PASS first offer immediate skip, normal settings/play, preference persistence');
 assert.deepEqual(errors,[]);console.log('TUTORIAL_BROWSER_RESULT 0');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
