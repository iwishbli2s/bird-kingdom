export const tutorialPreferenceKey='bird-kingdom:tutorial-offered';
export interface PreferenceStorage {getItem:(key:string)=>string|null;setItem:(key:string,value:string)=>void}
export function shouldOfferTutorial(storage:PreferenceStorage):boolean {try{return storage.getItem(tutorialPreferenceKey)!=='true';}catch{return true;}}
export function markTutorialOffered(storage:PreferenceStorage):void {try{storage.setItem(tutorialPreferenceKey,'true');}catch{/* Browsers without storage still allow every play action. */}}

export const patchPreferenceKey='bird-kingdom:lastSeenPatchVersion';
export const annualPreferenceKey='bird-kingdom:annual-autopopup';
export function isPatchUnread(storage:PreferenceStorage,version:string):boolean {try{return storage.getItem(patchPreferenceKey)!==version;}catch{return true;}}
export function markPatchRead(storage:PreferenceStorage,version:string):void {try{storage.setItem(patchPreferenceKey,version);}catch{}}
export function annualAutoEnabled(storage:PreferenceStorage):boolean {try{return storage.getItem(annualPreferenceKey)!=='false';}catch{return true;}}
export function setAnnualAutoEnabled(storage:PreferenceStorage,enabled:boolean):void {try{storage.setItem(annualPreferenceKey,String(enabled));}catch{}}
