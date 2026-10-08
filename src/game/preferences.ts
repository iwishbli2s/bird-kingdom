export const tutorialPreferenceKey='bird-kingdom:tutorial-offered';
export interface PreferenceStorage {getItem:(key:string)=>string|null;setItem:(key:string,value:string)=>void}
export function shouldOfferTutorial(storage:PreferenceStorage):boolean {try{return storage.getItem(tutorialPreferenceKey)!=='true';}catch{return true;}}
export function markTutorialOffered(storage:PreferenceStorage):void {try{storage.setItem(tutorialPreferenceKey,'true');}catch{/* Browsers without storage still allow every play action. */}}
