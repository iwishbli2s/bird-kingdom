import {activateTutorial,observeTutorialAction,tutorialStep} from './game/tutorial';
import {markTutorialOffered,shouldOfferTutorial} from './game/preferences';
import TutorialOffer from './components/TutorialOffer';
import {StopDialog} from './components/TutorialGuide';
import {skipTutorial} from './game/tutorial';
import type {Difficulty} from './game/difficulty';
import SaveDialog from './components/SaveDialog';
import {createBrowserSaveStorage,saveToSlot,autosaveDue} from './game/saveStorage';
import { setResearch } from './game/technology';
import AllyRequestDialog from './components/AllyRequestDialog';
import { declareWar, applyWarAction, respondToAllyRequest } from './game/warfare';
import { resolvePeace } from './game/peace';
import { setMobilizationTarget } from './game/military';
import { performDiplomaticAction } from './game/diplomacy';
import EventDialog from './components/EventDialog';
import { resolvePendingEvent } from './game/events';
import { useEffect, useState, useRef } from 'react';
import ElectionVictory from './components/ElectionVictory';
import Dashboard from './components/Dashboard';
import Setup from './components/Setup';
import GameOver from './components/GameOver';
import { advanceMonth, createGame } from './game/engine';

import { setControlledTaxPolicy } from './game/taxPolicy';
import { setControlledBudgetPolicy } from './game/budgetPolicy';
import { getDebugStrategicAI, getDebugCrisisRoll, getDebugWarRoll, getDebugConflictRoll, getDebugSecessionRoll, getDebugEventRoll, getDebugElectionRoll, getDebugMortalityRisk, installGameDebug } from './game/debug';
import type { StartingCountryId, GameState, RegionId } from './game/types';



