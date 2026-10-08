const {chromium}=require(process.env.BIRD_PLAYWRIGHT_PATH||'C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BIRD_TEST_URL||'http://127.0.0.1:5180');assert.equal(await page.evaluate(()=>typeof window.birdKingdomDebug),'undefined');await page.getByRole('button',{name:'처음부터 배우기',exact:true}).click();
 const guide=page.locator('.tutorial-guide');let complete=false;
 for(let i=0;i<90;i++){
  if(await page.locator('.foreign-proposal').count()){await page.getByRole('button',{name:'제안 거절',exact:true}).click();continue;}
  if(await page.locator('.election-result').count()){await page.getByRole('button',{name:'계속 운영',exact:true}).click();}
  if(await page.getByRole('button',{name:'자유 플레이 계속',exact:true}).count()){complete=true;break;}
  const id=await guide.getAttribute('data-step');console.log('PRODUCTION_STEP',id);
  if(id!=='event'&&await guide.getByRole('button',{name:'안내 화면으로 이동'}).count())await guide.getByRole('button',{name:'안내 화면으로 이동'}).click();
  if(['overview','economy','population','society','species','crisis','emergency','risk','election-prep'].includes(id)){
   if(id==='species')await page.getByRole('tab',{name:'종족 정치',exact:true}).click();if(id==='emergency')await page.getByRole('tab',{name:'예산 편성',exact:true}).click();await guide.getByRole('button',{name:'확인했어요'}).click();
  }else if(id==='month')await page.getByRole('button',{name:'다음 달',exact:true}).click();
  else if(id==='tax'){await page.locator('#incomeTaxRate').focus();await page.keyboard.press('ArrowRight');await page.getByRole('button',{name:'세율 적용',exact:true}).click();}
  else if(id==='budget'){await page.getByRole('tab',{name:'예산 편성',exact:true}).click();const input=page.getByRole('spinbutton',{name:'인프라 예산 변경 비율',exact:true});await input.fill((Number(await input.inputValue())+.3).toFixed(1));await page.getByRole('button',{name:'예산안 적용',exact:true}).click();}
  else if(id==='event')await page.locator('.event-dialog').getByRole('button').first().click();
  else if(id==='technology'){await page.getByRole('button',{name:'연구 중단 · 진척 보존',exact:true}).first().click();const buttons=page.getByRole('button',{name:'우선 연구 지정',exact:true});let found=false;for(let j=0;j<await buttons.count();j++)if(await buttons.nth(j).isEnabled()){await buttons.nth(j).click();found=true;break;}assert.ok(found);}
  else if(id==='diplomacy')await page.getByRole('button',{name:'관계 개선 사절단',exact:true}).click();
  else{await guide.getByRole('button',{name:'다음 안내까지 진행',exact:true}).click();await page.waitForFunction(step=>document.querySelector('.tutorial-guide')?.getAttribute('data-step')!==step||document.querySelector('.foreign-proposal')||document.querySelector('.event-dialog')||document.querySelector('.election-result'),id);}
 }
 assert.ok(complete);assert.match(await page.locator('.topbar-date').innerText(),/2034년 1월/);await page.getByRole('button',{name:'자유 플레이 계속',exact:true}).click();await page.getByRole('button',{name:'다음 달',exact:true}).click();assert.match(await page.locator('.topbar-date').innerText(),/2034년 2월/);assert.equal(await page.evaluate(()=>typeof window.birdKingdomDebug),'undefined');assert.deepEqual(errors,[]);console.log('PASS production tutorial full48months natural election/freeplay, debug absent, errors0');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