export default function App() {
  const [storage]=useState(createBrowserSaveStorage);
  const [offer,setOffer]=useState(()=>{try{return shouldOfferTutorial(localStorage);}catch{return true;}}),[fastForward,setFastForward]=useState(false),[confirmTutorialStop,setConfirmTutorialStop]=useState(false);
  useEffect(()=>{if(offer)rememberTutorialOffer();},[offer]);
  function rememberTutorialOffer(){try{markTutorialOffered(localStorage);}catch{/* Private/storage-restricted browser. */}}
  function startTutorial(){rememberTutorialOffer();setOffer(false);setDismissedElection(null);setFastForward(false);setGame(activateTutorial(createGame('sparrow',null,2030,'normal')));}
  function mutate(action:(g:GameState)=>GameState){setGame(current=>current?observeTutorialAction(current,action(current)):null);}
  const [showSaves,setShowSaves]=useState(false),[hasSaves,setHasSaves]=useState(false),[saveNotice,setSaveNotice]=useState(''),[loadRevision,setLoadRevision]=useState(0);
  const previousGame=useRef<GameState|null>(null),lastAutosave=useRef(-1);  const [screen, setScreen] = useState<'menu' | 'countries' | 'regions'>('menu');
  const [dismissedElection, setDismissedElection] = useState<number | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  useEffect(()=>{if(import.meta.env.DEV)installGameDebug(setGame,()=>game);},[game]);
  useEffect(()=>{if(!game)storage.list().then(s=>setHasSaves(s.length>0)).catch(()=>setSaveNotice('저장소를 열 수 없습니다.'));},[game===null,showSaves,storage]);
  useEffect(()=>{const before=previousGame.current;previousGame.current=game;if(game&&autosaveDue(before,game)&&lastAutosave.current!==game.turn){lastAutosave.current=game.turn;saveToSlot(storage,'auto',game).then(()=>setSaveNotice(game.date.year+'년 '+game.date.month+'월 자동 저장 완료')).catch(e=>setSaveNotice(e.message));}},[game,storage]);
  function loadSavedGame(g:GameState){setFastForward(false);previousGame.current=g;lastAutosave.current=g.turn;setGame(g);setShowSaves(false);setDismissedElection(null);setLoadRevision(r=>r+1);setSaveNotice('저장을 불러왔습니다.');}
  const savePanel=showSaves?<SaveDialog game={game} storage={storage} onLoad={loadSavedGame} onClose={()=>setShowSaves(false)}/>:null;
  const saveLauncher=game?<button className="save-launcher secondary" onClick={()=>setShowSaves(true)}>저장 / 불러오기</button>:null;  function startGame(countryId: StartingCountryId, regionId: RegionId|undefined,difficulty:Difficulty) { setDismissedElection(null); setGame(createGame(countryId, regionId,undefined,difficulty)); }
  function exitGame() { setFastForward(false);setGame(null); setScreen('menu'); }
  function advance() {
    if (!game?.player.alive || game.gameOverReason || game.events.pendingEvent ||game.world.foreignProposals?.some(p=>p.targetId===game.player.controlledCountryId)) return;
    setGame(current=>current?advanceMonth(current,{
      strategicAI:import.meta.env.DEV?getDebugStrategicAI():undefined,
      mortalityRiskOverride:import.meta.env.DEV?getDebugMortalityRisk():undefined,
      electionRandom:import.meta.env.DEV&&getDebugElectionRoll()!==undefined?()=>getDebugElectionRoll()!:undefined,
      eventOccurrenceRandom:import.meta.env.DEV&&getDebugEventRoll()!==undefined?()=>getDebugEventRoll()!:undefined,
      secessionRandom:import.meta.env.DEV&&getDebugSecessionRoll()!==undefined?()=>getDebugSecessionRoll()!:undefined,
      conflictRandom:import.meta.env.DEV&&getDebugConflictRoll()!==undefined?()=>getDebugConflictRoll()!:undefined,
      warRandom:import.meta.env.DEV&&getDebugWarRoll()!==undefined?()=>getDebugWarRoll()!:undefined,
      crisisRandom:import.meta.env.DEV&&getDebugCrisisRoll()!==undefined?()=>getDebugCrisisRoll()!:undefined,
    }):null);
  }
  useEffect(()=>{if(!fastForward)return;const blocked=!game||tutorialStep(game)?.kind!=='wait'||game.gameOverReason||game.events.pendingEvent||showSaves||game.world.foreignProposals?.some(p=>p.targetId===game.player.controlledCountryId)||game.world.warfare?.allyRequests.some(r=>r.status==='pending'&&r.allyCountryId===game.player.controlledCountryId);if(blocked){setFastForward(false);return;}const timer=setTimeout(advance,75);return()=>clearTimeout(timer);},[game,fastForward,showSaves]);
  function resolveEvent(choice:string){mutate(current=>current.events.pendingEvent?resolvePendingEvent(current,choice,undefined,import.meta.env.DEV&&getDebugSecessionRoll()!==undefined?()=>getDebugSecessionRoll()!:undefined,import.meta.env.DEV?getDebugStrategicAI()!==false:true):current);}  if (game && (!game.player.alive || game.gameOverReason)) return <><GameOver game={game} onExit={exitGame}/>{saveLauncher}{savePanel}</>;
  if (game) return <>{saveLauncher}{savePanel}{saveNotice&&<p className="save-status" role="status">{saveNotice}</p>}<Dashboard key={loadRevision} game={game} onAdvance={advance} onExit={exitGame} onTutorialChange={g=>{setFastForward(false);setGame(g);}} onFastForward={()=>setFastForward(v=>!v)} fastForward={fastForward}
    onResearch={(domain,id)=>mutate(current=>setResearch(current,domain,id))}
    onMobilization={target=>setGame(current=>current?setMobilizationTarget(current,target):null)}
    onWarAction={(id,action)=>setGame(current=>current?applyWarAction(current,id,action):null)}
    onPeace={(id,result)=>setGame(current=>current?resolvePeace(current,id,result):null)}
    onDeclare={(id,goal)=>setGame(current=>current?respondStrategicAllies(declareWar(current,current.player.controlledCountryId,id,goal,false,true)):null)}
    onDiplomaticAction={(target,action)=>mutate(current=>performDiplomaticAction(current,current.player.controlledCountryId,target,action))}
    onBudgetPolicy={(policy,emergency) => mutate(current=>setControlledBudgetPolicy(current,policy,emergency))}
    onTaxPolicy={policy => mutate(current=>setControlledTaxPolicy(current,policy))} />
    {!showSaves&&!game.events.pendingEvent&&!game.world.foreignProposals?.length&&<AllyRequestDialog game={game} onEndTutorial={()=>{setFastForward(false);setConfirmTutorialStop(true);}} onRespond={(id,accept)=>setGame(current=>current?respondToAllyRequest(current,id,accept):null)}/>}
    {!showSaves&&!game.events.pendingEvent&&<ForeignProposalDialog game={game} onEndTutorial={()=>{setFastForward(false);setConfirmTutorialStop(true);}} onRespond={(id,accept)=>setGame(current=>current?respondToForeignProposal(current,id,accept):null)}/>}
    {!showSaves&&game.events.pendingEvent && <EventDialog game={game} onResolve={resolveEvent} onEndTutorial={()=>{setFastForward(false);setConfirmTutorialStop(true);}}/>}
    {!showSaves&&!game.events.pendingEvent && game.player.career.lastElection?.won && game.player.career.lastElection.turn === game.turn && dismissedElection !== game.turn && <ElectionVictory career={game.player.career} onContinue={() => setDismissedElection(game.turn)} />}
    {confirmTutorialStop&&<StopDialog onClose={()=>setConfirmTutorialStop(false)} onStop={()=>{setConfirmTutorialStop(false);setGame(g=>g?skipTutorial(g):null);}}/>}
  </>;
  return <><Setup screen={screen} onScreen={setScreen} onStart={startGame} hasSaves={hasSaves} onTutorial={startTutorial} onContinue={()=>setShowSaves(true)}/>{offer&&<TutorialOffer onStart={startTutorial} onSkip={()=>{rememberTutorialOffer();setOffer(false);setScreen('countries');}}/>}{savePanel}{saveNotice&&<p className="save-status" role="status">{saveNotice}</p>}</>;
}
import ForeignProposalDialog from './components/ForeignProposalDialog';
import { respondToForeignProposal } from './game/strategicCommands';
import { respondStrategicAllies } from './game/strategicAI';




